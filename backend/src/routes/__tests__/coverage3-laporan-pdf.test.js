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

function binaryParser(res, callback) {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
}

describe('COVERAGE3 TEST — Laporan PDF & Excel Endpoints', () => {
  let tokenAkuntan;
  let tokenAhliGizi;
  let testPeriodeId;
  let akunKas;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const pStart = new Date(Date.UTC(2041, 5, 1));
    const pEnd = new Date(Date.UTC(2041, 5, 30));

    const existingPeriode = await prismaDb.periode.findFirst({
      where: { tanggalMulai: pStart }
    });

    if (existingPeriode) {
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: existingPeriode.id } });
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: existingPeriode.id } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: existingPeriode.id } });
      await prismaDb.periode.deleteMany({ where: { id: existingPeriode.id } });
    }

    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: pStart,
        tanggalSelesai: pEnd,
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga Test PDF Cov3',
            alamat: 'Jl. PDF Coverage No. 1',
            namaKepalaSPPG: 'Kepala Test PDF',
            namaAkuntanSPPG: 'Akuntan Test PDF',
            namaYayasan: 'Yayasan PDF',
            ketuaYayasan: 'Ketua Yayasan PDF',
            nomorRekeningVA: '112233445566',
            tahunAnggaran: 2041,
            awalPeriodeBerikutnya: new Date(Date.UTC(2041, 6, 1)),
            tanggalPelaporan: new Date(Date.UTC(2041, 5, 30)),
            tempatPelaporan: 'Jakarta',
          },
        },
      },
    });
    testPeriodeId = periode.id;

    akunKas = await prismaDb.akun.findFirst({ where: { tipe: 'KAS', aktif: true } });
    if (!akunKas) {
      akunKas = await prismaDb.akun.create({
        data: { kode: '1001-PDF', nama: 'Kas Test PDF', tipe: 'KAS', kategoriDana: 'BAHAN_MAKANAN', aktif: true },
      });
    }

    const userAkuntan = await prismaDb.user.findFirst({ where: { role: 'AKUNTAN' } });

    await prismaDb.saldoAwalPeriode.create({
      data: { periodeId: testPeriodeId, akunId: akunKas.id, saldoAwal: 5000000 },
    });

    await prismaDb.jurnalTransaksi.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2041, 5, 10)),
        nomorBukti: 88881,
        uraian: 'Test Transaksi PDF Cov3',
        jenis: 'KELUAR',
        nominal: 250000,
        akunKasId: akunKas.id,
        akunDanaBiayaId: akunKas.id,
        createdById: userAkuntan ? userAkuntan.id : undefined,
      },
    });
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. BKU PDF & Excel
  describe('GET /api/laporan/bku/pdf & export-excel', () => {
    test('GET /api/laporan/bku/pdf — happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/bku/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/inline; filename="BKU-/);
    });

    test('GET /api/laporan/bku/pdf — 403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/bku/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });

    test('GET /api/laporan/bku/pdf — 400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/bku/pdf')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('GET /api/laporan/bku/export-excel — happy 200 + excel content-type', async () => {
      const res = await request(app)
        .get('/api/laporan/bku/export-excel')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
    });
  });

  // 2. Catatan PDF
  describe('GET /api/laporan/catatan/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/catatan/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/catatan/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 3. Buku Pembantu (BP) PDF
  describe('GET /api/laporan/bp PDF endpoints', () => {
    test('GET /api/laporan/bp/pdf (default path check) — 404 karena bp.js mendaftarkan /bp/:path/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });

    test('GET /api/laporan/bp/kas/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('GET /api/laporan/bp/bahan-baku/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/bahan-baku/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('GET /api/laporan/bp/operasional/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/operasional/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('GET /api/laporan/bp/fasilitas/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/fasilitas/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('GET /api/laporan/bp/kas/pdf — 403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/bp/kas/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 4. Neraca Saldo PDF
  describe('GET /api/laporan/neraca-saldo/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/neraca-saldo/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/neraca-saldo/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 5. LPA PDF
  describe('GET /api/laporan/lpa/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/lpa/pdf')
        .query({ periodeId: testPeriodeId, nomorDokumen: '01/LPA/TEST' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/lpa/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 6. SPTJ PDF
  describe('GET /api/laporan/sptj/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/sptj/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/sptj/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 7. BAPSD PDF
  describe('GET /api/laporan/bapsd/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/bapsd/pdf')
        .query({ periodeId: testPeriodeId, nomorDokumen: '01/BAPSD/TEST' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('400 tanpa nomorDokumen', async () => {
      const res = await request(app)
        .get('/api/laporan/bapsd/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/bapsd/pdf')
        .query({ periodeId: testPeriodeId, nomorDokumen: '01/BAPSD/TEST' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 8. Kebutuhan Belanja PDF
  describe('GET /api/laporan/kebutuhan-belanja/pdf', () => {
    test('happy 200 + application/pdf', async () => {
      const res = await request(app)
        .get('/api/laporan/kebutuhan-belanja/pdf')
        .query({ periodeId: testPeriodeId, tanggalMulai: '2041-06-01', tanggalSelesai: '2041-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('400 tanpa tanggalMulai', async () => {
      const res = await request(app)
        .get('/api/laporan/kebutuhan-belanja/pdf')
        .query({ periodeId: testPeriodeId, tanggalSelesai: '2041-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/kebutuhan-belanja/pdf')
        .query({ periodeId: testPeriodeId, tanggalMulai: '2041-06-01', tanggalSelesai: '2041-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 9. Per Periode & Per Bulan PDF
  describe('GET /api/laporan/per-periode/pdf & /per-bulan/pdf', () => {
    test('per-periode/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/per-periode/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('per-bulan/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/per-bulan/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('per-periode/pdf — 403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/per-periode/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 10. Stock Barang PDF & Excel
  describe('GET /api/laporan/stock-barang PDF & Excel', () => {
    test('stock-barang/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/stock-barang/pdf')
        .query({ periodeId: testPeriodeId, tanggal: '2041-06-15' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('stock-barang/export-excel — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/stock-barang/export-excel')
        .query({ periodeId: testPeriodeId, tanggal: '2041-06-15' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
    });

    test('stock-barang/pdf — 403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/stock-barang/pdf')
        .query({ periodeId: testPeriodeId, tanggal: '2041-06-15' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 11. Harian, LRA, LPD2M, BTT, LBBP, BKK PDF
  describe('GET /api/laporan PDF sisa (harian, lra, lpd2m, btt, lbbp, bkk)', () => {
    test('harian/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/harian/pdf')
        .query({ periodeId: testPeriodeId, tanggal: '2041-06-10' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('lra/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/lra/pdf')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('lra/export-excel — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/lra/export-excel')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
    });

    test('lpd2m/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m/pdf')
        .query({ periodeIds: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('btt/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/btt/pdf')
        .query({ periodeId: testPeriodeId, kategori: 'operasional' })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('btt/pdf — 400 jika kategori invalid', async () => {
      const res = await request(app)
        .get('/api/laporan/btt/pdf')
        .query({ periodeId: testPeriodeId, kategori: 'invalid' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
    });

    test('lbbp/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/lbbp/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('bkk/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/laporan/bkk/pdf')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    test('harian/pdf — 403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/laporan/harian/pdf')
        .query({ periodeId: testPeriodeId, tanggal: '2041-06-10' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });
});
