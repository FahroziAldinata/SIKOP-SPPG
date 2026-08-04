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

describe('COVERAGE3 TEST — Gizi Menu Sub-Modul Routes', () => {
  let tokenAhliGizi;
  let tokenAkuntan;
  let tokenMitra;
  let userGiziId;

  let testPeriodeId;
  let testKelompokUmurId;
  let testKelompokUmurId2;
  let testBahanPokokId;
  let testMasterTargetId;

  let testMenuHarianId;
  let testBlokId;

  beforeAll(async () => {
    tokenAhliGizi = await login('ahligizi');
    tokenAkuntan = await login('akuntan');
    tokenMitra = await login('mitra');

    const userGizi = await prismaDb.user.findFirst({ where: { role: 'AHLI_GIZI' } });
    userGiziId = userGizi ? userGizi.id : null;

    // Periode 2035-01
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2035, 0, 1)),
        tanggalSelesai: new Date(Date.UTC(2035, 0, 31)),
        anggaranAlokasi: 50000000,
        status: 'AKTIF'
      }
    });
    testPeriodeId = p.id;

    // Fetch KelompokUmurMenu
    const kuList = await prismaDb.kelompokUmurMenu.findMany({ take: 2 });
    testKelompokUmurId = kuList[0]?.id || null;
    testKelompokUmurId2 = kuList[1]?.id || kuList[0]?.id || null;

    // Fetch BahanPokok
    const bp = await prismaDb.bahanPokok.findFirst();
    testBahanPokokId = bp ? bp.id : null;

    // Fetch or create MasterTargetGizi
    if (testKelompokUmurId) {
      let mt = await prismaDb.masterTargetGizi.findUnique({
        where: { kelompokUmurMenuId: testKelompokUmurId }
      });
      if (!mt) {
        mt = await prismaDb.masterTargetGizi.create({
          data: {
            kelompokUmurMenuId: testKelompokUmurId,
            energiKkal: 2000,
            proteinGr: 60,
            lemakGr: 50,
            karbohidratGr: 250,
            seratGr: 25
          }
        });
      }
      testMasterTargetId = mt.id;
    }

    // Create MenuHarian
    const menu = await prismaDb.menuHarian.create({
      data: {
        periodeId: testPeriodeId,
        tanggal: new Date(Date.UTC(2035, 0, 15)),
        status: 'DISETUJUI'
      }
    });
    testMenuHarianId = menu.id;

    // Create MenuHarianBlok for testing items/targets/organoleptik
    const blok = await prismaDb.menuHarianBlok.create({
      data: {
        menuHarianId: testMenuHarianId,
        kelompokUmurMenuId: testKelompokUmurId,
        createdById: userGiziId
      }
    });
    testBlokId = blok.id;
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

  // 1. menuHarianBlok: POST /api/gizi/menu-harian-blok, DELETE /api/gizi/menu-harian-blok/:id
  describe('menuHarianBlok', () => {
    let createdBlokId;

    test('POST /api/gizi/menu-harian-blok — happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian-blok')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuHarianId: testMenuHarianId,
          kelompokUmurMenuId: testKelompokUmurId2
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdBlokId = res.body.id;
    });

    test('POST /api/gizi/menu-harian-blok — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian-blok')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          menuHarianId: testMenuHarianId,
          kelompokUmurMenuId: testKelompokUmurId2
        });
      expect(res.status).toBe(403);
    });

    test('POST /api/gizi/menu-harian-blok — 404 menuHarianId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian-blok')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuHarianId: 'clxxxxxxxxxxxxxxxxx01',
          kelompokUmurMenuId: testKelompokUmurId
        });
      expect(res.status).toBe(404);
    });

    test('POST /api/gizi/menu-harian-blok — 400 validation error', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-harian-blok')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({});
      expect(res.status).toBe(400);
    });

    test('DELETE /api/gizi/menu-harian-blok/:id — happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-harian-blok/${createdBlokId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/gizi/menu-harian-blok/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-harian-blok/${testBlokId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('DELETE /api/gizi/menu-harian-blok/:id — 404', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-harian-blok/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 2. menuItem: GET /api/gizi/menu-item/:id, POST, PUT, DELETE
  describe('menuItem', () => {
    let createdMenuItemId;

    test('POST /api/gizi/menu-item — happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          namaMenu: 'Ayam Goreng Lengkuas',
          komponen: 'LAUK_HEWANI'
        });
      expect(res.status).toBe(201);
      expect(res.body.namaMenu).toBe('Ayam Goreng Lengkuas');
      createdMenuItemId = res.body.id;
    });

    test('POST /api/gizi/menu-item — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          blokId: testBlokId,
          namaMenu: 'Nasi Putih'
        });
      expect(res.status).toBe(403);
    });

    test('POST /api/gizi/menu-item — 404 blokId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: 'clxxxxxxxxxxxxxxxxx01',
          namaMenu: 'Nasi Putih'
        });
      expect(res.status).toBe(404);
    });

    test('POST /api/gizi/menu-item — 400 komponen invalid', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          namaMenu: 'Nasi Putih',
          komponen: 'INVALID_KOMPONEN'
        });
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/menu-item/:id — happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-item/${createdMenuItemId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdMenuItemId);
    });

    test('GET /api/gizi/menu-item/:id — 403 role MITRA', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-item/${createdMenuItemId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/menu-item/:id — 404', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-item/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-item/:id — happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-item/${createdMenuItemId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          namaMenu: 'Ayam Bakar Madu',
          komponen: 'LAUK_HEWANI'
        });
      expect(res.status).toBe(200);
      expect(res.body.namaMenu).toBe('Ayam Bakar Madu');
    });

    test('PUT /api/gizi/menu-item/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-item/${createdMenuItemId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ namaMenu: 'Update Test' });
      expect(res.status).toBe(403);
    });

    test('PUT /api/gizi/menu-item/:id — 404', async () => {
      const res = await request(app)
        .put('/api/gizi/menu-item/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ namaMenu: 'Update Test' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/gizi/menu-item/:id — happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-item/${createdMenuItemId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/gizi/menu-item/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-item/${testBlokId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('DELETE /api/gizi/menu-item/:id — 404', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-item/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 3. menuItemBahan: GET /api/gizi/menu-item-bahan/:id, POST, PUT, DELETE
  describe('menuItemBahan', () => {
    let testMenuItemId;
    let createdBahanId;

    beforeAll(async () => {
      const item = await prismaDb.menuItem.create({
        data: {
          blokId: testBlokId,
          namaMenu: 'Tahu Goreng Test',
          komponen: 'LAUK_NABATI'
        }
      });
      testMenuItemId = item.id;
    });

    test('POST /api/gizi/menu-item-bahan — happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item-bahan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuItemId: testMenuItemId,
          bahanPokokId: testBahanPokokId,
          beratBersihGr: 100,
          bddPersen: 100,
          beratSatuanGr: 1000,
          energiKkal: 150,
          proteinGr: 8,
          lemakGr: 4,
          karbohidratGr: 10,
          seratGr: 2
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdBahanId = res.body.id;
    });

    test('POST /api/gizi/menu-item-bahan — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item-bahan')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          menuItemId: testMenuItemId,
          bahanPokokId: testBahanPokokId,
          beratBersihGr: 100,
          bddPersen: 100,
          beratSatuanGr: 1000,
          energiKkal: 150,
          proteinGr: 8,
          lemakGr: 4,
          karbohidratGr: 10,
          seratGr: 2
        });
      expect(res.status).toBe(403);
    });

    test('POST /api/gizi/menu-item-bahan — 404 menuItemId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item-bahan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuItemId: 'clxxxxxxxxxxxxxxxxx01',
          bahanPokokId: testBahanPokokId,
          beratBersihGr: 100,
          bddPersen: 100,
          beratSatuanGr: 1000,
          energiKkal: 150,
          proteinGr: 8,
          lemakGr: 4,
          karbohidratGr: 10,
          seratGr: 2
        });
      expect(res.status).toBe(404);
    });

    test('POST /api/gizi/menu-item-bahan — 400 validation error (beratBersihGr negatif)', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-item-bahan')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          menuItemId: testMenuItemId,
          bahanPokokId: testBahanPokokId,
          beratBersihGr: -10,
          bddPersen: 100,
          beratSatuanGr: 1000,
          energiKkal: 150,
          proteinGr: 8,
          lemakGr: 4,
          karbohidratGr: 10,
          seratGr: 2
        });
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/menu-item-bahan/:id — happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdBahanId);
    });

    test('GET /api/gizi/menu-item-bahan/:id — 403 role MITRA', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/menu-item-bahan/:id — 404', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-item-bahan/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-item-bahan/:id — happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          beratBersihGr: 120
        });
      expect(res.status).toBe(200);
      expect(Number(res.body.beratBersihGr)).toBe(120);
    });

    test('PUT /api/gizi/menu-item-bahan/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ beratBersihGr: 120 });
      expect(res.status).toBe(403);
    });

    test('PUT /api/gizi/menu-item-bahan/:id — 404', async () => {
      const res = await request(app)
        .put('/api/gizi/menu-item-bahan/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ beratBersihGr: 120 });
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-item-bahan/:id — 400 validation error (bddPersen > 100)', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ bddPersen: 150 });
      expect(res.status).toBe(400);
    });

    test('DELETE /api/gizi/menu-item-bahan/:id — happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-item-bahan/${createdBahanId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/gizi/menu-item-bahan/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-item-bahan/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('DELETE /api/gizi/menu-item-bahan/:id — 404', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-item-bahan/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 4. menuTargetGizi: GET /api/gizi/menu-target-gizi/:id, POST, PUT, DELETE
  describe('menuTargetGizi', () => {
    let createdTargetId;

    test('POST /api/gizi/menu-target-gizi — happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-target-gizi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          targetEnergi: 600,
          targetProtein: 25,
          targetLemak: 15,
          targetKarbohidrat: 70,
          targetSerat: 5
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdTargetId = res.body.id;
    });

    test('POST /api/gizi/menu-target-gizi — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-target-gizi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          blokId: testBlokId,
          targetEnergi: 600,
          targetProtein: 25,
          targetLemak: 15,
          targetKarbohidrat: 70,
          targetSerat: 5
        });
      expect(res.status).toBe(403);
    });

    test('POST /api/gizi/menu-target-gizi — 404 blokId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-target-gizi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: 'clxxxxxxxxxxxxxxxxx01',
          targetEnergi: 600,
          targetProtein: 25,
          targetLemak: 15,
          targetKarbohidrat: 70,
          targetSerat: 5
        });
      expect(res.status).toBe(404);
    });

    test('POST /api/gizi/menu-target-gizi — 400 targetEnergi negatif', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-target-gizi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          targetEnergi: -10,
          targetProtein: 25,
          targetLemak: 15,
          targetKarbohidrat: 70,
          targetSerat: 5
        });
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/menu-target-gizi/:id — happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdTargetId);
    });

    test('GET /api/gizi/menu-target-gizi/:id — 403 role MITRA', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/menu-target-gizi/:id — 404', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-target-gizi/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-target-gizi/:id — happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          targetEnergi: 650
        });
      expect(res.status).toBe(200);
      expect(Number(res.body.targetEnergi)).toBe(650);
    });

    test('PUT /api/gizi/menu-target-gizi/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ targetEnergi: 650 });
      expect(res.status).toBe(403);
    });

    test('PUT /api/gizi/menu-target-gizi/:id — 404', async () => {
      const res = await request(app)
        .put('/api/gizi/menu-target-gizi/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ targetEnergi: 650 });
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-target-gizi/:id — 400 targetEnergi negatif', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ targetEnergi: -10 });
      expect(res.status).toBe(400);
    });

    test('DELETE /api/gizi/menu-target-gizi/:id — happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-target-gizi/${createdTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/gizi/menu-target-gizi/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-target-gizi/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('DELETE /api/gizi/menu-target-gizi/:id — 404', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-target-gizi/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 5. menuOrganoleptik: GET /api/gizi/menu-organoleptik/:id, POST, PUT, DELETE
  describe('menuOrganoleptik', () => {
    let createdOrgId;

    test('POST /api/gizi/menu-organoleptik — happy 201', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-organoleptik')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          rasa: 'Gurih Manis',
          aroma: 'Harum Sedap',
          tekstur: 'Lembut',
          suhuSaji: 'Hangat (60C)',
          catatan: 'Organoleptik test',
          jumlahOmpreng: 5
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdOrgId = res.body.id;
    });

    test('POST /api/gizi/menu-organoleptik — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-organoleptik')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          blokId: testBlokId,
          rasa: 'Enak',
          aroma: 'Sedap',
          tekstur: 'Pas',
          suhuSaji: 'Hangat'
        });
      expect(res.status).toBe(403);
    });

    test('POST /api/gizi/menu-organoleptik — 404 blokId tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-organoleptik')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: 'clxxxxxxxxxxxxxxxxx01',
          rasa: 'Enak',
          aroma: 'Sedap',
          tekstur: 'Pas',
          suhuSaji: 'Hangat'
        });
      expect(res.status).toBe(404);
    });

    test('POST /api/gizi/menu-organoleptik — 400 rasa kosong', async () => {
      const res = await request(app)
        .post('/api/gizi/menu-organoleptik')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          blokId: testBlokId,
          rasa: '',
          aroma: 'Sedap',
          tekstur: 'Pas',
          suhuSaji: 'Hangat'
        });
      expect(res.status).toBe(400);
    });

    test('GET /api/gizi/menu-organoleptik/:id — happy 200', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdOrgId);
    });

    test('GET /api/gizi/menu-organoleptik/:id — 403 role MITRA', async () => {
      const res = await request(app)
        .get(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenMitra}`);
      expect(res.status).toBe(403);
    });

    test('GET /api/gizi/menu-organoleptik/:id — 404', async () => {
      const res = await request(app)
        .get('/api/gizi/menu-organoleptik/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-organoleptik/:id — happy 200', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          rasa: 'Sangat Lezat'
        });
      expect(res.status).toBe(200);
      expect(res.body.rasa).toBe('Sangat Lezat');
    });

    test('PUT /api/gizi/menu-organoleptik/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ rasa: 'Test' });
      expect(res.status).toBe(403);
    });

    test('PUT /api/gizi/menu-organoleptik/:id — 404', async () => {
      const res = await request(app)
        .put('/api/gizi/menu-organoleptik/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ rasa: 'Test' });
      expect(res.status).toBe(404);
    });

    test('PUT /api/gizi/menu-organoleptik/:id — 400 jumlahOmpreng <= 0', async () => {
      const res = await request(app)
        .put(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ jumlahOmpreng: 0 });
      expect(res.status).toBe(400);
    });

    test('DELETE /api/gizi/menu-organoleptik/:id — happy 200', async () => {
      const res = await request(app)
        .delete(`/api/gizi/menu-organoleptik/${createdOrgId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/gizi/menu-organoleptik/:id — 403 role AKUNTAN', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-organoleptik/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(403);
    });

    test('DELETE /api/gizi/menu-organoleptik/:id — 404', async () => {
      const res = await request(app)
        .delete('/api/gizi/menu-organoleptik/clxxxxxxxxxxxxxxxxx01')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(404);
    });
  });

  // 6. masterTargetGizi: PUT /api/gizi/master-target/:id
  describe('masterTargetGizi', () => {
    test('PUT /api/gizi/master-target/:id — happy 200', async () => {
      if (!testMasterTargetId) return;
      const res = await request(app)
        .put(`/api/gizi/master-target/${testMasterTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          energiKkal: 2100,
          proteinGr: 65,
          lemakGr: 55,
          karbohidratGr: 260,
          seratGr: 28
        });
      expect(res.status).toBe(200);
      expect(Number(res.body.energiKkal)).toBe(2100);
    });

    test('PUT /api/gizi/master-target/:id — 403 role AKUNTAN', async () => {
      if (!testMasterTargetId) return;
      const res = await request(app)
        .put(`/api/gizi/master-target/${testMasterTargetId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ energiKkal: 2100 });
      expect(res.status).toBe(403);
    });

    test('PUT /api/gizi/master-target/:id — 400 validation error (energiKkal negatif)', async () => {
      if (!testMasterTargetId) return;
      const res = await request(app)
        .put(`/api/gizi/master-target/${testMasterTargetId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({ energiKkal: -50 });
      expect(res.status).toBe(400);
    });
  });
});
