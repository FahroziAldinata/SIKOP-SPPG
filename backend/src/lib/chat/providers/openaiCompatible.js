'use strict';

// =============================================================================
// Adapter Provider OpenAI-Compatible — POST /chat/completions
// =============================================================================
// Mendukung Groq, OpenAI, Gemini (via OpenAI-compatible endpoint), dan
// provider lain yang mengikuti format OpenAI Chat Completions API.
//
// KEAMANAN: Fungsi ini TIDAK BOLEH log apiKey atau body request penuh.
// Hanya log status HTTP, model, dan durasi.
// =============================================================================

const { logger } = require('../../logger');

const TIMEOUT_MS = 30 * 1000; // 30 detik

/**
 * Kirim permintaan chat ke provider OpenAI-compatible.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl   - Base URL provider, tanpa trailing slash
 * @param {string} opts.apiKey   - API key (TIDAK BOLEH di-log)
 * @param {string} opts.model    - Model yang digunakan
 * @param {Array}  opts.messages - Array pesan [{role, content}]
 * @returns {Promise<object>} Response JSON dari provider
 * @throws {Error} Pesan seragam 'Gagal menghubungi AI provider' untuk semua error
 */
async function chatCompletion({ baseUrl, apiKey, model, messages, tools }) {
  // Hapus trailing slash dari baseUrl agar konsisten
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const startTime = Date.now();

  const requestBody = { model, messages, stream: false };
  if (tools && Array.isArray(tools) && tools.length > 0) {
    requestBody.tools = tools;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // JANGAN log body yang mengandung apiKey atau pesan user.
      // stream:false eksplisit — OpenAI-compatible spec default non-streaming,
      // tapi sebagian proxy (mis. 9router lokal) default streaming (SSE) yang
      // membuat response.json() di bawah gagal.
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      let providerBody = '';
      try {
        providerBody = await response.text();
      } catch {
        providerBody = '';
      }

      // Log status + body + model + duration, BUKAN apiKey
      logger.warn({
        msg: 'Provider AI response non-2xx',
        status: response.status,
        body: providerBody,
        model,
        durationMs
      });
      const err = new Error('Gagal menghubungi AI provider');
      err.status = response.status;
      err.providerBody = providerBody;
      err.errName = 'ProviderResponseError';
      throw err;
    }

    const data = await response.json();

    logger.info({
      msg: 'Provider AI response OK',
      status: response.status,
      model,
      durationMs
    });

    return data;

  } catch (err) {
    // AbortError = timeout
    if (err.name === 'AbortError') {
      logger.warn({
        msg: 'Provider AI timeout',
        model,
        durationMs: TIMEOUT_MS
      });
      const timeoutErr = new Error('Gagal menghubungi AI provider');
      timeoutErr.status = 504;
      timeoutErr.providerBody = `Timeout ${TIMEOUT_MS}ms reached`;
      timeoutErr.errName = 'TimeoutError';
      throw timeoutErr;
    }

    // Error yang sudah diformat di atas
    if (err.message === 'Gagal menghubungi AI provider') {
      throw err;
    }

    // Error lain (mis. JSON parse error, network failure)
    logger.error({
      msg: 'Provider AI error tidak terduga',
      model,
      errName: err.name,
      errMessage: err.message
      // JANGAN log apiKey, baseUrl, atau body
    });
    const unexpectedErr = new Error('Gagal menghubungi AI provider');
    unexpectedErr.status = 500;
    unexpectedErr.providerBody = err.message;
    unexpectedErr.errName = err.name || 'UnexpectedError';
    throw unexpectedErr;

  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { chatCompletion };
