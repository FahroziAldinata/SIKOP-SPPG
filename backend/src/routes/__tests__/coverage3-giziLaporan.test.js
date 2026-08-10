const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

async function login(username) {
  let res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'ganti-password-ini' });
  if (res.status !== 200) {
    res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: process.env.TEST_PASSWORD || 'Test@123456' });
  }
  if (res.status !== 200) {
    console.log('LOGIN ERROR:', username, res.status, res.body);
  }
  expect(res.status).toBe(200);
  return res.body.token;
}

function binaryParser(res, callback) {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
}

describe('COVERAGE3 TEST — Gizi Laporan Routes', () => {
  let tokenAhliGizi;
  let tokenKepala;
  let tokenAkuntan;
  let userGiziId;

  let testPeriodeId;
  let testKelompokUmurId;
  let testBahanPokokId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenKepala = await login('kepalasppg');
    tokenAkuntan = await login('akuntan');

    const userGizi = await prismaDb.user.findFirst({ where: { role: 'AHLI_GIZI' } });
    userGiziId = userGizi ? userGizi.id : null;

    // Periode 2036-06
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2036, 5, 1)),
        tanggalSelesai: new Date(Date.UTC(2036, 5, 30)),
        anggaranAlokasi: 50000000,
        status: 'AKTIF'
      }
    });
    testPeriodeId = p.id;

    // Fetch KelompokUmurMenu
    const ku = await prismaDb.kelompokUmurMenu.findFirst();
    testKelompokUmurId = ku ? ku.id : null;

    // Fetch BahanPokok
    const bp = await prismaDb.bahanPokok.findFirst();
    testBahanPokokId = bp ? bp.id : null;

    // Create MenuHarian with status DISETUJUI for report query filtering
    const menu = await prismaDb.menuHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2036, 5, 15)),
        status: 'DISETUJUI'
      }
    });

    if (testKelompokUmurId) {
      const blok = await prismaDb.menuHarianBlok.create({
        data: {
          menuHarianId: menu.id,
          kelompokUmurMenuId: testKelompokUmurId,
          createdById: userGiziId
        }
      });

      const item = await prismaDb.menuItem.create({
        data: {
          blokId: blok.id,
          namaMenu: 'Menu Laporan Gizi Test',
          komponen: 'KARBOHIDRAT'
        }
      });

      if (testBahanPokokId) {
        await prismaDb.menuItemBahan.create({
          data: {
            menuItemId: item.id,
            bahanPokokId: testBahanPokokId,
            beratBersihGr: 100,
            bddPersen: 100,
            beratKotorGr: 100,
            hargaSatuan: 10000,
            beratSatuanGr: 1000,
            totalHargaBahan: 1000,
            energiKkal: 200,
            proteinGr: 10,
            lemakGr: 5,
            karbohidratGr: 40,
            seratGr: 2
          }
        });
      }

      await prismaDb.menuTargetGizi.create({
        data: {
          blokId: blok.id,
          targetEnergi: 500,
          targetProtein: 20,
          targetLemak: 15,
          targetKarbohidrat: 60,
          targetSerat: 5
        }
      });

      await prismaDb.menuOrganoleptik.create({
        data: {
          blokId: blok.id,
          rasa: 'Enak',
          aroma: 'Harum',
          tekstur: 'Lembut',
          suhuSaji: 'Hangat',
          catatan: 'Laporan Test'
        }
      });
    }
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.menuItemBahan.deleteMany({
        where: { menuItem: { blok: { menuHarian: { periodeId: testPeriodeId } } } }
      });
      await prismaDb.menuOrganoleptik.deleteMany({
        where: { blok: { menuHarian: { periodeId: testPeriodeId } } }
      });
      await prismaDb.menuTargetGizi.deleteMany({
        where: { blok: { menuHarian: { periodeId: testPeriodeId } } }
      });
      await prismaDb.menuItem.deleteMany({
        where: { blok: { menuHarian: { periodeId: testPeriodeId } } }
      });
      await prismaDb.menuHarianBlok.deleteMany({
        where: { menuHarian: { periodeId: testPeriodeId } }
      });
      await prismaDb.menuHarian.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. Pemenuhan Gizi: GET /api/gizi/laporan/pemenuhan-gizi & /pdf
  describe('Laporan Pemenuhan Gizi', () => {
    test('GET /api/gizi/laporan/pemenuhan-gizi — happy 200 (AHLI_GIZI)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi — happy 200 (KEPALA_SPPG)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenKepala}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi — 400 tanpa tanggalMulai/tanggalSelesai', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/inline; filename=/);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi/pdf — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/pemenuhan-gizi/pdf — 400 tanpa tanggalMulai/tanggalSelesai', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/pemenuhan-gizi/pdf')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });
  });

  // 2. Rekap Menu: GET /api/gizi/laporan/rekap-menu & /pdf
  describe('Laporan Rekap Menu', () => {
    test('GET /api/gizi/laporan/rekap-menu — happy 200 (AHLI_GIZI)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/gizi/laporan/rekap-menu — happy 200 (KEPALA_SPPG)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenKepala}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/gizi/laporan/rekap-menu — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/rekap-menu — 400 tanpa tanggalMulai/tanggalSelesai', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/laporan/rekap-menu/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/inline; filename=/);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/gizi/laporan/rekap-menu/pdf — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/rekap-menu/pdf — 400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/rekap-menu/pdf')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });
  });

  // 3. Organoleptik: GET /api/gizi/laporan/organoleptik & /pdf
  describe('Laporan Organoleptik', () => {
    test('GET /api/gizi/laporan/organoleptik — happy 200 (AHLI_GIZI)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/gizi/laporan/organoleptik — happy 200 (KEPALA_SPPG)', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenKepala}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/gizi/laporan/organoleptik — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/organoleptik — 400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/laporan/organoleptik/pdf — happy 200', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/inline; filename=/);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/gizi/laporan/organoleptik/pdf — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik/pdf')
        .query({ tanggalMulai: '2036-06-01', tanggalSelesai: '2036-06-30' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/laporan/organoleptik/pdf — 400 tanpa query param', async () => {
      const res = await request(app)
        .get('/api/gizi/laporan/organoleptik/pdf')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(400);
    });
  });
});
