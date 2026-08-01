/**
 * HTML template untuk Buku Pembantu (BP) reusable.
 */
const { renderKopSurat, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

const NAMA_BULAN = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function renderBpHtml(data, showKeterangan = false) {
  const { saldoAwal, saldoAkhir, namaAkun, jenisPembantu, identitas, data: transactions } = data;
  const { namaLembaga = '', alamat = '' } = identitas || {};

  const title = `BUKU PEMBANTU ${jenisPembantu.toUpperCase()}`;
  const colSpanCount = showKeterangan ? 8 : 7;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    .bp-identitas td { padding: 3px 0; font-size: 11pt; }
    .bp-identitas td:first-child { width: 140px; font-weight: bold; }
  </style>
</head>
<body>

  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok" style="margin-top: 10px; text-align: center;">${escapeHtml(title)}</h2>
  <div style="text-align: center; font-size: 11pt; margin-bottom: 15px; font-weight: bold; text-transform: uppercase;">
    AKUN: ${escapeHtml(namaAkun)}
  </div>

  <table class="bp-identitas" style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tbody>
      <tr>
        <td>Saldo Awal</td>
        <td>: Rp${Number(saldoAwal).toLocaleString('id-ID')}</td>
      </tr>
      <tr>
        <td>Saldo Akhir</td>
        <td>: Rp${Number(saldoAkhir).toLocaleString('id-ID')}</td>
      </tr>
    </tbody>
  </table>

  <table class="tabel-transaksi-bp" style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 10pt; page-break-inside: auto;">
    <thead>
      <tr style="background-color: #eaeaea; border-bottom: 1px solid #000;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 80px;">Bulan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 40px;">Tgl</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 100px;">No. Bukti</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Uraian Transaksi</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 110px;">Debet</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 110px;">Kredit</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 110px;">Saldo</th>
        ${showKeterangan ? `<th style="border: 1px solid #000; padding: 6px; text-align: center; width: 120px;">Keterangan</th>` : ''}
      </tr>
      <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000; font-size: 9pt;">
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">1</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">2</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">3</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">4</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">5</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">6</th>
        <th style="border: 1px solid #000; padding: 3px; text-align: center;">7</th>
        ${showKeterangan ? `<th style="border: 1px solid #000; padding: 3px; text-align: center;">8</th>` : ''}
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #000; page-break-inside: avoid; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: left;">SALDO AWAL</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">0</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">0</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(saldoAwal)}</td>
        ${showKeterangan ? `<td style="border: 1px solid #000; padding: 5px; text-align: left;">—</td>` : ''}
      </tr>
      ${transactions.length === 0 ? `
        <tr>
          <td colspan="${colSpanCount}" style="border: 1px solid #000; padding: 12px; text-align: center; font-style: italic; color: #666;">
            Tidak ada transaksi pada periode ini.
          </td>
        </tr>
      ` : transactions.map(row => {
          const dateParts = (row.tanggal || '').split('-');
          const tgl = dateParts.length === 3 ? parseInt(dateParts[2], 10) : '';
          const blnIndex = dateParts.length === 3 ? parseInt(dateParts[1], 10) : row.bulan || 1;
          const bulanNama = NAMA_BULAN[blnIndex] || '';
          
          return `
            <tr style="border-bottom: 1px solid #000; page-break-inside: avoid;">
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(bulanNama)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(tgl)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(row.noBukti || '—')}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(row.uraian || '')}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.debet)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.kredit)}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.saldoBerjalan)}</td>
              ${showKeterangan ? `<td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(row.sumberKas || '')}</td>` : ''}
            </tr>
          `;
        }).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = { renderBpHtml };
