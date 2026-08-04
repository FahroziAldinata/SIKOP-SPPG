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

describe('COVERAGE TEST — RabHarian Domain Routes (4 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;
  let testRabHarianId;
  let testBahanPokokId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const akuntanUser = await prismaDb.user.findFirst({ where: { role: 'AKUNTAN' } });
    const bahan = await prismaDb.bahanPokok.findFirst({ where: { aktif: true } });
    expect(bahan).toBeTruthy();
    testBahanPokokId = bahan.id;

    // Create test period in 2038
    const start = new Date(Date.UTC(2038, 0, 1));
    const end = new Date(Date.UTC(2038, 0, 31));
    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: start,
        tanggalSelesai: end,
        anggaranAlokasi: 20000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = periode.id;

    // Create test rabHarian + item
    const targetTanggal = new Date(Date.UTC(2038, 0, 15));
    const rab = await prismaDb.rabHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: targetTanggal,
        status: 'DRAFT',
        totalKebutuhan: 120000,
        totalPagu: 150000,
        selisih: 30000,
        createdById: akuntanUser.id,
        items: {
          create: [
            {
              bahanPokokId: testBahanPokokId,
              qtySiswa: 10,
              qtyB3: 2,
              qtyTotal: 12,
              satuan: 'kg',
              hargaSatuan: 10000,
              hargaOverride: false,
              subtotal: 120000
            }
          ]
        }
      }
    });
    testRabHarianId = rab.id;
  });

  afterAll(async () => {
    if (testRabHarianId) {
      await prismaDb.rabHarianItem.deleteMany({ where: { rabHarianId: testRabHarianId } });
      await prismaDb.rabHarian.delete({ where: { id: testRabHarianId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.delete({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/akuntan/rab-harian/preview
  describe('GET /api/akuntan/rab-harian/preview', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/rab-harian/preview?periodeId=${testPeriodeId}&tanggal=2038-01-15`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/akuntan/rab-harian/preview')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/rab-harian/preview?periodeId=${testPeriodeId}&tanggal=2038-01-15`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 2. GET /api/akuntan/rab-harian
  describe('GET /api/akuntan/rab-harian', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/rab-harian?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/akuntan/rab-harian')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. GET /api/akuntan/rab-harian/:id
  describe('GET /api/akuntan/rab-harian/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/rab-harian/${testRabHarianId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testRabHarianId);
    });

    test('404 id random', async () => {
      const res = await request(app)
        .get('/api/akuntan/rab-harian/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/rab-harian/${testRabHarianId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 4. PUT /api/akuntan/rab-harian/:id/items
  describe('PUT /api/akuntan/rab-harian/:id/items', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/akuntan/rab-harian/${testRabHarianId}/items`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          items: [
            { bahanPokokId: testBahanPokokId, hargaSatuan: 12000 }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testRabHarianId);
    });

    test('404 id random', async () => {
      const res = await request(app)
        .put('/api/akuntan/rab-harian/non-existent-id/items')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          items: [
            { bahanPokokId: testBahanPokokId, hargaSatuan: 12000 }
          ]
        });
      expect(res.status).toBe(404);
    });

    test('400 payload invalid (items kosong)', async () => {
      const res = await request(app)
        .put(`/api/akuntan/rab-harian/${testRabHarianId}/items`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ items: [] });
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .put(`/api/akuntan/rab-harian/${testRabHarianId}/items`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          items: [
            { bahanPokokId: testBahanPokokId, hargaSatuan: 12000 }
          ]
        });
      expect(res.status).toBe(403);
    });
  });
});
