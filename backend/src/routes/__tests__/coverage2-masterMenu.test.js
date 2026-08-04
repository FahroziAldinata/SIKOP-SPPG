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

describe('COVERAGE2 TEST — Gizi Master Menu Routes (7 endpoints)', () => {
  let tokenAhliGizi;
  let tokenAkuntan;
  let tokenMitra;

  let testPeriodeId;
  let testMasterMenuId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    // Create unique test period in 2038-01
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 0, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 0, 31)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga Test Master Menu',
            alamat: 'Jl Master Menu 123',
            namaKepalaSPPG: 'Kepala Test MM',
            namaAkuntanSPPG: 'Akuntan Test MM',
            namaYayasan: 'Yayasan Test MM',
            ketuaYayasan: 'Ketua Test MM',
            nomorRekeningVA: '1234567891',
            tahunAnggaran: 2038,
            awalPeriodeBerikutnya: new Date(Date.UTC(2038, 1, 1)),
            tanggalPelaporan: new Date(Date.UTC(2038, 0, 31)),
            tempatPelaporan: 'Jakarta'
          }
        }
      }
    });
    testPeriodeId = p.id;

    // Pre-create 1 MasterMenuMingguan row
    const userAhliGizi = await prismaDb.user.findFirst({ where: { username: 'ahligizi' } });
    const createdMM = await prismaDb.masterMenuMingguan.create({
      data: {
        periodeId: testPeriodeId,
        jalur: 'SISWA',
        hari: 'SENIN',
        mingguKe: 1,
        catatan: 'Setup awal test',
        menuKarbohidrat: 'Nasi Putih',
        menuLaukHewani: 'Ayam Goreng',
        menuLaukNabati: 'Tahu Tempe',
        menuSayur: 'Sayur Asem',
        menuBuah: 'Pisang',
        createdById: userAhliGizi.id
      }
    });
    testMasterMenuId = createdMM.id;
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.masterMenuMingguan.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/gizi/master-menu
  describe('GET /api/gizi/master-menu', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('400 tanpa periodeId / blokId', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 2. GET /api/gizi/master-menu/by-hari
  describe('GET /api/gizi/master-menu/by-hari', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu/by-hari')
        .query({ periodeId: testPeriodeId, jalur: 'SISWA', hari: 'SENIN', mingguKe: 1 })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testMasterMenuId);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu/by-hari')
        .query({ periodeId: testPeriodeId, jalur: 'SISWA', hari: 'SENIN' })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('400 query param invalid', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu/by-hari')
        .query({ periodeId: testPeriodeId, jalur: 'INVALID', hari: 'SENIN' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });
  });

  // 3. GET /api/gizi/master-menu-list
  describe('GET /api/gizi/master-menu-list', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu-list')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu-list')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('400 tanpa periodeId', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu-list')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });
  });

  // 4. GET /api/gizi/master-menu/:id
  describe('GET /api/gizi/master-menu/:id', () => {
    test('happy 404 jika id blok tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu/non-existent-blok-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/gizi/master-menu/some-id')
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });
  });

  // 5. POST /api/gizi/master-menu
  describe('POST /api/gizi/master-menu', () => {
    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/master-menu')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          jalur: 'SISWA',
          hari: 'SELASA',
          mingguKe: 1,
          menuKarbohidrat: 'Nasi Kuning',
          menuLaukHewani: 'Telur Balado'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    test('403 role AKUNTAN tidak diizinkan create master menu', async () => {
      const res = await request(app)
        .post('/api/gizi/master-menu')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          jalur: 'SISWA',
          hari: 'RABU',
          mingguKe: 1
        });
      expect(res.status).toBe(403);
    });

    test('404 periode tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/master-menu')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: 'non-existent-periode-id',
          jalur: 'SISWA',
          hari: 'RABU',
          mingguKe: 1
        });
      expect(res.status).toBe(404);
    });
  });

  // 6. PUT /api/gizi/master-menu/:id
  describe('PUT /api/gizi/master-menu/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/master-menu/${testMasterMenuId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          catatan: 'Catatan updated'
        });
      expect(res.status).toBe(200);
      expect(res.body.catatan).toBe('Catatan updated');
    });

    test('403 role AKUNTAN tidak diizinkan update', async () => {
      const res = await request(app)
        .put(`/api/gizi/master-menu/${testMasterMenuId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ catatan: 'Update' });
      expect(res.status).toBe(403);
    });

    test('404 master menu tidak ditemukan', async () => {
      const res = await request(app)
        .put('/api/gizi/master-menu/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ catatan: 'Update' });
      expect(res.status).toBe(404);
    });
  });

  // 7. DELETE /api/gizi/master-menu/:id
  describe('DELETE /api/gizi/master-menu/:id', () => {
    test('403 role AKUNTAN tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/gizi/master-menu/${testMasterMenuId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('404 master menu tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/gizi/master-menu/non-existent-id')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/master-menu/${testMasterMenuId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
