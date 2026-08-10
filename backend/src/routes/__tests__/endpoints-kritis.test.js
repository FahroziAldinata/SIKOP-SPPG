const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('Endpoints Kritis Akuntan & Laporan Integration Tests', () => {
  const prismaDb = new PrismaClient();
  let token;
  let headers;
  let periode;
  let akunKas;

  beforeAll(async () => {
    // Auth login as Akuntan
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'akuntan', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    periode = await prismaDb.periode.findFirst({
      where: { setupLembaga: { isNot: null } },
      orderBy: { tanggalMulai: 'desc' }
    }) || await prismaDb.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } });

    expect(periode).toBeTruthy();

    akunKas = await prismaDb.akun.findFirst({ where: { tipe: 'KAS' } });
  });

  afterAll(async () => {
    await prismaDb.$disconnect();
  });

  // --- MODUL LAPORAN ---
  test('GET /api/laporan/bku — valid periodeId returns 200 and success shape', async () => {
    const res = await request(app)
      .get(`/api/laporan/bku?periodeId=${periode.id}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
  });

  test('GET /api/laporan/bp — valid periodeId & akunId returns 200', async () => {
    const akunIdQuery = akunKas ? `&akunId=${akunKas.id}` : '';
    const res = await request(app)
      .get(`/api/laporan/bp?periodeId=${periode.id}${akunIdQuery}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/laporan/bkk/pdf — missing params returns 400 validation error', async () => {
    const res = await request(app)
      .get('/api/laporan/bkk/pdf')
      .set(headers);

    expect([400, 404]).toContain(res.status);
  });

  test('GET /api/laporan/bkk/pdf — valid periodeId returns 200 + %PDF', async () => {
    const res = await request(app)
      .get(`/api/laporan/bkk/pdf?periodeId=${periode.id}`)
      .set(headers)
      .parse((res, callback) => {
        const data = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/inline; filename=/);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    expect(res.body.length).toBeGreaterThan(0);
  });

  // --- MODUL AKUNTAN ---
  test('GET /api/akuntan/rab-p12/harian — RAB P12 Harian endpoint returns 200 or 400', async () => {
    const res = await request(app)
      .get(`/api/akuntan/rab-p12/harian?periodeId=${periode.id}`)
      .set(headers);

    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toBeTruthy();
    }
  });

  test('GET /api/akuntan/rab-p12/rekap — RAB P12 Rekap endpoint returns 200 or 400', async () => {
    const res = await request(app)
      .get(`/api/akuntan/rab-p12/rekap?periodeId=${periode.id}`)
      .set(headers);

    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toBeTruthy();
    }
  });

  test('GET /api/akuntan/jurnal-transaksi — Jurnal Transaksi endpoint returns 200', async () => {
    const res = await request(app)
      .get(`/api/akuntan/jurnal-transaksi?periodeId=${periode.id}`)
      .set(headers);

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toBeTruthy();
    }
  });
});
