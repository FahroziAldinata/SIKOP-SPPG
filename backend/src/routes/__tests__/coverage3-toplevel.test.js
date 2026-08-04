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

describe('COVERAGE3 TEST — Top-Level Domain Routes', () => {
  let tokenAkuntan;
  let tokenAdmin;
  let tokenAhliGizi;
  let testPeriodeId;
  let createdBugId = null;
  let createdRabId = null;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAdmin = await login('admin');
    tokenAhliGizi = await login('ahligizi');

    const pStart = new Date(Date.UTC(2042, 0, 1));
    const pEnd = new Date(Date.UTC(2042, 0, 31));

    const existing = await prismaDb.periode.findFirst({
      where: { tanggalMulai: pStart }
    });

    if (existing) {
      await prismaDb.rabHarianItem.deleteMany({ where: { rabHarian: { periodeId: existing.id } } });
      await prismaDb.rabHarian.deleteMany({ where: { periodeId: existing.id } });
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: existing.id } });
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: existing.id } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: existing.id } });
      await prismaDb.periode.deleteMany({ where: { id: existing.id } });
    }

    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: pStart,
        tanggalSelesai: pEnd,
        anggaranAlokasi: 30000000,
        status: 'DRAFT',
      },
    });
    testPeriodeId = periode.id;
  });

  afterAll(async () => {
    if (createdBugId) {
      await prismaDb.notifikasi.deleteMany({ where: { entityType: 'BUG', entityId: createdBugId } });
      await prismaDb.laporanBug.deleteMany({ where: { id: createdBugId } });
    }
    if (createdRabId) {
      await prismaDb.rabHarianItem.deleteMany({ where: { rabHarianId: createdRabId } });
      await prismaDb.rabHarian.deleteMany({ where: { id: createdRabId } });
    }
    if (testPeriodeId) {
      await prismaDb.rabHarianItem.deleteMany({ where: { rabHarian: { periodeId: testPeriodeId } } });
      await prismaDb.rabHarian.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.jurnalTransaksi.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.saldoAwalPeriode.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. Notifikasi
  describe('GET /api/notifikasi & PATCH /api/notifikasi/mark-read', () => {
    test('GET /api/notifikasi — happy 200 (list notifikasi)', async () => {
      const res = await request(app)
        .get('/api/notifikasi')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/notifikasi — 401 tanpa token', async () => {
      const res = await request(app).get('/api/notifikasi');
      expect(res.status).toBe(401);
    });

    test('PATCH /api/notifikasi/mark-read — happy 200', async () => {
      const res = await request(app)
        .patch('/api/notifikasi/mark-read')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('PATCH /api/notifikasi/mark-read — 401 tanpa token', async () => {
      const res = await request(app).patch('/api/notifikasi/mark-read');
      expect(res.status).toBe(401);
    });
  });

  // 2. Laporan Bug
  describe('Laporan Bug endpoints (/api/laporan-bug)', () => {
    test('POST /api/laporan-bug/submit — happy 201', async () => {
      const res = await request(app)
        .post('/api/laporan-bug/submit')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          judul: 'Bug Test Coverage3',
          deskripsi: 'Deskripsi bug test coverage 3',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.judul).toBe('Bug Test Coverage3');
      expect(res.body.status).toBe('BARU');
      createdBugId = res.body.id;
    });

    test('POST /api/laporan-bug/submit — 400 jika judul/deskripsi kosong', async () => {
      const res = await request(app)
        .post('/api/laporan-bug/submit')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ judul: 'Hanya Judul Tanpa Deskripsi' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/wajib diisi/i);
    });

    test('GET /api/laporan-bug — happy 200 (ADMIN)', async () => {
      const res = await request(app)
        .get('/api/laporan-bug')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/laporan-bug — 403 jika role AKUNTAN (non-ADMIN)', async () => {
      const res = await request(app)
        .get('/api/laporan-bug')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(403);
    });

    test('PATCH /api/laporan-bug/:id/status — happy 200 (ADMIN)', async () => {
      expect(createdBugId).toBeTruthy();

      const res = await request(app)
        .patch(`/api/laporan-bug/${createdBugId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'DIPROSES' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DIPROSES');
    });

    test('PATCH /api/laporan-bug/:id/status — 400 jika status enum invalid', async () => {
      expect(createdBugId).toBeTruthy();

      const res = await request(app)
        .patch(`/api/laporan-bug/${createdBugId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'STATUS_TIDAK_VALID' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status harus salah satu dari/i);
    });

    test('PATCH /api/laporan-bug/:id/status — 404 jika ID tidak ada', async () => {
      const res = await request(app)
        .patch('/api/laporan-bug/cuid-bug-non-existent-999/status')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'SELESAI' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tidak ditemukan/i);
    });

    test('PATCH /api/laporan-bug/:id/status — 403 jika non-ADMIN', async () => {
      expect(createdBugId).toBeTruthy();

      const res = await request(app)
        .patch(`/api/laporan-bug/${createdBugId}/status`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ status: 'SELESAI' });

      expect(res.status).toBe(403);
    });
  });

  // 3. Dashboard Summary
  describe('GET /api/dashboard/summary', () => {
    test('happy 200 + assert body structure (AKUNTAN)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('saldoKasBku');
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data).toHaveProperty('totalPenerimaManfaat');
      expect(res.body.data).toHaveProperty('totalEstimasiBiaya');
      expect(res.body.data).toHaveProperty('workflowProgress');
      expect(typeof res.body.data.saldoKasBku).toBe('number');
      expect(typeof res.body.data.totalEstimasiBiaya).toBe('number');
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/periodeId wajib diisi/i);
    });

    test('404 jika periodeId tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .query({ periodeId: 'cuid-periode-non-existent' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Periode tidak ditemukan/i);
    });

    test('401 tanpa token', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .query({ periodeId: testPeriodeId });

      expect(res.status).toBe(401);
    });
  });

  // 4. LPD2M Bukti List
  describe('GET /api/laporan/lpd2m/bukti', () => {
    test('happy 200 — list bukti (AKUNTAN)', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m/bukti')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m/bukti')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/periodeId wajib diisi/i);
    });

    test('403 jika role tidak diizinkan (AHLIGIZI)', async () => {
      const res = await request(app)
        .get('/api/laporan/lpd2m/bukti')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(403);
    });
  });

  // 5. POST /api/akuntan/rab-harian
  describe('POST /api/akuntan/rab-harian', () => {
    test('happy 201 — submit RabHarian valid (AKUNTAN)', async () => {
      const res = await request(app)
        .post('/api/akuntan/rab-harian')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2042-01-15',
          items: []
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.periodeId).toBe(testPeriodeId);
      expect(res.body.status).toBe('DRAFT');
      createdRabId = res.body.id;
    });

    test('400 jika payload invalid (tanpa tanggal)', async () => {
      const res = await request(app)
        .post('/api/akuntan/rab-harian')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId
        });

      expect(res.status).toBe(400);
    });

    test('403 jika role tidak diizinkan (AHLIGIZI)', async () => {
      const res = await request(app)
        .post('/api/akuntan/rab-harian')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          tanggal: '2042-01-16'
        });

      expect(res.status).toBe(403);
    });
  });
});
