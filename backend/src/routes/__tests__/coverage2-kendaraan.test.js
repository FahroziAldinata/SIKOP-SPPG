const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

async function login(username) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('COVERAGE2 TEST — Gizi Kendaraan Routes (5 endpoints)', () => {
  let tokenAhliGizi;
  let tokenMitra;

  let testKendaraanId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenMitra = await login('mitra');

    // Create a test vehicle for GET :id
    const vehicle = await prismaDb.kendaraan.create({
      data: {
        namaKendaraan: 'Mobil Test',
        platNomor: 'B 8888 KDR',
        aktif: true
      }
    });
    testKendaraanId = vehicle.id;
  });

  afterAll(async () => {
    if (testKendaraanId) {
      await prismaDb.kendaraan.deleteMany({ where: { id: testKendaraanId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/gizi/kendaraan (Aktif)
  describe('GET /api/gizi/kendaraan', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/kendaraan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/kendaraan')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/gizi/kendaraan');
      expect(res.status).toBe(401);
    });
  });

  // 2. GET /api/gizi/kendaraan/:id (Aktif)
  describe('GET /api/gizi/kendaraan/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testKendaraanId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 kendaraan tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/gizi/kendaraan/non-existent-kendaraan-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. POST /api/gizi/kendaraan (Stub 410 — Moved to Mitra)
  describe('POST /api/gizi/kendaraan (Stub 410)', () => {
    test('assert 410 dipindahkan ke /api/mitra/kendaraan', async () => {
      const res = await request(app)
        .post('/api/gizi/kendaraan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ platNomor: 'B 1234 ABC', jenis: 'MOBIL' });
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error');
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/gizi/kendaraan')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).post('/api/gizi/kendaraan');
      expect(res.status).toBe(401);
    });
  });

  // 4. PUT /api/gizi/kendaraan/:id (Stub 410 — Moved to Mitra)
  describe('PUT /api/gizi/kendaraan/:id (Stub 410)', () => {
    test('assert 410 dipindahkan ke /api/mitra/kendaraan', async () => {
      const res = await request(app)
        .put(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ platNomor: 'B 1234 XYZ' });
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error');
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .put(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).put(`/api/gizi/kendaraan/${testKendaraanId}`);
      expect(res.status).toBe(401);
    });
  });

  // 5. DELETE /api/gizi/kendaraan/:id (Stub 410 — Moved to Mitra)
  describe('DELETE /api/gizi/kendaraan/:id (Stub 410)', () => {
    test('assert 410 dipindahkan ke /api/mitra/kendaraan', async () => {
      const res = await request(app)
        .delete(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error');
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .delete(`/api/gizi/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).delete(`/api/gizi/kendaraan/${testKendaraanId}`);
      expect(res.status).toBe(401);
    });
  });
});
