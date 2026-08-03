const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * Render HTML untuk PDF BKK (Buku Kas Kecil).
 *
 * @param {object} data
 * @param {object}   data.lembaga       - SetupLembaga fields
 * @param {string}   data.periodeLabel  - "2026-07-01 - 2026-07-14"
 * @param {Array}    data.rows          - array of { no, tanggal, noBukti, uraian, jenisPengeluaran, penerimaan, pengeluaran, saldo }
 * @param {number}   data.saldoAwal     - saldo awal kas kecil di awal periode
 * @param {number}   data.totalPenerimaan
 * @param {number}   data.totalPengeluaran
 * @param {number}   data.saldoAkhir
 */
function renderBkkHtml(data) {
  const {
    lembaga = {},
    periodeLabel = '',
    rows = [],
    saldoAwal = 0,
    totalPenerimaan = 0,
    totalPengeluaran = 0,
    saldoAkhir = 0,
  } = data || {};

  const {
    namaLembaga = '',
    alamat = '',
    namaKepalaSPPG = '',
    namaAkuntanSPPG = '',
    tempatPelaporan = '',
    tanggalPelaporan = null,
  } = lembaga;

  // Format tempat & tanggal pelaporan
  let tempatTglStr = '';
  if (tanggalPelaporan) {
    try {
      const d = new Date(tanggalPelaporan);
      if (!isNaN(d.getTime())) {
        const tglFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        tempatTglStr = tempatPelaporan ? `${tempatPelaporan}, ${tglFormatted}` : tglFormatted;
      }
    } catch { /* skip */ }
  }

  const kopHtml = namaLembaga
    ? renderKopSurat({ namaLembaga, alamat })
    : `<div class="kop-surat"><div class="kop-text"><div class="kop-lembaga">BKK</div></div></div><div class="kop-garis"></div>`;

  const footerHtml = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntanSPPG || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,',  nama: namaKepalaSPPG  || '—', jabatan: 'Kepala SPPG' },
  ], tempatTglStr, { ruangTtd: 40 });

  // Helper format tanggal
  function fmtTgl(tglStr) {
    try {
      const d = new Date(tglStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return tglStr; }
  }

  // Baris saldo awal
  const saldoAwalRow = `
    <tr style="background:#e8edf5; font-weight:bold;">
      <td colspan="5" style="border:1px solid #ccc; padding:4px 8px; text-align:left; font-size:8.5pt;">Saldo Awal Kas Kecil</td>
      <td style="border:1px solid #ccc; padding:4px 6px; text-align:right; font-variant-numeric:tabular-nums;">${formatRupiah(saldoAwal)}</td>
      <td style="border:1px solid #ccc; padding:4px 6px; text-align:right; font-variant-numeric:tabular-nums;"></td>
      <td style="border:1px solid #ccc; padding:4px 6px; text-align:right; font-variant-numeric:tabular-nums;">${formatRupiah(saldoAwal)}</td>
    </tr>
  `;

  // Baris data transaksi
  const tbodyRows = rows.map((row, idx) => {
    const tglFormatted = fmtTgl(row.tanggal);
    const jenisLabel = escapeHtml(row.jenisPengeluaran || 'Lainnya');
    return `
      <tr style="border-bottom: 1px solid #e5e7eb; page-break-inside: avoid;">
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${escapeHtml(tglFormatted)}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:center; font-family:monospace; font-size:8pt;">${escapeHtml(row.noBukti || '—')}</td>
        <td style="border:1px solid #ccc; padding:3px 6px;">${escapeHtml(row.uraian || '—')}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">
          <span style="background:#e8edf5; color:#1e3a5f; padding:1px 5px; border-radius:3px; font-size:7.5pt; font-weight:bold;">${jenisLabel}</span>
        </td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${Number(row.penerimaan || 0) > 0 ? formatRupiah(row.penerimaan) : '—'}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${Number(row.pengeluaran || 0) > 0 ? formatRupiah(row.pengeluaran) : '—'}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${formatRupiah(row.saldo)}</td>
      </tr>
    `;
  }).join('');

  const totalRow = rows.length > 0 ? `
    <tr style="background:#1e3a5f; color:#fff; font-weight:bold;">
      <td colspan="5" style="border:1px solid #1e3a5f; padding:5px 10px; text-align:right; font-size:10pt; letter-spacing:0.02em;">TOTAL</td>
      <td style="border:1px solid #1e3a5f; padding:5px 6px; text-align:right; font-variant-numeric:tabular-nums; font-size:10pt;">${formatRupiah(totalPenerimaan)}</td>
      <td style="border:1px solid #1e3a5f; padding:5px 6px; text-align:right; font-variant-numeric:tabular-nums; font-size:10pt;">${formatRupiah(totalPengeluaran)}</td>
      <td style="border:1px solid #1e3a5f; padding:5px 6px; text-align:right; font-variant-numeric:tabular-nums; font-size:10pt;">${formatRupiah(saldoAkhir)}</td>
    </tr>
  ` : `
    <tr>
      <td colspan="8" style="border:1px solid #ccc; padding:16px; text-align:center; font-style:italic; color:#666;">
        Tidak ada transaksi kas kecil pada periode ini.
      </td>
    </tr>
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>BKK — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    .bkk-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 8.5pt;
      margin-top: 12px;
    }
    .bkk-table thead tr th {
      background: #1e3a5f;
      color: #fff;
      border: 1px solid #1e3a5f;
      padding: 5px 6px;
      text-align: center;
      font-weight: bold;
    }
    .bkk-table thead tr.subheader th {
      background: #e8edf5;
      color: #1e3a5f;
      border: 1px solid #ccc;
      padding: 3px 4px;
      font-size: 8pt;
      font-weight: bold;
    }
    .bkk-table tbody td {
      vertical-align: top;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .bkk-table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  ${kopHtml}

  <h2 class="judul-dok" style="margin-top:10px;">BUKU KAS KECIL (BKK)</h2>
  <div class="periode-label">Periode: ${escapeHtml(periodeLabel)}</div>

  <table class="bkk-table">
    <thead>
      <tr>
        <th style="width:28px;">No</th>
        <th style="width:90px;">Tanggal</th>
        <th style="width:75px;">No. Bukti</th>
        <th style="min-width:130px;">Uraian</th>
        <th style="width:90px;">Jenis Pengeluaran</th>
        <th style="width:95px;">Penerimaan</th>
        <th style="width:95px;">Pengeluaran</th>
        <th style="width:95px;">Saldo</th>
      </tr>
      <tr class="subheader">
        <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th>
      </tr>
    </thead>
    <tbody>
      ${saldoAwalRow}
      ${tbodyRows || ''}
      ${totalRow}
    </tbody>
  </table>

  <div style="margin-top:10px; font-size:8.5pt; color:#555; font-style:italic;">
    * Kolom Penerimaan: Pengisian Kas Kecil dari Kas Bank. Kolom Pengeluaran: pembayaran tunai harian (transport, ATK, konsumsi, pemeliharaan, dll).
  </div>

  ${footerHtml}

</body>
</html>`;
}

module.exports = { renderBkkHtml };
