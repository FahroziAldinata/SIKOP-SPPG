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

describe('COVERAGE2 TEST — Akuntan Dokumen Resmi Routes (4 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    // Periode 2038-07 dengan setupLembaga
    const p = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date(Date.UTC(2038, 6, 1)),
        tanggalSelesai: new Date(Date.UTC(2038, 6, 31)),
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga Test Dokumen Resmi',
            alamat: 'Jl Dokumen 123',
            namaKepalaSPPG: 'Kepala Test Dok',
            namaAkuntanSPPG: 'Akuntan Test Dok',
            namaYayasan: 'Yayasan Test Dok',
            ketuaYayasan: 'Ketua Test Dok',
            nomorRekeningVA: '1234567892',
            tahunAnggaran: 2038,
            awalPeriodeBerikutnya: new Date(Date.UTC(2038, 7, 1)),
            tanggalPelaporan: new Date(Date.UTC(2038, 6, 31)),
            tempatPelaporan: 'Jakarta'
          }
        }
      }
    });
    testPeriodeId = p.id;

    const userAkuntan = await prismaDb.user.findFirst({ where: { username: 'akuntan' } });

    // Pre-create 1 DokumenResmi (jenis: LPA)
    await prismaDb.dokumenResmi.create({
      data: {
        periodeId: testPeriodeId,
        jenisDokumen: 'LPA',
        nomorDokumen: 'LPA/2038/001',
        createdById: userAkuntan.id
      }
    });
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.auditLog.deleteMany({
        where: { entityType: 'DokumenResmi' }
      });
      await prismaDb.dokumenResmi.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. GET /api/akuntan/dokumen-resmi/generate
  describe('GET /api/akuntan/dokumen-resmi/generate', () => {
    test('happy 200 (generate SPTJ)', async () => {
      const res = await request(app)
        .get('/api/akuntan/dokumen-resmi/generate')
        .query({ periodeId: testPeriodeId, jenisDokumen: 'SPTJ' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('jumlahPenerimaan');
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/akuntan/dokumen-resmi/generate')
        .query({ periodeId: testPeriodeId, jenisDokumen: 'SPTJ' })
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });

    test('400 tanpa periodeId / jenisDokumen tidak valid', async () => {
      const res = await request(app)
        .get('/api/akuntan/dokumen-resmi/generate')
        .query({ jenisDokumen: 'SPTJ' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(400);

      const resInvalid = await request(app)
        .get('/api/akuntan/dokumen-resmi/generate')
        .query({ periodeId: testPeriodeId, jenisDokumen: 'INVALID' })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(resInvalid.status).toBe(400);
    });
  });

  // 2. GET /api/akuntan/dokumen-resmi
  describe('GET /api/akuntan/dokumen-resmi', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get('/api/akuntan/dokumen-resmi')
        .query({ periodeId: testPeriodeId })
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get('/api/akuntan/dokumen-resmi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });

    test('401 tanpa token', async () => {
      const res = await request(app).get('/api/akuntan/dokumen-resmi');
      expect(res.status).toBe(401);
    });
  });

  // 3. POST /api/akuntan/dokumen-resmi
  describe('POST /api/akuntan/dokumen-resmi', () => {
    let createdId;

    afterEach(async () => {
      if (createdId) {
        await prismaDb.dokumenResmi.deleteMany({ where: { id: createdId } });
        createdId = null;
      }
    });

    test('happy 201 (publish SPTJ)', async () => {
      const res = await request(app)
        .post('/api/akuntan/dokumen-resmi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          jenisDokumen: 'SPTJ',
          nomorDokumen: 'SPTJ/2038/001'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    test('403 role AHLI_GIZI tidak diizinkan publish', async () => {
      const res = await request(app)
        .post('/api/akuntan/dokumen-resmi')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          jenisDokumen: 'BAPSD'
        });
      expect(res.status).toBe(403);
    });

    test('404 periode tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/akuntan/dokumen-resmi')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: 'non-existent-periode-id',
          jenisDokumen: 'BAPSD'
        });
      expect(res.status).toBe(404);
    });
  });

  // 4. DELETE /api/akuntan/dokumen-resmi/:id
  describe('DELETE /api/akuntan/dokumen-resmi/:id', () => {
    let toDeleteId;

    beforeEach(async () => {
      const userAkuntan = await prismaDb.user.findFirst({ where: { username: 'akuntan' } });
      const created = await prismaDb.dokumenResmi.create({
        data: {
          periodeId: testPeriodeId,
          jenisDokumen: 'BAPSD',
          nomorDokumen: 'BAPSD/2038/001',
          createdById: userAkuntan.id
        }
      });
      toDeleteId = created.id;
    });

    test('happy 200', async () => {
      const res = await request(app)
        .delete(`/api/akuntan/dokumen-resmi/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('403 role AHLI_GIZI tidak diizinkan delete', async () => {
      const res = await request(app)
        .delete(`/api/akuntan/dokumen-resmi/${toDeleteId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);

      await prismaDb.dokumenResmi.deleteMany({ where: { id: toDeleteId } });
    });

    test('404 dokumen resmi tidak ditemukan', async () => {
      const res = await request(app)
        .delete('/api/akuntan/dokumen-resmi/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });
  });
});
