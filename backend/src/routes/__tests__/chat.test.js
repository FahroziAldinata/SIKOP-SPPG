'use strict';

// =============================================================================
// Integration Test: /api/chat — Route Chatbot
// =============================================================================
// Strategi mock: Vitest v4 TIDAK bisa intercept modul yang di-load via
// require() (CJS). Maka kita patch require.cache SEBELUM app di-require
// agar modul openaiCompatible diganti mock (chatCompletion = vi.fn()).
// =============================================================================

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Mock adapter provider sebelum require app — patch require.cache (CJS)
const chatCompletion = vi.fn();
const providerPath = require.resolve('../../lib/chat/providers/openaiCompatible');
require.cache[providerPath] = {
  id: providerPath,
  filename: providerPath,
  loaded: true,
  exports: { chatCompletion }
};

const { app } = require('../../app');

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'ganti-password-ini';
const prismaDb = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper login
// ---------------------------------------------------------------------------
async function login(username) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Login ${username} gagal: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('Chat API — /api/chat', () => {
  let tokenAslap, userAslap;
  let tokenAkuntan, userAkuntan;

  beforeAll(async () => {
    // Login dengan 2 user berbeda untuk test isolasi
    const dataAslap = await login('aslap');
    tokenAslap = dataAslap.token;
    userAslap = dataAslap.user;

    const dataAkuntan = await login('akuntan');
    tokenAkuntan = dataAkuntan.token;
    userAkuntan = dataAkuntan.user;

    // Bersihkan data chatbot test sebelumnya
    await prismaDb.chatLog.deleteMany({ where: { userId: { in: [userAslap.id, userAkuntan.id] } } });
    await prismaDb.chatApiKey.deleteMany({ where: { userId: { in: [userAslap.id, userAkuntan.id] } } });

    // Reset mock sebelum semua test
    chatCompletion.mockReset();
  });

  afterAll(async () => {
    // Cleanup
    await prismaDb.chatLog.deleteMany({ where: { userId: { in: [userAslap.id, userAkuntan.id] } } });
    await prismaDb.chatApiKey.deleteMany({ where: { userId: { in: [userAslap.id, userAkuntan.id] } } });
    await prismaDb.$disconnect();
  });

  // --------------------------------------------------------------------------
  // POST /api/chat/api-key — simpan API key
  // --------------------------------------------------------------------------
  describe('POST /api/chat/api-key', () => {
    test('401 — tanpa token', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .send({
          provider: 'groq',
          apiKey: 'test-api-key-12345',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });
      expect(res.status).toBe(401);
    });

    test('400 — apiKey terlalu pendek (< 8 char)', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: 'short',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });
      expect(res.status).toBe(400);
    });

    test('400 — provider tidak valid', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'invalid-provider',
          apiKey: 'test-api-key-12345',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });
      expect(res.status).toBe(400);
    });

    test('400 — baseUrl tidak valid (bukan URL)', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: 'test-api-key-12345',
          baseUrl: 'bukan-url-valid',
          model: 'llama-3.3-70b-versatile'
        });
      expect(res.status).toBe(400);
    });

    test('400 — model kosong', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: 'test-api-key-12345',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: ''
        });
      expect(res.status).toBe(400);
    });

    test('200 — simpan API key sukses, response TIDAK mengandung apiKey mentah', async () => {
      const RAW_KEY = 'gsk-test-api-key-groq-12345678';

      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: RAW_KEY,
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // KEAMANAN: apiKey mentah TIDAK boleh ada di response
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(RAW_KEY);
      expect(bodyStr).not.toContain('apiKey');
    });

    test('200 — upsert (simpan ulang) menggunakan provider berbeda', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'openai',
          apiKey: 'sk-openai-test-key-12345678',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Pastikan key tersimpan dengan provider & baseUrl & model baru
      const record = await prismaDb.chatApiKey.findUnique({ where: { userId: userAslap.id } });
      expect(record.provider).toBe('openai');
      expect(record.baseUrl).toBe('https://api.openai.com/v1');
      expect(record.model).toBe('gpt-4o-mini');
    });

    test('200 — simpan API key provider custom & proxy generic, POST /api/chat memanggil chatCompletion dengan baseUrl & model custom', async () => {
      const CUSTOM_BASE_URL = 'https://9router.example.com/v1';
      const CUSTOM_MODEL = 'custom-model-v1';

      const saveRes = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'custom',
          apiKey: 'sk-custom-key-12345678',
          baseUrl: CUSTOM_BASE_URL,
          model: CUSTOM_MODEL
        });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);

      chatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: 'Response dari custom proxy' } }]
      });

      const chatRes = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: 'Halo Custom AI' });

      expect(chatRes.status).toBe(200);
      expect(chatRes.body.success).toBe(true);
      expect(chatRes.body.data.provider).toBe('custom');
      expect(chatRes.body.data.model).toBe(CUSTOM_MODEL);

      // Verifikasi argumen yang diberikan ke chatCompletion mock
      const lastCall = chatCompletion.mock.calls[chatCompletion.mock.calls.length - 1][0];
      expect(lastCall.baseUrl).toBe(CUSTOM_BASE_URL);
      expect(lastCall.model).toBe(CUSTOM_MODEL);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/chat/api-key — ambil info key (masked)
  // --------------------------------------------------------------------------
  describe('GET /api/chat/api-key', () => {
    test('401 — tanpa token', async () => {
      const res = await request(app).get('/api/chat/api-key');
      expect(res.status).toBe(401);
    });

    test('200 — role dengan grant chatbot:READ tetap mendapat respons normal (requirePermission tidak memblokir)', async () => {
      const res = await request(app)
        .get('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`);

      // ASLAP punya grant chatbot:READ — harus lolos requirePermission, bukan 403
      expect(res.status).not.toBe(403);
      expect([200, 404]).toContain(res.status);
    });

    test('200 — mengembalikan provider, baseUrl, model, dan apiKeyMasked (4 karakter + ****)', async () => {
      const RAW_KEY = 'sk-openai-test-key-12345678';
      const BASE_URL = 'https://api.openai.com/v1';
      const MODEL = 'gpt-4o-mini';

      await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'openai',
          apiKey: RAW_KEY,
          baseUrl: BASE_URL,
          model: MODEL
        });

      const res = await request(app)
        .get('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.provider).toBe('openai');
      expect(res.body.data.baseUrl).toBe(BASE_URL);
      expect(res.body.data.model).toBe(MODEL);

      // Mask: 4 karakter pertama + ****
      const expectedMask = RAW_KEY.slice(0, 4) + '****';
      expect(res.body.data.apiKeyMasked).toBe(expectedMask);

      // KEAMANAN: key mentah TIDAK boleh ada di response
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(RAW_KEY);
    });

    test('404 — user belum punya API key', async () => {
      // Login sebagai akuntan yang belum set key
      const res = await request(app)
        .get('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      expect(res.status).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /api/chat/api-key — hapus key
  // --------------------------------------------------------------------------
  describe('DELETE /api/chat/api-key', () => {
    test('401 — tanpa token', async () => {
      const res = await request(app).delete('/api/chat/api-key');
      expect(res.status).toBe(401);
    });

    test('200 — hapus key sukses', async () => {
      // Pastikan aslap punya key dulu
      await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: 'gsk-test-delete-key-12345',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });

      const res = await request(app)
        .delete('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Pastikan key benar-benar dihapus
      const record = await prismaDb.chatApiKey.findUnique({ where: { userId: userAslap.id } });
      expect(record).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/chat — kirim pesan ke AI
  // --------------------------------------------------------------------------
  describe('POST /api/chat', () => {
    beforeAll(async () => {
      // Setup: aslap set API key (groq)
      await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({
          provider: 'groq',
          apiKey: 'gsk-real-test-api-key-12345678',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        });
    });

    test('401 — tanpa token', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Halo AI' });
      expect(res.status).toBe(401);
    });

    test('400 — message kosong', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: '' });
      expect(res.status).toBe(400);
    });

    test('400 — message melebihi 4000 karakter', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: 'x'.repeat(4001) });
      expect(res.status).toBe(400);
    });

    test('400 — chat tanpa API key (user belum set key)', async () => {
      // akuntan belum punya key
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ message: 'Halo AI' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/API key belum diatur/);
    });

    test('200 — chat sukses: jawaban diterima, ChatLog TERBENTUK dengan roleSnapshot benar', async () => {
      const MOCK_JAWABAN = 'Halo! Saya adalah asisten AI untuk sistem SPPG.';

      // Setup mock chatCompletion return value
      chatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: MOCK_JAWABAN } }]
      });

      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: 'Apa fungsi SPPG?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jawaban).toBe(MOCK_JAWABAN);
      expect(res.body.data.role).toBe(userAslap.role);
      expect(res.body.data.provider).toBe('groq');

      // Verifikasi ChatLog terbentuk di DB
      const log = await prismaDb.chatLog.findFirst({
        where: { userId: userAslap.id, pertanyaan: 'Apa fungsi SPPG?' },
        orderBy: { createdAt: 'desc' }
      });

      expect(log).not.toBeNull();
      expect(log.roleSnapshot).toBe(userAslap.role);
      expect(log.pertanyaan).toBe('Apa fungsi SPPG?');
      expect(log.jawaban).toBe(MOCK_JAWABAN);
      expect(log.status).toBe('success');
      expect(log.provider).toBe('groq');
    });

    test('500 — provider error: mock reject → 500 pesan seragam, ChatLog status error', async () => {
      // Mock reject
      chatCompletion.mockRejectedValueOnce(new Error('Gagal menghubungi AI provider'));

      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: 'Test provider error' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Gagal menghubungi AI provider');

      // Verifikasi ChatLog error tersimpan
      const log = await prismaDb.chatLog.findFirst({
        where: { userId: userAslap.id, pertanyaan: 'Test provider error' },
        orderBy: { createdAt: 'desc' }
      });

      expect(log).not.toBeNull();
      expect(log.status).toBe('error');
      expect(log.roleSnapshot).toBe(userAslap.role);
    });

    test('ChatLog roleSnapshot sesuai role user yang request', async () => {
      // Setup akuntan key
      await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          provider: 'openai',
          apiKey: 'sk-openai-test-12345678',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini'
        });

      const MOCK_JAWABAN_AKUNTAN = 'Jurnal transaksi adalah catatan keuangan.';
      chatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: MOCK_JAWABAN_AKUNTAN } }]
      });

      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({ message: 'Apa itu jurnal transaksi?' });

      expect(res.status).toBe(200);

      const log = await prismaDb.chatLog.findFirst({
        where: { userId: userAkuntan.id, pertanyaan: 'Apa itu jurnal transaksi?' },
        orderBy: { createdAt: 'desc' }
      });

      expect(log).not.toBeNull();
      expect(log.roleSnapshot).toBe('AKUNTAN');
    });
  });

  // --------------------------------------------------------------------------
  // Rate Limit — POST /api/chat (16 request → ke-16 → 429)
  // --------------------------------------------------------------------------
  describe('Rate Limit — POST /api/chat', () => {
    const originalRateLimitTest = process.env.RATE_LIMIT_TEST;

    beforeAll(() => {
      process.env.RATE_LIMIT_TEST = '1';
      // Mock selalu return success untuk test rate limit
      chatCompletion.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }]
      });
    });

    afterAll(() => {
      if (originalRateLimitTest === undefined) {
        delete process.env.RATE_LIMIT_TEST;
      } else {
        process.env.RATE_LIMIT_TEST = originalRateLimitTest;
      }
    });

    test('15 request OK → ke-16 → 429', async () => {
      // Pastikan aslap masih punya key
      const keyCheck = await prismaDb.chatApiKey.findUnique({ where: { userId: userAslap.id } });
      if (!keyCheck) {
        await request(app)
          .post('/api/chat/api-key')
          .set('Authorization', `Bearer ${tokenAslap}`)
          .send({
            provider: 'groq',
            apiKey: 'gsk-rate-limit-test-12345',
            baseUrl: 'https://api.groq.com/openai/v1',
            model: 'llama-3.3-70b-versatile'
          });
      }

      // Kirim 15 request — semua harus OK (200)
      for (let i = 1; i <= 15; i++) {
        const res = await request(app)
          .post('/api/chat')
          .set('Authorization', `Bearer ${tokenAslap}`)
          .send({ message: `Rate limit test ${i}` });

        expect(res.status, `Request ke-${i} harus 200`).toBe(200);
      }

      // Request ke-16 harus 429
      const res16 = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenAslap}`)
        .send({ message: 'Rate limit test 16' });

      expect(res16.status, 'Request ke-16 harus 429').toBe(429);
      expect(res16.body).toHaveProperty('error');
      expect(typeof res16.body.error).toBe('string');
    });
  });

  // --------------------------------------------------------------------------
  // KEAMANAN: apiKey TIDAK BOLEH muncul di response mana pun
  // --------------------------------------------------------------------------
  describe('Keamanan — apiKey tidak boleh tercetak di response', () => {
    const SENSITIVE_KEY = 'sk-sensitive-key-must-not-appear-1234567890';

    test('POST api-key response tidak mengandung key mentah', async () => {
      const res = await request(app)
        .post('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAkuntan}`)
        .send({
          provider: 'openai',
          apiKey: SENSITIVE_KEY,
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini'
        });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(SENSITIVE_KEY);
      // Tidak ada field apiKey di response sama sekali
      expect(res.body).not.toHaveProperty('apiKey');
      expect(res.body).not.toHaveProperty('apiKeyEncrypted');
    });

    test('GET api-key response tidak mengandung key mentah (hanya masked)', async () => {
      const res = await request(app)
        .get('/api/chat/api-key')
        .set('Authorization', `Bearer ${tokenAkuntan}`);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(SENSITIVE_KEY);
      // Hanya apiKeyMasked yang ada
      if (res.status === 200) {
        expect(res.body.data).not.toHaveProperty('apiKey');
        expect(res.body.data).not.toHaveProperty('apiKeyEncrypted');
        // Masked harus mengandung **** dan bukan key penuh
        expect(res.body.data.apiKeyMasked).toMatch(/\*\*\*\*/);
        expect(res.body.data.apiKeyMasked.length).toBeLessThan(SENSITIVE_KEY.length);
      }
    });
  });
});
