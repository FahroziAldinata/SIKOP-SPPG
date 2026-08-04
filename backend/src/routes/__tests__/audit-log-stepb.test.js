const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');
const { HARI_MAP } = require('../../lib/accountingHelper');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

async function login(username) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return { token: res.body.token, user: res.body.user };
}

async function auditRow(entityType, entityId) {
  return prismaDb.auditLog.findFirst({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, nama: true, username: true, role: true } } }
  });
}

function expectAudit(row, { username, aksi, entityType, detailKey }) {
  expect(row).toBeTruthy();
  expect(row.user.username).toBe(username);
  expect(row.aksi).toBe(aksi);
  expect(row.entityType).toBe(entityType);
  expect(row.createdAt).toBeTruthy();
  if (detailKey !== undefined) expect(row.dataBaru[detailKey]).toBeTruthy();
  return row;
}

describe('STEP B — AuditLog pada master akuntan (CREATE/UPDATE/DELETE)', () => {
  const cleanup = { supplier: [], jp: [], hl: [], bahan: [] };

  afterAll(async () => {
    for (const id of cleanup.hl) { try { await prismaDb.hariLibur.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.jp) { try { await prismaDb.jenisPekerjaan.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.bahan) { try { await prismaDb.bahanPokok.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.supplier) { try { await prismaDb.supplier.delete({ where: { id } }); } catch {} }
    await prismaDb.$disconnect();
  });

  test('POST /api/akuntan/supplier -> AuditLog CREATE Supplier', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/supplier')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama: 'Supplier Audit StepB ' + Date.now(), kontak: '08123' });
    expect(res.status).toBe(201);
    cleanup.supplier.push(res.body.id);
    const row = await auditRow('Supplier', res.body.id);
    expectAudit(row, { username: user.username, aksi: 'CREATE', entityType: 'Supplier', detailKey: 'nama' });
    expect(row.dataBaru.nama).toBe(res.body.nama);
  });

  test('POST/PUT/DELETE /api/akuntan/jenis-pekerjaan -> AuditLog CREATE/UPDATE/DELETE', async () => {
    const { token, user } = await login('akuntan');
    const created = await request(app)
      .post('/api/akuntan/jenis-pekerjaan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama: 'Pekerjaan Audit StepB ' + Date.now(), tarifHarian: 100000 });
    expect(created.status).toBe(201);
    cleanup.jp.push(created.body.id);
    expectAudit(await auditRow('JenisPekerjaan', created.body.id), { username: user.username, aksi: 'CREATE', entityType: 'JenisPekerjaan', detailKey: 'tarifHarian' });

    const updated = await request(app)
      .put(`/api/akuntan/jenis-pekerjaan/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tarifHarian: 120000 });
    expect(updated.status).toBe(200);
    expectAudit(await auditRow('JenisPekerjaan', created.body.id), { username: user.username, aksi: 'UPDATE', entityType: 'JenisPekerjaan', detailKey: 'tarifHarian' });
    expect(Number(updated.body.tarifHarian)).toBe(120000);

    const deleted = await request(app)
      .delete(`/api/akuntan/jenis-pekerjaan/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expectAudit(await auditRow('JenisPekerjaan', created.body.id), { username: user.username, aksi: 'DELETE', entityType: 'JenisPekerjaan' });
  });

  test('POST/DELETE /api/akuntan/hari-libur -> AuditLog CREATE/DELETE', async () => {
    const { token, user } = await login('akuntan');
    const created = await request(app)
      .post('/api/akuntan/hari-libur')
      .set('Authorization', `Bearer ${token}`)
      .send({ tanggal: '2030-06-15', keterangan: 'Hari Libur Audit StepB' });
    expect(created.status).toBe(201);
    cleanup.hl.push(created.body.id);
    expectAudit(await auditRow('HariLibur', created.body.id), { username: user.username, aksi: 'CREATE', entityType: 'HariLibur' });

    const deleted = await request(app)
      .delete(`/api/akuntan/hari-libur/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expectAudit(await auditRow('HariLibur', created.body.id), { username: user.username, aksi: 'DELETE', entityType: 'HariLibur' });
  });

  test('POST /api/akuntan/bahan-pokok -> AuditLog CREATE BahanPokok', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/bahan-pokok')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama: 'Bahan Audit StepB ' + Date.now(), satuan: 'KG', tipePenyimpanan: 'HABIS_HARI_ITU' });
    expect(res.status).toBe(201);
    cleanup.bahan.push(res.body.data.id);
    expectAudit(await auditRow('BahanPokok', res.body.data.id), { username: user.username, aksi: 'CREATE', entityType: 'BahanPokok', detailKey: 'nama' });
  });

  test('POST/PUT /api/akuntan/periode -> AuditLog CREATE/UPDATE Periode', async () => {
    const { token, user } = await login('akuntan');
    const body = {
      tanggalMulai: '2032-01-01',
      tanggalSelesai: '2032-12-31',
      anggaranAlokasi: '5000000',
      totalDanaDiterima: '5000000',
      namaLembaga: 'Lembaga Audit StepB',
      alamat: 'Jl. Test 1',
      namaKepalaSPPG: 'Kepala Test',
      namaAkuntanSPPG: 'Akuntan Test',
      namaYayasan: 'Yayasan Test',
      ketuaYayasan: 'Ketua Test',
      nomorRekeningVA: '1234567890',
      tahunAnggaran: '2032',
      awalPeriodeBerikutnya: '2033-01-01',
      tanggalPelaporan: '2032-12-31',
      tempatPelaporan: 'Jakarta'
    };
    const created = await request(app)
      .post('/api/akuntan/periode')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(created.status).toBe(201);
    const periodeId = created.body.data.id;
    expectAudit(await auditRow('Periode', periodeId), { username: user.username, aksi: 'CREATE', entityType: 'Periode', detailKey: 'anggaranAlokasi' });

    const updated = await request(app)
      .put(`/api/akuntan/periode/${periodeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'AKTIF' });
    expect(updated.status).toBe(200);
    expectAudit(await auditRow('Periode', periodeId), { username: user.username, aksi: 'UPDATE', entityType: 'Periode' });

    // Cleanup periode + setupLembaga (child dulu, lalu parent)
    try { await prismaDb.setupLembaga.deleteMany({ where: { periodeId } }); } catch {}
    try { await prismaDb.periode.delete({ where: { id: periodeId } }); } catch {}
  });
});

describe('STEP B — AuditLog mutasi & validasi stok', () => {
  let bahanId, supplierId;
  const mutasiIds = [];
  const validasiIds = [];

  beforeAll(async () => {
    const bahan = await prismaDb.bahanPokok.create({
      data: { nama: 'Bahan Stok StepB ' + Date.now(), satuan: 'KG', tipePenyimpanan: 'HABIS_HARI_ITU', aktif: true }
    });
    bahanId = bahan.id;
    const supplier = await prismaDb.supplier.create({
      data: { nama: 'Supplier Stok StepB ' + Date.now(), kontak: '08123', aktif: true }
    });
    supplierId = supplier.id;
  });

  afterAll(async () => {
    for (const id of validasiIds) { try { await prismaDb.validasiStok.delete({ where: { id } }); } catch {} }
    for (const id of mutasiIds) { try { await prismaDb.mutasiStok.delete({ where: { id } }); } catch {} }
    try { await prismaDb.supplier.delete({ where: { id: supplierId } }); } catch {}
    try { await prismaDb.bahanPokok.delete({ where: { id: bahanId } }); } catch {}
    await prismaDb.$disconnect();
  });

  test('POST /api/akuntan/mutasi-stok -> AuditLog CREATE MutasiStok', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/mutasi-stok')
      .set('Authorization', `Bearer ${token}`)
      .send({ bahanPokokId: bahanId, tanggal: '2030-01-05', jenis: 'MASUK', qty: 5, supplierId, hargaBeli: 10000 });
    expect(res.status).toBe(201);
    mutasiIds.push(res.body.id);
    expectAudit(await auditRow('MutasiStok', res.body.id), { username: user.username, aksi: 'CREATE', entityType: 'MutasiStok' });
    expect(res.body.jenis).toBe('MASUK');
  });

  test('POST /api/akuntan/validasi-stok -> AuditLog CREATE ValidasiStok', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/validasi-stok')
      .set('Authorization', `Bearer ${token}`)
      .send({ bahanPokokId: bahanId, tanggal: '2030-01-06', qtyDibeli: 10, qtyTerpakai: 4, catatan: 'Validasi StepB' });
    expect(res.status).toBe(201);
    validasiIds.push(res.body.id);
    expectAudit(await auditRow('ValidasiStok', res.body.id), { username: user.username, aksi: 'CREATE', entityType: 'ValidasiStok' });
    expect(Number(res.body.selisih)).toBe(6);
  });
});

describe('STEP B — AuditLog alur RAB -> approval -> PO -> terima -> hapus', () => {
  let periode, testDate, dayOfWeek, kategori;
  let bahanId, supplierId;
  let menuHarianId, blokId, menuItemId, itemBahanId, grupHariId, inputPmId, inputPmDetailId;
  let rabHarianId, poId;
  const hargaId = [];

  beforeAll(async () => {
    periode = await prismaDb.periode.findFirst({
      where: { setupLembaga: { isNot: null } },
      orderBy: { tanggalMulai: 'desc' }
    }) || await prismaDb.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } });
    expect(periode).toBeTruthy();

    const pStart = new Date(periode.tanggalMulai);
    testDate = new Date(pStart);
    testDate.setUTCDate(pStart.getUTCDate() + 2);
    if (testDate.getUTCDay() === 0) testDate.setUTCDate(testDate.getUTCDay() === 0 ? testDate.getUTCDate() + 1 : testDate.getUTCDate());
    dayOfWeek = HARI_MAP[testDate.getUTCDay()];

    const { user } = await login('akuntan');
    const userId = user.id;

    // Prasyarat data
    const bahan = await prismaDb.bahanPokok.create({
      data: { nama: 'Bahan RAB StepB ' + Date.now(), satuan: 'KG', tipePenyimpanan: 'HABIS_HARI_ITU', aktif: true, konversiPerKg: 1, satuanHitungan: 'KG' }
    });
    bahanId = bahan.id;
    const supplier = await prismaDb.supplier.create({
      data: { nama: 'Supplier RAB StepB ' + Date.now(), kontak: '08123', aktif: true }
    });
    supplierId = supplier.id;

    const harga = await prismaDb.hargaBahanPeriode.create({
      data: { periodeId: periode.id, bahanPokokId: bahan.id, harga: 5000, createdById: userId }
    });
    hargaId.push(harga.id);

    const kelompok = await prismaDb.kelompokUmurMenu.findFirst({ include: { kategoriPenerima: true } });
    kategori = kelompok.kategoriPenerima[0];

    // MenuHarian DISETUJUI + blok + item + bahan
    const menu = await prismaDb.menuHarian.create({ data: { periodeId: periode.id, tanggal: testDate, status: 'DISETUJUI' } });
    menuHarianId = menu.id;
    const blok = await prismaDb.menuHarianBlok.create({ data: { menuHarianId: menu.id, kelompokUmurMenuId: kelompok.id, createdById: userId } });
    blokId = blok.id;
    const item = await prismaDb.menuItem.create({ data: { blokId: blok.id, namaMenu: 'Menu StepB', komponen: 'LAUK_HEWANI' } });
    menuItemId = item.id;
    const itemBahan = await prismaDb.menuItemBahan.create({
      data: {
        menuItemId: item.id,
        bahanPokokId: bahan.id,
        beratBersihGr: 40, bddPersen: 80, beratKotorGr: 50,
        hargaSatuan: 5000, beratSatuanGr: 1000, totalHargaBahan: 1000,
        energiKkal: 100, proteinGr: 10, lemakGr: 5, karbohidratGr: 2, seratGr: 0,
        jumlahHitungan: 1
      }
    });
    itemBahanId = itemBahan.id;

    // GrupHari + InputPenerimaManfaat (detail kategori)
    const grupHari = await prismaDb.grupHari.create({ data: { periodeId: periode.id, label: 'Grup StepB ' + Date.now(), hariAktif: [dayOfWeek] } });
    grupHariId = grupHari.id;
    const inputPm = await prismaDb.inputPenerimaManfaat.create({ data: { periodeId: periode.id, grupHariId: grupHari.id, createdById: userId } });
    inputPmId = inputPm.id;
    const inputDetail = await prismaDb.inputPenerimaManfaatDetail.create({ data: { inputPenerimaManfaatId: inputPm.id, kategoriId: kategori.id, lakiLaki: 10, perempuan: 15 } });
    inputPmDetailId = inputDetail.id;
  });

  afterAll(async () => {
    try { await prismaDb.inputPenerimaManfaatDetail.delete({ where: { id: inputPmDetailId } }); } catch {}
    try { await prismaDb.inputPenerimaManfaat.delete({ where: { id: inputPmId } }); } catch {}
    try { await prismaDb.grupHari.delete({ where: { id: grupHariId } }); } catch {}
    try { await prismaDb.menuItemBahan.delete({ where: { id: itemBahanId } }); } catch {}
    try { await prismaDb.menuItem.delete({ where: { id: menuItemId } }); } catch {}
    try { await prismaDb.menuHarianBlok.delete({ where: { id: blokId } }); } catch {}
    try { await prismaDb.menuHarian.delete({ where: { id: menuHarianId } }); } catch {}
    for (const id of hargaId) { try { await prismaDb.hargaBahanPeriode.delete({ where: { id } }); } catch {} }
    try { await prismaDb.supplier.delete({ where: { id: supplierId } }); } catch {}
    try { await prismaDb.bahanPokok.delete({ where: { id: bahanId } }); } catch {}
    await prismaDb.$disconnect();
  });

  test('POST /api/akuntan/rab-harian -> AuditLog CREATE RabHarian', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/rab-harian')
      .set('Authorization', `Bearer ${token}`)
      .send({ periodeId: periode.id, tanggal: testDate.toISOString().split('T')[0], items: [{ bahanPokokId: bahanId, hargaSatuan: 5000 }] });
    expect([200, 201]).toContain(res.status);
    rabHarianId = res.body.id;
    expectAudit(await auditRow('RabHarian', rabHarianId), { username: user.username, aksi: 'CREATE', entityType: 'RabHarian', detailKey: 'periodeId' });
  });

  test('PUT /api/akuntan/rab-harian/:id/verify -> AuditLog UPDATE', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .put(`/api/akuntan/rab-harian/${rabHarianId}/verify`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const row = await auditRow('RabHarian', rabHarianId);
    expectAudit(row, { username: user.username, aksi: 'UPDATE', entityType: 'RabHarian' });
    expect(row.dataBaru.verifiedAt).toBeTruthy();
  });

  test('PUT /api/akuntan/rab-harian/:id (DIAJUKAN) -> AuditLog UPDATE', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .put(`/api/akuntan/rab-harian/${rabHarianId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DIAJUKAN' });
    expect(res.status).toBe(200);
    const row = await auditRow('RabHarian', rabHarianId);
    expectAudit(row, { username: user.username, aksi: 'UPDATE', entityType: 'RabHarian' });
    expect(row.dataBaru.status).toBe('DIAJUKAN');
  });

  test('POST /api/kepala/approval (DISETUJUI) -> AuditLog APPROVE RabHarian', async () => {
    const { token, user } = await login('kepalasppg');
    const res = await request(app)
      .post('/api/kepala/approval')
      .set('Authorization', `Bearer ${token}`)
      .send({ rabHarianId, status: 'DISETUJUI' });
    expect(res.status).toBe(201);
    const row = await auditRow('RabHarian', rabHarianId);
    expectAudit(row, { username: user.username, aksi: 'APPROVE', entityType: 'RabHarian' });
    expect(row.dataBaru.status).toBe('DISETUJUI');
  });

  test('POST /api/akuntan/po -> AuditLog CREATE TransaksiPembelian', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .post('/api/akuntan/po')
      .set('Authorization', `Bearer ${token}`)
      .send({
        periodeId: periode.id,
        tanggal: testDate.toISOString().split('T')[0],
        supplierId,
        items: [{ bahanPokokId: bahanId, qtyTotal: 2, hargaSatuan: 5000 }]
      });
    expect(res.status).toBe(201);
    poId = res.body.data.id;
    expectAudit(await auditRow('TransaksiPembelian', poId), { username: user.username, aksi: 'CREATE', entityType: 'TransaksiPembelian', detailKey: 'rabHarianId' });
  });

  test('PUT /api/aslap/po/:id/approve -> AuditLog APPROVE TransaksiPembelian', async () => {
    // Set status DIREALISASI dulu (prasyarat alur: realisasi belanja oleh Mitra)
    await prismaDb.transaksiPembelian.update({ where: { id: poId }, data: { status: 'DIREALISASI' } });
    const poItems = await prismaDb.transaksiPembelianItem.findMany({
      where: { transaksiId: poId },
      select: { id: true, qty: true }
    });
    const { token, user } = await login('aslap');
    const res = await request(app)
      .put(`/api/aslap/po/${poId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: poItems.map((i) => ({ itemId: i.id, qtyDiterima: Number(i.qty) })) });
    expect(res.status).toBe(200);
    const row = await auditRow('TransaksiPembelian', poId);
    expectAudit(row, { username: user.username, aksi: 'APPROVE', entityType: 'TransaksiPembelian' });
    expect(row.dataBaru.status).toBe('DITERIMA');
  });

  test('DELETE /api/akuntan/rab-harian/:id -> AuditLog DELETE RabHarian', async () => {
    const { token, user } = await login('akuntan');
    const res = await request(app)
      .delete(`/api/akuntan/rab-harian/${rabHarianId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const row = await auditRow('RabHarian', rabHarianId);
    expectAudit(row, { username: user.username, aksi: 'DELETE', entityType: 'RabHarian' });
  });
});
