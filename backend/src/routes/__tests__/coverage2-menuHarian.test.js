/**
 * Note: PUT /api/gizi/menu-harian/:id (F4) sudah di-cover oleh audit-log-stepb.test.js,
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

describe('COVERAGE2 TEST — Gizi Menu Harian Routes (4 endpoints)', () => {
  let tokenAhliGizi;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testMenuHarianId;
  let testKelompokUmurId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Periode 2038-03
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 2, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 2, 31)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = p.id;

    // Fetch kelompokUmurMenu
    const ku = await prismaDb.kelompokUmurMenu.findFirst();
    testKelompokUmurId = ku ? ku.id : null;

    // Create a MenuHarian
    const menu = await prismaDb.menuHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2038, 2, 15)),
        status: 'DRAFT'
      }
    });
    testMenuHarianId = menu.id;
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.menuHarianBlok.deleteMany({
        where: { menuHarian: { periodeId: testPeriodeId } }
      });
      await prismaDb.menuHarian.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/gizi/menu-harian
  describe('GET /api/gizi/menu-harian', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-harian')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-harian')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-harian')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 2. GET /api/gizi/menu-harian/:id
  describe('GET /api/gizi/menu-harian/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-harian/${testMenuHarianId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testMenuHarianId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-harian/${testMenuHarianId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 menu harian tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-harian/non-existent-menu-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. POST /api/gizi/menu-harian
  describe('POST /api/gizi/menu-harian', () => {
    let createdMenuId;

    afterEach(async () => {
      if (createdMenuId) {
        await prismaDb.menuHarianBlok.deleteMany({ where: { menuHarianId: createdMenuId } });
        await prismaDb.menuHarian.deleteMany({ where: { id: createdMenuId } });
        createdMenuId = null;
      }
    });

    test('happy 201', async () => {
      const payload = {
        periodeId: testPeriodeId,
        tanggal: '2038-03-20'
      };
      if (testKelompokUmurId) {
        payload.blok = [{ kelompokUmurMenuId: testKelompokUmurId }];
      }

      const res = await request(app)
        .post('/api/gizi/menu-harian')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdMenuId = res.body.id;
    });

    test('403 role AKUNTAN tidak diizinkan create', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2038-03-21'
        });
      expect(res.status).toBe(403);
    });

    test('400 tanggal di luar rentang periode', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2039-01-01'
        });
      expect(res.status).toBe(400);
    });
  });

  // 4. DELETE /api/gizi/menu-harian/:id
  describe('DELETE /api/gizi/menu-harian/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const created = await prismaDb.menuHarian.create({
        data: {
          periodeId: testPeriodeId,
          tanggal: new Date(Date.UTC(2038, 2, 25)),
          status: 'DRAFT'
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-harian/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-harian/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);

      await prismaDb.menuHarian.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 menu harian tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-harian/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });
});
