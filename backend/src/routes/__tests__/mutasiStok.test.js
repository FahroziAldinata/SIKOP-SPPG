const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Mutasi Stok API Integration Tests', () => {
  const prismaDb = new PrismaClient();
  let token;
  let headers;

  let testBahanId = null;
  let testSupplierId = null;
  let testSupplierInaktifId = null;
  const testMutasiIds = [];
  let testValidasiId = null;

  beforeAll(async () => {
    // 1. Authenticate as AKUNTAN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'akuntan', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Setup Data (Bahan Pokok & Supplier)
    const testBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: `Bahan Pokok Mutasi Test ${Date.now()}`,
        satuan: 'kg',
        tipePenyimpanan: 'HABIS_HARI_ITU',
        aktif: true
      }
    });
    testBahanId = testBahan.id;

    const testSupplier = await prismaDb.supplier.create({
      data: {
        nama: `Supplier Mutasi Test ${Date.now()}`,
        kontak: '08123456789',
        aktif: true
      }
    });
    testSupplierId = testSupplier.id;

    const testSupplierInaktif = await prismaDb.supplier.create({
      data: {
        nama: `Supplier Inaktif Test ${Date.now()}`,
        kontak: '08987654321',
        aktif: false
      }
    });
    testSupplierInaktifId = testSupplierInaktif.id;
  });

  afterAll(async () => {
    if (testValidasiId) {
      try { await prismaDb.validasiStok.delete({ where: { id: testValidasiId } }); } catch {}
    }
    for (const mutId of testMutasiIds) {
      try { await prismaDb.mutasiStok.delete({ where: { id: mutId } }); } catch {}
    }
    if (testBahanId) {
      try { await prismaDb.bahanPokok.delete({ where: { id: testBahanId } }); } catch {}
    }
    if (testSupplierId) {
      try { await prismaDb.supplier.delete({ where: { id: testSupplierId } }); } catch {}
    }
    if (testSupplierInaktifId) {
      try { await prismaDb.supplier.delete({ where: { id: testSupplierInaktifId } }); } catch {}
    }
    await prismaDb.$disconnect();
  });

  test('POST /api/akuntan/mutasi-stok KELUAR (dengan supplierId) -> 400', async () => {
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-05',
        jenis: 'KELUAR',
        qty: 10,
        kelompokPenerima: 'SISWA',
        supplierId: testSupplierId
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/akuntan/mutasi-stok KELUAR (tanpa kelompokPenerima) -> 400', async () => {
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-05',
        jenis: 'KELUAR',
        qty: 5
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/akuntan/mutasi-stok KELUAR (Valid)', async () => {
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-05',
        jenis: 'KELUAR',
        qty: 15,
        kelompokPenerima: 'SISWA'
      });

    expect(res.status).toBe(201);
    expect(res.body.kelompokPenerima).toBe('SISWA');
    expect(res.body.supplierId).toBeNull();
    expect(res.body.hargaBeli).toBeNull();
    testMutasiIds.push(res.body.id);
  });

  test('POST /api/akuntan/mutasi-stok MASUK (dengan kelompokPenerima) -> 400', async () => {
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-05',
        jenis: 'MASUK',
        qty: 50,
        supplierId: testSupplierId,
        hargaBeli: 20000,
        kelompokPenerima: 'SISWA'
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/akuntan/mutasi-stok MASUK (dengan supplier inaktif) -> 400', async () => {
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-05',
        jenis: 'MASUK',
        qty: 10,
        supplierId: testSupplierInaktifId,
        hargaBeli: 15000
      });

    expect(res.status).toBe(400);
  });

  test('GET /api/akuntan/validasi-stok/preview', async () => {
    // Create multiple mutasi stok
    const m1Res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-01',
        jenis: 'MASUK',
        qty: 100,
        supplierId: testSupplierId,
        hargaBeli: 20000
      });
    expect(m1Res.status).toBe(201);
    testMutasiIds.push(m1Res.body.id);

    const m2Res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-02',
        jenis: 'MASUK',
        qty: 50,
        supplierId: testSupplierId,
        hargaBeli: 21000
      });
    expect(m2Res.status).toBe(201);
    testMutasiIds.push(m2Res.body.id);

    const m3Res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-02',
        jenis: 'KELUAR',
        qty: 30,
        kelompokPenerima: 'SISWA'
      });
    expect(m3Res.status).toBe(201);
    testMutasiIds.push(m3Res.body.id);

    const m4Res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-03',
        jenis: 'KELUAR',
        qty: 20,
        kelompokPenerima: 'SISWA'
      });
    expect(m4Res.status).toBe(201);
    testMutasiIds.push(m4Res.body.id);

    // Preview on 2026-07-02
    const previewRes = await request(app)
      .get(`/api/akuntan/validasi-stok/preview?bahanPokokId=${testBahanId}&tanggal=2026-07-02`)
      .set(headers);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.qtyDibeli).toBe(150);
    expect(previewRes.body.qtyTerpakai).toBe(30);
    expect(previewRes.body.sisaSistem).toBe(120);
  });

  test('POST /api/akuntan/validasi-stok', async () => {
    const validasiRes = await request(app)
      .post('/api/akuntan/validasi-stok')
      .set(headers)
      .send({
        bahanPokokId: testBahanId,
        tanggal: '2026-07-02',
        qtyDibeli: 150,
        qtyTerpakai: 30,
        catatan: 'Validasi stok fisik oke'
      });

    expect(validasiRes.status).toBe(201);
    testValidasiId = validasiRes.body.id;
    expect(Number(validasiRes.body.selisih)).toBe(120);
  });

  test('GET /api/akuntan/validasi-stok list', async () => {
    const listRes = await request(app)
      .get(`/api/akuntan/validasi-stok?bahanPokokId=${testBahanId}`)
      .set(headers);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].id).toBe(testValidasiId);
  });

  test('GET /api/akuntan/validasi-stok filtered by date', async () => {
    const listDateRes = await request(app)
      .get(`/api/akuntan/validasi-stok?bahanPokokId=${testBahanId}&tanggal=2026-07-02`)
      .set(headers);

    expect(listDateRes.status).toBe(200);
    expect(listDateRes.body.data.length).toBe(1);
    expect(listDateRes.body.data[0].id).toBe(testValidasiId);
  });
});
