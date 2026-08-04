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

describe('COVERAGE TEST — Mitra Domain Routes (9 endpoints)', () => {
  let tokenMitra;
  let tokenAdmin;
  let tokenAslap;
  let tokenAhliGizi;

  let testKendaraanId;
  let testPeriodeId;
  let testHargaBahanId;
  let testBahanPokokId;

  beforeAll(async () => {
    tokenMitra = await login('mitra');
    tokenAdmin = await login('admin');
    tokenAslap = await login('aslap');
    tokenAhliGizi = await login('ahligizi');

    const kendaraan = await prismaDb.kendaraan.create({
      data: {
        namaKendaraan: 'Mobil Test Mitra ' + Date.now(),
        platNomor: 'B ' + Math.floor(1000 + Math.random() * 9000) + ' TST',
        aktif: true
      }
    });
    testKendaraanId = kendaraan.id;

    const start = new Date(Date.UTC(2036, 0, 1));
    const end = new Date(Date.UTC(2036, 0, 31));
    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: start,
        tanggalSelesai: end,
        anggaranAlokasi: 10000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = periode.id;

    const bahan = await prismaDb.bahanPokok.findFirst({ where: { aktif: true } });
    expect(bahan).toBeTruthy();
    testBahanPokokId = bahan.id;

    const mitraUser = await prismaDb.user.findFirst({ where: { role: 'MITRA' } });
    const hargaBahan = await prismaDb.hargaBahanPeriode.create({
      data: {
        periodeId: testPeriodeId,
        bahanPokokId: testBahanPokokId,
        harga: 15000,
        createdById: mitraUser.id
      }
    });
    testHargaBahanId = hargaBahan.id;
  });

  afterAll(async () => {
    if (testHargaBahanId) {
      await prismaDb.hargaBahanPeriode.delete({ where: { id: testHargaBahanId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.delete({ where: { id: testPeriodeId } });
    }
    if (testKendaraanId) {
      await prismaDb.kendaraan.delete({ where: { id: testKendaraanId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/mitra/kendaraan/:id
  describe('GET /api/mitra/kendaraan/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/mitra/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testKendaraanId);
    });

    test('404 id random', async () => {
      const res = await request(app)
        .get('/api/mitra/kendaraan/non-existent-id')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/kendaraan/${testKendaraanId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(403);
    });
  });

  // 2. GET /api/mitra/harga-bahan
  describe('GET /api/mitra/harga-bahan', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/mitra/harga-bahan?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/mitra/harga-bahan')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/harga-bahan?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. GET /api/mitra/harga-bahan/:id
  describe('GET /api/mitra/harga-bahan/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/mitra/harga-bahan/${testHargaBahanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testHargaBahanId);
    });

    test('404 id random', async () => {
      const res = await request(app)
        .get('/api/mitra/harga-bahan/non-existent-id')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/harga-bahan/${testHargaBahanId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(403);
    });
  });

  // 4. GET /api/mitra/po/kebutuhan
  describe('GET /api/mitra/po/kebutuhan', () => {
    test('happy 200 / 400 tanpa RAB', async () => {
      const res = await request(app)
        .get(`/api/mitra/po/kebutuhan?tanggal=2036-01-10&periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect([200, 400]).toContain(res.status);
    });

    test('400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/mitra/po/kebutuhan')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/po/kebutuhan?tanggal=2036-01-10&periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(403);
    });
  });

  // 5. POST /api/mitra/po (STUB)
  describe('POST /api/mitra/po', () => {
    test('STUB 410 Gone', async () => {
      const res = await request(app)
        .post('/api/mitra/po')
        .set('Authorization', `Bearer ${tokenMitra}`)
        .send({ dummy: 'data' });
      expect(res.status).toBe(410);
      expect(res.body.error).toContain('PO sekarang dibuat oleh Akuntan');
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/mitra/po')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ dummy: 'data' });
      expect(res.status).toBe(403);
    });
  });

  // 6. GET /api/mitra/po/list
  describe('GET /api/mitra/po/list', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/mitra/po/list?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/mitra/po/list')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/po/list?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 7. GET /api/mitra/po/:id/pdf
  describe('GET /api/mitra/po/:id/pdf', () => {
    test('404 id tak ada', async () => {
      const res = await request(app)
        .get('/api/mitra/po/non-existent-id/pdf')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/mitra/po/some-id/pdf')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 8. GET /api/mitra/laporan/realisasi-po
  describe('GET /api/mitra/laporan/realisasi-po', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/mitra/laporan/realisasi-po?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/mitra/laporan/realisasi-po')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/laporan/realisasi-po?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(403);
    });
  });

  // 9. GET /api/mitra/laporan/realisasi-po/pdf
  describe('GET /api/mitra/laporan/realisasi-po/pdf', () => {
    test('happy 200 PDF', async () => {
      const res = await request(app)
        .get(`/api/mitra/laporan/realisasi-po/pdf?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('400 tanpa query periodeId', async () => {
      const res = await request(app)
        .get('/api/mitra/laporan/realisasi-po/pdf')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/mitra/laporan/realisasi-po/pdf?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(403);
    });
  });
});
