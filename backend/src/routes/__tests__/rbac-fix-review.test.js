'use strict';

const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { permissionCache, invalidatePermissionCache } = require('../../middleware/auth');
const { seedRbacPermissions } = require('../../lib/rbacSeeder');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

describe('RBAC Fix Review — cache lockout, approval resource split, MITRA aslap-master', () => {
  let akuntanToken;
  let aslapToken;
  let mitraToken;
  let kepalaToken;
  let adminToken;
  let createdPermissionId;

  beforeAll(async () => {
    await seedRbacPermissions(prismaDb);
    invalidatePermissionCache();

    const login = async (username) => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username, password: TEST_PASSWORD });
      return res.body.token;
    };

    akuntanToken = await login('akuntan');
    aslapToken = await login('aslap');
    mitraToken = await login('mitra');
    kepalaToken = await login('kepalasppg');
    adminToken = await login('admin');
  });

  afterAll(async () => {
    // Bersihkan permission uji (kepala-approval CREATE untuk AKUNTAN)
    if (createdPermissionId) {
      try {
        await prismaDb.rolePermission.delete({ where: { id: createdPermissionId } });
      } catch {
        // ignore
      }
    }
    invalidatePermissionCache();
    await prismaDb.$disconnect();
  });

  describe('BUG 1 — requirePermission reload saat role tidak ada di cache (bukan hanya size===0)', () => {
    test('AKUNTAN tetap 200 pada endpoint lama SETELAH admin mengubah permission AKUNTAN (tidak lockout 403)', async () => {
      // 1. Request pertama AKUNTAN → cache load, AKUNTAN ada di Map
      const before = await request(app)
        .get('/api/akuntan/akun')
        .set('Authorization', `Bearer ${akuntanToken}`);
      expect(before.status).toBe(200);
      expect(permissionCache.has('AKUNTAN')).toBe(true);

      // 2. ADMIN ubah permission AKUNTAN (tambah CREATE kepala-approval) → invalidatePermissionCache('AKUNTAN')
      const resource = await prismaDb.resource.findFirst({ where: { kode: 'kepala-approval' } });
      const addRes = await request(app)
        .post('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'AKUNTAN', resourceId: resource.id, aksi: 'CREATE' });
      expect(addRes.status).toBe(201);
      createdPermissionId = addRes.body.id;
      // Key AKUNTAN hilang dari cache (invalidate write-through menghapus key role)
      expect(permissionCache.has('AKUNTAN')).toBe(false);

      // 3. AKUNTAN akses endpoint lama LAGI → reload cache → 200 (bukan 403 lockout)
      const after = await request(app)
        .get('/api/akuntan/akun')
        .set('Authorization', `Bearer ${akuntanToken}`);
      expect(after.status).toBe(200);
      expect(permissionCache.has('AKUNTAN')).toBe(true);
    });

    test('my-permissions tidak kosong setelah invalidate role (konsisten reload)', async () => {
      // Hit my-permissions → role AKUNTAN di cache
      const first = await request(app)
        .get('/api/my-permissions')
        .set('Authorization', `Bearer ${akuntanToken}`);
      expect(first.status).toBe(200);
      expect(first.body.data.permissions.length).toBeGreaterThan(0);

      // invalidate role AKUNTAN → key hilang
      invalidatePermissionCache('AKUNTAN');
      expect(permissionCache.has('AKUNTAN')).toBe(false);

      // Request ulang → reload → permissions tetap terisi (bukan [])
      const second = await request(app)
        .get('/api/my-permissions')
        .set('Authorization', `Bearer ${akuntanToken}`);
      expect(second.status).toBe(200);
      expect(second.body.data.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('BUG 2 — resource approval terpisah: kepala-approval (KEPALA_SPPG) vs aslap-po-approval (ASLAP)', () => {
    test('ASLAP mendapat 403 saat POST /api/kepala/approval (tidak punya kepala-approval APPROVE)', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set('Authorization', `Bearer ${aslapToken}`)
        .send({ menuHarianId: 'dummy', status: 'DISETUJUI' });

      expect(res.status).toBe(403);
    });

    test('KEPALA_SPPG TIDAK boleh PUT /api/aslap/po/:id/approve (perilaku lama: hanya ASLAP)', async () => {
      const res = await request(app)
        .put('/api/aslap/po/dummy-id/approve')
        .set('Authorization', `Bearer ${kepalaToken}`)
        .send({ items: [] });

      expect(res.status).toBe(403);
    });

    test('ASLAP masih boleh PUT /api/aslap/po/:id/approve (punya aslap-po-approval APPROVE) — guard lolos, error bisnis 404 karena id dummy', async () => {
      const res = await request(app)
        .put('/api/aslap/po/dummy-id/approve')
        .set('Authorization', `Bearer ${aslapToken}`)
        .send({ items: [] });

      // Guard lolos (bukan 403) — handler berhenti di "PO tidak ditemukan" (404)
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PO tidak ditemukan');
    });

    test('KEPALA_SPPG tetap boleh POST /api/kepala/approval (kepala-approval APPROVE) — 400 validasi karena body kosong, bukan 403', async () => {
      const res = await request(app)
        .post('/api/kepala/approval')
        .set('Authorization', `Bearer ${kepalaToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('REGRESI — MITRA akses GET /api/aslap/periode (resource aslap-periode, tidak buka sekolah/posyandu)', () => {
    test('MITRA mendapat 200 di GET /api/aslap/periode (dulu requireRole ASLAP,MITRA,...)', async () => {
      const res = await request(app)
        .get('/api/aslap/periode')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(200);
    });

    test('MITRA tetap 403 di GET /api/aslap/sekolah (resource aslap-master, tanpa grant MITRA — perilaku lama)', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(403);
    });
  });
});
