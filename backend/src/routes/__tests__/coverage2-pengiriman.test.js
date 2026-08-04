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

describe('COVERAGE2 TEST — Gizi Pengiriman Routes (5 endpoints)', () => {
  let tokenAhliGizi;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testMenuHarianId;
  let testKendaraanId;
  let testKategoriId;
  let testPengirimanId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Periode 2038-02
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 1, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 1, 28)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = p.id;

    // Menu Harian
    const menu = await prismaDb.menuHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2038, 1, 10)),
        status: 'DRAFT'
      }
    });
    testMenuHarianId = menu.id;

    // Kendaraan aktif
    const vehicle = await prismaDb.kendaraan.create({
      data: {
        namaKendaraan: 'Motor Test',
        platNomor: 'B 9999 COV',
        aktif: true
      }
    });
    testKendaraanId = vehicle.id;

    // Kategori
    const kat = await prismaDb.kategoriPenerima.findFirst();
    testKategoriId = kat ? kat.id : null;

    // Pre-create 1 PengirimanHarian
    if (testKategoriId) {
      const pengiriman = await prismaDb.pengirimanHarian.create({
        data: {
          menuHarianId: testMenuHarianId,
          kendaraanId: testKendaraanId,
          catatan: 'Setup pengiriman test',
          kategoriPenerima: {
            connect: [{ id: testKategoriId }]
          }
        }
      });
      testPengirimanId = pengiriman.id;
    }
  });

  afterAll(async () => {
    if (testMenuHarianId) {
      await prismaDb.pengirimanHarian.deleteMany({ where: { menuHarianId: testMenuHarianId } });
    }
    if (testPengirimanId) {
      await prismaDb.pengirimanHarian.deleteMany({ where: { id: testPengirimanId } });
    }
    if (testMenuHarianId) {
      await prismaDb.menuHarian.deleteMany({ where: { id: testMenuHarianId } });
    }
    if (testKendaraanId) {
      await prismaDb.kendaraan.deleteMany({ where: { id: testKendaraanId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/gizi/pengiriman
  describe('GET /api/gizi/pengiriman', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/pengiriman')
        .query({ menuHarianId: testMenuHarianId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/pengiriman')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/gizi/pengiriman');
      expect(res.status).toBe(401);
    });
  });

  // 2. GET /api/gizi/pengiriman/:id
  describe('GET /api/gizi/pengiriman/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/pengiriman/${testPengirimanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testPengirimanId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/gizi/pengiriman/${testPengirimanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('404 pengiriman tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/gizi/pengiriman/non-existent-pengiriman-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. POST /api/gizi/pengiriman
  describe('POST /api/gizi/pengiriman', () => {
    let createdId;

    afterEach(async () => {
      if (createdId) {
        await prismaDb.pengirimanHarian.deleteMany({ where: { id: createdId } });
        createdId = null;
      }
    });

    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/pengiriman')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuHarianId: testMenuHarianId,
          kendaraanId: testKendaraanId,
          kategoriIds: [testKategoriId],
          catatan: 'Pengiriman baru'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    test('403 role AKUNTAN tidak diizinkan create pengiriman', async () => {
      const res = await request(app)
        .post('/api/gizi/pengiriman')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          menuHarianId: testMenuHarianId,
          kendaraanId: testKendaraanId,
          kategoriIds: [testKategoriId]
        });
      expect(res.status).toBe(403);
    });

    test('404 menu harian / kendaraan tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/pengiriman')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuHarianId: 'non-existent-menu-id',
          kendaraanId: testKendaraanId,
          kategoriIds: [testKategoriId]
        });
      expect(res.status).toBe(404);
    });
  });

  // 4. PUT /api/gizi/pengiriman/:id
  describe('PUT /api/gizi/pengiriman/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/pengiriman/${testPengirimanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          catatan: 'Pengiriman updated'
        });
      expect(res.status).toBe(200);
      expect(res.body.catatan).toBe('Pengiriman updated');
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/gizi/pengiriman/${testPengirimanId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ catatan: 'Update' });
      expect(res.status).toBe(403);
    });

    test('404 pengiriman tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/gizi/pengiriman/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ catatan: 'Update' });
      expect(res.status).toBe(404);
    });
  });

  // 5. DELETE /api/gizi/pengiriman/:id
  describe('DELETE /api/gizi/pengiriman/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const created = await prismaDb.pengirimanHarian.create({
        data: {
          menuHarianId: testMenuHarianId,
          kendaraanId: testKendaraanId,
          catatan: 'To delete',
          kategoriPenerima: { connect: [{ id: testKategoriId }] }
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/pengiriman/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/gizi/pengiriman/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);

      // Cleanup manual
      await prismaDb.pengirimanHarian.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 pengiriman tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/gizi/pengiriman/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });
});
