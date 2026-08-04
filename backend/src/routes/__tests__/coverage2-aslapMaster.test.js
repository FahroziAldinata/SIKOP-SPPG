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

describe('COVERAGE2 TEST — Aslap Master Routes (4 endpoints)', () => {
  let tokenAslap;
  let tokenAkuntan;
  let tokenMitra;

  let createdSekolahId;

  beforeAll(async () => {
    tokenAslap = await login('aslap');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');
  });

  afterAll(async () => {
    if (createdSekolahId) {
      await prismaDb.sekolah.deleteMany({ where: { id: createdSekolahId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/aslap/sekolah
  describe('GET /api/aslap/sekolah', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/aslap/sekolah');
      expect(res.status).toBe(401);
    });
  });

  // 2. POST /api/aslap/sekolah
  describe('POST /api/aslap/sekolah', () => {
    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          nama: 'SD Negeri 99 Cov2 Test',
          jenjang: 'SD',
          npsn: '99887766',
          alamat: 'Jl Test Sekolah 99'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      createdSekolahId = res.body.data.id;
    });

    test('403 role AKUNTAN tidak diizinkan create sekolah', async () => {
      const res = await request(app)
        .post('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          nama: 'SD Test 403',
          jenjang: 'SD'
        });
      expect(res.status).toBe(403);
    });

    test('400 NPSN invalid (harus 8 digit)', async () => {
      const res = await request(app)
        .post('/api/aslap/sekolah')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          nama: 'SD Test 400',
          jenjang: 'SD',
          npsn: '123'
        });
      expect(res.status).toBe(400);
    });
  });

  // 3. PUT /api/aslap/sekolah/:id
  describe('PUT /api/aslap/sekolah/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/aslap/sekolah/${createdSekolahId}`)
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          nama: 'SD Negeri 99 Cov2 Test Updated'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama).toBe('SD Negeri 99 Cov2 Test Updated');
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/aslap/sekolah/${createdSekolahId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ nama: 'SD Test' });
      expect(res.status).toBe(403);
    });

    test('404 sekolah tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/aslap/sekolah/non-existent-sekolah-id')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ nama: 'SD Non Existent' });
      expect(res.status).toBe(404);
    });
  });

  // 4. GET /api/aslap/posyandu
  describe('GET /api/aslap/posyandu', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/posyandu')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/aslap/posyandu')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/aslap/posyandu');
      expect(res.status).toBe(401);
    });
  });
});
