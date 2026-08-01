const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

const NAMA_BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Template PDF Laporan Bulanan (ASLAP)
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, logoFileName, namaPejabat }
 * @param {string} [data.namaAslap] - Nama petugas Aslap
 * @param {number|string} [data.bulan] - Angka bulan (1-12)
 * @param {string} [data.namaBulan] - Nama bulan (misal "Juli")
 * @param {number|string} [data.tahun] - Tahun (misal 2026)
 * @param {Array} [data.hari] - Rekapitulasi per tanggal dalam 1 bulan
 * @param {object} [data.total] - Total agregat bulan
 */
function renderAslapPerBulanHtml(data = {}) {
  const lembaga = data.lembaga || data.identitas || {};
  const namaAslap = data.namaAslap || data.aslapNama || '—';
  const namaPejabat = lembaga.namaPejabat || lembaga.namaKepalaSPPG || '—';

  const bulanNum = Number(data.bulan) || 1;
  const namaBulanStr = data.namaBulan || NAMA_BULAN_LIST[bulanNum - 1] || '—';
  const tahunNum = data.tahun || new Date().getFullYear();

  const hariList = data.hari || [];
  const tot = data.total || {};

  let rowsHtml = '';
  if (hariList.length === 0) {
    rowsHtml = '<tr><td colspan="19" style="text-align:center; padding:8px;">Tidak ada data penerima manfaat pada bulan ini.</td></tr>';
  } else {
    rowsHtml = hariList.map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(item.hari || '—')}</td>
        <td style="text-align:center;">${escapeHtml(item.tanggal || '—')}</td>
        <td>${escapeHtml(item.periodeId || '-')}</td>
        <td style="text-align:center;">${formatNumberTabel(item.paudTk)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.sd1_3)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.sd4_6)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.smp)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.sma)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.ats9)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.ats9_18)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.pendidik)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.tendik)}</td>
        <td style="text-align:center; font-weight:600;">${formatNumberTabel(item.jmlPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.bumil)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.busui)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.balita)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.kader)}</td>
        <td style="text-align:center; font-weight:bold;">${formatNumberTabel(item.total)}</td>
      </tr>
    `).join('') + `
      <tr style="font-weight:bold; background-color:#eef2f7;">
        <td style="text-align:center;">—</td>
        <td>TOTAL</td>
        <td style="text-align:center;">—</td>
        <td>—</td>
        <td style="text-align:center;">${formatNumberTabel(tot.paudTk)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.sd1_3)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.sd4_6)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.smp)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.sma)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.ats9)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.ats9_18)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.pendidik)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.tendik)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.jmlPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.bumil)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.busui)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.balita)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.kader)}</td>
        <td style="text-align:center;">${formatNumberTabel(tot.total)}</td>
      </tr>
    `;
  }

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAslap, jabatan: 'Aslap SPPG' },
    { label: 'Mengetahui,', nama: namaPejabat, jabatan: 'Kepala SPPG' }
  ], '', { ruangTtd: 40 });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Bulanan (ASLAP)</title>
  <style>
    ${SHARED_CSS}
    body { font-size: 8.5pt; }
    .bulan-info { text-align: center; font-size: 9.5pt; margin: 2px 0 12px 0; }
    h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
    table.tbl { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 12px; page-break-inside: avoid; }
    table.tbl thead { display: table-header-group; }
    table.tbl tr { page-break-inside: avoid; }
    table.tbl th, table.tbl td { border: 1px solid #000; padding: 2px 3px; word-break: break-word; }
    table.tbl th { background: #f0f0f0; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}
  <h2 class="judul-dok">LAPORAN BULANAN (ASLAP)</h2>
  <div class="bulan-info">Bulan: ${escapeHtml(namaBulanStr)} ${tahunNum}</div>

  <table class="tbl">
    <thead>
      <tr>
        <th rowspan="2">No</th>
        <th rowspan="2" style="text-align:left;">Hari</th>
        <th rowspan="2">Tanggal</th>
        <th rowspan="2" style="text-align:left;">Periode</th>
        <th colspan="7">Peserta Didik (Siswa)</th>
        <th colspan="3">PIC Sekolah</th>
        <th colspan="4">Non-Peserta Didik</th>
        <th rowspan="2">Total</th>
      </tr>
      <tr>
        <th>PAUD/TK</th>
        <th>SD 1-3</th>
        <th>SD 4-6</th>
        <th>SMP</th>
        <th>SMA</th>
        <th>ATS&lt;9</th>
        <th>ATS9-18</th>
        <th>Pendidik</th>
        <th>Tendik</th>
        <th>JML PIC</th>
        <th>Bumil</th>
        <th>Busui</th>
        <th>Balita</th>
        <th>Kader</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  ${footer}
</body>
</html>`;
}

module.exports = {
  renderAslapPerBulanHtml,
  renderPerBulanHtml: renderAslapPerBulanHtml
};
