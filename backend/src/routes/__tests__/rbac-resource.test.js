'use strict';

const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { invalidatePermissionCache } = require('../../middleware/auth');
const { seedRbacPermissions } = require('../../lib/rbacSeeder');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

// Kode resource unik agar tidak bertabrakan dengan resource existing
const TEST_RESOURCE_KODE = 'test-task4-resource-ui';

describe('Task 4 — CRUD Resource (POST/PUT/DELETE) + guard 409', () => {
  let adminToken;
  let akuntanToken;
  let createdResourceId;
  let createdGrantId;

  beforeAll(async () => {
    // Seed RBAC resources & role permissions
    await seedRbacPermissions(prismaDb);
    invalidatePermissionCache();

    // Bersihkan sisa resource test dari run sebelumnya
    const existing = await prismaDb.resource.findUnique({ where: { kode: TEST_RESOURCE_KODE } });
    if (existing) {
      await prismaDb.rolePermission.deleteMany({ where: { resourceId: existing.id } });
      await prismaDb.resource.delete({ where: { id: existing.id } });
    }

    // Login admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: TEST_PASSWORD });
    adminToken = adminLogin.body.token;
    expect(adminToken).toBeTruthy();

    // Login akuntan
    const akuntanLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'akuntan', password: TEST_PASSWORD });
    akuntanToken = akuntanLogin.body.token;
    expect(akuntanToken).toBeTruthy();
  });

  afterAll(async () => {
    // Bersihkan semua artefak test
    if (createdGrantId) {
      try { await prismaDb.rolePermission.delete({ where: { id: createdGrantId } }); } catch { /* ignore */ }
    }
    if (createdResourceId) {
      try {
        // Hapus semua grant dulu (agar delete tidak gagal FK)
        await prismaDb.rolePermission.deleteMany({ where: { resourceId: createdResourceId } });
        await prismaDb.resource.delete({ where: { id: createdResourceId } });
      } catch { /* ignore */ }
    }
    invalidatePermissionCache();
    await prismaDb.$disconnect();
  });

  // ── 1. POST create resource → 201 ────────────────────────────────────────
  test('1. POST /api/admin/resources → 201 (create resource baru)', async () => {
    const res = await request(app)
      .post('/api/admin/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kode: TEST_RESOURCE_KODE, nama: 'Test Task4 Resource UI', modul: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.kode).toBe(TEST_RESOURCE_KODE);
    expect(res.body.nama).toBe('Test Task4 Resource UI');
    expect(res.body.modul).toBe('admin');
    expect(res.body.aktif).toBe(true);
    createdResourceId = res.body.id;
    expect(createdResourceId).toBeTruthy();
  });

  // ── 2. POST kode duplikat → 409 ────────────────────────────────────────
  test('2. POST /api/admin/resources → 409 (kode duplikat)', async () => {
    const res = await request(app)
      .post('/api/admin/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kode: TEST_RESOURCE_KODE, nama: 'Duplikat Resource', modul: 'admin' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  // ── 3. POST tanpa field wajib → 400 ───────────────────────────────────
  test('3. POST /api/admin/resources → 400 (tanpa field wajib)', async () => {
    const res = await request(app)
      .post('/api/admin/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ kode: 'partial-resource' }); // missing nama & modul

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  // ── 4. PUT update nama/modul → 200 ────────────────────────────────────
  test('4. PUT /api/admin/resources/:id → 200 (update nama/modul)', async () => {
    expect(createdResourceId).toBeTruthy();

    const res = await request(app)
      .put(`/api/admin/resources/${createdResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nama: 'Test Task4 Resource (Updated)', modul: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.nama).toBe('Test Task4 Resource (Updated)');
    expect(res.body.modul).toBe('admin');
    expect(res.body.aktif).toBe(true);
  });

  // ── 5. PUT aktif:false → 200; lalu akses resource itu sebagai role bergrant → 403 ────
  test('5. PUT aktif:false → 200; akuntan bergrant → 403 (cache invalidation)', async () => {
    expect(createdResourceId).toBeTruthy();

    // Buat grant: AKUNTAN bisa READ resource test ini
    const grantRes = await request(app)
      .post('/api/admin/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'AKUNTAN', resourceId: createdResourceId, aksi: 'READ' });
    expect(grantRes.status).toBe(201);
    createdGrantId = grantRes.body.id;

    // Verifikasi: akuntanToken akses endpoint yang pakai resource ini
    // Kita pakai /api/my-permissions dan periksa bahwa grant terdaftar di DB
    // Verifikasi langsung lewat DB bahwa cache terinvalidasi setelah PUT aktif:false

    // Nonaktifkan resource via PUT aktif:false
    const putRes = await request(app)
      .put(`/api/admin/resources/${createdResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ aktif: false });

    expect(putRes.status).toBe(200);
    expect(putRes.body.aktif).toBe(false);

    // Setelah cache diinvalidasi (PUT memanggil invalidatePermissionCache()),
    // cache reload dari DB. Resource non-aktif TIDAK dimuat ke cache (lihat loadPermissionCache).
    // Verifikasi: my-permissions AKUNTAN tidak lagi memuat grant resource test yang non-aktif.
    const myPermsRes = await request(app)
      .get('/api/my-permissions')
      .set('Authorization', `Bearer ${akuntanToken}`);

    expect(myPermsRes.status).toBe(200);
    // Pastikan resource non-aktif tidak muncul di permissions list
    const hasTestResource = myPermsRes.body.data.permissions.some(
      (p) => p.resource === TEST_RESOURCE_KODE
    );
    expect(hasTestResource).toBe(false);
  });

  // ── 6. PUT aktif:true → 200; akses lagi → 200 (PEMULIHAN — wajib) ────
  test('6. PUT aktif:true → 200; akuntan akses resource pulih (PEMULIHAN)', async () => {
    expect(createdResourceId).toBeTruthy();

    // Aktifkan kembali resource
    const putRes = await request(app)
      .put(`/api/admin/resources/${createdResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ aktif: true });

    expect(putRes.status).toBe(200);
    expect(putRes.body.aktif).toBe(true);

    // Setelah cache diinvalidasi dan reload, resource aktif kembali.
    // my-permissions AKUNTAN harus kembali memuat grant resource test.
    const myPermsRes = await request(app)
      .get('/api/my-permissions')
      .set('Authorization', `Bearer ${akuntanToken}`);

    expect(myPermsRes.status).toBe(200);
    // Resource aktif kembali → grant dimuat ke cache → muncul di my-permissions
    const hasTestResource = myPermsRes.body.data.permissions.some(
      (p) => p.resource === TEST_RESOURCE_KODE
    );
    expect(hasTestResource).toBe(true);
  });

  // ── 7. DELETE saat masih ada grant → 409 (guard baru) ─────────────────
  test('7. DELETE /api/admin/resources/:id → 409 (masih ada grant)', async () => {
    expect(createdResourceId).toBeTruthy();
    expect(createdGrantId).toBeTruthy();

    // Pastikan grant masih ada
    const grantCount = await prismaDb.rolePermission.count({ where: { resourceId: createdResourceId } });
    expect(grantCount).toBeGreaterThan(0);

    const res = await request(app)
      .delete(`/api/admin/resources/${createdResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/grant aktif/);
    expect(res.body.error).toMatch(/Cabut grant/);
  });

  // ── 8. DELETE setelah grant dicabut → 200 (soft delete) ───────────────
  test('8. DELETE /api/admin/resources/:id → 200 (setelah grant dicabut)', async () => {
    expect(createdResourceId).toBeTruthy();
    expect(createdGrantId).toBeTruthy();

    // Cabut grant dulu via API
    const revokeRes = await request(app)
      .delete(`/api/admin/permissions/${createdGrantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revokeRes.status).toBe(200);
    createdGrantId = null; // sudah terhapus

    // Sekarang DELETE resource harus berhasil
    const res = await request(app)
      .delete(`/api/admin/resources/${createdResourceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifikasi resource di-soft-delete (aktif:false) di DB
    const dbRow = await prismaDb.resource.findUnique({ where: { id: createdResourceId } });
    expect(dbRow).toBeTruthy();
    expect(dbRow.aktif).toBe(false);
  });

  // ── 9. DELETE resource tak ada → 404 ──────────────────────────────────
  test('9. DELETE /api/admin/resources/:id → 404 (resource tidak ada)', async () => {
    const res = await request(app)
      .delete('/api/admin/resources/non-existent-resource-id-000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
