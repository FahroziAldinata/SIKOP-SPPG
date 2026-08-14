// Template email notifikasi (Fase 8 — v1 EMAIL only).
// Sederhana: versi plain-text + versi HTML, mendukung konten dinamis
// (nama user, judul, pesan, status/entitas). Tidak tergantung framework.

const ENTITY_LABEL = {
  MENU: 'Menu Harian',
  RAB: 'RAB Harian'
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render isi email notifikasi.
 * @param {{ nama: string, judul: string, pesan: string, entityType?: string }} ctx
 * @returns {{ subject: string, text: string, html: string }}
 */
function renderNotifikasiEmail({ nama, judul, pesan, entityType }) {
  const namaUser = nama || 'Pengguna SPPG';
  const judulClean = judul || 'Notifikasi SPPG';
  const pesanClean = pesan || '';
  const label = ENTITY_LABEL[entityType] || 'Entitas';
  const subject = `[SIKOP-SPPG] ${judulClean}`;

  const text = [
    `Yth. ${namaUser},`,
    '',
    judulClean,
    '',
    pesanClean,
    '',
    `Modul terkait: ${label}`,
    '---',
    'Ini adalah email otomatis dari Sistem Keuangan & Operasional SPPG MBG.',
    'Mohon tidak membalas email ini.'
  ].join('\n');

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">',
    `<h2 style="color:#166534;margin:0 0 4px;">SIKOP-SPPG</h2>`,
    `<p style="color:#6b7280;font-size:12px;margin:0 0 16px;">Sistem Keuangan & Operasional SPPG MBG</p>`,
    `<p style="margin:0 0 16px;">Yth. <strong>${escapeHtml(namaUser)}</strong>,</p>`,
    `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:4px;">`,
    `<p style="font-size:15px;font-weight:600;margin:0 0 6px;color:#14532d;">${escapeHtml(judulClean)}</p>`,
    `<p style="margin:0;color:#374151;">${escapeHtml(pesanClean)}</p>`,
    '</div>',
    `<p style="color:#6b7280;font-size:12px;margin:16px 0 0;">Modul terkait: ${escapeHtml(label)}</p>`,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />`,
    '<p style="color:#9ca3af;font-size:11px;margin:0;">',
    'Ini adalah email otomatis dari Sistem Keuangan & Operasional SPPG MBG. Mohon tidak membalas email ini.',
    '</p>',
    '</div>'
  ].join('\n');

  return { subject, text, html };
}

module.exports = { renderNotifikasiEmail, ENTITY_LABEL };
