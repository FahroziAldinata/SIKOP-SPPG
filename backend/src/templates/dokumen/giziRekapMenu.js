const { renderKopSurat, renderFooterTTD, escapeHtml, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Rekap Menu
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, namaKepalaSPPG }
 * @param {string} [data.namaGizi] - Nama Ahli Gizi
 * @param {string} [data.tanggalMulai]
 * @param {string} [data.tanggalSelesai]
 * @param {Array}  [data.data] - Array of { tanggal, status, blok: [...] }
 */
function renderGiziRekapMenuHtml(data = {}) {
  const lembaga = data.lembaga || {};
  const namaGizi = data.namaGizi || '—';
  const namaKepalaSPPG = lembaga.namaKepalaSPPG || '—';
  const tanggalMulai = data.tanggalMulai || '—';
  const tanggalSelesai = data.tanggalSelesai || '—';
  const reportList = data.data || [];

  let contentHtml = '';

  if (reportList.length === 0) {
    contentHtml = '<p style="text-align:center; padding: 20px; font-style:italic;">Tidak ada data rekap menu pada rentang tanggal ini.</p>';
  } else {
    contentHtml = reportList.map(item => {
      const tanggalTxt = escapeHtml(item.tanggal || '—');
      const statusTxt = escapeHtml(item.status || '—');

      const bloksHtml = (item.blok || []).map(blok => {
        const umNama = escapeHtml(blok.kelompokUmurNama || '—');
        const rUsia = escapeHtml(blok.rentangUsia || '—');
        const porsi = blok.porsi || 0;

        let lastKomponen = null;
        let rowsHtml = '';

        if (!blok.rows || blok.rows.length === 0) {
          rowsHtml = '<tr><td colspan="5" style="padding:8px; border:1px solid #333; text-align:center; font-style:italic;">Tidak ada data bahan menu</td></tr>';
        } else {
          rowsHtml = blok.rows.map(row => {
            const currentKomponen = row.komponen || 'Lain-lain';
            let groupHeader = '';
            if (currentKomponen !== lastKomponen) {
              lastKomponen = currentKomponen;
              groupHeader = `
                <tr style="background-color:#e5e7eb; font-weight:bold;">
                  <td colspan="5" style="padding:4px 8px; border:1px solid #333; text-align:center; color:#111827;">
                    KOMPONEN: ${escapeHtml(currentKomponen)}
                  </td>
                </tr>
              `;
            }

            const berat = Number(row.beratBersihGr || 0);
            const beratStr = Number.isInteger(berat)
              ? berat.toLocaleString('id-ID')
              : berat.toLocaleString('id-ID', { maximumFractionDigits: 2 });

            return `
              ${groupHeader}
              <tr>
                <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(row.komponen || '—')}</td>
                <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(row.namaMenu || '—')}</td>
                <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(row.bahan || '—')}</td>
                <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${beratStr}</td>
                <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(row.beratURT || '—')}</td>
              </tr>
            `;
          }).join('');
        }

        const tableHtml = `
          <table class="tbl">
            <thead>
              <tr style="background-color:#f3f4f6;">
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:20%;">Komponen</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:25%;">Nama Menu</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:25%;">Bahan Pokok</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:15%;">Berat Bersih (g)</th>
                <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:15%;">URT</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;

        return `
          <div style="margin-bottom:12px; page-break-inside: avoid; break-inside: avoid;">
            <h4 style="margin:6px 0 4px 0; font-size:10pt;">BLOK ${umNama} (${rUsia}) — ${porsi} porsi</h4>
            ${tableHtml}
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
  <title>Laporan Rekap Menu</title>
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
  <h2 class="judul-dok">LAPORAN REKAP MENU</h2>
  <div class="periode-label" style="text-align:center; font-size:10pt; margin-top:2px; margin-bottom:12px;">Rentang: ${escapeHtml(tanggalMulai)} s.d. ${escapeHtml(tanggalSelesai)}</div>
  ${contentHtml}
  ${ttdHtml}
</body>
</html>`;
}

module.exports = {
  renderGiziRekapMenuHtml
};
