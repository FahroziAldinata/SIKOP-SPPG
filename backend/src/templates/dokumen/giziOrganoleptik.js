const { renderKopSurat, renderFooterTTD, escapeHtml, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Uji Organoleptik & Keamanan Pangan
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, namaKepalaSPPG }
 * @param {string} [data.namaGizi] - Nama Ahli Gizi
 * @param {string} [data.tanggalMulai]
 * @param {string} [data.tanggalSelesai]
 * @param {Array}  [data.data] - Array of { tanggal, status, blok: [...] }
 */
function renderGiziOrganoleptikHtml(data = {}) {
  const lembaga = data.lembaga || {};
  const namaGizi = data.namaGizi || '—';
  const namaKepalaSPPG = lembaga.namaKepalaSPPG || '—';
  const tanggalMulai = data.tanggalMulai || '—';
  const tanggalSelesai = data.tanggalSelesai || '—';
  const reportList = data.data || [];

  let contentHtml = '';

  if (reportList.length === 0) {
    contentHtml = '<p style="text-align:center; padding: 20px; font-style:italic;">Tidak ada data uji organoleptik & keamanan pangan pada rentang tanggal ini.</p>';
  } else {
    contentHtml = reportList.map(item => {
      const tanggalTxt = escapeHtml(item.tanggal || '—');
      const statusTxt = escapeHtml(item.status || '—');

      const bloksHtml = (item.blok || []).map(blok => {
        const umNama = escapeHtml(blok.kelompokUmurNama || '—');
        const rUsia = escapeHtml(blok.rentangUsia || '—');
        const porsi = blok.porsi || 0;
        const org = blok.organoleptik;
        const alergiList = blok.alergi || [];

        let organoleptikHtml = '';
        if (!org) {
          organoleptikHtml = '<p style="text-align:center; font-style:italic; font-size:9pt; margin:4px 0 8px 0;">Tidak ada data uji organoleptik</p>';
        } else {
          const rasa = escapeHtml(org.rasa || '—');
          const aroma = escapeHtml(org.aroma || '—');
          const tekstur = escapeHtml(org.tekstur || '—');
          const suhuSaji = escapeHtml(org.suhuSaji || '—');
          const ujiPadaTanggal = escapeHtml(org.ujiPadaTanggal || '—');
          const jumlahOmpreng = org.jumlahOmpreng != null ? org.jumlahOmpreng : '—';
          const tanggalMusnah = escapeHtml(org.tanggalMusnah || '—');

          let catatanRow = '';
          if (org.catatan && String(org.catatan).trim() !== '') {
            catatanRow = `
              <tr>
                <td colspan="7" style="padding:4px 8px; border:1px solid #333; text-align:center;">
                  <strong>Catatan:</strong> ${escapeHtml(org.catatan)}
                </td>
              </tr>
            `;
          }

          organoleptikHtml = `
            <table class="tbl">
              <thead>
                <tr style="background-color:#f3f4f6;">
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Rasa</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Aroma</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Tekstur</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Suhu Saji</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:16%;">Uji Pada Tanggal</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Jumlah Ompreng</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:14%;">Tanggal Musnah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${rasa}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${aroma}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${tekstur}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${suhuSaji}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${ujiPadaTanggal}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${jumlahOmpreng}</td>
                  <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${tanggalMusnah}</td>
                </tr>
                ${catatanRow}
              </tbody>
            </table>
          `;
        }

        let alergiHtml = '';
        if (alergiList.length === 0) {
          alergiHtml = '<p style="text-align:center; font-style:italic; font-size:9pt; margin:4px 0 8px 0;">Tidak ada alergi</p>';
        } else {
          const rows = alergiList.map(a => `
            <tr>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(a.jenisAlergi || '—')}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${a.jumlahSiswa ?? 0}</td>
              <td style="padding:4px 8px; border:1px solid #333; text-align:center;">${escapeHtml(a.bahanPengganti || '—')}</td>
            </tr>
          `).join('');

          alergiHtml = `
            <table class="tbl">
              <thead>
                <tr style="background-color:#f3f4f6;">
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:35%;">Jenis Alergi</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:25%;">Jumlah Siswa</th>
                  <th style="padding:5px 8px; border:1px solid #333; text-align:center; width:40%;">Bahan Pengganti</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          `;
        }

        return `
          <div style="margin-bottom:12px; page-break-inside: avoid; break-inside: avoid;">
            <h4 style="margin:6px 0 4px 0; font-size:10pt;">BLOK ${umNama} (${rUsia}) — ${porsi} porsi</h4>
            ${organoleptikHtml}
            ${alergiHtml}
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
  <title>Laporan Uji Organoleptik & Keamanan Pangan</title>
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
  <h2 class="judul-dok">LAPORAN UJI ORGANOLEPTIK & KEAMANAN PANGAN</h2>
  <div class="periode-label" style="text-align:center; font-size:10pt; margin-top:2px; margin-bottom:12px;">Rentang: ${escapeHtml(tanggalMulai)} s.d. ${escapeHtml(tanggalSelesai)}</div>
  ${contentHtml}
  ${ttdHtml}
</body>
</html>`;
}

module.exports = {
  renderGiziOrganoleptikHtml
};
