const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';

describe('GrupHari CRUD & Overlap Validation Tests', () => {
  const prismaDb = new PrismaClient();
  let token;
  let headers;
  let testPeriode;
  let group1;
  let group2;

  beforeAll(async () => {
    // 1. Login as ASLAP
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'aslap', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create isolated test Periode
    testPeriode = await prismaDb.periode.create({
      data: {
        tanggalMulai: new Date('2029-01-01'),
        tanggalSelesai: new Date('2029-01-31'),
        status: 'AKTIF',
        anggaranAlokasi: 50000000
      }
    });
  });

  afterAll(async () => {
    if (testPeriode) {
      try { await prismaDb.grupHari.deleteMany({ where: { periodeId: testPeriode.id } }); } catch {}
      try { await prismaDb.anggaranHarian.deleteMany({ where: { periodeId: testPeriode.id } }); } catch {}
      try { await prismaDb.setupLembaga.deleteMany({ where: { periodeId: testPeriode.id } }); } catch {}
      try { await prismaDb.transaksiPembelianItem.deleteMany({ where: { transaksi: { rabHarian: { periodeId: testPeriode.id } } } }); } catch {}
      try { await prismaDb.transaksiPembelian.deleteMany({ where: { rabHarian: { periodeId: testPeriode.id } } }); } catch {}
      try { await prismaDb.rabHarian.deleteMany({ where: { periodeId: testPeriode.id } }); } catch {}
      try { await prismaDb.periode.delete({ where: { id: testPeriode.id } }); } catch {}
    }
    await prismaDb.$disconnect();
  });

  test('POST /api/aslap/grup-hari (Create Group 1)', async () => {
    const res = await request(app)
      .post('/api/aslap/grup-hari')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        label: 'GRUP A (SENIN-RABU)',
        hariAktif: ['SENIN', 'SELASA', 'RABU']
      });

    expect(res.status).toBe(201);
    group1 = res.body;
    expect(group1.label).toBe('GRUP A (SENIN-RABU)');
  });

  test('POST /api/aslap/grup-hari overlap validation', async () => {
    const res = await request(app)
      .post('/api/aslap/grup-hari')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        label: 'GRUP B (RABU-KAMIS)',
        hariAktif: ['RABU', 'KAMIS']
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('bertabrakan');
  });

  test('POST /api/aslap/grup-hari non-overlapping (Create Group 2)', async () => {
    const res = await request(app)
      .post('/api/aslap/grup-hari')
      .set(headers)
      .send({
        periodeId: testPeriode.id,
        label: 'GRUP B (KAMIS-JUMAT)',
        hariAktif: ['KAMIS', 'JUMAT']
      });

    expect(res.status).toBe(201);
    group2 = res.body;
  });

  test('GET /api/aslap/grup-hari?periodeId=X', async () => {
    const res = await request(app)
      .get(`/api/aslap/grup-hari?periodeId=${testPeriode.id}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('PUT /api/aslap/grup-hari/:id', async () => {
    const res = await request(app)
      .put(`/api/aslap/grup-hari/${group2.id}`)
      .set(headers)
      .send({
        label: 'GRUP B (KAMIS-SABTU)',
        hariAktif: ['KAMIS', 'JUMAT', 'SABTU']
      });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe('GRUP B (KAMIS-SABTU)');
  });

  test('DELETE /api/aslap/grup-hari/:id', async () => {
    const res = await request(app)
      .delete(`/api/aslap/grup-hari/${group1.id}`)
      .set(headers);

    expect(res.status).toBe(200);
  });
});
