'use strict';

const request = require('supertest');
const { app } = require('../../app');

describe('Rate Limiting — POST /api/auth/login', () => {
  const originalRateLimitTest = process.env.RATE_LIMIT_TEST;

  beforeAll(() => {
    // Aktifkan limiter untuk test ini
    process.env.RATE_LIMIT_TEST = '1';
  });

  afterAll(() => {
    // Restore env supaya file test lain tidak kena efek
    if (originalRateLimitTest === undefined) {
      delete process.env.RATE_LIMIT_TEST;
    } else {
      process.env.RATE_LIMIT_TEST = originalRateLimitTest;
    }
  });

  test('6x login gagal: percobaan 1-5 → 401 {error}, percobaan ke-6 → 429 {error}', async () => {
    const payload = { username: 'user_tidak_ada_sama_sekali', password: 'salah_banget_123' };

    // Percobaan 1-5: harus 401 dengan format { error }
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status, `Percobaan ke-${i} seharusnya 401`).toBe(401);
      expect(res.body, `Percobaan ke-${i} body harus punya property error`).toHaveProperty('error');
      expect(typeof res.body.error, `Percobaan ke-${i} error harus string`).toBe('string');
    }

    // Percobaan ke-6: harus 429 dengan format { error }
    const res6 = await request(app)
      .post('/api/auth/login')
      .send(payload);

    expect(res6.status, 'Percobaan ke-6 seharusnya 429').toBe(429);
    expect(res6.body, 'Body 429 harus punya property error').toHaveProperty('error');
    expect(typeof res6.body.error, 'error 429 harus string').toBe('string');
  });
});
