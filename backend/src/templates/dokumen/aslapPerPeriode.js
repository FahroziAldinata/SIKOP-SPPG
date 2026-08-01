const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Template PDF Laporan Per Periode (ASLAP)
 * @param {object} data
 * @param {object} [data.lembaga] - { namaLembaga, alamat, logoFileName, namaPejabat }
 * @param {string} [data.namaAslap] - Nama petugas Aslap
 * @param {object} [data.periode] - { nama, tanggalMulai, tanggalSelesai }
 * @param {object} [data.pendidikan] - { sekolah: [...], total: {...} }
 * @param {object} [data.posyandu] - { posyandu: [...], total: {...} }
 */
function renderAslapPerPeriodeHtml(data = {}) {
  const lembaga = data.lembaga || data.identitas || {};
  const namaAslap = data.namaAslap || data.aslapNama || '—';
  const namaPejabat = lembaga.namaPejabat || lembaga.namaKepalaSPPG || '—';
  const periode = data.periode || {};

  let periodeText = '—';
  if (periode.nama || periode.tanggalMulai) {
    periodeText = `${periode.nama || 'Periode'} (${periode.tanggalMulai || '-'} s.d. ${periode.tanggalSelesai || '-'})`;
  }

  const pendidikan = data.pendidikan || {};
  const sekolahList = pendidikan.sekolah || [];
  const totSek = pendidikan.total || {};

  const posyandu = data.posyandu || {};
  const posyanduList = posyandu.posyandu || [];
  const totPos = posyandu.total || {};

  // Table 1: Pendidikan (17 Columns)
  let rowsPendidikan = '';
  if (sekolahList.length === 0) {
    rowsPendidikan = '<tr><td colspan="17" style="text-align:center; padding:8px;">Tidak ada data penerima manfaat pendidikan pada periode ini.</td></tr>';
  } else {
    rowsPendidikan = sekolahList.map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(item.nama || '—')}</td>
        <td style="text-align:center;">${escapeHtml(item.npsn || '-')}</td>
        <td>${escapeHtml(item.alamat || '-')}</td>
        <td style="text-align:center;">${formatNumberTabel(item.kecil)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.besar46)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.besarSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.lk13)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.p13)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.lk46)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.p46)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.lkSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.pSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.lkPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.pPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.jmlPic)}</td>
        <td style="text-align:center; font-weight:bold;">${formatNumberTabel(item.jumlahPm)}</td>
      </tr>
    `).join('') + `
      <tr style="font-weight:bold; background-color:#eef2f7;">
        <td style="text-align:center;">—</td>
        <td colspan="3">JUMLAH SEKTOR PENDIDIKAN</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.kecil)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.besar46)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.besarSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.lk13)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.p13)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.lk46)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.p46)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.lkSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.pSmk)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.lkPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.pPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.jmlPic)}</td>
        <td style="text-align:center;">${formatNumberTabel(totSek.jumlahPm)}</td>
      </tr>
    `;
  }

  // Table 2: Posyandu (11 Columns)
  let rowsPosyandu = '';
  if (posyanduList.length === 0) {
    rowsPosyandu = '<tr><td colspan="11" style="text-align:center; padding:8px;">Tidak ada data penerima manfaat posyandu pada periode ini.</td></tr>';
  } else {
    rowsPosyandu = posyanduList.map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(item.nama || '—')}</td>
        <td style="text-align:center;">${formatNumberTabel(item.balita)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.bumil)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.busui)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.lkBalita)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.pBalita)}</td>
        <td style="text-align:center;">${!item.lkKader ? '-' : formatNumberTabel(item.lkKader)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.pKader)}</td>
        <td style="text-align:center;">${formatNumberTabel(item.picKader)}</td>
        <td style="text-align:center; font-weight:bold;">${formatNumberTabel(item.jumlah)}</td>
      </tr>
    `).join('') + `
      <tr style="font-weight:bold; background-color:#eef2f7;">
        <td style="text-align:center;">—</td>
        <td>JUMLAH SEKTOR POSYANDU</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.balita)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.bumil)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.busui)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.lkBalita)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.pBalita)}</td>
        <td style="text-align:center;">${!totPos.lkKader ? '-' : formatNumberTabel(totPos.lkKader)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.pKader)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.picKader)}</td>
        <td style="text-align:center;">${formatNumberTabel(totPos.jumlah)}</td>
      </tr>
    `;
  }

  const grandTotalPM = (Number(totSek.jumlahPm) || 0) + (Number(totPos.jumlah) || 0);

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAslap, jabatan: 'Aslap SPPG' },
    { label: 'Mengetahui,', nama: namaPejabat, jabatan: 'Kepala SPPG' }
  ], '', { ruangTtd: 40 });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Per Periode (ASLAP)</title>
  <style>
    ${SHARED_CSS}
    body { font-size: 8.5pt; }
    .periode-info { text-align: center; font-size: 9.5pt; margin: 2px 0 10px 0; }
    h3.section-title { font-size: 9.5pt; font-weight: bold; margin: 12px 0 4px 0; }
    h2, h3, h4, .section-title { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
    table.tbl { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 12px; page-break-inside: avoid; }
    table.tbl thead { display: table-header-group; }
    table.tbl tr { page-break-inside: avoid; }
    table.tbl th, table.tbl td { border: 1px solid #000; padding: 2px 3px; word-break: break-word; }
    table.tbl th { background: #f0f0f0; text-align: center; font-weight: bold; }
    .summary-box { border: 1px solid #000; padding: 6px 10px; margin-top: 10px; margin-bottom: 14px; font-size: 8.5pt; background: #fafafa; }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}
  <h2 class="judul-dok">LAPORAN PER PERIODE (ASLAP)</h2>
  <div class="periode-info">Periode: ${escapeHtml(periodeText)}</div>

  <h3 class="section-title">Sektor Pendidikan</h3>
  <table class="tbl">
    <thead>
      <tr>
        <th rowspan="2">No</th>
        <th rowspan="2" style="text-align:left;">Nama PM</th>
        <th rowspan="2">NPSN</th>
        <th rowspan="2" style="text-align:left;">Alamat</th>
        <th colspan="3">Kelompok Porsi</th>
        <th colspan="6">Sub-Gender Siswa</th>
        <th colspan="3">PIC Sekolah</th>
        <th rowspan="2">JUMLAH PM</th>
      </tr>
      <tr>
        <th>KECIL 1-3</th>
        <th>BESAR 4-6</th>
        <th>BESAR SMK</th>
        <th>lk/1-3</th>
        <th>p/1-3</th>
        <th>lk/4-6</th>
        <th>p/4-6</th>
        <th>lk/smk</th>
        <th>p/smk</th>
        <th>lk/PIC</th>
        <th>p/PIC</th>
        <th>JML PIC</th>
      </tr>
    </thead>
    <tbody>${rowsPendidikan}</tbody>
  </table>

  <h3 class="section-title">Sektor Posyandu</h3>
  <table class="tbl">
    <thead>
      <tr>
        <th rowspan="2">No</th>
        <th rowspan="2" style="text-align:left;">Nama Posyandu</th>
        <th colspan="3">Kelompok Non-Peserta</th>
        <th colspan="4">Sub-Gender &amp; Kader</th>
        <th rowspan="2">PIC KADER</th>
        <th rowspan="2">JUMLAH</th>
      </tr>
      <tr>
        <th>BALITA</th>
        <th>BUMIL</th>
        <th>BUSUI</th>
        <th>LK/BALITA</th>
        <th>P/BALITA</th>
        <th>LK/KADER</th>
        <th>P/KADER</th>
      </tr>
    </thead>
    <tbody>${rowsPosyandu}</tbody>
  </table>

  <div class="summary-box">
    <strong>RINGKASAN REKAPITULASI PERIODE:</strong>
    <div style="margin-top: 4px;">• Total PIC Sekolah (Pendidik + Tendik): <strong>${formatNumberTabel(totSek.jmlPic)}</strong></div>
    <div>• Total PIC Kader Posyandu: <strong>${formatNumberTabel(totPos.picKader)}</strong></div>
    <div>• <strong>GRAND TOTAL PENERIMA MANFAAT: ${formatNumberTabel(grandTotalPM)}</strong></div>
  </div>

  ${footer}
</body>
</html>`;
}

module.exports = {
  renderAslapPerPeriodeHtml,
  renderPerPeriodeHtml: renderAslapPerPeriodeHtml
};
