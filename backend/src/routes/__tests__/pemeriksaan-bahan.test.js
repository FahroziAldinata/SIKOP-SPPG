const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Pemeriksaan Bahan Makanan (B.7) Integration Tests', () => {
  const db = new PrismaClient();
  let token;
  let headers;

  let testPoId = null;
  let draftPoId = null;

  beforeAll(async () => {
    // Auth
    for (const cred of [
      { username: 'aslap', password: TEST_PASSWORD },
      { username: 'akuntan', password: TEST_PASSWORD },
    ]) {
      const r = await request(app)
        .post('/api/auth/login')
        .send(cred);

      if (r.status === 200) {
        token = r.body.token;
        break;
      }
    }
    expect(token).toBeTruthy();
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const periode = await db.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } });
    expect(periode).toBeTruthy();

    const supplier = await db.supplier.findFirst();
    expect(supplier).toBeTruthy();

    const bahanPokok = await db.bahanPokok.findFirst({ where: { aktif: true } });
    expect(bahanPokok).toBeTruthy();

    const akuntan = await db.user.findFirst({ where: { role: 'AKUNTAN', aktif: true } });
    expect(akuntan).toBeTruthy();
    const creatorId = akuntan.id;

    let rabHarian = await db.rabHarian.findFirst({ where: { periodeId: periode.id } });
    if (!rabHarian) {
      rabHarian = await db.rabHarian.create({
        data: {
          periodeId: periode.id,
          tanggal: new Date(Date.UTC(2026, 6, 26)),
          status: 'DISETUJUI',
          createdById: creatorId
        }
      });
    }
    expect(rabHarian).toBeTruthy();

    // Create PO DIREALISASI
    const po = await db.transaksiPembelian.create({
      data: {
        rabHarianId: rabHarian.id,
        supplierId: supplier.id,
        tanggal: new Date(Date.UTC(2026, 6, 26)),
        catatan: 'Test Pemeriksaan Bahan B.7',
        status: 'DIREALISASI',
        createdById: creatorId,
        items: {
          create: [
            {
              bahanPokokId: bahanPokok.id,
              qty: 10,
              hargaSatuan: 15000,
              subtotal: 150000,
              qtyRealisasi: 9.5,
              hargaSatuanRealisasi: 15000,
              subtotalRealisasi: 142500,
            },
          ],
        },
      },
    });
    testPoId = po.id;

    // Create PO DIAJUKAN
    const draftPo = await db.transaksiPembelian.create({
      data: {
        rabHarianId: rabHarian.id,
        supplierId: supplier.id,
        tanggal: new Date(Date.UTC(2026, 6, 26)),
        catatan: 'Test Draft PO B.7',
        status: 'DIAJUKAN',
        createdById: creatorId,
        items: {
          create: [
            {
              bahanPokokId: bahanPokok.id,
              qty: 5,
              hargaSatuan: 10000,
              subtotal: 50000,
            },
          ],
        },
      },
    });
    draftPoId = draftPo.id;
  });

  afterAll(async () => {
    for (const id of [testPoId, draftPoId]) {
      if (id) {
        try {
          await db.transaksiPembelianItem.deleteMany({ where: { transaksiId: id } });
          await db.transaksiPembelian.delete({ where: { id } });
        } catch {}
      }
    }
    await db.$disconnect();
  });

  test('[T1] GET /api/laporan/pemeriksaan-bahan — 400 jika poId kosong', async () => {
    const t1 = await request(app).get('/api/laporan/pemeriksaan-bahan').set(headers);
    expect(t1.status).toBe(400);
    expect(t1.body.success).toBe(false);
  });

  test('[T2] GET /api/laporan/pemeriksaan-bahan — 404 jika poId tidak ada', async () => {
    const t2 = await request(app)
      .get('/api/laporan/pemeriksaan-bahan?poId=nonexistent-id-xyz')
      .set(headers);
    expect(t2.status).toBe(404);
    expect(t2.body.success).toBe(false);
  });

  test('[T3] GET /api/laporan/pemeriksaan-bahan — 200 + struktur JSON lengkap', async () => {
    const t3 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}`)
      .set(headers);
    expect(t3.status).toBe(200);
    expect(t3.body.success).toBe(true);
    const d = t3.body.data;
    expect(d.poId).toBeTruthy();
    expect(d.nomorDokumen).toBeTruthy();
    expect(d.tanggalPemeriksaan).toBeTruthy();
    expect(d.supplier).toBeTruthy();
    expect(Array.isArray(d.bahanMakanan)).toBe(true);
    expect(d.bahanMakanan.length).toBeGreaterThan(0);
    expect(typeof d.totalNilai).toBe('number');
    expect(d.pemeriksa).toBeTruthy();

    const firstItem = d.bahanMakanan[0];
    expect('qtySiswa' in firstItem).toBe(true);
    expect('qtyB3' in firstItem).toBe(true);
    expect('kategori' in firstItem).toBe(true);
  });

  test('[T4] Format nomorDokumen: No.NNN/DD/MM/YYYY/VI', async () => {
    const t4 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}`)
      .set(headers);
    const d = t4.body.data;
    const nomorRegex = /^No\.\d{3}\/\d{2}\/\d{2}\/\d{4}\/VI$/;
    expect(nomorRegex.test(d.nomorDokumen)).toBe(true);
  });

  test('[T5] GET /api/laporan/pemeriksaan-bahan/pdf — 400 jika poId kosong', async () => {
    const t5 = await request(app).get('/api/laporan/pemeriksaan-bahan/pdf').set(headers);
    expect(t5.status).toBe(400);
  });

  test('[T6] GET /api/laporan/pemeriksaan-bahan/pdf — 404 jika poId tidak ada', async () => {
    const t6 = await request(app)
      .get('/api/laporan/pemeriksaan-bahan/pdf?poId=invalid-cuid')
      .set(headers);
    expect(t6.status).toBe(404);
  });

  test('[T7] GET /api/laporan/pemeriksaan-bahan/pdf — 200 + Content-Type PDF', async () => {
    const t7 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan/pdf?poId=${testPoId}`)
      .set(headers)
      .parse((res, callback) => {
        const data = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(t7.status).toBe(200);
    const ct = t7.headers['content-type'];
    expect(ct && ct.includes('application/pdf')).toBe(true);
    expect(t7.headers['content-disposition']).toMatch(/inline; filename=/);
    expect(t7.body.slice(0, 4).toString()).toBe('%PDF');
    expect(t7.body.length).toBeGreaterThan(1024);
  });

  test('[T8] GET /api/laporan/pemeriksaan-bahan — nomorUrut override', async () => {
    const t8 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}&nomorUrut=5`)
      .set(headers);
    expect(t8.status).toBe(200);
    expect(t8.body.data.nomorDokumen.startsWith('No.005/')).toBe(true);
  });

  test('[T9] GET /api/laporan/pemeriksaan-bahan — nomorUrut=0 harus 400', async () => {
    const t9 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}&nomorUrut=0`)
      .set(headers);
    expect(t9.status).toBe(400);
  });

  test('[T10] GET /api/laporan/pemeriksaan-bahan — nomorUrut=abc harus 400', async () => {
    const t10 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}&nomorUrut=abc`)
      .set(headers);
    expect(t10.status).toBe(400);
  });

  test('[T11] GET /api/laporan/pemeriksaan-bahan — 401 tanpa token', async () => {
    const t11 = await request(app).get(`/api/laporan/pemeriksaan-bahan?poId=${testPoId}`);
    expect(t11.status).toBe(401);
  });

  test('[T12] GET /api/laporan/pemeriksaan-bahan — PO DIAJUKAN', async () => {
    const t12 = await request(app)
      .get(`/api/laporan/pemeriksaan-bahan?poId=${draftPoId}`)
      .set(headers);
    if (t12.status === 200) {
      expect(t12.body.data.statusPO).toBeTruthy();
    }
  });
});
