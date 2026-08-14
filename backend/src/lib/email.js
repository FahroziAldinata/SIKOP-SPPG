const nodemailer = require('nodemailer');
const prisma = require('./prisma');
const { logger } = require('./logger');
const { renderNotifikasiEmail } = require('../templates/email/notifikasi');

// -----------------------------------------------------------------------------
// Email service SIKOP-SPPG (Fase 8 — email notification)
// SMTP dikonfigurasi lewat environment:
//   SMTP_HOST  (wajib untuk aktif)   SMTP_PORT (default 587)
//   SMTP_USER  SMTP_PASS             SMTP_FROM (default SMTP_USER)
//   SMTP_SECURE (default false)
// Kosongkan SMTP_HOST atau SMTP_USER untuk menonaktifkan email — semua pemanggil
// menerima `{ skipped: true }` sehingga alur bisnis tetap berjalan tanpa error.
// -----------------------------------------------------------------------------

const APP_NAME = 'SIKOP-SPPG';

let transport = null;

function resetTransportCache() {
  transport = null;
}

function createTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (transport) return transport;

  const port = Number(process.env.SMTP_PORT || 587);
  const validPort = Number.isInteger(port) && port > 0;

  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: validPort ? port : 587,
    secure: String(process.env.SMTP_SECURE || '') === 'true' || (validPort && port === 465),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    logger: false
  });
  transport.__smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  return transport;
}

/**
 * Kirim email via SMTP (low-level). Tidak pernah throw untuk konfigurasi
 * kosong — balik `{ skipped: true }` supaya caller bisa menandai lewat.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} msg
 * @returns {Promise<{ skipped: true, reason: string }|object>} hasil nodemailer atau skip
 */
async function sendMail({ to, subject, html, text }) {
  const t = createTransport();
  if (!t) {
    logger.debug('[EMAIL] SMTP tidak dikonfigurasi, email dilewati');
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }
  return t.sendMail({ from: t.__smtpFrom, to, subject, html, text });
}

/**
 * Kirim email notifikasi untuk satu baris Notifikasi milik user dan sinkronkan
 * status ke kolom Notifikasi.emailSent / emailError (fallback retry).
 *
 * @param {{ id: string, judul: string, pesan: string, entityType: string|null, entityId: string|null, emailSent: boolean }} notif
 * @param {{ id: string, email: string|null, nama: string|null }} user
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
async function sendEmailNotification(notif, user) {
  if (!user || !user.email) return { ok: false, skipped: true, error: 'email penerima tidak tersedia' };
  if (notif.emailSent) return { ok: false, skipped: true, error: 'email sudah terkirim' };

  const { subject, text, html } = renderNotifikasiEmail({
    nama: user.nama,
    judul: notif.judul,
    pesan: notif.pesan,
    entityType: notif.entityType
  });

  try {
    const result = await sendMail({ to: user.email, subject, text, html });
    if (!result || result.skipped) return { ok: false, skipped: true, error: result && result.reason };

    await prisma.notifikasi.update({
      where: { id: notif.id },
      data: { emailSent: true, emailError: null }
    });
    logger.info({ notifikasiId: notif.id, email: user.email }, `[EMAIL] Terkirim: "${notif.judul}"`);
    return { ok: true };
  } catch (error) {
    const msg = (error && error.message) || 'Gagal mengirim email';
    await prisma.notifikasi.update({
      where: { id: notif.id },
      data: { emailSent: false, emailError: msg }
    }).catch(() => undefined);
    logger.warn({ notifikasiId: notif.id, email: user.email, err: msg }, `[EMAIL] Gagal: "${notif.judul}"`);
    return { ok: false, error: msg };
  }
}

/**
 * Kirim email untuk semua notifikasi belum terkirim yang user-nya punya email
 * (retry terjadwal / saat startup).
 * @param {number} [limit] batas antrian per panggilan (default 50)
 */
async function sendPendingEmails(limit = 50) {
  const rows = await prisma.notifikasi.findMany({
    where: { emailSent: false, user: { email: { not: null } } },
    include: { user: { select: { id: true, email: true, nama: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit
  });

  const results = [];
  for (const n of rows) {
    results.push(await sendEmailNotification(n, n.user));
  }
  return results;
}

module.exports = {
  APP_NAME,
  createTransport,
  resetTransportCache,
  sendMail,
  sendEmailNotification,
  sendPendingEmails,
  renderNotifikasiEmail,
  transport
};