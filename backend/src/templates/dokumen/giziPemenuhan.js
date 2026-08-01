const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Pemenuhan Gizi Harian
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, namaKepalaSPPG }
 * @param {string} [data.namaGizi] - Nama Ahli Gizi
 * @param {string} [data.tanggalMulai]
 * @param {string} [data.tanggalSelesai]
 * @param {Array}  [data.data] - Array of { tanggal, status, blok: [...] }
 */
function renderGiziPemenuhanHtml(data = {}) {
  const lembaga = data.lembaga || {};
  const namaGizi = data.namaGizi || '—';
  const namaKepalaSPPG = lembaga.namaKepalaSPPG || '—';
  const tanggalMulai = data.tanggalMulai || '—';
  const tanggalSelesai = data.tanggalSelesai || '—';
  const reportList = data.data || [];

  let contentHtml = '';

  if (reportList.length === 0) {
    contentHtml = '<p style="text-align:center; padding: 20px; font-style:italic;">Tidak ada data pemenuhan gizi pada rentang tanggal ini.</p>';
  } else {
    contentHtml = reportList.map(item => {
      const tanggalTxt = escapeHtml(item.tanggal || '—');
      const statusTxt = escapeHtml(item.status || '—');

      const bloksHtml = (item.blok || []).map(blok => {
        const umNama = escapeHtml(blok.kelompokUmurNama || '—');
        const rUsia = escapeHtml(blok.rentangUsia || '—');
        const porsi = blok.porsi || 0;

        const menuList = (blok.menu || []).map(m => {
          const nm = escapeHtml(m.namaMenu || '');
          const komp = m.komponen ? ` (${escapeHtml(m.komponen)})` : '';
          return `${nm}${komp}`;
        }).filter(Boolean).join(', ');

        const menuHtml = menuList
          ? `<div style="margin-bottom:6px; font-size:9.5pt;"><strong>Menu:</strong> ${menuList}</div>`
          : '<div style="margin-bottom:6px; font-size:9.5pt; font-style:italic;">Belum ada menu</div>';

        const giziRows = (blok.gizi || []).map(g => {
          const labelSatuan = `${escapeHtml(g.label)} (${escapeHtml(g.satuan)})`;
          const targetVal = Number(g.target || 0).toLocaleString('id-ID');
          const realisasiVal = Number(g.realisasi || 0).toLocaleString('id-ID');
          const persenNum = Number(g.persen || 0);
          const persenStr = `${persenNum.toFixed(1)}%`;

          let statusTeks = 'Kurang';
          let statusColor = '#dc2626';
          if (persenNum >= 90) {
            statusTeks = 'Terpenuhi';
            statusColor = '#16a34a';
          } else if (persenNum >= 60) {
            statusTeks = 'Cukup';
            statusColor = '#d97706';
          }

          return `
            <tr>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${labelSatuan}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${targetVal}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${realisasiVal}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${persenStr}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center; font-weight:bold; color:${statusColor};">${statusTeks}</td>
            </tr>
          `;
        }).join('');

        const tableHtml = `
          <table class="tbl">
            <thead>
              <tr style="background-color:#f3f4f6;">
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:30%;">Zat Gizi</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:17.5%;">Target</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:17.5%;">Realisasi</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:17.5%;">Pemenuhan (%)</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:17.5%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${giziRows}
            </tbody>
          </table>
        `;

        const totalBiayaTxt = formatRupiah(blok.totalBiaya || 0);

        return `
          <div style="margin-bottom:12px; page-break-inside: avoid; break-inside: avoid;">
            <h4 style="margin:6px 0 4px 0; font-size:10pt;">BLOK ${umNama} (${rUsia}) — ${porsi} porsi</h4>
            ${menuHtml}
            ${tableHtml}
            <div style="font-size:9.5pt; font-weight:bold; margin-top:2px; margin-bottom:8px;">Total Biaya: ${totalBiayaTxt}</div>
          </div>
        `;
      }).join('');

      return `
        <div style="margin-bottom:16px;">
          <h3 style="margin:12px 0 6px 0; font-size:11pt; border-bottom:1px solid #ccc; padding-bottom:3px;">Tanggal: ${tanggalTxt} — Status: ${statusTxt}</h3>
          ${bloksHtml}
        </div>
      `;
    }).join('');
  }

  const ttdHtml = renderFooterTTD(
    [
      { label: 'Dibuat Oleh,', nama: namaGizi, jabatan: 'Ahli Gizi SPPG' },
      { label: 'Mengetahui,', nama: namaKepalaSPPG, jabatan: 'Kepala SPPG' }
    ],
    '',
    { ruangTtd: 40 }
  );

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Pemenuhan Gizi</title>
  <style>
    ${SHARED_CSS}
    table.tbl { width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:8px; page-break-inside:avoid; }
    table.tbl thead { display:table-header-group; }
    table.tbl tr { page-break-inside:avoid; }
    h2, h3, h4, .periode-label { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}
  <h2 class="judul-dok">LAPORAN PEMENUHAN GIZI</h2>
  <div class="periode-label" style="text-align:center; font-size:10pt; margin-top:2px; margin-bottom:12px;">Rentang: ${escapeHtml(tanggalMulai)} s.d. ${escapeHtml(tanggalSelesai)}</div>
  ${contentHtml}
  ${ttdHtml}
</body>
</html>`;
}

module.exports = {
  renderGiziPemenuhanHtml
};
