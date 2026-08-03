const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { HARI_MAP } = require('../../lib/accountingHelper');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Laporan API Integration Tests', () => {
  const prismaDb = new PrismaClient();
  let token;
  let periode;
  let akunKas;
  let akunBiaya;
  let kategori;
  let kelompokUmur;
  let testDate;
  let testDateStr;
  let targetDateStr;
  let testMonthKey;

  let testBahanId = null;
  let testJurnalId = null;
  let testAnggaranId = null;
  let testDetailId = null;
  let testMenuHarianId = null;
  let testMenuHarianBlokId = null;
  let testMenuItemId = null;
  let testMenuItemBahanId = null;
  let testGrupHariId = null;
  let testInputPmId = null;
  let testInputPmDetailId = null;
  let testSaldoAwalBarangId = null;
  const testMutasiIds = [];

  beforeAll(async () => {
    // 1. Authenticate as AKUNTAN
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'akuntan', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
    const userId = loginRes.body.user.id;

    // 2. Find Master Data
    periode = await prismaDb.periode.findFirst({
      where: { setupLembaga: { isNot: null } },
      orderBy: { tanggalMulai: 'desc' }
    }) || await prismaDb.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } });
    expect(periode).toBeTruthy();

    akunKas = await prismaDb.akun.findFirst({ where: { tipe: 'KAS' } });
    akunBiaya = await prismaDb.akun.findFirst({ where: { tipe: 'BIAYA' } });
    expect(akunKas && akunBiaya).toBeTruthy();

    kelompokUmur = await prismaDb.kelompokUmurMenu.findFirst({
      include: { kategoriPenerima: true }
    });
    expect(kelompokUmur && kelompokUmur.kategoriPenerima.length > 0).toBeTruthy();
    kategori = kelompokUmur.kategoriPenerima[0];

    // Compute dates within active period
    const pStart = new Date(periode.tanggalMulai);
    // Find a date inside period that is not Sunday
    testDate = new Date(pStart);
    testDate.setUTCDate(pStart.getUTCDate() + 2);
    if (testDate.getUTCDay() === 0) { // If Sunday, add 1 day
      testDate.setUTCDate(testDate.getUTCDate() + 1);
    }
    testDateStr = testDate.toISOString().split('T')[0];
    testMonthKey = testDateStr.substring(0, 7);

    const m1Date = new Date(pStart); m1Date.setUTCDate(pStart.getUTCDate() + 1);
    const m2Date = new Date(testDate);
    const m3Date = new Date(testDate); m3Date.setUTCDate(testDate.getUTCDate() + 1);
    const targetDate = new Date(testDate); targetDate.setUTCDate(testDate.getUTCDate() + 2);
    targetDateStr = targetDate.toISOString().split('T')[0];

    const dayOfWeek = HARI_MAP[testDate.getUTCDay()];

    // 3. Setup Temporary Bahan Pokok
    const testBahan = await prismaDb.bahanPokok.create({
      data: {
        nama: 'Bahan Pokok Test Laporan ' + Date.now(),
        satuan: 'KG',
        aktif: true
      }
    });
    testBahanId = testBahan.id;

    // === Cleanup data test (Strategi A: deleteMany child→parent, idempotent) ===
    // Model dengan unique non-id yang memakai nilai statis (testDate, nomorBukti 99999)
    // bisa bentrok dengan seed (seed membuat AnggaranHarian + MenuHarian per tanggal periode)
    // atau sisa run sebelumnya. Urutan child→parent karena tidak ada onDelete Cascade.
    // MenuHarian chain
    await prismaDb.menuItemBahan.deleteMany({
      where: { menuItem: { blok: { menuHarian: { periodeId: periode.id, tanggal: testDate } } } },
    }).catch(() => {});
    await prismaDb.menuItem.deleteMany({
      where: { blok: { menuHarian: { periodeId: periode.id, tanggal: testDate } } },
    }).catch(() => {});
    await prismaDb.menuHarianBlok.deleteMany({
      where: { menuHarian: { periodeId: periode.id, tanggal: testDate } },
    }).catch(() => {});
    await prismaDb.menuHarian.deleteMany({
      where: { periodeId: periode.id, tanggal: testDate },
    }).catch(() => {});
    // AnggaranHarian chain
    await prismaDb.anggaranBahanMakananDetail.deleteMany({
      where: { anggaranHarian: { periodeId: periode.id, tanggal: testDate } },
    }).catch(() => {});
    await prismaDb.anggaranHarian.deleteMany({
      where: { periodeId: periode.id, tanggal: testDate },
    }).catch(() => {});
    // JurnalTransaksi (nomorBukti 99999 statis — unique (periodeId, nomorBukti))
    await prismaDb.jurnalTransaksi.deleteMany({
      where: { periodeId: periode.id, nomorBukti: 99999 },
    }).catch(() => {});

    // 4. Setup Temporary Jurnal and Anggaran
    const testJurnal = await prismaDb.jurnalTransaksi.create({
      data: {
        periodeId: periode.id,
        tanggal: testDate,
        nomorBukti: 99999,
        uraian: 'Test Jurnal Laporan',
        jenis: 'KELUAR',
        nominal: 150000,
        akunKasId: akunKas.id,
        akunDanaBiayaId: akunBiaya.id,
        createdById: userId
      }
    });
    testJurnalId = testJurnal.id;

    const testAnggaran = await prismaDb.anggaranHarian.create({
      data: {
        periodeId: periode.id,
        tanggal: testDate,
        kategoriDana: 'BAHAN_MAKANAN',
        jumlahPaket: 100,
        rab: 1000000,
        aktual: 150000,
        selisih: 850000
      }
    });
    testAnggaranId = testAnggaran.id;

    const testDetail = await prismaDb.anggaranBahanMakananDetail.create({
      data: {
        anggaranHarianId: testAnggaran.id,
        kategoriId: kategori.id,
        jumlahPaket: 100,
        hargaSatuan: 10000,
        subtotal: 1000000
      }
    });
    testDetailId = testDetail.id;

    // 5. Setup Menu Harian, Blok, Item, Bahan, GrupHari, and InputPenerimaManfaat
    const testMenuHarian = await prismaDb.menuHarian.create({
      data: {
        periodeId: periode.id,
        tanggal: testDate,
        status: 'DISETUJUI'
      }
    });
    testMenuHarianId = testMenuHarian.id;

    const testMenuHarianBlok = await prismaDb.menuHarianBlok.create({
      data: {
        menuHarianId: testMenuHarian.id,
        kelompokUmurMenuId: kelompokUmur.id,
        createdById: userId
      }
    });
    testMenuHarianBlokId = testMenuHarianBlok.id;

    const testMenuItem = await prismaDb.menuItem.create({
      data: {
        blokId: testMenuHarianBlok.id,
        namaMenu: 'Menu Item Test Laporan',
        komponen: 'LAUK_HEWANI'
      }
    });
    testMenuItemId = testMenuItem.id;

    const testMenuItemBahan = await prismaDb.menuItemBahan.create({
      data: {
        menuItemId: testMenuItem.id,
        bahanPokokId: testBahan.id,
        beratBersihGr: 40.00,
        bddPersen: 80.00,
        beratKotorGr: 50.00,
        hargaSatuan: 20000.00,
        beratSatuanGr: 1000.00,
        totalHargaBahan: 1000.00,
        energiKkal: 100.00,
        proteinGr: 10.00,
        lemakGr: 5.00,
        karbohidratGr: 2.00,
        seratGr: 0.00
      }
    });
    testMenuItemBahanId = testMenuItemBahan.id;

    const grupHari = await prismaDb.grupHari.create({
      data: {
        periodeId: periode.id,
        label: 'Grup Hari Test Laporan ' + Date.now(),
        hariAktif: [dayOfWeek]
      }
    });
    testGrupHariId = grupHari.id;

    const testInputPm = await prismaDb.inputPenerimaManfaat.create({
      data: {
        periodeId: periode.id,
        grupHariId: grupHari.id,
        createdById: userId
      }
    });
    testInputPmId = testInputPm.id;

    const testInputPmDetail = await prismaDb.inputPenerimaManfaatDetail.create({
      data: {
        inputPenerimaManfaatId: testInputPm.id,
        kategoriId: kategori.id,
        lakiLaki: 10,
        perempuan: 15
      }
    });
    testInputPmDetailId = testInputPmDetail.id;

    // 6. Setup Stock Barang: SaldoAwalBarang and MutasiStok
    const testSaldoAwalBarang = await prismaDb.saldoAwalBarang.create({
      data: {
        periodeId: periode.id,
        bahanPokokId: testBahan.id,
        saldoAwalQty: 10.000,
        hargaBeliAwal: 10000.00
      }
    });
    testSaldoAwalBarangId = testSaldoAwalBarang.id;

    const m1 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: m1Date,
        jenis: 'MASUK',
        qty: 5.000,
        hargaBeli: 12000.00,
        keterangan: 'Mutasi Masuk 1',
        createdById: userId
      }
    });
    testMutasiIds.push(m1.id);

    const m2 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: m2Date,
        jenis: 'MASUK',
        qty: 2.000,
        hargaBeli: 15000.00,
        keterangan: 'Mutasi Masuk 2',
        createdById: userId
      }
    });
    testMutasiIds.push(m2.id);

    const m3 = await prismaDb.mutasiStok.create({
      data: {
        bahanPokokId: testBahan.id,
        tanggal: m3Date,
        jenis: 'KELUAR',
        qty: 4.000,
        keterangan: 'Mutasi Keluar 1',
        createdById: userId
      }
    });
    testMutasiIds.push(m3.id);
  });

  afterAll(async () => {
    for (const mId of testMutasiIds) {
      try { await prismaDb.mutasiStok.delete({ where: { id: mId } }); } catch (e) {}
    }
    if (testSaldoAwalBarangId) {
      try { await prismaDb.saldoAwalBarang.delete({ where: { id: testSaldoAwalBarangId } }); } catch (e) {}
    }
    if (testInputPmDetailId) {
      try { await prismaDb.inputPenerimaManfaatDetail.delete({ where: { id: testInputPmDetailId } }); } catch (e) {}
    }
    if (testInputPmId) {
      try { await prismaDb.inputPenerimaManfaat.delete({ where: { id: testInputPmId } }); } catch (e) {}
    }
    if (testGrupHariId) {
      try { await prismaDb.grupHari.delete({ where: { id: testGrupHariId } }); } catch (e) {}
    }
    if (testMenuItemBahanId) {
      try { await prismaDb.menuItemBahan.delete({ where: { id: testMenuItemBahanId } }); } catch (e) {}
    }
    if (testMenuItemId) {
      try { await prismaDb.menuItem.delete({ where: { id: testMenuItemId } }); } catch (e) {}
    }
    if (testMenuHarianBlokId) {
      try { await prismaDb.menuHarianBlok.delete({ where: { id: testMenuHarianBlokId } }); } catch (e) {}
    }
    if (testMenuHarianId) {
      try { await prismaDb.menuHarian.delete({ where: { id: testMenuHarianId } }); } catch (e) {}
    }
    if (testDetailId) {
      try { await prismaDb.anggaranBahanMakananDetail.delete({ where: { id: testDetailId } }); } catch (e) {}
    }
    if (testAnggaranId) {
      try { await prismaDb.anggaranHarian.delete({ where: { id: testAnggaranId } }); } catch (e) {}
    }
    if (testJurnalId) {
      try { await prismaDb.jurnalTransaksi.delete({ where: { id: testJurnalId } }); } catch (e) {}
    }
    if (testBahanId) {
      try { await prismaDb.bahanPokok.delete({ where: { id: testBahanId } }); } catch (e) {}
    }
    await prismaDb.$disconnect();
  });

  test('GET /api/laporan/bku', async () => {
    const bkuRes = await request(app)
      .get('/api/laporan/bku')
      .query({ periodeId: periode.id })
      .set('Authorization', `Bearer ${token}`);

    expect(bkuRes.status).toBe(200);
    const bkuData = bkuRes.body;
    expect(bkuData.success).toBe(true);
    const rows = bkuData.data.transaksi || bkuData.data.rows || bkuData.data.bkuRows || (Array.isArray(bkuData.data) ? bkuData.data : []);
    expect(Array.isArray(rows)).toBe(true);
    const testBkuRow = rows.find(row => row.id === testJurnalId);
    expect(testBkuRow).toBeTruthy();
    expect(testBkuRow.noBukti).toBe(99999);
    expect(testBkuRow.kredit).toBe(150000);
  });

  test('GET /api/laporan/bp', async () => {
    const bpRes = await request(app)
      .get('/api/laporan/bp')
      .query({ periodeId: periode.id, akunId: akunKas.id })
      .set('Authorization', `Bearer ${token}`);

    expect(bpRes.status).toBe(200);
    const bpData = bpRes.body;
    expect(bpData.success).toBe(true);
    expect(Array.isArray(bpData.data)).toBe(true);
    const testBpRow = bpData.data.find(row => row.id === testJurnalId);
    expect(testBpRow).toBeTruthy();
    expect(testBpRow.debet).toBe(0);
    expect(testBpRow.kredit).toBe(150000);
  });

  test('GET /api/laporan/lpa', async () => {
    const lpaRes = await request(app)
      .get('/api/laporan/lpa')
      .query({ periodeId: periode.id, nomorDokumen: '01/LPA/TEST' })
      .set('Authorization', `Bearer ${token}`);

    expect(lpaRes.status).toBe(200);
    const lpaData = lpaRes.body;
    expect(lpaData.success).toBe(true);
    expect(lpaData.data.nomorDokumen).toBe('01/LPA/TEST');
    expect(Array.isArray(lpaData.data.rincian)).toBe(true);
    const r = lpaData.data.rincian.find(x => x.kategoriDana === 'BAHAN_MAKANAN');
    expect(r).toBeTruthy();
    expect(r.diajukan).toBeGreaterThanOrEqual(1000000);
    expect(r.terealisasi).toBeGreaterThanOrEqual(150000);
  });

  test('GET /api/laporan/sptj', async () => {
    const sptjRes = await request(app)
      .get('/api/laporan/sptj')
      .query({ periodeId: periode.id })
      .set('Authorization', `Bearer ${token}`);

    expect(sptjRes.status).toBe(200);
    const sptjData = sptjRes.body;
    expect(sptjData.success).toBe(true);
    expect(sptjData.data.jumlahPenerimaan).toBeGreaterThanOrEqual(1000000);
    expect(sptjData.data.jumlahPengeluaran).toBeGreaterThanOrEqual(150000);
  });

  test('GET /api/laporan/bapsd', async () => {
    const bapsdRes = await request(app)
      .get('/api/laporan/bapsd')
      .query({ periodeId: periode.id, nomorDokumen: '01/BAPSD/TEST' })
      .set('Authorization', `Bearer ${token}`);

    expect(bapsdRes.status).toBe(200);
    const bapsdData = bapsdRes.body;
    expect(bapsdData.success).toBe(true);
    expect(bapsdData.data.nomorDokumen).toBe('01/BAPSD/TEST');
    expect(bapsdData.data.sisaDana).not.toBeUndefined();
  });

  test('GET /api/laporan/kebutuhan-belanja-bahan', async () => {
    const kbbRes = await request(app)
      .get('/api/laporan/kebutuhan-belanja-bahan')
      .query({ periodeId: periode.id, tanggalMulai: testDateStr, tanggalSelesai: targetDateStr })
      .set('Authorization', `Bearer ${token}`);

    expect(kbbRes.status).toBe(200);
    const kbbData = kbbRes.body;
    expect(kbbData.success).toBe(true);
    expect(Array.isArray(kbbData.data)).toBe(true);

    const testKbbRow = kbbData.data.find(row => row.id === testBahanId);
    expect(testKbbRow).toBeTruthy();
    expect(testKbbRow.totalBeratKotorGr).toBe(1250);
    expect(testKbbRow.totalBeratBersihGr).toBe(1000);
    expect(testKbbRow.totalEstimasiBiaya).toBe(25000);
  });

  test('GET /api/laporan/per-periode', async () => {
    const lppRes = await request(app)
      .get('/api/laporan/per-periode')
      .query({ periodeId: periode.id })
      .set('Authorization', `Bearer ${token}`);

    expect(lppRes.status).toBe(200);
    const lppData = lppRes.body;
    expect(lppData.success).toBe(true);
    expect(lppData.data.bahanMakanan.pendidikan.metodeAlokasi).toBe('PROPORSIONAL_RAB');
    expect(lppData.data.bahanMakanan.posyandu.metodeAlokasi).toBe('PROPORSIONAL_RAB');
  });

  test('GET /api/laporan/per-bulan', async () => {
    const lpbRes = await request(app)
      .get('/api/laporan/per-bulan')
      .query({ periodeId: periode.id })
      .set('Authorization', `Bearer ${token}`);

    expect(lpbRes.status).toBe(200);
    const lpbData = lpbRes.body;
    expect(lpbData.success).toBe(true);
    expect(Array.isArray(lpbData.data)).toBe(true);

    const testMonthRow = lpbData.data.find(row => row.key === testMonthKey);
    expect(testMonthRow).toBeTruthy();
    expect(testMonthRow.totalKeluar).toBeGreaterThanOrEqual(150000);
  });

  test('GET /api/laporan/stock-barang', async () => {
    const sbRes = await request(app)
      .get('/api/laporan/stock-barang')
      .query({ periodeId: periode.id, tanggal: targetDateStr })
      .set('Authorization', `Bearer ${token}`);

    expect(sbRes.status).toBe(200);
    const sbData = sbRes.body;
    expect(sbData.success).toBe(true);
    expect(Array.isArray(sbData.data)).toBe(true);

    const testSbRow = sbData.data.find(row => row.bahanPokokId === testBahanId);
    expect(testSbRow).toBeTruthy();
    expect(testSbRow.saldoAwalQty).toBe(10);
    expect(testSbRow.totalMasukQty).toBe(7);
    expect(testSbRow.totalKeluarQty).toBe(4);
    expect(testSbRow.saldoAkhirQty).toBe(13);
    expect(testSbRow.hargaBeliTerakhir).toBe(15000);
    expect(testSbRow.nilaiStock).toBe(195000);
  });
});
