'use strict';

// =============================================================================
// Enkripsi/Dekripsi API Key Chatbot — AES-256-GCM
// =============================================================================
// Format payload terenkripsi: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
// ENCRYPTION_KEY harus berupa 64 karakter hex (= 32 byte = 256 bit).
// Generate dengan: openssl rand -hex 32
// =============================================================================

const crypto = require('crypto');

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

// Validasi wajib saat module load — gagal cepat daripada error runtime
if (!ENCRYPTION_KEY_HEX) {
  throw new Error(
    '[encryption] ENCRYPTION_KEY belum diset di .env. ' +
    'Generate dengan: openssl rand -hex 32'
  );
}

if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error(
    '[encryption] ENCRYPTION_KEY harus tepat 64 karakter hex (32 byte). ' +
    'Format salah. Generate ulang dengan: openssl rand -hex 32'
  );
}

const KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV — rekomendasi GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Enkripsi plaintext menggunakan AES-256-GCM.
 * Setiap panggilan menghasilkan ciphertext berbeda karena IV random.
 *
 * @param {string} plaintext
 * @returns {string} payload format "iv_hex:tag_hex:ciphertext_hex"
 */
function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex')
  ].join(':');
}

/**
 * Dekripsi payload hasil encrypt().
 *
 * @param {string} payload format "iv_hex:tag_hex:ciphertext_hex"
 * @returns {string} plaintext asli
 */
function decrypt(payload) {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('[encryption] Format payload tidak valid, harus "iv:tag:ciphertext"');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
