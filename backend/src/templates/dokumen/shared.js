const fs = require('fs');
const path = require('path');
const { logger } = require('../../lib/logger');

/**
 * Shared HTML template fragments for PDF dokumen resmi SPPG.
 * Dipakai ulang oleh LPA, SPTJ, BAPSD, BKU, Nominatif Upah.
 */

/**
 * Render kop surat resmi SPPG.
 * @param {object} opts
 * @param {string} opts.namaLembaga  - nama SPPG, contoh: "SPPG Tunas Harapan"
 * @param {string} opts.alamat       - alamat lengkap (opsional)
 * @param {string} opts.logoFileName - nama file logo (opsional, default 'logo-bgn.png')
 * @param {boolean} opts.tampilkanBarisYayasan - tampilkan nama yayasan (opsional, default true)
 */
function renderKopSurat({ namaLembaga = '', alamat = '', logoFileName = 'logo-bgn.png', tampilkanBarisYayasan = true } = {}) {
  let logoBase64 = '';
  try {
    const logoPath = path.join(__dirname, `../../../assets/dokumen-resmi/${logoFileName}`);
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString('base64');
    }
  } catch (e) {
    logger.error('Gagal memuat logo untuk kop surat:', e);
  }

  const logoSrc = logoBase64 
    ? `data:image/png;base64,${logoBase64}`
    : `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56">
        <circle cx="32" cy="32" r="30" fill="#1a3c6e" stroke="#fff" stroke-width="2"/>
        <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="18" font-family="serif" font-weight="bold">BGN</text>
      </svg>
    `)}`;

  const isPalabuan = (namaLembaga || '').toUpperCase().includes('PALABUAN');
  const namaResmiKop = isPalabuan
    ? 'SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) SUMEDANG UJUNGJAYA PALABUAN'
    : namaLembaga;

  return `
    <div class="kop-surat">
      <div class="kop-logo">
        <img src="${logoSrc}" alt="Logo BGN" width="56" height="56" style="display: block; width: 56px; height: 56px; object-fit: contain;" />
      </div>
      <div class="kop-text">
        <div class="kop-lembaga" style="font-size: 11pt; font-weight: bold; text-transform: uppercase; line-height: 1.3;">
          ${escapeHtml(namaResmiKop)}
          ${isPalabuan && tampilkanBarisYayasan ? `<br><span style="font-size: 9.5pt; font-weight: normal;">(YAYASAN TIGA SRIKANDI BERLIAN SUMEDANG)</span>` : ''}
        </div>
        ${alamat ? `<div class="kop-alamat" style="font-size: 9.5pt; margin-top: 3px; font-weight: normal; line-height: 1.3;">Alamat : ${escapeHtml(alamat)}</div>` : ''}
      </div>
    </div>
    <div class="kop-garis"></div>
  `;
}

/**
 * Render footer tanda tangan.
 * @param {Array<{label: string, nama: string, jabatan?: string}>} kolom - maks 3 kolom
 * @param {string} [tempatTanggal]   - "Jakarta, 14 Juli 2026"
 * @param {object} [opts]
 * @param {string} [opts.tengahLabel]  - label kolom tengah (kalau 3 kolom, biasanya "Mengetahui")
 * @param {number} [opts.ruangTtd]     - tinggi area ruang TTD (default 15)
 * @param {object} [ttdBase64ByNama]   - map { [nama]: base64String } dari prepareTtdMap() (opsional).
 *   Kalau diberikan dan nama penandatangan cocok, area TTD diisi <img> base64.
 *   Kalau tidak diberikan/tidak cocok, render div kosong seperti semula (backward compatible).
 */
function renderFooterTTD(kolom = [], tempatTanggal = '', opts = {}, ttdBase64ByNama = {}) {
  /**
   * Render area ruang TTD untuk satu kolom.
   * Kalau ada base64 untuk nama ini, tampilkan <img>; kalau tidak, div kosong.
   */
  function renderRuangTtd(nama, ruangTtd) {
    const base64 = (ttdBase64ByNama && nama) ? (ttdBase64ByNama[nama] || '') : '';
    const tinggi = Math.max(ruangTtd ?? 15, 55);
    if (base64) {
      return `<div class="ttd-ruang" style="height:${tinggi}px; display:flex; align-items:flex-end; justify-content:center;"><img src="data:image/png;base64,${base64}" alt="TTD ${escapeHtml(nama)}" style="height:55px;max-width:220px;object-fit:contain;" /></div>`;
    }
    return `<div class="ttd-ruang" data-ttd-nama="${escapeHtml(nama)}" style="height:${tinggi}px;"></div>`;
  }

  const count = kolom.length;
  if (count === 1) {
    const k = kolom[0];
    const ruangTtd = opts?.ruangTtd ?? 15;
    return `
      <div class="footer-ttd" style="display:flex; justify-content:center; margin-top:30px;">
        <div class="ttd-kolom" style="width:45%;">
          ${k.label ? `<div class="ttd-label" style="font-weight: normal; margin-bottom: 2px;">${escapeHtml(k.label)}</div>` : ''}
          ${k.org ? `<div class="ttd-org" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.org)}</div>` : ''}
          ${k.jabatan ? `<div class="ttd-jabatan" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.jabatan)}</div>` : ''}
          ${renderRuangTtd(k.nama, ruangTtd)}
          <div class="ttd-nama" style="font-size: 11pt;"><strong>${escapeHtml(k.nama)}</strong></div>
          ${k.jabatanBawah ? `<div class="ttd-jabatan-bawah" style="font-size: 11pt; margin-top: 2px;">${escapeHtml(k.jabatanBawah)}</div>` : ''}
        </div>
      </div>
    `;
  }

  const cols = kolom.map((k, i) => {
    const ruangTtd = opts?.ruangTtd ?? 15;
    const dateHtml = (i === 1 && tempatTanggal)
      ? `<div class="ttd-tempat-tgl" style="margin-bottom: 1px;">${tempatTanggal}</div>`
      : `<div class="ttd-tempat-tgl-placeholder" style="height: 12px; margin-bottom: 1px;"></div>`;

    return `
      <div class="ttd-kolom" style="width:45%;">
        ${dateHtml}
        ${k.label ? `<div class="ttd-label" style="font-weight: normal; margin-bottom: 2px;">${escapeHtml(k.label)}</div>` : ''}
        ${k.org ? `<div class="ttd-org" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.org)}</div>` : ''}
        ${k.jabatan ? `<div class="ttd-jabatan" style="font-weight: normal; margin-top: 2px;">${escapeHtml(k.jabatan)}</div>` : ''}
        ${renderRuangTtd(k.nama, ruangTtd)}
        <div class="ttd-nama" style="font-size: 11pt;"><strong>${escapeHtml(k.nama)}</strong></div>
        ${k.jabatanBawah ? `<div class="ttd-jabatan-bawah" style="font-size: 11pt; margin-top: 2px;">${escapeHtml(k.jabatanBawah)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="footer-ttd" style="display:flex; justify-content:space-between; gap:16px; margin-top:30px;">
      ${cols}
    </div>
  `;
}

/**
 * Escape HTML chars agar nama/alamat tidak bisa XSS di template.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Ambil TTD user sebagai base64 string.
 * Query prisma.user berdasarkan nama (findFirst, aktif:true) → baca file dari uploads/ttd/.
 * Return '' kalau user tidak ketemu, ttdPath null, atau file tidak ada.
 * Prisma di-require lazy (di dalam fungsi) untuk menghindari circular dependency.
 *
 * @param {string} nama - nama penandatangan
 * @returns {Promise<string>} base64 string (tanpa prefix data URI), atau ''
 */
async function getTtdBase64(nama) {
  if (!nama) return '';
  try {
    // Lazy require — hindari potensi circular di top-level
    const prisma = require('../../lib/prisma');
    const user = await prisma.user.findFirst({
      where: { nama, aktif: true },
      select: { ttdPath: true },
    });
    if (!user?.ttdPath) return '';
    // ttdPath dari DB: '/uploads/ttd/xxx.png' → ambil basename saja
    const filename = path.basename(user.ttdPath);
    // __dirname = backend/src/templates/dokumen → ../../../ = backend/
    const filePath = path.join(__dirname, '../../../uploads/ttd', filename);
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath).toString('base64');
  } catch (e) {
    logger.error('Gagal memuat TTD untuk', nama, ':', e.message);
    return '';
  }
}

/**
 * Pre-compute map { [nama]: base64String } untuk semua penandatangan dalam kolom.
 * Dipanggil dari route handler (async) SEBELUM memanggil fungsi render template.
 * Hasilnya diteruskan sebagai argumen ke-4 renderFooterTTD.
 *
 * Contoh penggunaan di route:
 *   const ttdMap = await prepareTtdMap(kolomArray);
 *   const html = renderXxxHtml({ ..., ttdMap });
 *   // di template: renderFooterTTD(kolom, tempatTgl, opts, ttdMap)
 *
 * @param {Array<{nama?: string}>} kolom - array kolom TTD (sama dgn arg pertama renderFooterTTD)
 * @returns {Promise<object>} map { [nama]: base64 }
 */
async function prepareTtdMap(kolom = []) {
  // Kumpulkan nama unik yang tidak kosong
  const namaUnik = [...new Set(
    (Array.isArray(kolom) ? kolom : [])
      .map(k => (k && k.nama) ? k.nama.trim() : '')
      .filter(Boolean)
  )];
  const entries = await Promise.all(
    namaUnik.map(async (nama) => [nama, await getTtdBase64(nama)])
  );
  return Object.fromEntries(entries);
}

/**
 * Post-process HTML: scan data-ttd-nama markers, load base64 TTD via getTtdBase64,
 * replace empty ruang-TTD divs with <img> tags.
 * Dipanggil di route handler: await page.setContent(await injectTtdImages(html), ...)
 *
 * @param {string} html - HTML hasil render template
 * @returns {Promise<string>} HTML dengan TTD terinject (atau original kalau gagal/kosong)
 */
async function injectTtdImages(html) {
  try {
    // Fast path: tidak ada marker sama sekali
    if (!html || !html.includes('data-ttd-nama=')) return html;

    // Scan semua marker data-ttd-nama="..." (nama sudah di-escapeHtml)
    const markerPattern = /data-ttd-nama="([^"]*)"/g;
    const namaEscapedSet = new Set();
    let m;
    while ((m = markerPattern.exec(html)) !== null) {
      if (m[1]) namaEscapedSet.add(m[1]);
    }

    if (namaEscapedSet.size === 0) return html;

    // Decode HTML entities untuk query DB (escapeHtml encode: & < > " ')
    function unescapeHtml(s) {
      return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }

    // Batch query semua nama unik
    const namaEscapedArr = [...namaEscapedSet];
    const entries = await Promise.all(
      namaEscapedArr.map(async (namaEscaped) => {
        const namaRaw = unescapeHtml(namaEscaped);
        const base64 = await getTtdBase64(namaRaw);
        return [namaEscaped, base64];
      })
    );
    const ttdMap = Object.fromEntries(entries);

    // Ganti tiap div kosong yang punya marker dengan <img> kalau base64 ada
    // Pattern: <div class="ttd-ruang" data-ttd-nama="NAMA" style="height:Npx;"></div>
    let result = html;
    for (const [namaEscaped, base64] of Object.entries(ttdMap)) {
      if (!base64) continue; // tidak ada TTD → biarkan div kosong
      // Escape namaEscaped untuk regex (karakter HTML entity aman, tapi & perlu escape)
      const namaForRegex = namaEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const divPattern = new RegExp(
        `<div class="ttd-ruang" data-ttd-nama="${namaForRegex}" style="height:(\\d+)px;"></div>`,
        'g'
      );
      result = result.replace(divPattern, (_, h) =>
        `<div class="ttd-ruang" data-ttd-nama="${namaEscaped}" style="height:${Math.max(Number(h), 55)}px; display:flex; align-items:flex-end; justify-content:center;"><img src="data:image/png;base64,${base64}" alt="TTD" style="height:55px;max-width:220px;object-fit:contain;" /></div>`
      );
    }
    return result;
  } catch (e) {
    logger.error('[injectTtdImages] Error, returning original html:', e.message);
    return html;
  }
}

/**
 * Format angka ke rupiah Indonesia.
 * @param {number} val
 */
function formatRupiah(val) {
  return 'Rp' + Number(val || 0).toLocaleString('id-ID');
}

/**
 * Format angka untuk kolom tabel tanpa awalan Rp dan return '-' untuk nilai 0.
 * @param {number} val
 */
function formatNumberTabel(val) {
  if (val === 0 || !val) return '-';
  return Number(val).toLocaleString('id-ID');
}

/**
 * Shared <style> block untuk semua dokumen resmi (injected ke <head>).
 */
const SHARED_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #000;
    margin: 0;
    padding: 10mm 10mm 1mm 10mm;
    background: #fff;
    min-height: calc(297mm - 50mm);
  }
  .kop-surat {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }
  .kop-logo-placeholder {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .kop-text { flex: 1; text-align: center; }
  .kop-instansi { font-size: 11pt; font-weight: normal; letter-spacing: 0.03em; }
  .kop-lembaga { font-size: 16pt; font-weight: bold; text-transform: uppercase; }
  .kop-alamat { font-size: 10pt; margin-top: 2px; }
  .kop-garis { border-top: 3px solid #000; margin-bottom: 0; }
  .kop-garis-tipis { border-top: 1px solid #000; margin-bottom: 8px; }

  h2.judul-dok { text-align: center; font-size: 13pt; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; }
  .nomor-dok { text-align: center; font-size: 11pt; margin-bottom: 1px; }
  .nomor-dok span.highlight { background: #ffe000; padding: 0 6px; font-weight: bold; }
  .periode-label { text-align: center; font-size: 11pt; margin-bottom: 4px; }

  table { border-collapse: collapse; width: 100%; margin-bottom: 0; }
  table.tabel-rincian th {
    padding: 3px 6px;
    font-size: 11pt;
    font-weight: bold;
  }
  table.tabel-rincian th.col-label {
    text-align: left;
  }
  table.tabel-rincian th.col-amount {
    text-align: center;
  }
  table.tabel-rincian td {
    padding: 2px 6px;
    font-size: 11pt;
    line-height: 1.1;
  }
  table.tabel-rincian td.col-label {
    text-align: left;
  }
  table.tabel-rincian td.col-amount {
    text-align: center;
  }
  table.tabel-rincian tr.baris-total td {
    font-weight: bold;
  }
  table.tabel-rincian tr.baris-total td.col-total-amount {
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
  }
  table.identitas-lembaga td { padding: 1px 6px; font-size: 11pt; vertical-align: top; }
  table.identitas-lembaga td:first-child { width: 200px; }

  .keterangan-section { margin-top: 4px; font-size: 11pt; line-height: 1.4; }
  .keterangan-section p { margin: 2px 0; }

  .footer-ttd { margin-top: 5px; page-break-inside: avoid; }
  .ttd-kolom { display: inline-block; text-align: center; }
  .ttd-label { font-weight: bold; font-size: 11pt; margin-bottom: 2px; }
  .ttd-tempat-tgl { font-size: 11pt; }
  .ttd-jabatan { font-size: 11pt; margin-top: 2px; }
  .ttd-ruang { height: 15px; }
  .ttd-nama { font-size: 11pt; }

  .section-title { font-weight: bold; text-decoration: underline; margin: 4px 0 2px 0; font-size: 11pt; }
  .pembuka { font-size: 11pt; line-height: 1.4; margin-bottom: 4px; }
`;

module.exports = { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS, getTtdBase64, prepareTtdMap, injectTtdImages };
