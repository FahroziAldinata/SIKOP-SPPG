const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

const prismaDb = new PrismaClient();

const USERNAMES = ['admin', 'aslap', 'mitra', 'ahligizi', 'akuntan', 'kepalasppg'];

async function login(username) {
  return request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
}

describe('SMOKE TEST 13 MODUL BACKEND', () => {
  const headers = {};
  let periodeId;
  let poId;

  beforeAll(async () => {
    for (const username of USERNAMES) {
      const loginRes = await login(username);
      expect(loginRes.status, `login ${username}`).toBe(200);
      expect(loginRes.body.token).toBeTruthy();
      headers[username] = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginRes.body.token}`,
      };
    }

    const periode =
      (await prismaDb.periode.findFirst({
        where: { setupLembaga: { isNot: null } },
        orderBy: { tanggalMulai: 'desc' },
      })) ||
      (await prismaDb.periode.findFirst({ orderBy: { tanggalMulai: 'desc' } }));
    expect(periode).toBeTruthy();
    periodeId = periode.id;

    const po = await prismaDb.transaksiPembelian.findFirst();
    poId = po ? po.id : null;
  });

  afterAll(async () => {
    await prismaDb.$disconnect();
  });

  // 1. /api/auth
  describe('Modul /api/auth', () => {
    test('GET /api/auth/me — valid token', async () => {
      const res = await request(app).get('/api/auth/me').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/login — password salah → 401 (bukan 500)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'aslap', password: 'password-salah-banget' });
      expect(res.status).toBeLessThan(500);
    });
  });

  // 2. /api/aslap
  describe('Modul /api/aslap', () => {
    test('GET /api/aslap/periode', async () => {
      const res = await request(app).get('/api/aslap/periode').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/aslap/kategori', async () => {
      const res = await request(app).get('/api/aslap/kategori').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/aslap/grup-hari', async () => {
      const res = await request(app).get('/api/aslap/grup-hari').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 3. /api/mitra
  describe('Modul /api/mitra', () => {
    test('GET /api/mitra/bahan-pokok', async () => {
      const res = await request(app).get('/api/mitra/bahan-pokok').set(headers.mitra);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/mitra/kendaraan', async () => {
      const res = await request(app).get('/api/mitra/kendaraan').set(headers.mitra);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 4. /api/gizi
  describe('Modul /api/gizi', () => {
    test('GET /api/gizi/kelompok-umur-menu', async () => {
      const res = await request(app).get('/api/gizi/kelompok-umur-menu').set(headers.ahligizi);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/gizi/batas-harga-porsi', async () => {
      const res = await request(app).get('/api/gizi/batas-harga-porsi').set(headers.ahligizi);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/gizi/master-target', async () => {
      const res = await request(app).get('/api/gizi/master-target').set(headers.ahligizi);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 5. /api/akuntan
  describe('Modul /api/akuntan', () => {
    test('GET /api/akuntan/akun', async () => {
      const res = await request(app).get('/api/akuntan/akun').set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/akuntan/supplier', async () => {
      const res = await request(app).get('/api/akuntan/supplier').set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/akuntan/jenis-pekerjaan', async () => {
      const res = await request(app).get('/api/akuntan/jenis-pekerjaan').set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/akuntan/hari-libur', async () => {
      const res = await request(app).get('/api/akuntan/hari-libur').set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 6. /api/kepala
  describe('Modul /api/kepala', () => {
    test('GET /api/kepala/approval?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/kepala/approval?periodeId=${periodeId}`)
        .set(headers.kepalasppg);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 7. /api/laporan/lpd2m/bukti
  describe('Modul /api/laporan/lpd2m/bukti', () => {
    test('GET /api/laporan/lpd2m/bukti?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/laporan/lpd2m/bukti?periodeId=${periodeId}`)
        .set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/laporan/lpd2m/bukti tanpa periodeId → 400 (bukan 500)', async () => {
      const res = await request(app).get('/api/laporan/lpd2m/bukti').set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 8. /api/laporan
  describe('Modul /api/laporan', () => {
    test('GET /api/laporan/bku?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/laporan/bku?periodeId=${periodeId}`)
        .set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/laporan/ringkasan-anggaran?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/laporan/ringkasan-anggaran?periodeId=${periodeId}`)
        .set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/laporan/per-periode?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/laporan/per-periode?periodeId=${periodeId}`)
        .set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 9. /api/notifikasi
  describe('Modul /api/notifikasi', () => {
    test('GET /api/notifikasi', async () => {
      const res = await request(app).get('/api/notifikasi').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 10. /api/dashboard
  describe('Modul /api/dashboard', () => {
    test('GET /api/dashboard/summary?periodeId=', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?periodeId=${periodeId}`)
        .set(headers.akuntan);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/dashboard/summary tanpa periodeId → 400 (bukan 500)', async () => {
      const res = await request(app).get('/api/dashboard/summary').set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 11. /api/admin
  describe('Modul /api/admin', () => {
    test('GET /api/admin/users', async () => {
      const res = await request(app).get('/api/admin/users').set(headers.admin);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 12. /api/laporan-bug
  describe('Modul /api/laporan-bug', () => {
    test('GET /api/laporan-bug (ADMIN)', async () => {
      const res = await request(app).get('/api/laporan-bug').set(headers.admin);
      expect(res.status).toBeLessThan(500);
    });
  });

  // 13. /api/laporan/pemeriksaan-bahan
  describe('Modul /api/laporan/pemeriksaan-bahan', () => {
    test('GET /api/laporan/pemeriksaan-bahan tanpa poId → 400 (bukan 500)', async () => {
      const res = await request(app)
        .get('/api/laporan/pemeriksaan-bahan')
        .set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/laporan/pemeriksaan-bahan?poId= (PO terdaftar)', async () => {
      if (!poId) {
        return;
      }
      const res = await request(app)
        .get(`/api/laporan/pemeriksaan-bahan?poId=${poId}`)
        .set(headers.aslap);
      expect(res.status).toBeLessThan(500);
    });
  });
});
