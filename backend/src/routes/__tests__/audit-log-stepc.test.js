const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

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

describe('STEP C — AuditLog pada 16 Endpoint Mutasi', () => {
  let periode;
  let bahanPokok;
  let supplier;
  const cleanup = {
    nominatif: [],
    kendaraan: [],
    hargaBahan: [],
    buktiLpd2m: [],
    users: [],
    bahanPokok: [],
    supplier: [],
    po: [],
    rabHarian: []
  };

  beforeAll(async () => {
    periode = await prismaDb.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } });
    if (!periode) {
      periode = await prismaDb.periode.create({
        data: {
          tanggalMulai: new Date('2030-01-01'),
          tanggalSelesai: new Date('2030-01-31'),
          status: 'AKTIF'
        }
      });
    }

    bahanPokok = await prismaDb.bahanPokok.create({
      data: { nama: 'Bahan Audit StepC ' + Date.now(), satuan: 'KG', tipePenyimpanan: 'HABIS_HARI_ITU', aktif: true }
    });
    cleanup.bahanPokok.push(bahanPokok.id);

    supplier = await prismaDb.supplier.create({
      data: { nama: 'Supplier Audit StepC ' + Date.now(), kontak: '08123', aktif: true }
    });
    cleanup.supplier.push(supplier.id);
  });

  afterAll(async () => {
    for (const id of cleanup.buktiLpd2m) {
      try {
        const doc = await prismaDb.dokumenBuktiLpd2m.findUnique({ where: { id } });
        if (doc) {
          const abs = path.isAbsolute(doc.filePath) ? doc.filePath : path.join(__dirname, '../../../', doc.filePath);
          if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
          await prismaDb.dokumenBuktiLpd2m.delete({ where: { id } });
        }
      } catch {}
    }
    for (const id of cleanup.nominatif) {
      try {
        await prismaDb.daftarNominatifUpahHarian.deleteMany({ where: { daftarNominatifId: id } });
        await prismaDb.daftarNominatifUpah.delete({ where: { id } });
      } catch {}
    }
    for (const id of cleanup.po) {
      try {
        await prismaDb.transaksiPembelianItem.deleteMany({ where: { transaksiId: id } });
        await prismaDb.transaksiPembelian.delete({ where: { id } });
      } catch {}
    }
    for (const id of cleanup.rabHarian) { try { await prismaDb.rabHarian.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.hargaBahan) { try { await prismaDb.hargaBahanPeriode.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.kendaraan) { try { await prismaDb.kendaraan.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.users) { try { await prismaDb.user.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.supplier) { try { await prismaDb.supplier.delete({ where: { id } }); } catch {} }
    for (const id of cleanup.bahanPokok) { try { await prismaDb.bahanPokok.delete({ where: { id } }); } catch {} }
    await prismaDb.$disconnect();
  });

  // 1. Nominatif Upah (3 endpoints)
  test('POST / PUT / DELETE /api/akuntan/daftar-nominatif-upah -> AuditLog CREATE/UPDATE/DELETE', async () => {
    const { token, user } = await login('akuntan');

    // POST
    const postRes = await request(app)
      .post('/api/akuntan/daftar-nominatif-upah')
      .set('Authorization', `Bearer ${token}`)
      .send({
        periodeId: periode.id,
        jenisPekerjaan: 'Tukang Masak',
        namaRelawan: 'Relawan Audit StepC',
        tarifHarian: 100000,
        danaKesehatan: 50000
      });
    expect(postRes.status).toBe(201);
    const nomId = postRes.body.id;
    cleanup.nominatif.push(nomId);

    const createRow = await auditRow('DaftarNominatifUpah', nomId);
    expectAudit(createRow, { username: user.username, aksi: 'CREATE', entityType: 'DaftarNominatifUpah' });
    expect(createRow.dataBaru.namaRelawan).toBe('Relawan Audit StepC');

    // PUT
    const putRes = await request(app)
      .put(`/api/akuntan/daftar-nominatif-upah/${nomId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ namaRelawan: 'Relawan Audit StepC Updated' });
    expect(putRes.status).toBe(200);

    const updateRow = await auditRow('DaftarNominatifUpah', nomId);
    expectAudit(updateRow, { username: user.username, aksi: 'UPDATE', entityType: 'DaftarNominatifUpah' });
    expect(updateRow.dataBaru.namaRelawan).toBe('Relawan Audit StepC Updated');
    expect(updateRow.dataLama.namaRelawan).toBe('Relawan Audit StepC');

    // DELETE
    const delRes = await request(app)
      .delete(`/api/akuntan/daftar-nominatif-upah/${nomId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const deleteRow = await auditRow('DaftarNominatifUpah', nomId);
    expectAudit(deleteRow, { username: user.username, aksi: 'DELETE', entityType: 'DaftarNominatifUpah' });
    expect(deleteRow.dataLama.namaRelawan).toBe('Relawan Audit StepC Updated');
    expect(deleteRow.dataBaru).toBeNull();
  });

  // 2. Mitra - Bahan Pokok (1 endpoint)
  test('PUT /api/mitra/bahan-pokok/:id -> AuditLog UPDATE BahanPokok', async () => {
    const { token, user } = await login('mitra');

    const res = await request(app)
      .put(`/api/mitra/bahan-pokok/${bahanPokok.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ konversiPerKg: 10, satuanHitungan: 'BUNGKUS' });
    expect(res.status).toBe(200);

    const row = await auditRow('BahanPokok', bahanPokok.id);
    expectAudit(row, { username: user.username, aksi: 'UPDATE', entityType: 'BahanPokok' });
    expect(row.dataBaru.satuanHitungan).toBe('BUNGKUS');
  });

  // 3. Mitra - Kendaraan (3 endpoints)
  test('POST / PUT / DELETE /api/mitra/kendaraan -> AuditLog CREATE/UPDATE/DELETE', async () => {
    const { token, user } = await login('mitra');

    // POST
    const postRes = await request(app)
      .post('/api/mitra/kendaraan')
      .set('Authorization', `Bearer ${token}`)
      .send({ namaKendaraan: 'Mobil Audit StepC ' + Date.now(), platNomor: 'B 1234 AUD', aktif: true });
    expect(postRes.status).toBe(201);
    const kId = postRes.body.id;
    cleanup.kendaraan.push(kId);

    const createRow = await auditRow('Kendaraan', kId);
    expectAudit(createRow, { username: user.username, aksi: 'CREATE', entityType: 'Kendaraan' });
    expect(createRow.dataBaru.platNomor).toBe('B 1234 AUD');

    // PUT
    const putRes = await request(app)
      .put(`/api/mitra/kendaraan/${kId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ platNomor: 'B 9999 AUD' });
    expect(putRes.status).toBe(200);

    const updateRow = await auditRow('Kendaraan', kId);
    expectAudit(updateRow, { username: user.username, aksi: 'UPDATE', entityType: 'Kendaraan' });
    expect(updateRow.dataBaru.platNomor).toBe('B 9999 AUD');
    expect(updateRow.dataLama.platNomor).toBe('B 1234 AUD');

    // DELETE
    const delRes = await request(app)
      .delete(`/api/mitra/kendaraan/${kId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const deleteRow = await auditRow('Kendaraan', kId);
    expectAudit(deleteRow, { username: user.username, aksi: 'DELETE', entityType: 'Kendaraan' });
    expect(deleteRow.dataBaru).toBeNull();
  });

  // 4. Mitra - Harga Bahan Periode (3 endpoints)
  test('POST / PUT / DELETE /api/mitra/harga-bahan -> AuditLog CREATE/UPDATE/DELETE', async () => {
    const { token, user } = await login('mitra');

    // POST
    const postRes = await request(app)
      .post('/api/mitra/harga-bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({ periodeId: periode.id, bahanPokokId: bahanPokok.id, harga: 15000, isFallback: false });
    expect(postRes.status).toBe(201);
    const hId = postRes.body.id;
    cleanup.hargaBahan.push(hId);

    const createRow = await auditRow('HargaBahanPeriode', hId);
    expectAudit(createRow, { username: user.username, aksi: 'CREATE', entityType: 'HargaBahanPeriode' });
    expect(createRow.dataBaru.harga).toBe(15000);

    // PUT
    const putRes = await request(app)
      .put(`/api/mitra/harga-bahan/${hId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ harga: 17500 });
    expect(putRes.status).toBe(200);

    const updateRow = await auditRow('HargaBahanPeriode', hId);
    expectAudit(updateRow, { username: user.username, aksi: 'UPDATE', entityType: 'HargaBahanPeriode' });
    expect(updateRow.dataBaru.harga).toBe(17500);

    // DELETE
    const delRes = await request(app)
      .delete(`/api/mitra/harga-bahan/${hId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const deleteRow = await auditRow('HargaBahanPeriode', hId);
    expectAudit(deleteRow, { username: user.username, aksi: 'DELETE', entityType: 'HargaBahanPeriode' });
    expect(deleteRow.dataBaru).toBeNull();
  });

  // 5. Mitra - PO Realisasi (1 endpoint)
  test('PUT /api/mitra/po/:id/realisasi -> AuditLog UPDATE TransaksiPembelian', async () => {
    // Create RabHarian & PO manually via DB to test realisasi
    const { user: akuntanUser } = await login('akuntan');
    const uniqueOffset = Math.floor(Math.random() * 100000) + 1000;
    const testDate = new Date(Date.now() + uniqueOffset * 86400000);

    const rabHarian = await prismaDb.rabHarian.create({
      data: {
        periode: { connect: { id: periode.id } },
        tanggal: testDate,
        status: 'DISETUJUI',
        createdBy: { connect: { id: akuntanUser.id } }
      }
    });
    const po = await prismaDb.transaksiPembelian.create({
      data: {
        rabHarianId: rabHarian.id,
        tanggal: testDate,
        supplierId: supplier.id,
        createdById: akuntanUser.id,
        status: 'DIAJUKAN',
        items: {
          create: [{ bahanPokokId: bahanPokok.id, qty: 5, hargaSatuan: 10000, subtotal: 50000 }]
        }
      },
      include: { items: true }
    });
    cleanup.po.push(po.id);
    cleanup.rabHarian.push(rabHarian.id);

    const { token: mitraToken, user: mitraUser } = await login('mitra');
    const item = po.items[0];

    const res = await request(app)
      .put(`/api/mitra/po/${po.id}/realisasi`)
      .set('Authorization', `Bearer ${mitraToken}`)
      .send({
        items: [{ itemId: item.id, qtyRealisasi: 5, hargaSatuanRealisasi: 10000 }]
      });
    expect(res.status).toBe(200);

    const row = await auditRow('TransaksiPembelian', po.id);
    expectAudit(row, { username: mitraUser.username, aksi: 'UPDATE', entityType: 'TransaksiPembelian' });
    expect(row.dataLama.status).toBe('DIAJUKAN');
    expect(row.dataBaru.status).toBe('DIREALISASI');
  });

  // 6. Bukti LPD2M (2 endpoints)
  test('POST / DELETE /api/laporan/lpd2m/bukti -> AuditLog CREATE/DELETE DokumenBuktiLpd2m', async () => {
    const { token, user } = await login('akuntan');

    const dummyBuffer = Buffer.from('fake pdf file content stepc');

    // POST
    const postRes = await request(app)
      .post('/api/laporan/lpd2m/bukti')
      .set('Authorization', `Bearer ${token}`)
      .field('periodeId', periode.id)
      .field('namaBukti', 'Bukti Test Audit StepC')
      .field('jenis', 'NOTA_BELANJA')
      .attach('file', dummyBuffer, 'test-stepc.pdf');
    expect(postRes.status).toBe(201);
    const bId = postRes.body.data.id;
    cleanup.buktiLpd2m.push(bId);

    const createRow = await auditRow('DokumenBuktiLpd2m', bId);
    expectAudit(createRow, { username: user.username, aksi: 'CREATE', entityType: 'DokumenBuktiLpd2m' });
    expect(createRow.dataBaru.namaBukti).toBe('Bukti Test Audit StepC');

    // DELETE
    const delRes = await request(app)
      .delete(`/api/laporan/lpd2m/bukti/${bId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const deleteRow = await auditRow('DokumenBuktiLpd2m', bId);
    expectAudit(deleteRow, { username: user.username, aksi: 'DELETE', entityType: 'DokumenBuktiLpd2m' });
    expect(deleteRow.dataBaru).toBeNull();
  });

  // 7. Admin Users (3 endpoints)
  test('POST / PUT / DELETE /api/admin/users -> AuditLog CREATE/UPDATE/DELETE User non-sensitif', async () => {
    const { token, user } = await login('admin');

    const testUsername = 'user_stepc_' + Date.now();

    // POST /users
    const postRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama: 'User StepC', username: testUsername, password: 'password123', role: 'ASLAP' });
    expect(postRes.status).toBe(201);
    const uId = postRes.body.id;
    cleanup.users.push(uId);

    const createRow = await auditRow('User', uId);
    expectAudit(createRow, { username: user.username, aksi: 'CREATE', entityType: 'User' });
    expect(createRow.dataBaru.username).toBe(testUsername);
    expect(createRow.dataBaru.role).toBe('ASLAP');
    expect(JSON.stringify(createRow.dataBaru)).not.toContain('passwordHash');
    expect(JSON.stringify(createRow.dataBaru)).not.toContain('tokenVersion');

    // PUT /users/:id dengan ganti password
    const putRes = await request(app)
      .put(`/api/admin/users/${uId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nama: 'User StepC Updated', password: 'newpassword123' });
    expect(putRes.status).toBe(200);

    const updateRow = await auditRow('User', uId);
    expectAudit(updateRow, { username: user.username, aksi: 'UPDATE', entityType: 'User' });
    expect(updateRow.dataBaru.nama).toBe('User StepC Updated');
    expect(updateRow.dataBaru.passwordChanged).toBe(true);
    expect(JSON.stringify(updateRow.dataBaru)).not.toContain('passwordHash');
    expect(JSON.stringify(updateRow.dataLama)).not.toContain('passwordHash');

    // DELETE /users/:id (soft delete)
    const delRes = await request(app)
      .delete(`/api/admin/users/${uId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const deleteRow = await auditRow('User', uId);
    expectAudit(deleteRow, { username: user.username, aksi: 'DELETE', entityType: 'User' });
    expect(deleteRow.dataBaru.aktif).toBe(false);
    expect(JSON.stringify(deleteRow.dataBaru)).not.toContain('passwordHash');
  });
});
