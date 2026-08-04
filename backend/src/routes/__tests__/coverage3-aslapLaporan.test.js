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

describe('COVERAGE3 TEST — Aslap Laporan Routes', () => {
  let tokenAslap;
  let tokenMitra;
  let userAslapId;

  let testPeriodeId;
  let testSekolahId;

  beforeAll(async () => {
    tokenAslap = await login('aslap');
    tokenMitra = await login('mitra');

    const userAslap = await prismaDb.user.findFirst({ where: { role: 'ASLAP' } });
    userAslapId = userAslap ? userAslap.id : null;

    // Periode 2037-05
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2037, 4, 1)),
        tanggalSelesai: new Date(Date.UTC(2037, 4, 31)),
        anggaranAlokasi: 50000000,
        status: 'AKTIF'
      }
    });
    testPeriodeId = p.id;

    // Create Sekolah
    const sek = await prismaDb.sekolah.create({
      data: {
        nama: 'SD Negeri Aslap Coverage3 Test',
        jenjang: 'SD',
        npsn: '77665544',
        alamat: 'Jl Laporan Aslap 123'
      }
    });
    testSekolahId = sek.id;

    // Create SekolahKelasDetail
    await prismaDb.sekolahKelasDetail.create({
      data: {
        periodeId: testPeriodeId,
        sekolahId: testSekolahId,
        namaKelas: '1A',
        jumlah: 30
      }
    });

    // Create GrupHari
    const gh = await prismaDb.grupHari.create({
      data: {
        periodeId: testPeriodeId,
        label: 'Grup Hari Cov3',
        hariAktif: ['SENIN', 'RABU']
      }
    });

    // Create InputPenerimaManfaat & detail
    const pm = await prismaDb.inputPenerimaManfaat.create({
      data: {
        periodeId: testPeriodeId,
        grupHariId: gh.id,
        createdById: userAslapId,
        createdAt: new Date(Date.UTC(2037, 4, 10, 8, 0, 0))
      }
    });

    const kat = await prismaDb.kategoriPenerima.findFirst({
      where: { jenisSasaran: 'PESERTA_DIDIK' }
    });

    if (kat) {
      await prismaDb.inputPenerimaManfaatDetail.create({
        data: {
          inputPenerimaManfaatId: pm.id,
          kategoriId: kat.id,
          sekolahId: testSekolahId,
          lakiLaki: 15,
          perempuan: 15
        }
      });
    }
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.inputPenerimaManfaatDetail.deleteMany({
        where: { inputPenerimaManfaat: { periodeId: testPeriodeId } }
      });
      await prismaDb.inputPenerimaManfaat.deleteMany({
        where: { periodeId: testPeriodeId }
      });
      await prismaDb.grupHari.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.sekolahKelasDetail.deleteMany({ where: { periodeId: testPeriodeId } });
    }
    if (testSekolahId) {
      await prismaDb.sekolah.deleteMany({ where: { id: testSekolahId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. Laporan Per-Kelas: GET /api/aslap/laporan/per-kelas & /pdf
  describe('Laporan Per-Kelas', () => {
    test('GET /api/aslap/laporan/per-kelas — happy 200 (ASLAP)', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/aslap/laporan/per-kelas — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/per-kelas — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/aslap/laporan/per-kelas/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('GET /api/aslap/laporan/per-kelas/pdf — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/per-kelas/pdf — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/per-kelas/pdf')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });
  });

  // 2. Laporan Harian: GET /api/aslap/laporan/harian & /pdf
  describe('Laporan Harian', () => {
    test('GET /api/aslap/laporan/harian — happy 200 (ASLAP)', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('grupHari');
    });

    test('GET /api/aslap/laporan/harian — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/harian — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/aslap/laporan/harian/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('GET /api/aslap/laporan/harian/pdf — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/harian/pdf — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/harian/pdf')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });
  });

  // 3. Laporan Periode: GET /api/aslap/laporan/periode & /pdf
  describe('Laporan Periode', () => {
    test('GET /api/aslap/laporan/periode — happy 200 (ASLAP)', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('pendidikan');
    });

    test('GET /api/aslap/laporan/periode — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/periode — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/aslap/laporan/periode/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('GET /api/aslap/laporan/periode/pdf — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/periode/pdf — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/periode/pdf')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });
  });

  // 4. Laporan Bulanan: GET /api/aslap/laporan/bulanan & /pdf
  describe('Laporan Bulanan', () => {
    test('GET /api/aslap/laporan/bulanan — happy 200 (ASLAP)', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan')
        .query({ bulan: 5, tahun: 2037, periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('bulan', 5);
      expect(res.body.data).toHaveProperty('tahun', 2037);
    });

    test('GET /api/aslap/laporan/bulanan — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan')
        .query({ bulan: 5, tahun: 2037, periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/bulanan — 400 tanpa bulan & tahun', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/aslap/laporan/bulanan/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan/pdf')
        .query({ bulan: 5, tahun: 2037, periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('GET /api/aslap/laporan/bulanan/pdf — 403 role MITRA', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan/pdf')
        .query({ bulan: 5, tahun: 2037, periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/aslap/laporan/bulanan/pdf — 400 tanpa bulan & tahun', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/bulanan/pdf')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });
  });

  // 5. Laporan Aggregate: GET /api/aslap/laporan/aggregate
  describe('Laporan Aggregate', () => {
    test('GET /api/aslap/laporan/aggregate — happy 200', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/aggregate')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sectionA');
      expect(res.body).toHaveProperty('sectionB');
      expect(res.body).toHaveProperty('total');
    });

    test('GET /api/aslap/laporan/aggregate — 401 tanpa token', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/aggregate')
        .query({ periodeId: testPeriodeId });
      expect(res.status).toBe(401);
    });

    test('GET /api/aslap/laporan/aggregate — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/aslap/laporan/aggregate')
        .set('Authorization', `Bearer ${tokenAslap}`);
      expect(res.status).toBe(400);
    });
  });
});
