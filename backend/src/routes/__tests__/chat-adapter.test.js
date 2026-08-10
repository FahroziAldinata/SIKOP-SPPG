'use strict';

// =============================================================================
// Unit Test: adapter OpenAI-compatible (lib/chat/providers/openaiCompatible.js)
// =============================================================================
// Regression guard: body request HARUS mengandung `stream: false` — tanpa ini,
// proxy yang default streaming (mis. 9router lokal) mengembalikan SSE
// (text/event-stream) sehingga response.json() gagal (bug 2026-08-07, fix 6cbb960).
// =============================================================================

const { chatCompletion } = require('../../lib/chat/providers/openaiCompatible');

describe('chatCompletion (adapter OpenAI-compatible)', () => {
  const BASE_URL = 'https://api.example.com/v1';
  const API_KEY = 'test-api-key-12345';
  const MODEL = 'oc/deepseek-v4-flash-free';
  const MESSAGES = [{ role: 'user', content: 'Halo' }];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubFetchOk() {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Halo juga' } }]
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  test('kirim stream:false di body request (regression: proxy default SSE)', async () => {
    const fetchMock = stubFetchOk();

    const result = await chatCompletion({ baseUrl: BASE_URL, apiKey: API_KEY, model: MODEL, messages: MESSAGES });

    // Jawaban tetap diekstrak
    expect(result.choices[0].message.content).toBe('Halo juga');

    // fetch dipanggil sekali ke URL yang benar
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/chat/completions`);
    expect(options.headers.Authorization).toBe(`Bearer ${API_KEY}`);

    // REGRESSION GUARD: body request WAJIB mengandung stream:false.
    // Jika baris `stream: false` dihapus dari adapter, test ini GAGAL.
    const body = JSON.parse(options.body);
    expect(body.stream).toBe(false);
    expect(body.model).toBe(MODEL);
    expect(body.messages).toEqual(MESSAGES);
  });

  test('normalisasi error: status non-2xx → pesan seragam, simpan detail status + body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('error body 500 detail', { status: 500, headers: { 'content-type': 'text/plain' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      await chatCompletion({ baseUrl: BASE_URL, apiKey: API_KEY, model: MODEL, messages: MESSAGES });
      expect.unreachable('Harus lempar error');
    } catch (err) {
      expect(err.message).toBe('Gagal menghubungi AI provider');
      expect(err.status).toBe(500);
      expect(err.providerBody).toBe('error body 500 detail');
      expect(err.errName).toBe('ProviderResponseError');
    }

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.stream).toBe(false);
  });

  test('normalisasi error: timeout → pesan seragam, simpan status 504 dan errName TimeoutError', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));

    try {
      await chatCompletion({ baseUrl: BASE_URL, apiKey: API_KEY, model: MODEL, messages: MESSAGES });
      expect.unreachable('Harus lempar error');
    } catch (err) {
      expect(err.message).toBe('Gagal menghubungi AI provider');
      expect(err.status).toBe(504);
      expect(err.errName).toBe('TimeoutError');
    }
  });
});
