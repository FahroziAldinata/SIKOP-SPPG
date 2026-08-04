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

describe('COVERAGE2 TEST — Gizi Alergi Catatan Routes (5 endpoints)', () => {
  let tokenAhliGizi;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testMenuHarianId;
  let testBlokId;
  let testAlergiId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Periode 2038-04
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 3, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 3, 30)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = p.id;

    // Fetch KelompokUmurMenu
    const ku = await prismaDb.kelompokUmurMenu.findFirst();
    const userAhliGizi = await prismaDb.user.findFirst({ where: { username: 'ahligizi' } });

    // Create MenuHarian & Blok
    const menu = await prismaDb.menuHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2038, 3, 10)),
        status: 'DRAFT',
        blok: {
          create: {
            kelompokUmurMenuId: ku.id,
            createdById: userAhliGizi.id
          }
        }
      },
      include: { blok: true }
    });
    testMenuHarianId = menu.id;
    testBlokId = menu.blok[0].id;

    // Pre-create 1 AlergiCatatan (jumlahSiswa: 0 agar tidak melebihi penerima = 0)
    const alergi = await prismaDb.alergiCatatan.create({
      data: {
        blokId: testBlokId,
        jenisAlergi: 'Kacang Tanah',
        jumlahSiswa: 0,
        bahanPengganti: 'Kedelai'
      }
    });
    testAlergiId = alergi.id;
  });

  afterAll(async () => {
    if (testBlokId) {
      await prismaDb.alergiCatatan.deleteMany({ where: { blokId: testBlokId } });
      await prismaDb.menuHarianBlok.deleteMany({ where: { id: testBlokId } });
    }
    if (testMenuHarianId) {
      await prismaDb.menuHarian.deleteMany({ where: { id: testMenuHarianId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/gizi/alergi-catatan
  describe('GET /api/gizi/alergi-catatan', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/alergi-catatan')
        .query({ blokId: testBlokId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/alergi-catatan')
        .query({ blokId: testBlokId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('400 tanpa blokId', async () => {
      const res = await request(app)
        .get('/api/gizi/alergi-catatan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 2. GET /api/gizi/alergi-catatan/:id
  describe('GET /api/gizi/alergi-catatan/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/alergi-catatan/${testAlergiId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testAlergiId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/gizi/alergi-catatan/${testAlergiId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 catatan alergi tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/gizi/alergi-catatan/non-existent-alergi-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. POST /api/gizi/alergi-catatan
  describe('POST /api/gizi/alergi-catatan', () => {
    let createdId;

    afterEach(async () => {
      if (createdId) {
        await prismaDb.alergiCatatan.deleteMany({ where: { id: createdId } });
        createdId = null;
      }
    });

    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/alergi-catatan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          jenisAlergi: 'Udang / Seafood',
          jumlahSiswa: 0,
          bahanPengganti: 'Daging Ayam'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    test('403 role AKUNTAN tidak diizinkan create', async () => {
      const res = await request(app)
        .post('/api/gizi/alergi-catatan')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          blokId: testBlokId,
          jenisAlergi: 'Telur',
          jumlahSiswa: 0
        });
      expect(res.status).toBe(403);
    });

    test('404 blokId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/alergi-catatan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: 'non-existent-blok-id',
          jenisAlergi: 'Telur',
          jumlahSiswa: 0
        });
      expect(res.status).toBe(404);
    });
  });

  // 4. PUT /api/gizi/alergi-catatan/:id
  describe('PUT /api/gizi/alergi-catatan/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/alergi-catatan/${testAlergiId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          jenisAlergi: 'Kacang Tanah Updated',
          jumlahSiswa: 0
        });
      expect(res.status).toBe(200);
      expect(res.body.jenisAlergi).toBe('Kacang Tanah Updated');
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/gizi/alergi-catatan/${testAlergiId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ jenisAlergi: 'Update' });
      expect(res.status).toBe(403);
    });

    test('404 catatan alergi tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/gizi/alergi-catatan/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ jenisAlergi: 'Update' });
      expect(res.status).toBe(404);
    });
  });

  // 5. DELETE /api/gizi/alergi-catatan/:id
  describe('DELETE /api/gizi/alergi-catatan/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const created = await prismaDb.alergiCatatan.create({
        data: {
          blokId: testBlokId,
          jenisAlergi: 'Susu Sapi',
          jumlahSiswa: 0,
          bahanPengganti: 'Susu Kedelai'
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/alergi-catatan/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/gizi/alergi-catatan/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);

      await prismaDb.alergiCatatan.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 catatan alergi tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/gizi/alergi-catatan/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });
});
