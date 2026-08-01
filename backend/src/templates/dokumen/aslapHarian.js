const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Harian Penerima Manfaat (ASLAP)
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, logoFileName, namaPejabat }
 * @param {string} [data.namaAslap] - Nama petugas Aslap
 * @param {object} [data.periode] - { nama, tanggalMulai, tanggalSelesai }
 * @param {Array} [data.grupHari] - List grup hari (setiap item berisi sesiA dan sesiB)
 * @param {object} [data.sesiB] - Sesi B global (Non-Peserta Didik)
 */
function renderAslapHarianHtml(data = {}) {
  const lembaga = data.lembaga || data.identitas || {};
  const namaAslap = data.namaAslap || data.aslapNama || '—';
  const namaPejabat = lembaga.namaPejabat || lembaga.namaKepalaSPPG || '—';
  const periode = data.periode || {};

  const grupHariList = data.grupHari || [];
  const sesiBGlobal = data.sesiB || {};

  let periodeText = '—';
  if (periode.nama || periode.tanggalMulai) {
    periodeText = `${periode.nama || 'Periode'} (${periode.tanggalMulai || '-'} s.d. ${periode.tanggalSelesai || '-'})`;
  }

  let contentHtml = '';

  if (grupHariList.length === 0) {
    contentHtml = '<p style="text-align:center; padding: 20px; font-style:italic;">Tidak ada data laporan harian untuk periode ini.</p>';
  } else {
    contentHtml = grupHariList.map((gh) => {
      const hariAktifStr = Array.isArray(gh.hariAktif) ? gh.hariAktif.join(', ') : '';

      // Section A: Peserta Didik
      const sesiA = gh.sesiA || {};
      const sekolahList = sesiA.sekolah || [];
      let rowsA = '';

      if (sekolahList.length === 0) {
        rowsA = '<tr><td colspan="8" style="text-align:center; padding:6px;">Tidak ada data penerima manfaat peserta didik pada grup hari ini.</td></tr>';
      } else {
        const rowList = [];
        sekolahList.forEach((sek) => {
          let subL = 0;
          let subP = 0;
          (sek.kategori || []).forEach((kat) => {
            subL += kat.l || 0;
            subP += kat.p || 0;
            const sekDisplay = sek.jenjang && sek.jenjang !== '-' ? `${escapeHtml(sek.nama)} (${escapeHtml(sek.jenjang)})` : escapeHtml(sek.nama);
            rowList.push(`
              <tr>
                <td>${escapeHtml(kat.nama)}</td>
                <td>${sekDisplay}</td>
                <td style="text-align:center;">${formatNumberTabel(kat.l)}</td>
                <td style="text-align:center;">${formatNumberTabel(kat.p)}</td>
                <td style="text-align:center; font-weight:600;">${formatNumberTabel(kat.total)}</td>
                <td style="text-align:center;">—</td>
                <td style="text-align:center;">—</td>
                <td style="text-align:center;">—</td>
              </tr>
            `);
          });
          rowList.push(`
            <tr style="font-weight:bold; background-color:#f9f9f9;">
              <td>Subtotal ${escapeHtml(sek.nama)}</td>
              <td style="text-align:center;">—</td>
              <td style="text-align:center;">${formatNumberTabel(subL)}</td>
              <td style="text-align:center;">${formatNumberTabel(subP)}</td>
              <td style="text-align:center;">${formatNumberTabel(sek.total)}</td>
              <td style="text-align:center;">${formatNumberTabel(sek.lkPic)}</td>
              <td style="text-align:center;">${formatNumberTabel(sek.pPic)}</td>
              <td style="text-align:center;">${formatNumberTabel(sek.jmlPic)}</td>
            </tr>
          `);
        });
        rowList.push(`
          <tr style="font-weight:bold; background-color:#eef2f7;">
            <td colspan="4">GRAND TOTAL PESERTA DIDIK (${escapeHtml(gh.label)})</td>
            <td style="text-align:center;">${formatNumberTabel(sesiA.grandTotal)}</td>
            <td colspan="3" style="text-align:center;">—</td>
          </tr>
        `);
        rowsA = rowList.join('');
      }

      // Section B: Non-Peserta Didik (1 Blok Seluruh Periode)
      const sesiB = gh.sesiB || sesiBGlobal || {};
      const posyanduList = sesiB.posyandu || [];
      let rowsB = '';

      if (posyanduList.length === 0) {
        rowsB = '<tr><td colspan="6" style="text-align:center; padding:6px;">Tidak ada data penerima manfaat non-peserta didik pada periode ini.</td></tr>';
      } else {
        const rowListB = [];
        posyanduList.forEach((pos) => {
          let subL = 0;
          let subP = 0;
          (pos.kategori || []).forEach((kat) => {
            subL += kat.l || 0;
            subP += kat.p || 0;
            const isKader = kat.kode === 'KADER_POSYANDU' || (kat.nama && kat.nama.toLowerCase().includes('kader'));
            const displayL = (isKader && kat.l === 0) ? '-' : formatNumberTabel(kat.l);
            rowListB.push(`
              <tr>
                <td>${escapeHtml(kat.nama)}</td>
                <td>${escapeHtml(pos.nama)}</td>
                <td style="text-align:center;">${displayL}</td>
                <td style="text-align:center;">${formatNumberTabel(kat.p)}</td>
                <td style="text-align:center; font-weight:600;">${formatNumberTabel(kat.total)}</td>
                <td style="text-align:center;">—</td>
              </tr>
            `);
          });
          rowListB.push(`
            <tr style="font-weight:bold; background-color:#f9f9f9;">
              <td>Subtotal ${escapeHtml(pos.nama)}</td>
              <td style="text-align:center;">—</td>
              <td style="text-align:center;">${formatNumberTabel(subL)}</td>
              <td style="text-align:center;">${formatNumberTabel(subP)}</td>
              <td style="text-align:center;">${formatNumberTabel(pos.total)}</td>
              <td style="text-align:center;">${formatNumberTabel(pos.picKader)}</td>
            </tr>
          `);
        });
        rowListB.push(`
          <tr style="font-weight:bold; background-color:#eef2f7;">
            <td colspan="4">GRAND TOTAL NON-PESERTA DIDIK</td>
            <td style="text-align:center;">${formatNumberTabel(sesiB.grandTotal)}</td>
            <td style="text-align:center;">—</td>
          </tr>
        `);
        rowsB = rowListB.join('');
      }

      return `
        <div style="margin-top: 16px; margin-bottom: 24px;">
          <h3 style="font-size: 10pt; font-weight: bold; margin: 8px 0 6px 0; background: #e2e8f0; padding: 4px 8px; border-left: 4px solid #1a3c6e;">
            GRUP HARI: ${escapeHtml(gh.label)} ${hariAktifStr ? `(${escapeHtml(hariAktifStr)})` : ''}
          </h3>

          <h4 style="font-size: 9.5pt; font-weight: bold; margin: 8px 0 4px 0;">Section A: Peserta Didik (${escapeHtml(gh.label)})</h4>
          <table class="tbl">
            <thead>
              <tr>
                <th style="text-align:left;">Kelompok</th>
                <th style="text-align:left;">Sekolah</th>
                <th>L</th>
                <th>P</th>
                <th>Total</th>
                <th>LK PIC</th>
                <th>P PIC</th>
                <th>JML PIC</th>
              </tr>
            </thead>
            <tbody>${rowsA}</tbody>
          </table>

          <h4 style="font-size: 9.5pt; font-weight: bold; margin: 12px 0 4px 0;">Section B: Non-Peserta Didik (B3)</h4>
          <table class="tbl">
            <thead>
              <tr>
                <th style="text-align:left;">Kelompok</th>
                <th style="text-align:left;">Posyandu</th>
                <th>L</th>
                <th>P</th>
                <th>Total</th>
                <th>PIC KADER</th>
              </tr>
            </thead>
            <tbody>${rowsB}</tbody>
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
  <title>Laporan Harian Penerima Manfaat (ASLAP)</title>
  <style>
    ${SHARED_CSS}
    body { font-size: 9pt; }
    .periode-info { text-align: center; font-size: 9.5pt; margin: 2px 0 12px 0; }
    h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
    table.tbl { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8px; page-break-inside: avoid; }
    table.tbl thead { display: table-header-group; }
    table.tbl tr { page-break-inside: avoid; }
    table.tbl th, table.tbl td { border: 1px solid #000; padding: 3px 5px; }
    table.tbl th { background: #f0f0f0; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}
  <h2 class="judul-dok">LAPORAN HARIAN PENERIMA MANFAAT (ASLAP)</h2>
  <div class="periode-info">Periode: ${escapeHtml(periodeText)}</div>
  ${contentHtml}
  ${footer}
</body>
</html>`;
}

module.exports = {
  renderAslapHarianHtml,
  renderHarianHtml: renderAslapHarianHtml
};
