const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { permissionCache } = require('../../middleware/auth');
const { seedRbacPermissions } = require('../../lib/rbacSeeder');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

describe('Task 2 RBAC: /api/my-permissions + CRUD Admin Permission', () => {
  let adminToken;
  let akuntanToken;
  let testResourceId;
  let createdPermissionId;

  beforeAll(async () => {
    // Seed RBAC resources & role permissions first
    await seedRbacPermissions(prismaDb);

    // Login admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: TEST_PASSWORD });
    adminToken = adminLogin.body.token;

    // Login akuntan
    const akuntanLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'akuntan', password: TEST_PASSWORD });
    akuntanToken = akuntanLogin.body.token;

    // Get a resource id for testing
    const resRow = await prismaDb.resource.findFirst({ where: { kode: 'aslap-master' } });
    testResourceId = resRow.id;
  });

  afterAll(async () => {
    // Clean up created permission if exists
    if (createdPermissionId) {
      try {
        await prismaDb.rolePermission.delete({ where: { id: createdPermissionId } });
      } catch {
        // ignore
      }
    }
    await prismaDb.$disconnect();
  });

  describe('GET /api/my-permissions', () => {
    test('401 jika belum login', async () => {
      const res = await request(app).get('/api/my-permissions');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTruthy();
    });

    test('200 dan mengembalikan role & permissions user yang login', async () => {
      const res = await request(app)
        .get('/api/my-permissions')
        .set('Authorization', `Bearer ${akuntanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('AKUNTAN');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThan(0);
      expect(res.body.data.permissions[0]).toHaveProperty('resource');
      expect(res.body.data.permissions[0]).toHaveProperty('aksi');
    });
  });

  describe('CRUD Admin Permission (/api/admin/permissions & /api/admin/resources)', () => {
    test('GET /api/admin/resources - 200 list resources', async () => {
      const res = await request(app)
        .get('/api/admin/resources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/admin/permissions - 200 list permissions dengan filter', async () => {
      const res = await request(app)
        .get('/api/admin/permissions?role=AKUNTAN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((p) => p.role === 'AKUNTAN')).toBe(true);
    });

    test('POST /api/admin/permissions - 400 jika body tidak valid', async () => {
      const res = await request(app)
        .post('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'AKUNTAN' }); // missing resource and aksi

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    test('POST /api/admin/permissions - 201 create permission + invalidasi cache', async () => {
      // Pre-fill cache for testing invalidation
      permissionCache.set('MITRA', new Set(['dummy:READ']));

      const res = await request(app)
        .post('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'MITRA',
          resourceId: testResourceId,
          aksi: 'DELETE'
        });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('MITRA');
      expect(res.body.aksi).toBe('DELETE');
      createdPermissionId = res.body.id;

      // Verify cache invalidation occurred for MITRA
      expect(permissionCache.has('MITRA')).toBe(false);
    });

    test('POST /api/admin/permissions - 409 jika duplikat', async () => {
      const res = await request(app)
        .post('/api/admin/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'MITRA',
          resourceId: testResourceId,
          aksi: 'DELETE'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('sudah ada');
    });

    test('PUT /api/admin/permissions/:id - 200 update permission + invalidasi cache', async () => {
      permissionCache.set('MITRA', new Set(['aslap-master:DELETE']));

      const res = await request(app)
        .put(`/api/admin/permissions/${createdPermissionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          aksi: 'EXPORT'
        });

      expect(res.status).toBe(200);
      expect(res.body.aksi).toBe('EXPORT');

      // Verify cache invalidation occurred for MITRA
      expect(permissionCache.has('MITRA')).toBe(false);
    });

    test('PUT /api/admin/permissions/:id - 404 jika ID tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/admin/permissions/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ aksi: 'READ' });

      expect(res.status).toBe(404);
    });

    test('DELETE /api/admin/permissions/:id - 200 delete permission + invalidasi cache', async () => {
      permissionCache.set('MITRA', new Set(['aslap-master:EXPORT']));

      const res = await request(app)
        .delete(`/api/admin/permissions/${createdPermissionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cache invalidation occurred
      expect(permissionCache.has('MITRA')).toBe(false);

      createdPermissionId = null; // cleared
    });

    test('DELETE /api/admin/permissions/:id - 404 jika ID tidak ada', async () => {
      const res = await request(app)
        .delete('/api/admin/permissions/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
