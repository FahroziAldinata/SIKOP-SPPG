const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Render HTML untuk PDF Neraca Saldo.
 * @param {object} data - { akun, verifikasi, identitas }
 */
function renderNeracaSaldoHtml(data = {}) {
  const payload = data.data || data;
  const akun = payload.akun || [];
  const verifikasi = payload.verifikasi || {};
  const identitas = payload.identitas || {};

  const namaLembaga = identitas.namaLembaga || '';
  const alamat = identitas.alamat || '';
  const namaAkuntan = identitas.namaAkuntan || identitas.namaAkuntanSPPG || '';
  const namaKepala = identitas.namaKepala || identitas.namaKepalaSPPG || identitas.namaPejabat || '';

  const kopHtml = renderKopSurat({ namaLembaga, alamat });

  let totalSaldoAwal = 0;
  let totalDebet = 0;
  let totalKredit = 0;
  let totalSaldoAkhir = 0;

  const dataRows = akun.map((row, idx) => {
    const sAwal = Number(row.saldoAwal || 0);
    const debet = Number(row.totalDebet || 0);
    const kredit = Number(row.totalKredit || 0);
    const sAkhir = Number(row.saldoAkhir || 0);

    totalSaldoAwal += sAwal;
    totalDebet += debet;
    totalKredit += kredit;
    totalSaldoAkhir += sAkhir;

    const bgStyle = idx % 2 === 0 ? '' : 'background:#fafafa;';

    return `
      <tr>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; font-family:monospace; ${bgStyle}">${escapeHtml(row.kode)}</td>
        <td style="border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${escapeHtml(row.nama)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${escapeHtml(row.tipe)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${formatNumberTabel(sAwal)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${formatNumberTabel(debet)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${formatNumberTabel(kredit)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:4px 6px; ${bgStyle}">${formatNumberTabel(sAkhir)}</td>
      </tr>
    `;
  }).join('');

  const isCocok = verifikasi.danaBiayaCocok;
  const badgeStyle = isCocok
    ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;'
    : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;';

  const footerHtml = renderFooterTTD([
    { label: 'Dibuat Oleh', nama: namaAkuntan, jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui', nama: namaKepala, jabatan: 'Kepala SPPG' }
  ]);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_CSS}
    .neraca-table { border-collapse: collapse; width: 100%; font-size: 9pt; margin-top: 10px; margin-bottom: 15px; }
    .neraca-table th { background: #f0f0f0; font-weight: bold; border: 1px solid #000; padding: 5px 6px; text-align: center; }
    .neraca-table td { border: 1px solid #ddd; }
    .neraca-table tr.baris-total { background: #e8e8e8; font-weight: bold; }
    .neraca-table tr.baris-total td { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 6px; }
    .verifikasi-badge {
      display: inline-block;
      margin-top: 8px;
      margin-bottom: 12px;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 9.5pt;
      font-weight: bold;
      ${badgeStyle}
    }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  ${kopHtml}

  <h2 class="judul-dok">NERACA SALDO</h2>

  <div class="verifikasi-badge">
    ${escapeHtml(verifikasi.pesan || '')}
  </div>

  <table class="neraca-table">
    <thead>
      <tr>
        <th style="width: 80px;">Kode</th>
        <th>Nama Akun</th>
        <th style="width: 70px;">Tipe</th>
        <th style="width: 105px;">Saldo Awal</th>
        <th style="width: 105px;">Total Debet</th>
        <th style="width: 105px;">Total Kredit</th>
        <th style="width: 105px;">Saldo Akhir</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      <tr class="baris-total">
        <td colspan="3" style="text-align:center;">TOTAL</td>
        <td style="text-align:center;">${formatNumberTabel(totalSaldoAwal)}</td>
        <td style="text-align:center;">${formatNumberTabel(totalDebet)}</td>
        <td style="text-align:center;">${formatNumberTabel(totalKredit)}</td>
        <td style="text-align:center;">${formatNumberTabel(totalSaldoAkhir)}</td>
      </tr>
    </tbody>
  </table>

  ${footerHtml}
</body>
</html>`;
}

module.exports = { renderNeracaSaldoHtml };
