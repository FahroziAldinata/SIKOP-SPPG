const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../../app');
const { PrismaClient } = require('@prisma/client');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

async function login(username) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return { token: res.body.token, user: res.body.user };
}

describe('COVERAGE2 TEST — Auth Routes (3 endpoints)', () => {
  let tokenAhliGizi;
  let userId;
  const createdFiles = [];

  beforeAll(async () => {
    const authData = await login('ahligizi');
    tokenAhliGizi = authData.token;
    userId = authData.user.id;
  });

  afterAll(async () => {
    // Cleanup file TTD di DB & disk
    if (userId) {
      const user = await prismaDb.user.findUnique({
        where: { id: userId },
        select: { ttdPath: true }
      });
      if (user && user.ttdPath) {
        const uploadDir = path.join(__dirname, '../../../uploads/ttd');
        const filename = path.basename(user.ttdPath);
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await prismaDb.user.update({
        where: { id: userId },
        data: { ttdPath: null }
      });
    }

    for (const fPath of createdFiles) {
      if (fs.existsSync(fPath)) {
        fs.unlinkSync(fPath);
      }
    }

    await prismaDb.$disconnect();
  });

  // 1. POST /api/auth/ttd
  describe('POST /api/auth/ttd', () => {
    test('happy 200 — upload PNG valid', async () => {
      const pixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const fileBuffer = Buffer.from(pixelPngBase64, 'base64');

      const res = await request(app)
        .post('/api/auth/ttd')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .attach('ttd', fileBuffer, 'ttd-test.png');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ttdPath');
      expect(typeof res.body.ttdPath).toBe('string');

      const uploadDir = path.join(__dirname, '../../../uploads/ttd');
      const filename = path.basename(res.body.ttdPath);
      createdFiles.push(path.join(uploadDir, filename));
    });

    test('401 — tanpa token', async () => {
      const res = await request(app).post('/api/auth/ttd');
      expect(res.status).toBe(401);
    });

    test('400 — file tidak diupload / format invalid', async () => {
      const resMissing = await request(app)
        .post('/api/auth/ttd')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);
      expect(resMissing.status).toBe(400);
      expect(resMissing.body).toHaveProperty('error');

      const resInvalid = await request(app)
        .post('/api/auth/ttd')
        .set('Authorization', `Bearer ${tokenAhliGizi}`)
        .attach('ttd', Buffer.from('plain text file'), 'ttd-test.txt');
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body).toHaveProperty('error');
    });
  });

  // 2. GET /api/auth/ttd
  describe('GET /api/auth/ttd', () => {
    test('happy 200 — ambil path ttd user login', async () => {
      const res = await request(app)
        .get('/api/auth/ttd')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ttdPath');
    });

    test('401 — tanpa token', async () => {
      const res = await request(app).get('/api/auth/ttd');
      expect(res.status).toBe(401);
    });
  });

  // 3. DELETE /api/auth/ttd
  describe('DELETE /api/auth/ttd', () => {
    test('happy 200 — hapus ttd', async () => {
      const res = await request(app)
        .delete('/api/auth/ttd')
        .set('Authorization', `Bearer ${tokenAhliGizi}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ttdPath: null });
    });

    test('401 — tanpa token', async () => {
      const res = await request(app).delete('/api/auth/ttd');
      expect(res.status).toBe(401);
    });
  });
});
