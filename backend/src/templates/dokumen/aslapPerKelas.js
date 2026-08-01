const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Per Kelas (ASLAP)
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, logoFileName, namaPejabat }
 * @param {string} [data.namaAslap] - Nama petugas Aslap
 * @param {object} [data.periode] - { nama, tanggalMulai, tanggalSelesai }
 * @param {Array} [data.perKelas] - List grouped sekolah per kelas
 */
function renderAslapPerKelasHtml(data = {}) {
  const lembaga = data.lembaga || data.identitas || {};
  const namaAslap = data.namaAslap || data.aslapNama || '—';
  const namaPejabat = lembaga.namaPejabat || lembaga.namaKepalaSPPG || '—';
  const periode = data.periode || {};

  let periodeText = '—';
  if (periode.nama || periode.tanggalMulai) {
    periodeText = `${periode.nama || 'Periode'} (${periode.tanggalMulai || '-'} s.d. ${periode.tanggalSelesai || '-'})`;
  }

  const perKelasList = data.perKelas || data.data || (Array.isArray(data) ? data : []);

  let totalSekolahCount = perKelasList.length;
  let totalKelasCount = 0;
  let totalSiswaCount = 0;

  perKelasList.forEach(item => {
    totalKelasCount += item.totalKelas || 0;
    totalSiswaCount += item.totalJumlah || 0;
  });

  let contentHtml = '';
  if (perKelasList.length === 0) {
    contentHtml = '<p style="text-align:center; padding: 20px; font-style:italic;">Tidak ada data detail kelas untuk periode ini.</p>';
  } else {
    contentHtml = perKelasList.map((item, idx) => {
      const sek = item.sekolah || {};
      const kelasList = item.kelas || [];

      const rowsKelas = kelasList.map((k, kIdx) => `
        <tr>
          <td style="text-align:center;">${kIdx + 1}</td>
          <td>${escapeHtml(k.namaKelas || '—')}</td>
          <td style="text-align:center; font-weight:600;">${formatNumberTabel(k.jumlah)}</td>
        </tr>
      `).join('');

      return `
        <div style="margin-bottom: 20px; ${idx > 0 && idx % 3 === 0 ? 'page-break-before: always;' : ''}">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; margin-bottom: 4px;">
            <strong style="font-size: 10pt;">${escapeHtml(sek.nama || 'Sekolah')}</strong>
            ${sek.jenjang ? `<span style="font-size: 8.5pt; font-weight: normal; margin-left: 6px;">(${escapeHtml(sek.jenjang)})</span>` : ''}
            <div style="font-size: 8pt; color: #475569; margin-top: 2px;">
              NPSN: ${escapeHtml(sek.npsn || '-')} | Alamat: ${escapeHtml(sek.alamat || '-')} | Jumlah Kelas: ${formatNumberTabel(item.totalKelas)} | Total Siswa: ${formatNumberTabel(item.totalJumlah)}
            </div>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th style="text-align:left;">Nama Kelas</th>
                <th style="width: 160px;">Jumlah Siswa / Penerima</th>
              </tr>
            </thead>
            <tbody>${rowsKelas}</tbody>
            <tfoot>
              <tr style="font-weight:bold; background-color:#eef2f7;">
                <td colspan="2" style="text-align:right;">Subtotal ${escapeHtml(sek.nama || '')}:</td>
                <td style="text-align:center;">${formatNumberTabel(item.totalJumlah)} Siswa</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join('');
  }

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAslap, jabatan: 'Aslap SPPG' },
    { label: 'Mengetahui,', nama: namaPejabat, jabatan: 'Kepala SPPG' }
  ], '', { ruangTtd: 40 });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Per Kelas (ASLAP)</title>
  <style>
    ${SHARED_CSS}
    body { font-size: 9pt; }
    .periode-info { text-align: center; font-size: 9.5pt; margin: 2px 0 10px 0; }
    h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
    table.tbl { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8px; page-break-inside: avoid; }
    table.tbl thead { display: table-header-group; }
    table.tbl tr { page-break-inside: avoid; }
    table.tbl th, table.tbl td { border: 1px solid #000; padding: 3px 6px; }
    table.tbl th { background: #f0f0f0; text-align: center; font-weight: bold; }
    .summary-box { border: 1px solid #000; padding: 6px 10px; margin-top: 10px; margin-bottom: 14px; font-size: 8.5pt; background: #fafafa; }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}
  <h2 class="judul-dok">LAPORAN PER KELAS (ASLAP)</h2>
  <div class="periode-info">Periode: ${escapeHtml(periodeText)}</div>

  <div class="summary-box">
    <strong>RINGKASAN:</strong> Total Sekolah: <strong>${formatNumberTabel(totalSekolahCount)}</strong> | Total Rombel/Kelas: <strong>${formatNumberTabel(totalKelasCount)}</strong> | Total Siswa: <strong>${formatNumberTabel(totalSiswaCount)}</strong>
  </div>

  ${contentHtml}

  ${footer}
</body>
</html>`;
}

module.exports = {
  renderAslapPerKelasHtml,
  renderPerKelasHtml: renderAslapPerKelasHtml
};
