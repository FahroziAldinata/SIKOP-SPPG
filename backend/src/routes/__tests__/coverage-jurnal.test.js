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

describe('COVERAGE TEST — Jurnal Transaksi Domain Routes (7 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;
  let testAkunBiayaId;
  let testAkunKasId;
  let testSupplierId;
  let testRabHarianId;
  let testPoId;
  let testPoItemId;
  let testJurnalId;

  let createdJurnalIds = [];

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const akuntanUser = await prismaDb.user.findFirst({ where: { role: 'AKUNTAN' } });
    const bahan = await prismaDb.bahanPokok.findFirst({ where: { aktif: true } });
    expect(bahan).toBeTruthy();

    // Accounts
    const akuns = await prismaDb.akun.findMany({ where: { aktif: true } });
    expect(akuns.length).toBeGreaterThanOrEqual(2);
    testAkunBiayaId = akuns[0].id;
    testAkunKasId = akuns[1].id;

    // Supplier
    const supplier = await prismaDb.supplier.findFirst() || await prismaDb.supplier.create({
      data: { nama: 'Supplier Jurnal Test ' + Date.now(), kontak: '081234' }
    });
    testSupplierId = supplier.id;

    // Periode in 2039
    const start = new Date(Date.UTC(2039, 0, 1));
    const end = new Date(Date.UTC(2039, 0, 31));
    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: start,
        tanggalSelesai: end,
        anggaranAlokasi: 30000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = periode.id;

    // RabHarian
    const rab = await prismaDb.rabHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2039, 0, 15)),
        status: 'DISETUJUI',
        createdById: akuntanUser.id
      }
    });
    testRabHarianId = rab.id;

    // TransaksiPembelian (PO) DIREALISASI for prefill & bulk-generate
    const po = await prismaDb.transaksiPembelian.create({
      data: {
        rabHarianId: testRabHarianId,
        supplierId: testSupplierId,
        tanggal: new Date(Date.UTC(2039, 0, 15)),
        status: 'DIREALISASI',
        createdById: akuntanUser.id,
        items: {
          create: [
            {
              bahanPokokId: bahan.id,
              qty: 10,
              hargaSatuan: 10000,
              subtotal: 100000,
              qtyRealisasi: 10,
              hargaSatuanRealisasi: 10000,
              subtotalRealisasi: 100000
            }
          ]
        }
      },
      include: { items: true }
    });
    testPoId = po.id;
    testPoItemId = po.items[0].id;
  });

  afterAll(async () => {
    // Child to parent cleanup
    if (testPeriodeId) {
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: testPeriodeId } });
    }
    for (const jId of createdJurnalIds) {
      const exists = await prismaDb.jurnalTransaksi.findUnique({ where: { id: jId } });
      if (exists) {
        await prismaDb.jurnalTransaksi.delete({ where: { id: jId } });
      }
    }
    if (testPoId) {
      await prismaDb.transaksiPembelianItem.deleteMany({ where: { transaksiId: testPoId } });
      await prismaDb.transaksiPembelian.delete({ where: { id: testPoId } });
    }
    if (testRabHarianId) {
      await prismaDb.rabHarian.delete({ where: { id: testRabHarianId } });
    }
    if (testPeriodeId) {
      await prismaDb.periode.delete({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. POST /api/akuntan/jurnal-transaksi
  describe('POST /api/akuntan/jurnal-transaksi', () => {
    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2039-01-10',
          uraian: 'Uraian Jurnal Test',
          jenis: 'KELUAR',
          nominal: 50000,
          akunDanaBiayaId: testAkunBiayaId,
          akunKasId: testAkunKasId
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      testJurnalId = res.body.id;
      createdJurnalIds.push(testJurnalId);
    });

    test('400 payload invalid (akun sama)', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2039-01-10',
          uraian: 'Uraian Jurnal Test',
          jenis: 'KELUAR',
          nominal: 50000,
          akunDanaBiayaId: testAkunBiayaId,
          akunKasId: testAkunBiayaId
        });
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2039-01-10',
          uraian: 'Uraian Jurnal Test',
          jenis: 'KELUAR',
          nominal: 50000,
          akunDanaBiayaId: testAkunBiayaId,
          akunKasId: testAkunKasId
        });
      expect(res.status).toBe(403);
    });
  });

  // 2. GET /api/akuntan/jurnal-transaksi/prefill/:transaksiPembelianId
  describe('GET /api/akuntan/jurnal-transaksi/prefill/:transaksiPembelianId', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/prefill/${testPoId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.transaksiPembelianId).toBe(testPoId);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .get('/api/akuntan/jurnal-transaksi/prefill/non-existent-po-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/prefill/${testPoId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. GET /api/akuntan/jurnal-transaksi/bulk-preview
  describe('GET /api/akuntan/jurnal-transaksi/bulk-preview', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/bulk-preview?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/akuntan/jurnal-transaksi/bulk-preview')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/bulk-preview?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 4. POST /api/akuntan/jurnal-transaksi/bulk-generate
  describe('POST /api/akuntan/jurnal-transaksi/bulk-generate', () => {
    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi/bulk-generate')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          rows: [
            {
              transaksiPembelianId: testPoId,
              items: [
                { id: testPoItemId, hargaSatuanRealisasi: 10000 }
              ]
            }
          ]
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      if (res.body.data && res.body.data.length > 0) {
        createdJurnalIds.push(...res.body.data.map(j => j.id));
      }
    });

    test('400 payload invalid (rows kosong)', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi/bulk-generate')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          rows: []
        });
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi/bulk-generate')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          rows: [
            {
              transaksiPembelianId: testPoId,
              items: [
                { id: testPoItemId, hargaSatuanRealisasi: 10000 }
              ]
            }
          ]
        });
      expect(res.status).toBe(403);
    });
  });

  // 5. GET /api/akuntan/jurnal-transaksi/:id
  describe('GET /api/akuntan/jurnal-transaksi/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/${testJurnalId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testJurnalId);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .get('/api/akuntan/jurnal-transaksi/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/jurnal-transaksi/${testJurnalId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 6. PUT /api/akuntan/jurnal-transaksi/:id
  describe('PUT /api/akuntan/jurnal-transaksi/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/akuntan/jurnal-transaksi/${testJurnalId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          uraian: 'Uraian Jurnal Update'
        });
      expect(res.status).toBe(200);
      expect(res.body.uraian).toBe('Uraian Jurnal Update');
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .put('/api/akuntan/jurnal-transaksi/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          uraian: 'Uraian Jurnal Update'
        });
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .put(`/api/akuntan/jurnal-transaksi/${testJurnalId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          uraian: 'Uraian Jurnal Update'
        });
      expect(res.status).toBe(403);
    });
  });

  // 7. DELETE /api/akuntan/jurnal-transaksi/:id
  describe('DELETE /api/akuntan/jurnal-transaksi/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/akuntan/jurnal-transaksi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2039-01-12',
          uraian: 'Jurnal To Delete',
          jenis: 'KELUAR',
          nominal: 20000,
          akunDanaBiayaId: testAkunBiayaId,
          akunKasId: testAkunKasId
        });
      expect(res.status).toBe(201);
      toDeleteId = res.body.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/akuntan/jurnal-transaksi/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .delete('/api/akuntan/jurnal-transaksi/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .delete(`/api/akuntan/jurnal-transaksi/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
      // Clean up manually since test failed deletion due to 403 as expected
      await prismaDb.jurnalTransaksi.delete({ where: { id: toDeleteId } });
    });
  });
});
