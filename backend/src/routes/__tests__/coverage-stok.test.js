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

describe('COVERAGE TEST — Stok SaldoAwalBarang Domain Routes (5 endpoints)', () => {
  let tokenAkuntan;
  let tokenAhliGizi;

  let testPeriodeId;
  let testBahan1Id;
  let testBahan2Id;
  let testBahan3Id;

  let testSaldoId;

  beforeAll(async () => {
    tokenAkuntan = await login('akuntan');
    tokenAhliGizi = await login('ahligizi');

    const bahans = await prismaDb.bahanPokok.findMany({ where: { aktif: true }, take: 5 });
    expect(bahans.length).toBeGreaterThanOrEqual(3);
    testBahan1Id = bahans[0].id;
    testBahan2Id = bahans[1].id;
    testBahan3Id = bahans[2].id;

    // Create test period in 2040
    const start = new Date(Date.UTC(2040, 0, 1));
    const end = new Date(Date.UTC(2040, 0, 31));
    const periode = await prismaDb.periode.create({
      data: {
        tanggalMulai: start,
        tanggalSelesai: end,
        anggaranAlokasi: 40000000,
        status: 'DRAFT'
      }
    });
    testPeriodeId = periode.id;
  });

  afterAll(async () => {
    if (testPeriodeId) {
      await prismaDb.saldoAwalBarang.deleteMany({ where: { periodeId: testPeriodeId } });
      await prismaDb.periode.delete({ where: { id: testPeriodeId } });
    }
    await prismaDb.$disconnect();
  });

  // 1. POST /api/akuntan/saldo-awal-barang
  describe('POST /api/akuntan/saldo-awal-barang', () => {
    test('happy 201', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          bahanPokokId: testBahan1Id,
          saldoAwalQty: 10,
          hargaBeliAwal: 5000
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      testSaldoId = res.body.id;
    });

    test('400 payload invalid', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId
        });
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          bahanPokokId: testBahan1Id,
          saldoAwalQty: 10,
          hargaBeliAwal: 5000
        });
      expect(res.status).toBe(403);
    });
  });

  // 2. GET /api/akuntan/saldo-awal-barang
  describe('GET /api/akuntan/saldo-awal-barang', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .get(`/api/akuntan/saldo-awal-barang?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .get(`/api/akuntan/saldo-awal-barang?periodeId=${testPeriodeId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. PUT /api/akuntan/saldo-awal-barang/:id
  describe('PUT /api/akuntan/saldo-awal-barang/:id', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .put(`/api/akuntan/saldo-awal-barang/${testSaldoId}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          saldoAwalQty: 25
        });
      expect(res.status).toBe(200);
      expect(Number(res.body.saldoAwalQty)).toBe(25);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .put('/api/akuntan/saldo-awal-barang/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          saldoAwalQty: 25
        });
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .put(`/api/akuntan/saldo-awal-barang/${testSaldoId}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          saldoAwalQty: 25
        });
      expect(res.status).toBe(403);
    });
  });

  // 4. DELETE /api/akuntan/saldo-awal-barang/:id
  describe('DELETE /api/akuntan/saldo-awal-barang/:id', () => {
    test('happy 200', async () => {
      const created = await prismaDb.saldoAwalBarang.create({
        data: {
          periodeId: testPeriodeId,
          bahanPokokId: testBahan2Id,
          saldoAwalQty: 5,
          hargaBeliAwal: 3000
        }
      });

      const res = await request(app)
        .delete(`/api/akuntan/saldo-awal-barang/${created.id}`)
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('404 id tak ada', async () => {
      const res = await request(app)
        .delete('/api/akuntan/saldo-awal-barang/non-existent-id')
        .set('Authorization', `Bearer ${tokenAkuntan}`);
      expect(res.status).toBe(404);
    });

    test('403 role tidak diizinkan', async () => {
      const created = await prismaDb.saldoAwalBarang.create({
        data: {
          periodeId: testPeriodeId,
          bahanPokokId: testBahan2Id,
          saldoAwalQty: 5,
          hargaBeliAwal: 3000
        }
      });

      const res = await request(app)
        .delete(`/api/akuntan/saldo-awal-barang/${created.id}`)
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(res.status).toBe(403);

      await prismaDb.saldoAwalBarang.delete({ where: { id: created.id } });
    });
  });

  // 5. POST /api/akuntan/saldo-awal-barang/bulk
  describe('POST /api/akuntan/saldo-awal-barang/bulk', () => {
    test('happy 200', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang/bulk')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          items: [
            { bahanPokokId: testBahan3Id, saldoAwalQty: 15, hargaBeliAwal: 6000 }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('400 payload invalid (items kosong)', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang/bulk')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          periodeId: testPeriodeId,
          items: []
        });
      expect(res.status).toBe(400);
    });

    test('403 role tidak diizinkan', async () => {
      const res = await request(app)
        .post('/api/akuntan/saldo-awal-barang/bulk')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .send({
          periodeId: testPeriodeId,
          items: [
            { bahanPokokId: testBahan3Id, saldoAwalQty: 15, hargaBeliAwal: 6000 }
          ]
        });
      expect(res.status).toBe(403);
    });
  });
});
