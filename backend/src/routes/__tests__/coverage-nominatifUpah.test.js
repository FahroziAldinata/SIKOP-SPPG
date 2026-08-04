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

describe('COVERAGE TEST — Daftar Nominatif Upah Domain Routes (2 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;
  let testNominatifId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const start = new Date(Date.UTC(2041, 0, 1));
    const end = new Date(Date.UTC(2041, 0, 31));
    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: start,
        tanggalSelesai: end,
        anggaranAlokasi: 15000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = periode.id;

    const nom = await prismaDb.daftarNominatifUpah.create({
      data: {
        periodeId: testPeriodeId,
        jenisPekerjaan: 'Koki Utama',
        namaRelawan: 'Budi Test',
        danaKesehatan: 50000,
        tk: 20000,
        pj: 10000,
        tarifHarian: 100000,
        detailHarian: {
          create: [
            {
              tanggal: new Date(Date.UTC(2041, 0, 10)),
              nominal: 100000
            }
          ]
        }
      }
    });
    testNominatifId = nom.id;
  });

  afterAll(async () => {
    if (testNominatifId) {
      await prismaDb.daftarNominatifUpahHarian.deleteMany({ where: { daftarNominatifId: testNominatifId } });
      await prismaDb.daftarNominatifUpah.delete({ where: { id: testNominatifId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.delete({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/akuntan/daftar-nominatif-upah
  describe('GET /api/akuntan/daftar-nominatif-upah', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/daftar-nominatif-upah?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/daftar-nominatif-upah?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/akuntan/daftar-nominatif-upah');
      expect(res.status).toBe(401);
    });
  });

  // 2. GET /api/akuntan/daftar-nominatif-upah/:id
  describe('GET /api/akuntan/daftar-nominatif-upah/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/daftar-nominatif-upah/${testNominatifId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testNominatifId);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .get('/api/akuntan/daftar-nominatif-upah/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/daftar-nominatif-upah/${testNominatifId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });
});
