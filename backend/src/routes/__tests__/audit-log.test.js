const request = require('supertest');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

async function login(username) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
  return res.body.token;
}

describe('GET /api/audit-log — akses role + filter + pagination', () => {
  let userId;
  let createdIds = [];

  beforeAll(async () => {
    const user = await prismaDb.user.findUnique({ where: { username: 'aslap' } });
    userId = user.id;
    // Seed 2 baris audit log untuk test filter
    const rows = [
      { entityType: 'TEST_ENTITY', entityId: 'test-1', aksi: 'CREATE', dataLama: null, dataBaru: { x: 1 }, userId },
      { entityType: 'TEST_ENTITY', entityId: 'test-2', aksi: 'DELETE', dataLama: { x: 1 }, dataBaru: null, userId }
    ];
    for (const r of rows) {
      const created = await prismaDb.auditLog.create({ data: r });
      createdIds.push(created.id);
    }
  });

  afterAll(async () => {
    await prismaDb.auditLog.deleteMany({ where: { id: { in: createdIds } } });
    await prismaDb.$disconnect();
  });

  test('AKUNTAN dapat mengakses -> 200 + data + pagination', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${await login('akuntan')}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  test('MITRA dapat mengakses -> 200', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${await login('mitra')}`);
    expect(res.status).toBe(200);
  });

  test('ADMIN dapat mengakses -> 200', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${await login('admin')}`);
    expect(res.status).toBe(200);
  });

  test('Role lain (ASLAP, AHLI_GIZI, KEPALA_SPPG) -> 403', async () => {
    for (const username of ['aslap', 'ahligizi', 'kepalasppg']) {
      const res = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${await login(username)}`);
      expect(res.status, `role ${username}`).toBe(403);
    }
  });

  test('Tanpa token -> 401', async () => {
    const res = await request(app).get('/api/audit-log');
    expect(res.status).toBe(401);
  });

  test('Filter aksi + userId + resource mengembalikan baris yang sesuai', async () => {
    const token = await login('akuntan');
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${token}`)
      .query({ aksi: 'CREATE', userId, resource: 'TEST_ENTITY' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].aksi).toBe('CREATE');
    expect(res.body.data[0].entityType).toBe('TEST_ENTITY');
    expect(res.body.data[0].userId).toBe(userId);
    expect(res.body.data[0].user).toBeTruthy();
  });

  test('Filter tanggal rentang bekerja', async () => {
    const token = await login('akuntan');
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${token}`)
      .query({ tanggalMulai: '2026-01-01', tanggalSelesai: '2027-01-01' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('Pagination limit=1 -> 1 baris + totalPages sesuai', async () => {
    const token = await login('akuntan');
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: '1', page: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  test('aksi tidak valid -> 400', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${await login('akuntan')}`)
      .query({ aksi: 'HACK' });
    expect(res.status).toBe(400);
  });
});
