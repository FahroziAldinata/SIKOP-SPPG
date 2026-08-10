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

describe('RAB P12 PDF Endpoint Tests — GET /api/akuntan/rab-p12/pdf', () => {
  let tokenAkuntan;
  let tokenAhliGizi;
  let testPeriodeId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const pStart = new Date(Date.UTC(2042, 0, 1));
    const pEnd = new Date(Date.UTC(2042, 0, 31));

    const existingPeriode = await prismaDb.periode.findFirst({
      where: { tanggalMulai: pStart }
    });

    if (existingPeriode) {
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: existingPeriode.id } });
      await prismaDb.periode.deleteMany({ where: { id: existingPeriode.id } });
    }

    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: pStart,
        tanggalSelesai: pEnd,
        anggaranAlokasi: 50000000,
        status: 'DRAFT',
        setupLembaga: {
          create: {
            namaLembaga: 'Lembaga RAB P12 Test',
            alamat: 'Jl. RAB P12 No. 1',
            namaKepalaSPPG: 'Kepala RAB P12',
            namaAkuntanSPPG: 'Akuntan RAB P12',
            namaYayasan: 'Yayasan RAB P12',
            ketuaYayasan: 'Ketua RAB P12',
            nomorRekeningVA: '112233445566',
            tahunAnggaran: 2042,
            awalPeriodeBerikutnya: new Date(Date.UTC(2042, 1, 1)),
            tanggalPelaporan: new Date(Date.UTC(2042, 0, 31)),
            tempatPelaporan: 'Jakarta',
          },
        },
      },
    });
    testPeriodeId = periode.id;

    await prismaDb.batasHargaPorsi.upsert({
      where: { jenisPorsi: 'KECIL' },
      update: {},
      create: { jenisPorsi: 'KECIL', batasMaksimal: 15000 },
    });
    await prismaDb.batasHargaPorsi.upsert({
      where: { jenisPorsi: 'BESAR' },
      update: {},
      create: { jenisPorsi: 'BESAR', batasMaksimal: 20000 },
    });
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.deleteMany({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  test('GET /api/akuntan/rab-p12/pdf — 400 tanpa periodeId & tanggal', async () => {
    const res = await request(app)
      .get('/api/akuntan/rab-p12/pdf')
      .set('Authorization', `Bearer ${tokenAkuntan}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/akuntan/rab-p12/pdf — 400 tanpa tanggal', async () => {
    const res = await request(app)
      .get('/api/akuntan/rab-p12/pdf')
      .query({ periodeId: testPeriodeId })
      .set('Authorization', `Bearer ${tokenAkuntan}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/akuntan/rab-p12/pdf — 403 role tanpa grant (AHLI_GIZI)', async () => {
    const res = await request(app)
      .get('/api/akuntan/rab-p12/pdf')
      .query({ periodeId: testPeriodeId, tanggal: '2042-01-15' })
      .set('Authorization', `Bearer ${tokenAhliGizi}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/akuntan/rab-p12/pdf — happy path 200 + application/pdf + %PDF + Content-Disposition', async () => {
    const res = await request(app)
      .get('/api/akuntan/rab-p12/pdf')
      .query({ periodeId: testPeriodeId, tanggal: '2042-01-15' })
      .set('Authorization', `Bearer ${tokenAkuntan}`)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/inline; filename="RAB-P12-2042-01-15\.pdf"/);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    expect(res.body.length).toBeGreaterThan(0);
  });
});
