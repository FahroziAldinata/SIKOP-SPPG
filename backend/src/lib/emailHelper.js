const prisma = require('./prisma');
const { logger } = require('./logger');
const { sendMail } = require('./email');
const { renderNotifikasiEmail } = require('../templates/email/notifikasi');

/**
 * Helper notifikasi email (Fase 8) — menghubungkan notifikasi in-app yang
 * sudah ada dengan pengiriman email berbasis Nodemailer.
 *
 * Alur:
 * 1. `createNotifikasiRows(client, ...)` dipanggil DALAM transaksi (tx) —
 *    baris Notifikasi commit atomik bersama aksi approval/submit.
 * 2. `queueEmailDispatch(rows, ...)` dipanggil SETELAH transaksi commit —
 *    email dikirim async (fire-and-forget), TIDAK memblok respons API.
 * 3. Fallback: kalau email gagal, error dicatat ke `Notifikasi.emailError`
 *    sehingga bisa di-retry/selidiki; notifikasi in-app tetap tersedia.
 */

/**
 * Buat baris Notifikasi in-app untuk daftar user.
 * @param {object} client prisma client ATAU transaction client (tx)
 * @param {object} opts
 * @param {string[]} opts.userIds  id user penerima (deduped otomatis)
 * @param {string} opts.judul
 * @param {string} opts.pesan
 * @param {string} [opts.entityType]
 * @param {string} [opts.entityId]
 * @returns {Promise<Array<{notifId: string, email: string|null, nama: string}>>}
 */
async function createNotifikasiRows(client, { userIds, judul, pesan, entityType, entityId }) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const users = await client.user.findMany({
    where: { id: { in: uniqueIds }, aktif: true },
    select: { id: true, nama: true, email: true }
  });
  if (users.length === 0) return [];

  const rows = [];
  for (const u of users) {
    const notif = await client.notifikasi.create({
      data: { userId: u.id, judul, pesan, entityType, entityId }
    });
    rows.push({ notifId: notif.id, email: u.email || null, nama: u.nama });
  }
  return rows;
}

/**
 * Kirim email secara async (fire-and-forget) untuk baris notifikasi yang
 * dibuat lewat `createNotifikasiRows`. Panggil SETELAH transaksi commit.
 * Email gagal → simpan ke `Notifikasi.emailError` (fallback retry).
 *
 * @param {Array<{notifId: string, email: string|null, nama: string}>} rows
 * @param {{judul: string, pesan: string, entityType?: string}} msg
 */
function queueEmailDispatch(rows, msg) {
  const targets = (rows || []).filter((r) => r.email);
  if (targets.length === 0) return;

  setImmediate(async () => {
    for (const t of targets) {
      const { subject, text, html } = renderNotifikasiEmail({
        nama: t.nama,
        judul: msg.judul,
        pesan: msg.pesan,
        entityType: msg.entityType
      });
      try {
        const result = await sendMail({ to: t.email, subject, text, html });
        if (!result || result.skipped) continue;
        await prisma.notifikasi.update({
          where: { id: t.notifId },
          data: { emailSent: true }
        });
      } catch (error) {
        logger.error({ err: error, notifId: t.notifId }, '[EMAIL] Gagal mengirim email notifikasi');
        try {
          await prisma.notifikasi.update({
            where: { id: t.notifId },
            data: { emailError: String((error && error.message) || error) }
          });
        } catch (innerErr) {
          logger.error({ err: innerErr, notifId: t.notifId }, '[EMAIL] Gagal mencatat emailError');
        }
      }
    }
  });
}

module.exports = { createNotifikasiRows, queueEmailDispatch };