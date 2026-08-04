const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const NEW_PASSWORD = 'new-password-123';
const prismaDb = new PrismaClient();

describe('Admin Reset Password -> Invalidasi Sesi User Target', () => {
  const TARGET_USERNAME = 'mitra';

  afterAll(async () => {
    try {
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
      await prismaDb.user.update({
        where: { username: TARGET_USERNAME },
        data: {
          tokenVersion: 0,
          passwordHash,
        },
      });
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

    // 2. Login admin, ambil id user target dari DB
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: TEST_PASSWORD });
    expect(loginAdmin.status).toBe(200);
    const adminToken = loginAdmin.body.token;

    const target = await prismaDb.user.findUnique({ where: { username: TARGET_USERNAME } });
    expect(target).toBeTruthy();

    // 3. Admin reset password user target
    const resetRes = await request(app)
      .put(`/api/admin/users/${target.id}`)
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
