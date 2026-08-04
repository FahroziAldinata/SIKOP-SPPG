/**
 * Note: POST /api/aslap/sekolah-kelas-detail (I3) sudah di-cover oleh audit-log-stepb/c,
 * sehingga sengaja dilewati di sini agar tidak terjadi duplikasi test.
 */
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

describe('COVERAGE2 TEST — Aslap Sekolah Kelas Routes (4 endpoints)', () => {
  let tokenAslap;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testSekolahId;
  let testKelasDetailId;

  beforeAll(async () => {
    tokenAslap = await login('aslap');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Periode 2038-05
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 4, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 4, 31)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = p.id;

    // Sekolah
    const sek = await prismaDb.sekolah.create({
      data: {
        nama: 'SD Negeri Test KelasDetail',
        jenjang: 'SD',
        npsn: '11223344'
      }
    });
    testSekolahId = sek.id;

    // Pre-create 1 SekolahKelasDetail
    const kd = await prismaDb.sekolahKelasDetail.create({
      data: {
        periodeId: testPeriodeId,
        sekolahId: testSekolahId,
        namaKelas: 'Kelas 1A',
        jumlah: 30
      }
    });
    testKelasDetailId = kd.id;
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.sekolahKelasDetail.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    if (testSekolahId) {
      await prismaDb.sekolah.deleteMany({ where: { id: testSekolahId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/aslap/sekolah-kelas-detail (I1)
  describe('GET /api/aslap/sekolah-kelas-detail', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah-kelas-detail')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah-kelas-detail')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/aslap/sekolah-kelas-detail');
      expect(res.status).toBe(401);
    });
  });

  // 2. GET /api/aslap/sekolah-kelas-detail/:id (I2)
  describe('GET /api/aslap/sekolah-kelas-detail/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/aslap/sekolah-kelas-detail/${testKelasDetailId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testKelasDetailId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/aslap/sekolah-kelas-detail/${testKelasDetailId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 detail kelas tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/aslap/sekolah-kelas-detail/non-existent-kelas-id')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. PUT /api/aslap/sekolah-kelas-detail/:id (I4)
  describe('PUT /api/aslap/sekolah-kelas-detail/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/aslap/sekolah-kelas-detail/${testKelasDetailId}`)
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          namaKelas: 'Kelas 1A Updated',
          jumlah: 32
        });
      expect(res.status).toBe(200);
      expect(res.body.namaKelas).toBe('Kelas 1A Updated');
      expect(res.body.jumlah).toBe(32);
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/aslap/sekolah-kelas-detail/${testKelasDetailId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ namaKelas: 'Kelas 1A' });
      expect(res.status).toBe(403);
    });

    test('404 detail kelas tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/aslap/sekolah-kelas-detail/non-existent-id')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ namaKelas: 'Kelas 1A' });
      expect(res.status).toBe(404);
    });
  });

  // 4. DELETE /api/aslap/sekolah-kelas-detail/:id (I5)
  describe('DELETE /api/aslap/sekolah-kelas-detail/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const created = await prismaDb.sekolahKelasDetail.create({
        data: {
          periodeId: testPeriodeId,
          sekolahId: testSekolahId,
          namaKelas: 'Kelas To Delete',
          jumlah: 10
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/aslap/sekolah-kelas-detail/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/aslap/sekolah-kelas-detail/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);

      await prismaDb.sekolahKelasDetail.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 detail kelas tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/aslap/sekolah-kelas-detail/non-existent-id')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(404);
    });
  });
});
