const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Format angka ke format Rupiah.
 */
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

/**
 * Render HTML template untuk PDF RAB P12 Harian.
 * @param {object} data
 * @returns {string} HTML string
 */
function renderRabP12Html(data = {}) {
  const {
    tanggal = '',
    periodeInfo = '',
    pagu = {},
    items = [],
    rekap = {},
    identitas = {}
  } = data;

  const {
    namaLembaga = '',
    alamat = '',
    namaAkuntan = '',
    namaKepala = '',
    namaKepalaSPPG = ''
  } = identitas;

  const kepalaNama = namaKepala || namaKepalaSPPG || '';

  const totalSubtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);

  const tglFormatted = tanggal
    ? new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const itemRows = items.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 10px;">Tidak ada data bahan</td></tr>`
    : items.map((item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${escapeHtml(item.nama || item.bahan || '—')}</td>
        <td style="text-align: center;">${formatNumberTabel(item.qtySiswa)}</td>
        <td style="text-align: center;">${formatNumberTabel(item.qtyB3)}</td>
        <td style="text-align: center;">${formatNumberTabel(item.qtyTotal)}</td>
        <td style="text-align: center;">${escapeHtml(item.satuan || 'kg')}</td>
        <td style="text-align: center;">${formatNumberTabel(item.hargaSatuan)}</td>
        <td style="text-align: center;">${formatNumberTabel(item.subtotal)}</td>
      </tr>
    `).join('');

  const footerTTD = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntan || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,', nama: kepalaNama || '—', jabatan: 'Kepala SPPG' }
  ], tglFormatted);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>RAB P12 — ${escapeHtml(tanggal)}</title>
  <style>
    ${SHARED_CSS}

    body {
      font-size: 9pt;
    }

    .info-header {
      margin: 10px 0 14px 0;
      font-size: 9.5pt;
    }

    .info-header table {
      width: 100%;
      border-collapse: collapse;
    }

    .info-header td {
      padding: 2px 4px;
    }

    table.rab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 16px;
    }

    table.rab-table th, table.rab-table td {
      border: 1px solid #000;
      padding: 4px 6px;
    }

    table.rab-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }

    .rekap-section {
      margin-top: 16px;
      margin-bottom: 20px;
      border: 1px solid #000;
      padding: 10px 14px;
      font-size: 9.5pt;
    }

    .rekap-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }

    .rekap-table td {
      padding: 3px 6px;
    }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok" style="margin-top: 10px;">RENCANA ANGGARAN BIAYA (RAB) P12</h2>

  <div class="info-header">
    <table>
      <tr>
        <td style="width: 250px;"><strong>Tanggal:</strong> ${escapeHtml(tglFormatted)} (${escapeHtml(tanggal)})</td>
        <td><strong>Periode:</strong> ${escapeHtml(periodeInfo || '—')}</td>
      </tr>
      <tr>
        <td colspan="2">
          <strong>Pagu Kecil:</strong> ${formatRupiah(pagu.KECIL)} &nbsp;|&nbsp;
          <strong>Pagu Besar:</strong> ${formatRupiah(pagu.BESAR)} &nbsp;|&nbsp;
          <strong>Total Pagu Harian:</strong> ${formatRupiah(pagu.total)}
        </td>
      </tr>
    </table>
  </div>

  <table class="rab-table">
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th>Nama Bahan</th>
        <th style="width: 70px;">Qty SISWA</th>
        <th style="width: 70px;">Qty B3</th>
        <th style="width: 75px;">Total Qty</th>
        <th style="width: 50px;">Satuan</th>
        <th style="width: 100px;">Harga Satuan (Rp)</th>
        <th style="width: 110px;">Subtotal (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #f2f2f2; font-weight: bold;">
        <td colspan="7" style="text-align: center;">TOTAL:</td>
        <td style="text-align: center;">${formatNumberTabel(totalSubtotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="rekap-section">
    <div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px;">
      Rekapitulasi Pagu &amp; Pemakaian Anggaran
    </div>
    <table class="rekap-table">
      <tr>
        <td style="width: 220px;">Pagu Maksimal</td>
        <td style="width: 15px;">:</td>
        <td><strong>${formatRupiah(rekap.maksimalAnggaran ?? pagu.total)}</strong></td>
      </tr>
      <tr>
        <td>Jumlah Kebutuhan Bahan</td>
        <td>:</td>
        <td>${formatRupiah(rekap.jumlahKebutuhanBahan ?? totalSubtotal)}</td>
      </tr>
      <tr>
        <td>Pemakaian Anggaran</td>
        <td>:</td>
        <td>${formatRupiah(rekap.pemakaianAnggaran)}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Sisa Anggaran</td>
        <td>:</td>
        <td>${formatRupiah(rekap.sisa ?? ((rekap.maksimalAnggaran ?? pagu.total ?? 0) - (rekap.pemakaianAnggaran ?? 0)))}</td>
      </tr>
    </table>
  </div>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderRabP12Html };
