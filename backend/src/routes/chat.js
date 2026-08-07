'use strict';

// =============================================================================
// Route Chatbot — /api/chat
// =============================================================================
// Endpoints:
//   POST   /api/chat/api-key   — simpan/upsert API key user (terenkripsi)
//   GET    /api/chat/api-key   — ambil info key (masked, tanpa key mentah)
//   DELETE /api/chat/api-key   — hapus key user
//   POST   /api/chat           — kirim pesan ke AI, simpan ChatLog
// =============================================================================

const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../lib/logger');
const { encrypt, decrypt } = require('../lib/chat/encryption');
const { chatCompletion } = require('../lib/chat/providers/openaiCompatible');

const router = express.Router();

// ---------------------------------------------------------------------------
// Validasi Zod
// ---------------------------------------------------------------------------

const apiKeyBodySchema = z.object({
  provider: z.enum(['gemini', 'groq', 'openai']),
  apiKey: z.string().min(8)
});

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  provider: z.enum(['gemini', 'groq', 'openai']).optional(),
  model: z.string().optional()
});

// ---------------------------------------------------------------------------
// Rate Limiter — 15 request / 15 menit per user (bukan per IP)
// skip di NODE_ENV=test kecuali RATE_LIMIT_TEST di-set (pola loginLimiter)
// ---------------------------------------------------------------------------

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  keyGenerator: (req) => {
    // Gunakan userId sebagai key (bukan IP) — lebih adil & aman per user
    if (req.user && req.user.sub) return `user:${req.user.sub}`;
    // Fallback ke remoteAddress bila user belum auth (middleware order)
    return req.socket.remoteAddress || 'unknown';
  },
  skip: (_req) => {
    if (process.env.NODE_ENV !== 'test') return false;
    return !process.env.RATE_LIMIT_TEST;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Terlalu banyak permintaan chat, coba lagi dalam 15 menit' });
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Matikan validasi IPv6 — kita pakai userId bukan req.ip sebagai key
  validate: { keyGeneratorIpFallback: false }
});

// ---------------------------------------------------------------------------
// Konfigurasi default model per provider
// ---------------------------------------------------------------------------

const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini'
};

// Base URL OpenAI-compatible per provider
const PROVIDER_BASE_URLS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1'
};

// ---------------------------------------------------------------------------
// System prompt per role
// ---------------------------------------------------------------------------

function buildSystemPrompt(role) {
  const basePrompt =
    `Kamu adalah asisten AI untuk role ${role} pada sistem SPPG (Satuan Pelayanan Pemenuhan Gizi) MBG. ` +
    'Kamu hanya memberikan informasi, saran, dan panduan sesuai hak akses dan tanggung jawab role tersebut. ' +
    'Kamu TIDAK BOLEH mengubah, menghapus, atau memproses data secara langsung (read-only assistant). ' +
    'Gunakan bahasa Indonesia yang sopan dan profesional. ';

  const roleGuides = {
    ASLAP:
      'Fokus pada: input penerima manfaat, manajemen sekolah/posyandu, laporan aslap, ' +
      'pemeriksaan bahan makanan, dan persetujuan PO.',
    MITRA:
      'Fokus pada: master bahan & supplier, pesanan pembelian (PO), harga bahan, ' +
      'pemeriksaan bahan, dan realisasi PO.',
    AHLI_GIZI:
      'Fokus pada: perencanaan menu harian, master menu, target gizi, laporan gizi, ' +
      'nilai nutrisi makanan, dan organoleptik.',
    AKUNTAN:
      'Fokus pada: jurnal transaksi, RAB harian, chart of accounts, stok barang, ' +
      'daftar upah, periode, dan laporan keuangan resmi.',
    KEPALA_SPPG:
      'Fokus pada: approval menu dan RAB, ringkasan laporan seluruh modul, ' +
      'monitoring operasional SPPG, dan dokumen resmi.',
    ADMIN:
      'Fokus pada: manajemen user, permission RBAC, audit log, dan konfigurasi sistem.'
  };

  return basePrompt + (roleGuides[role] || 'Bantu sesuai kebutuhan sistem SPPG.');
}

// ---------------------------------------------------------------------------
// POST /api/chat/api-key — simpan/upsert API key (terenkripsi)
// ---------------------------------------------------------------------------

router.post('/api-key', requireAuth, async (req, res) => {
  const parsed = apiKeyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { provider, apiKey } = parsed.data;
  const userId = req.user.sub;

  try {
    const apiKeyEncrypted = encrypt(apiKey);

    await prisma.chatApiKey.upsert({
      where: { userId },
      update: { provider, apiKeyEncrypted },
      create: { userId, provider, apiKeyEncrypted }
    });

    // JANGAN return apiKey mentah
    return res.json({ success: true });
  } catch (err) {
    logger.error({ msg: 'Gagal menyimpan API key chatbot', errMessage: err.message });
    return res.status(500).json({ error: 'Gagal menyimpan API key' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/api-key — ambil info key (masked)
// ---------------------------------------------------------------------------

router.get('/api-key', requireAuth, async (req, res) => {
  const userId = req.user.sub;

  try {
    const record = await prisma.chatApiKey.findUnique({ where: { userId } });

    if (!record) {
      return res.status(404).json({ error: 'API key belum diatur' });
    }

    // Dekripsi hanya untuk mendapatkan 4 karakter pertama, lalu mask sisanya
    const plainKey = decrypt(record.apiKeyEncrypted);
    const apiKeyMasked = plainKey.slice(0, 4) + '****';

    return res.json({
      success: true,
      data: {
        provider: record.provider,
        apiKeyMasked
      }
    });
  } catch (err) {
    logger.error({ msg: 'Gagal mengambil API key chatbot', errMessage: err.message });
    return res.status(500).json({ error: 'Gagal mengambil API key' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/chat/api-key — hapus key user
// ---------------------------------------------------------------------------

router.delete('/api-key', requireAuth, async (req, res) => {
  const userId = req.user.sub;

  try {
    await prisma.chatApiKey.deleteMany({ where: { userId } });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ msg: 'Gagal menghapus API key chatbot', errMessage: err.message });
    return res.status(500).json({ error: 'Gagal menghapus API key' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat — kirim pesan ke AI, simpan ChatLog
// ---------------------------------------------------------------------------

router.post('/', requireAuth, chatLimiter, async (req, res) => {
  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { message, model: modelOverride } = parsed.data;
  const userId = req.user.sub;
  const userRole = req.user.role;

  // Ambil API key user
  let keyRecord;
  try {
    keyRecord = await prisma.chatApiKey.findUnique({ where: { userId } });
  } catch (err) {
    logger.error({ msg: 'Gagal membaca ChatApiKey', errMessage: err.message });
    return res.status(500).json({ error: 'Gagal menghubungi AI provider' });
  }

  if (!keyRecord) {
    return res.status(400).json({
      error: 'API key belum diatur. Silakan atur API key chatbot terlebih dahulu di pengaturan.'
    });
  }

  const provider = keyRecord.provider;
  const model = modelOverride || DEFAULT_MODELS[provider] || 'gpt-4o-mini';
  const baseUrl = PROVIDER_BASE_URLS[provider];

  // Dekripsi key — JANGAN log key ini
  let apiKey;
  try {
    apiKey = decrypt(keyRecord.apiKeyEncrypted);
  } catch (err) {
    logger.error({ msg: 'Gagal mendekripsi API key', errMessage: err.message });
    return res.status(500).json({ error: 'Gagal menghubungi AI provider' });
  }

  // Susun messages dengan system prompt berbasis role
  const systemPrompt = buildSystemPrompt(userRole);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ];

  let jawaban = '';
  let chatLogData = null;

  try {
    const aiResponse = await chatCompletion({ baseUrl, apiKey, model, messages });

    // Ekstrak jawaban dari format OpenAI-compatible
    jawaban = aiResponse?.choices?.[0]?.message?.content || '';

    chatLogData = {
      userId,
      pertanyaan: message,
      jawaban,
      roleSnapshot: userRole,
      provider,
      model,
      toolCalls: null,
      status: 'success'
    };

  } catch (err) {
    jawaban = '';

    // Log error tanpa apiKey
    logger.error({
      msg: 'Provider AI error saat chat',
      userId,
      provider,
      model,
      errMessage: err.message
    });

    // Simpan ChatLog dengan status error
    chatLogData = {
      userId,
      pertanyaan: message,
      jawaban: '',
      roleSnapshot: userRole,
      provider,
      model,
      toolCalls: null,
      status: 'error'
    };

    // Simpan log sebelum return error
    try {
      await prisma.chatLog.create({ data: chatLogData });
    } catch (logErr) {
      logger.error({ msg: 'Gagal menyimpan ChatLog error', errMessage: logErr.message });
    }

    return res.status(500).json({ error: 'Gagal menghubungi AI provider' });
  }

  // Simpan ChatLog sukses
  let createdLog;
  try {
    createdLog = await prisma.chatLog.create({ data: chatLogData });
  } catch (logErr) {
    logger.error({ msg: 'Gagal menyimpan ChatLog sukses', errMessage: logErr.message });
    // Tetap return sukses meski log gagal
  }

  return res.json({
    success: true,
    data: {
      jawaban,
      role: userRole,
      provider,
      model,
      createdAt: createdLog ? createdLog.createdAt : new Date()
    }
  });
});

module.exports = router;
module.exports.chatLimiter = chatLimiter;
