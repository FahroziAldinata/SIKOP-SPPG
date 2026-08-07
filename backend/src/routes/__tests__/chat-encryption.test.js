'use strict';

// =============================================================================
// Unit Test: encryption.js — AES-256-GCM
// =============================================================================
// PENTING: Karena encryption.js melempar Error saat module load bila
// ENCRYPTION_KEY tidak ada, kita set env SEBELUM require module.
// Gunakan vi.isolateModules() agar require fresh setiap describe.
// =============================================================================

// Key test 64 karakter hex yang valid (32 byte)
const TEST_KEY = 'a'.repeat(64); // 64 x 'a' = valid hex 32-byte

describe('encryption — modul enkripsi AES-256-GCM', () => {
  let encrypt, decrypt;

  beforeAll(async () => {
    // Set env sebelum require module
    process.env.ENCRYPTION_KEY = TEST_KEY;

    // Dynamic require agar dapat env yang baru di-set
    const mod = require('../../lib/chat/encryption');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  test('decrypt(encrypt(x)) == x — round-trip string biasa', () => {
    const plaintext = 'test-api-key-12345-groq';
    const payload = encrypt(plaintext);
    const result = decrypt(payload);
    expect(result).toBe(plaintext);
  });

  test('decrypt(encrypt(x)) == x — round-trip string panjang', () => {
    const plaintext = 'sk-or-v1-' + 'z'.repeat(200);
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  test('encrypt(x) dua kali → ciphertext BERBEDA (IV random)', () => {
    const plaintext = 'sama-tapi-iv-beda';
    const payload1 = encrypt(plaintext);
    const payload2 = encrypt(plaintext);
    // Payload harus berbeda karena IV random
    expect(payload1).not.toBe(payload2);
    // Keduanya tetap bisa didekripsi ke plaintext yang sama
    expect(decrypt(payload1)).toBe(plaintext);
    expect(decrypt(payload2)).toBe(plaintext);
  });

  test('encrypt dan decrypt string kosong — tidak melempar error', () => {
    const plaintext = '';
    const payload = encrypt(plaintext);
    const result = decrypt(payload);
    expect(result).toBe(plaintext);
  });

  test('format payload: iv:tag:ciphertext (3 bagian dipisah titik dua)', () => {
    const payload = encrypt('test-format');
    const parts = payload.split(':');
    expect(parts).toHaveLength(3);
    // IV harus 24 hex chars (12 byte)
    expect(parts[0]).toMatch(/^[0-9a-f]{24}$/);
    // Auth tag harus 32 hex chars (16 byte)
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
  });

  test('decrypt payload rusak → melempar Error', () => {
    expect(() => decrypt('bukan-payload-valid')).toThrow();
  });

  test('decrypt payload dengan auth tag salah → melempar Error', () => {
    const payload = encrypt('data-asli');
    const parts = payload.split(':');
    // Ubah satu karakter di ciphertext (tamper) — PASTIKAN berubah,
    // jangan hardcode 'ff' (bisa sama dengan karakter asli → tidak throw)
    const lastChar = parts[2].slice(-1);
    const flipChar = lastChar === '0' ? '1' : '0';
    const tamperedCiphertext = parts[2].slice(0, -1) + flipChar;
    const tampered = [parts[0], parts[1], tamperedCiphertext].join(':');
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('encryption — validasi ENCRYPTION_KEY saat module load', () => {
  // Catatan: module encryption.js sudah ter-cache oleh require cache DAN
  // registry vitest. vi.resetModules() saja TIDAK cukup me-reload modul CJS
  // yang sudah pernah di-load — harus dikombinasi dengan delete require.cache.
  // Setiap test diakhiri vi.unstubAllEnvs() + vi.resetModules() agar env &
  // cache kembali normal (test roundtrip butuh ENCRYPTION_KEY valid).

  test('ENCRYPTION_KEY tidak ada → melempar Error saat require', () => {
    vi.resetModules();
    delete require.cache[require.resolve('../../lib/chat/encryption')];
    vi.stubEnv('ENCRYPTION_KEY', '');

    expect(() => require('../../lib/chat/encryption')).toThrow('ENCRYPTION_KEY');

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test('ENCRYPTION_KEY format salah (bukan 64 hex) → melempar Error', () => {
    vi.resetModules();
    delete require.cache[require.resolve('../../lib/chat/encryption')];
    vi.stubEnv('ENCRYPTION_KEY', 'terlalu-pendek');

    expect(() => require('../../lib/chat/encryption')).toThrow('ENCRYPTION_KEY');

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
