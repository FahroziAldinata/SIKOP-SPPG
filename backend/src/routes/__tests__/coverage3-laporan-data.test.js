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

describe('COVERAGE3 TEST — Laporan JSON Data Endpoints', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;
  let akunKas;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    // Setup Periode rentang unik 2037
    const pStart = new Date(Date.UTC(2037, 5, 1));
    const pEnd = new Date(Date.UTC(2037, 5, 30));

    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: pStart,
        tanggalSelesai: pEnd,
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga Test Laporan Coverage3',
            alamat: 'Jl. Coverage Three No. 3',
            namaKepalaSPPG: 'Kepala Test Cov3',
            namaAkuntanSPPG: 'Akuntan Test Cov3',
            namaYayasan: 'Yayasan Cov3',
            ketuaYayasan: 'Ketua Yayasan Cov3',
            nomorRekeningVA: '998877665544',
            tahunAnggaran: 2037,
            awalPeriodeBerikutnya: new Date(Date.UTC(2037, 6, 1)),
            tanggalPelaporan: new Date(Date.UTC(2037, 5, 30)),
            tempatPelaporan: 'Sumedang',
          },
        },
      },
    });
    testPeriodeId = periode.id;

    // Accounts for BP
    akunKas = await prismaDb.akun.findFirst({ where: { tipe: 'KAS', aktif: true } });
    if (!akunKas) {
      akunKas = await prismaDb.akun.create({
        data: { kode: '1001-COV3', nama: 'Kas Test Cov3', tipe: 'KAS', kategoriDana: 'BAHAN_MAKANAN', aktif: true },
      });
    }

    let akunBahan = await prismaDb.akun.findFirst({ where: { kategoriDana: 'BAHAN_MAKANAN', aktif: true } });
    if (!akunBahan) {
      akunBahan = await prismaDb.akun.create({
        data: { kode: '5001-COV3', nama: 'Bahan Test Cov3', tipe: 'BIAYA', kategoriDana: 'BAHAN_MAKANAN', aktif: true },
      });
    }

    let akunOps = await prismaDb.akun.findFirst({ where: { kategoriDana: 'OPERASIONAL', aktif: true } });
    if (!akunOps) {
      akunOps = await prismaDb.akun.create({
        data: { kode: '5002-COV3', nama: 'Ops Test Cov3', tipe: 'BIAYA', kategoriDana: 'OPERASIONAL', aktif: true },
      });
    }

    let akunFas = await prismaDb.akun.findFirst({ where: { kategoriDana: 'INSENTIF_FASILITAS', aktif: true } });
    if (!akunFas) {
      akunFas = await prismaDb.akun.create({
        data: { kode: '5003-COV3', nama: 'Fas Test Cov3', tipe: 'BIAYA', kategoriDana: 'INSENTIF_FASILITAS', aktif: true },
      });
    }

    // Get Akuntan user for createdById
    const userAkuntan = await prismaDb.user.findFirst({ where: { role: 'AKUNTAN' } });

    // Saldo Awal Periode
    await prismaDb.saldoAwalPeriode.createMany({
      data: [
        { periodeId: testPeriodeId, akunId: akunKas.id, saldoAwal: 10000000 },
        { periodeId: testPeriodeId, akunId: akunBahan.id, saldoAwal: 0 },
      ],
    });

    // Jurnal Transaksi
    await prismaDb.jurnalTransaksi.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2037, 5, 15)),
        nomorBukti: 99999,
        uraian: 'Uraian Jurnal Test Coverage3',
        jenis: 'MASUK',
        nominal: 5000000,
        akunKasId: akunKas.id,
        akunDanaBiayaId: akunBahan.id,
        createdById: userAkuntan.id,
      },
    });

    // Anggaran Harian
    await prismaDb.anggaranHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2037, 5, 15)),
        kategoriDana: 'BAHAN_MAKANAN',
        jumlahPaket: 100,
        rab: 1000000,
        aktual: 900000,
        selisih: 100000,
      },
    });
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.anggaranHarian.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/laporan/neraca-saldo
  describe('GET /api/laporan/neraca-saldo', () => {
    test('happy 200 (get Neraca Saldo data)', async () => {
      const res = await request(app)
        .get('/api/laporan/neraca-saldo')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('akun');
      expect(res.body.data).toHaveProperty('verifikasi');
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/neraca-saldo')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/neraca-saldo')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });
  });

  // 2. GET /api/laporan/ringkasan-anggaran
  describe('GET /api/laporan/ringkasan-anggaran', () => {
    test('happy 200 (get Ringkasan Anggaran data)', async () => {
      const res = await request(app)
        .get('/api/laporan/ringkasan-anggaran')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/ringkasan-anggaran')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/ringkasan-anggaran')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/ringkasan-anggaran')
        .query({ periodeId: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // 3. GET /api/laporan/harian
  describe('GET /api/laporan/harian', () => {
    test('happy 200 (get Laporan Harian data)', async () => {
      const res = await request(app)
        .get('/api/laporan/harian')
        .query({ periodeId: testPeriodeId, tanggal: '2037-06-15' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/harian')
        .query({ periodeId: testPeriodeId, tanggal: '2037-06-15' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query tanggal', async () => {
      const res = await request(app)
        .get('/api/laporan/harian')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });
  });

  // 4. GET /api/laporan/lra
  describe('GET /api/laporan/lra', () => {
    test('happy 200 (get LRA data)', async () => {
      const res = await request(app)
        .get('/api/laporan/lra')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/lra')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeIds', async () => {
      const res = await request(app)
        .get('/api/laporan/lra')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('non-existent periodeIds returns 200 with empty periods', async () => {
      const res = await request(app)
        .get('/api/laporan/lra')
        .query({ periodeIds: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 5. GET /api/laporan/lpd2m
  describe('GET /api/laporan/lpd2m', () => {
    test('happy 200 (get LPD2M data)', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeIds', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('non-existent periodeIds returns 200 with empty periods', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m')
        .query({ periodeIds: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 6. GET /api/laporan/btt
  describe('GET /api/laporan/btt', () => {
    test('happy 200 (kategori operasional)', async () => {
      const res = await request(app)
        .get('/api/laporan/btt')
        .query({ periodeId: testPeriodeId, kategori: 'operasional' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.kategori).toBe('operasional');
    });

    test('happy 200 (kategori sewa)', async () => {
      const res = await request(app)
        .get('/api/laporan/btt')
        .query({ periodeId: testPeriodeId, kategori: 'sewa' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.kategori).toBe('sewa');
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/btt')
        .query({ periodeId: testPeriodeId, kategori: 'operasional' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 invalid kategori', async () => {
      const res = await request(app)
        .get('/api/laporan/btt')
        .query({ periodeId: testPeriodeId, kategori: 'invalid-kategori' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/btt')
        .query({ periodeId: 'non-existent-periode-id', kategori: 'operasional' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // 7. GET /api/laporan/lbbp
  describe('GET /api/laporan/lbbp', () => {
    test('happy 200 (get LBBP data)', async () => {
      const res = await request(app)
        .get('/api/laporan/lbbp')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/lbbp')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/lbbp')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/lbbp')
        .query({ periodeId: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // 8. GET /api/laporan/bkk
  describe('GET /api/laporan/bkk', () => {
    test('happy 200 (get BKK JSON data)', async () => {
      const res = await request(app)
        .get('/api/laporan/bkk')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/bkk')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/bkk')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/bkk')
        .query({ periodeId: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // 9. GET /api/laporan/bp
  describe('GET /api/laporan/bp', () => {
    test('happy 200 (get Buku Pembantu per Akun)', async () => {
      const res = await request(app)
        .get('/api/laporan/bp')
        .query({ periodeId: testPeriodeId, akunId: akunKas.id })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/bp')
        .query({ periodeId: testPeriodeId, akunId: akunKas.id })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query akunId', async () => {
      const res = await request(app)
        .get('/api/laporan/bp')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent akunId', async () => {
      const res = await request(app)
        .get('/api/laporan/bp')
        .query({ periodeId: testPeriodeId, akunId: 'non-existent-akun-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // 10. GET /api/laporan/bp/kas, /bp/bahan-baku, /bp/operasional, /bp/fasilitas (4 varian data)
  describe('GET /api/laporan/bp/:path (4 varian BP data)', () => {
    test('happy 200 GET /api/laporan/bp/kas', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('happy 200 GET /api/laporan/bp/bahan-baku', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/bahan-baku')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('happy 200 GET /api/laporan/bp/operasional', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/operasional')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('happy 200 GET /api/laporan/bp/fasilitas', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/fasilitas')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('403 forbidden role', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('400 missing query periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('404 non-existent setupLembaga / periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas')
        .query({ periodeId: 'non-existent-periode-id' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });
});
