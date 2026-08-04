/**
 * Note: POST /api/aslap/penerima-manfaat (J3) sudah di-cover oleh audit-log-stepb/stepc,
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

describe('COVERAGE2 TEST — Aslap Penerima Manfaat Routes (4 endpoints)', () => {
  let tokenAslap;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testGrupHariId;
  let testKategoriId;
  let testPenerimaId;

  beforeAll(async () => {
    tokenAslap = await login('aslap');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Periode 2038-06
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 5, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 5, 30)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = p.id;

    // GrupHari
    const gh = await prismaDb.grupHari.create({
      data: {
        periodeId: testPeriodeId,
        label: 'SENIN-SELASA',
        hariAktif: ['SENIN', 'SELASA']
      }
    });
    testGrupHariId = gh.id;

    // Fetch non-peserta didik category (e.g. BUMIL or BALITA) or any category
    const kat = await prismaDb.kategoriPenerima.findFirst({ where: { kode: 'BUMIL' } })
      || await prismaDb.kategoriPenerima.findFirst();
    testKategoriId = kat.id;

    const userAslap = await prismaDb.user.findFirst({ where: { username: 'aslap' } });

    // Create InputPenerimaManfaat & detail
    const pm = await prismaDb.inputPenerimaManfaat.create({
      data: {
        periodeId: testPeriodeId,
        grupHariId: testGrupHariId,
        createdById: userAslap.id,
        detail: {
          create: [{
            kategoriId: testKategoriId,
            lakiLaki: 0,
            perempuan: 10
          }]
        }
      }
    });
    testPenerimaId = pm.id;
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.inputPenerimaManfaatDetail.deleteMany({
        where: { inputPenerimaManfaat: { periodeId: testPeriodeId } }
      });
      await prismaDb.inputPenerimaManfaat.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.grupHari.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/aslap/penerima-manfaat (J1)
  describe('GET /api/aslap/penerima-manfaat', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/penerima-manfaat')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/aslap/penerima-manfaat')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/aslap/penerima-manfaat');
      expect(res.status).toBe(401);
    });
  });

  // 2. GET /api/aslap/penerima-manfaat/:id (J2)
  describe('GET /api/aslap/penerima-manfaat/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/aslap/penerima-manfaat/${testPenerimaId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testPenerimaId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/aslap/penerima-manfaat/${testPenerimaId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 penerima manfaat tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/aslap/penerima-manfaat/non-existent-penerima-id')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. PUT /api/aslap/penerima-manfaat/:id (J4)
  describe('PUT /api/aslap/penerima-manfaat/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/aslap/penerima-manfaat/${testPenerimaId}`)
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          grupHariId: testGrupHariId,
          detail: [{
            kategoriId: testKategoriId,
            lakiLaki: 0,
            perempuan: 15
          }]
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testPenerimaId);
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/aslap/penerima-manfaat/${testPenerimaId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ grupHariId: testGrupHariId });
      expect(res.status).toBe(403);
    });

    test('404 penerima manfaat tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/aslap/penerima-manfaat/non-existent-id')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ grupHariId: testGrupHariId });
      expect(res.status).toBe(404);
    });
  });

  // 4. DELETE /api/aslap/penerima-manfaat/:id (J5)
  describe('DELETE /api/aslap/penerima-manfaat/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const userAslap = await prismaDb.user.findFirst({ where: { username: 'aslap' } });
      const created = await prismaDb.inputPenerimaManfaat.create({
        data: {
          periodeId: testPeriodeId,
          grupHariId: testGrupHariId,
          createdById: userAslap.id,
          detail: {
            create: [{
              kategoriId: testKategoriId,
              lakiLaki: 0,
              perempuan: 5
            }]
          }
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/aslap/penerima-manfaat/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/aslap/penerima-manfaat/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);

      await prismaDb.inputPenerimaManfaatDetail.deleteMany({
        where: { inputPenerimaManfaatId: toDeleteId }
      });
      await prismaDb.inputPenerimaManfaat.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 penerima manfaat tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/aslap/penerima-manfaat/non-existent-id')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(404);
    });
  });
});
