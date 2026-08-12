const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

describe('Token Version & Invalidasi Sesi (logout & ganti password)', () => {
  let testUser;
  const TEST_USERNAME = `test-tokenver-${Date.now()}`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    testUser = await prismaDb.user.create({
      data: {
        username: TEST_USERNAME,
        passwordHash,
        nama: 'Test Token Version User',
        role: 'ASLAP',
        tokenVersion: 0,
      },
    });
  });

  afterAll(async () => {
    try {
      if (testUser && testUser.id) {
        await prismaDb.auditLog.deleteMany({ where: { userId: testUser.id } });
        await prismaDb.chatLog.deleteMany({ where: { userId: testUser.id } });
        await prismaDb.user.delete({ where: { id: testUser.id } });
      }
    } catch {
      // ignore
    } finally {
      await prismaDb.$disconnect();
    }
  });

  test('Test A: Logout meng-invalidasi token lama (GET /api/auth/me -> 401)', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    const oldToken = loginRes.body.token;
    expect(oldToken).toBeTruthy();

    // 2. Logout dengan token
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3. GET /api/auth/me dengan token lama -> expect 401 + body.error
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.error).toBeTruthy();
  });

  test('Test B: Ganti password meng-invalidasi token lama (GET /api/auth/me -> 401)', async () => {
    // 1. Login (dengan TEST_PASSWORD)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(200);
    const oldToken = loginRes.body.token;
    expect(oldToken).toBeTruthy();

    // 2. Ganti password via PUT /api/auth/profile dengan body { password: "new-password-123" }
    const changePassRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ password: 'new-password-123' });

    expect(changePassRes.status).toBe(200);
    expect(changePassRes.body.success).toBe(true);

    // 3. GET /api/auth/me dengan token lama -> 401
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.error).toBeTruthy();
  });
});
