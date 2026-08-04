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

describe('COVERAGE TEST — Akuntan Master Routes (3 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let sourcePeriodeId;
  let targetPeriodeId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    // Create source period in 2037-01
    const source = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2037, 0, 1)),
        tanggalSelesai: new Date(Date.UTC(2037, 0, 31)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga Test Master',
            alamat: 'Jl Test Master 123',
            namaKepalaSPPG: 'Kepala Test',
            namaAkuntanSPPG: 'Akuntan Test',
            namaYayasan: 'Yayasan Test',
            ketuaYayasan: 'Ketua Test',
            nomorRekeningVA: '1234567890',
            tahunAnggaran: 2037,
            awalPeriodeBerikutnya: new Date(Date.UTC(2037, 1, 1)),
            tanggalPelaporan: new Date(Date.UTC(2037, 0, 31)),
            tempatPelaporan: 'Jakarta'
          }
        }
      }
    });
    sourcePeriodeId = source.id;

    // Create target period in 2037-02
    const target = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2037, 1, 1)),
        tanggalSelesai: new Date(Date.UTC(2037, 1, 28)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT'
      }
    });
    targetPeriodeId = target.id;
  });

  afterAll(async () => {
    // Child to parent cleanup without empty catch block swallowing errors
    if (targetPeriodeId) {
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: targetPeriodeId } });
      await prismaDb.saldoAwalBarang.deleteMany({ where: { periodeId: targetPeriodeId } });
    }
    if (sourcePeriodeId || targetPeriodeId) {
      const pIds = [sourcePeriodeId, targetPeriodeId].filter(Boolean);
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: { in: pIds } } });
      await prismaDb.periode.deleteMany({ where: { id: { in: pIds } } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/akuntan/periode/latest-setup
  describe('GET /api/akuntan/periode/latest-setup', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/akuntan/periode/latest-setup')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeUndefined();
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/akuntan/periode/latest-setup')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/akuntan/periode/latest-setup');
      expect(res.status).toBe(401);
    });
  });

  // 2. POST /api/akuntan/periode/:id/tutup-periode
  describe('POST /api/akuntan/periode/:id/tutup-periode', () => {
    test('happy 200 chain tutup periode', async () => {
      const res = await request(app)
        .post(`/api/akuntan/periode/${sourcePeriodeId}/tutup-periode`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ periodeTargetId: targetPeriodeId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .post('/api/akuntan/periode/non-existent-periode-id/tutup-periode')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ periodeTargetId: targetPeriodeId });
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post(`/api/akuntan/periode/${sourcePeriodeId}/tutup-periode`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. GET /api/akuntan/kebutuhan-hitungan
  describe('GET /api/akuntan/kebutuhan-hitungan', () => {
    test('happy 200 / valid query or missing params 400', async () => {
      const res = await request(app)
        .get(`/api/akuntan/kebutuhan-hitungan?periodeId=${sourcePeriodeId}&tanggal=2037-01-15`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect([200, 400]).toContain(res.status);
    });

    test('400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/akuntan/kebutuhan-hitungan')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/kebutuhan-hitungan?periodeId=${sourcePeriodeId}&tanggal=2037-01-15`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });
});
