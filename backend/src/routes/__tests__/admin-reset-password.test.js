const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const NEW_PASSWORD = 'new-password-123';
const prismaDb = new PrismaClient();

describe('Admin Reset Password -> Invalidasi Sesi User Target', () => {
  let targetUser;
  const TARGET_USERNAME = `test-adminreset-${Date.now()}`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    targetUser = await prismaDb.user.create({
      data: {
        username: TARGET_USERNAME,
        passwordHash,
        nama: 'Test Admin Reset Target User',
        role: 'MITRA',
        tokenVersion: 0,
      },
    });
  });

  afterAll(async () => {
    try {
      if (targetUser && targetUser.id) {
        await prismaDb.auditLog.deleteMany({ where: { userId: targetUser.id } });
        await prismaDb.chatLog.deleteMany({ where: { userId: targetUser.id } });
        await prismaDb.user.delete({ where: { id: targetUser.id } });
      }
    } catch {
      // ignore
    } finally {
      await prismaDb.$disconnect();
    }
  });

  test('Reset password oleh admin meng-invalidasi token lama user target + password benar-benar berubah', async () => {
    // 1. Login user target -> TOKEN_LAMA
    const loginTarget = await request(app)
      .post('/api/auth/login')
      .send({ username: TARGET_USERNAME, password: TEST_PASSWORD });
    expect(loginTarget.status).toBe(200);
    const tokenLama = loginTarget.body.token;
    expect(tokenLama).toBeTruthy();

    // 2. Login admin, ambil token admin
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: TEST_PASSWORD });
    expect(loginAdmin.status).toBe(200);
    const adminToken = loginAdmin.body.token;

    // 3. Admin reset password user target buatan sendiri
    const resetRes = await request(app)
      .put(`/api/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: NEW_PASSWORD });
    expect(resetRes.status).toBe(200);

    // 4. TOKEN_LAMA -> harus 401
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenLama}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body.error).toBeTruthy();

    // 5. Login ulang dengan password baru -> harus 200 (bukti password berubah)
    const loginBaru = await request(app)
      .post('/api/auth/login')
      .send({ username: TARGET_USERNAME, password: NEW_PASSWORD });
    expect(loginBaru.status).toBe(200);
    expect(loginBaru.body.token).toBeTruthy();
  });
});
