const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * Render HTML untuk PDF LBBP (Laporan Buku Belanja Bahan Pokok).
 *
 * @param {object} data
 * @param {object}   data.lembaga       - SetupLembaga fields
 * @param {string}   data.periodeLabel  - "2026-07-01 - 2026-07-14"
 * @param {Array}    data.grupTanggal   - array of { tanggal, rows: [{no, noPO, supplier, namaBahan, satuan, qty, hargaSatuan, subtotal, status}] }
 * @param {number}   data.grandTotal    - total semua subtotal
 */
function renderLbbpHtml(data) {
  const {
    lembaga = {},
    periodeLabel = '',
    grupTanggal = [],
    grandTotal = 0,
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
    : `<div class="kop-surat"><div class="kop-text"><div class="kop-lembaga">LBBP</div></div></div><div class="kop-garis"></div>`;

  const footerHtml = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntanSPPG || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,',  nama: namaKepalaSPPG  || '—', jabatan: 'Kepala SPPG' },
  ], tempatTglStr, { ruangTtd: 40 });

  // Build table rows — group by tanggal
  let noGlobal = 0;
  const tbodyRows = grupTanggal.map(grup => {
    const tglFormatted = (() => {
      try {
        const d = new Date(grup.tanggal);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch { return grup.tanggal; }
    })();

    const subtotalGrup = grup.rows.reduce((s, r) => s + Number(r.subtotal || 0), 0);

    const rowsHtml = grup.rows.map(row => {
      noGlobal++;
      const statusBadge = row.status === 'DITERIMA'
        ? `<span style="background:#dcfce7; color:#15803d; padding:1px 6px; border-radius:3px; font-size:8pt; font-weight:bold;">DITERIMA</span>`
        : `<span style="background:#fef9c3; color:#854d0e; padding:1px 6px; border-radius:3px; font-size:8pt; font-weight:bold;">DIREALISASI</span>`;
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; page-break-inside: avoid;">
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${noGlobal}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${escapeHtml(tglFormatted)}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:center; font-family:monospace; font-size:8.5pt;">${escapeHtml(row.noPO || '—')}</td>
          <td style="border:1px solid #ccc; padding:3px 6px;">${escapeHtml(row.supplier || '—')}</td>
          <td style="border:1px solid #ccc; padding:3px 6px;">${escapeHtml(row.namaBahan || '—')}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${escapeHtml(row.satuan || '')}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${Number(row.qty || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 })}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${formatRupiah(row.hargaSatuan)}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums;">${formatRupiah(row.subtotal)}</td>
          <td style="border:1px solid #ccc; padding:3px 6px; text-align:center;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    const subtotalRow = `
      <tr style="background:#f8fafc; font-weight:bold;">
        <td colspan="8" style="border:1px solid #ccc; padding:3px 10px; text-align:right; font-size:9pt;">Subtotal ${escapeHtml(tglFormatted)}</td>
        <td style="border:1px solid #ccc; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums; border-top:2px solid #333;">${formatRupiah(subtotalGrup)}</td>
        <td style="border:1px solid #ccc;"></td>
      </tr>
    `;

    return rowsHtml + subtotalRow;
  }).join('');

  const grandTotalRow = grupTanggal.length > 0 ? `
    <tr style="background:#1e3a5f; color:#fff; font-weight:bold;">
      <td colspan="8" style="border:1px solid #1e3a5f; padding:5px 10px; text-align:right; font-size:10pt; letter-spacing:0.02em;">TOTAL KESELURUHAN</td>
      <td style="border:1px solid #1e3a5f; padding:5px 6px; text-align:right; font-variant-numeric:tabular-nums; font-size:10pt;">${formatRupiah(grandTotal)}</td>
      <td style="border:1px solid #1e3a5f;"></td>
    </tr>
  ` : `
    <tr>
      <td colspan="10" style="border:1px solid #ccc; padding:16px; text-align:center; font-style:italic; color:#666;">
        Tidak ada data belanja bahan pokok yang terealisasi pada periode ini.
      </td>
    </tr>
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>LBBP — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    .lbbp-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 8.5pt;
      margin-top: 12px;
    }
    .lbbp-table thead tr th {
      background: #1e3a5f;
      color: #fff;
      border: 1px solid #1e3a5f;
      padding: 5px 6px;
      text-align: center;
      font-weight: bold;
    }
    .lbbp-table thead tr.subheader th {
      background: #e8edf5;
      color: #1e3a5f;
      border: 1px solid #ccc;
      padding: 3px 4px;
      font-size: 8pt;
      font-weight: bold;
    }
    .lbbp-table tbody td {
      vertical-align: top;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .lbbp-table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  ${kopHtml}

  <h2 class="judul-dok" style="margin-top:10px;">LAPORAN BUKU BELANJA BAHAN POKOK (LBBP)</h2>
  <div class="periode-label">Periode: ${escapeHtml(periodeLabel)}</div>

  <table class="lbbp-table">
    <thead>
      <tr>
        <th style="width:28px;">No</th>
        <th style="width:90px;">Tanggal</th>
        <th style="width:80px;">No. PO</th>
        <th style="min-width:100px;">Supplier</th>
        <th style="min-width:110px;">Nama Bahan</th>
        <th style="width:48px;">Satuan</th>
        <th style="width:55px;">Qty</th>
        <th style="width:90px;">Harga Satuan</th>
        <th style="width:95px;">Subtotal</th>
        <th style="width:80px;">Status</th>
      </tr>
      <tr class="subheader">
        <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
      </tr>
    </thead>
    <tbody>
      ${tbodyRows || ''}
      ${grandTotalRow}
    </tbody>
  </table>

  <div style="margin-top:10px; font-size:8.5pt; color:#555; font-style:italic;">
    * Status DIREALISASI = PO sudah dikonfirmasi realisasi oleh Mitra; DITERIMA = sudah diterima oleh ASLAP.
  </div>

  ${footerHtml}

</body>
</html>`;
}

module.exports = { renderLbbpHtml };
