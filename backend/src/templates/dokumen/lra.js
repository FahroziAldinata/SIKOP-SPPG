const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * Render HTML untuk PDF Laporan Realisasi Anggaran (LRA) Standar SAP BGN.
 * @param {object} data - { periodeList, pendapatan, belanja, ringkasan, lembaga, kategoriSummary }
 */
function renderLraHtml(data) {
  const {
    periodeList = [],
    pendapatan: inputPendapatan = [],
    belanja: inputBelanja = [],
    ringkasan: inputRingkasan = {},
    lembaga = {},
    kategoriSummary = [],
    pendingTransfer: isPending
  } = data;

  const pendingTransfer = isPending ?? inputRingkasan.pendingTransfer ?? false;

  let pendapatan = [...inputPendapatan];
  let belanja = [...inputBelanja];
  let ringkasan = { ...inputRingkasan };

  // Fallback: If pendapatan/belanja arrays are not provided directly, generate from kategoriSummary
  if (pendapatan.length === 0 && belanja.length === 0 && kategoriSummary.length > 0) {
    const KATEGORI_CONFIG = {
      BAHAN_MAKANAN: {
        kodeP: '4.1.01', namaP: 'Pendapatan Bantuan Operasional MBG - Bahan Makanan',
        kodeB: '5.1.01', namaB: 'Belanja Bahan Pokok / Makanan'
      },
      OPERASIONAL: {
        kodeP: '4.1.02', namaP: 'Pendapatan Bantuan Operasional MBG - Operasional',
        kodeB: '5.1.02', namaB: 'Belanja Operasional'
      },
      INSENTIF_FASILITAS: {
        kodeP: '4.1.03', namaP: 'Pendapatan Bantuan Operasional MBG - Insentif & Fasilitas',
        kodeB: '5.1.03', namaB: 'Belanja Insentif & Fasilitas'
      }
    };

    kategoriSummary.filter(item => !item.isTotal && item.kategori !== 'TOTAL').forEach(item => {
      const cfg = KATEGORI_CONFIG[item.kategori] || {
        kodeP: '4.1.99', namaP: `Pendapatan ${item.kategori}`,
        kodeB: '5.1.99', namaB: `Belanja ${item.kategori}`
      };
      const pagu = item.totalRAB || 0;
      const realisasi = item.totalAktual || 0;
      const sisa = pagu - realisasi;
      const persen = pagu > 0 ? (realisasi / pagu) * 100 : 0;

      pendapatan.push({
        kode: cfg.kodeP,
        kelompokAkun: cfg.namaP,
        pagu,
        realisasi: 0,
        sisa: pagu,
        persen: 0
      });

      belanja.push({
        kode: cfg.kodeB,
        kelompokAkun: cfg.namaB,
        pagu,
        realisasi,
        sisa,
        persen
      });
    });

    const totP_Pagu = pendapatan.reduce((s, x) => s + x.pagu, 0);
    const totP_Real = pendapatan.reduce((s, x) => s + x.realisasi, 0);
    const totB_Pagu = belanja.reduce((s, x) => s + x.pagu, 0);
    const totB_Real = belanja.reduce((s, x) => s + x.realisasi, 0);

    ringkasan = {
      totalPendapatan: { pagu: totP_Pagu, realisasi: totP_Real, sisa: totP_Pagu - totP_Real, persen: totP_Pagu > 0 ? (totP_Real / totP_Pagu) * 100 : 0 },
      totalBelanja: { pagu: totB_Pagu, realisasi: totB_Real, sisa: totB_Pagu - totB_Real, persen: totB_Pagu > 0 ? (totB_Real / totB_Pagu) * 100 : 0 },
      silpa: { pagu: totP_Pagu - totB_Pagu, realisasi: totP_Real - totB_Real, sisa: (totP_Pagu - totP_Real) - (totB_Pagu - totB_Real), persen: totP_Pagu > 0 ? ((totP_Real - totB_Real) / totP_Pagu) * 100 : 0 }
    };
  }

  const { totalPendapatan = {}, totalBelanja = {}, silpa = {} } = ringkasan;

  // Render detail rows for Pendapatan
  const pendapatanRows = pendapatan.map((item, idx) => {
    const bgStyle = idx % 2 === 0 ? '' : 'background:#fafafa;';
    const persenColor = item.persen >= 90 ? '#16a34a' : item.persen >= 60 ? '#d97706' : '#dc2626';
    return `
      <tr>
        <td style="text-align:center; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${escapeHtml(item.kode)}</td>
        <td style="border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${escapeHtml(item.kelompokAkun)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.pagu)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.realisasi)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.sisa)}</td>
        <td style="text-align:center; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle} font-weight:bold; color:${persenColor};">${item.persen.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  // Render total row for Pendapatan
  const totalPendapatanPersenColor = (totalPendapatan.persen || 0) >= 90 ? '#16a34a' : (totalPendapatan.persen || 0) >= 60 ? '#d97706' : '#dc2626';
  const totalPendapatanRow = `
    <tr style="background:#eef2ff; font-weight:bold;">
      <td colspan="2" style="border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">JUMLAH PENDAPATAN DANA</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalPendapatan.pagu)}</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalPendapatan.realisasi)}</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalPendapatan.sisa)}</td>
      <td style="text-align:center; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt; color:${totalPendapatanPersenColor};">${(totalPendapatan.persen || 0).toFixed(1)}%</td>
    </tr>
  `;

  // Render detail rows for Belanja
  const belanjaRows = belanja.map((item, idx) => {
    const bgStyle = idx % 2 === 0 ? '' : 'background:#fafafa;';
    const persenColor = item.persen >= 90 ? '#16a34a' : item.persen >= 60 ? '#d97706' : '#dc2626';
    return `
      <tr>
        <td style="text-align:center; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${escapeHtml(item.kode)}</td>
        <td style="border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${escapeHtml(item.kelompokAkun)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.pagu)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.realisasi)}</td>
        <td style="text-align:right; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle}">${formatRupiah(item.sisa)}</td>
        <td style="text-align:center; border:1px solid #ccc; padding:5px 8px; font-size:9.5pt; ${bgStyle} font-weight:bold; color:${persenColor};">${item.persen.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  // Render total row for Belanja
  const totalBelanjaPersenColor = (totalBelanja.persen || 0) >= 90 ? '#16a34a' : (totalBelanja.persen || 0) >= 60 ? '#d97706' : '#dc2626';
  const totalBelanjaRow = `
    <tr style="background:#eef2ff; font-weight:bold;">
      <td colspan="2" style="border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">JUMLAH BELANJA / PENGELUARAN</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalBelanja.pagu)}</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalBelanja.realisasi)}</td>
      <td style="text-align:right; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt;">${formatRupiah(totalBelanja.sisa)}</td>
      <td style="text-align:center; border:1px solid #93c5fd; padding:6px 8px; font-size:9.5pt; color:${totalBelanjaPersenColor};">${(totalBelanja.persen || 0).toFixed(1)}%</td>
    </tr>
  `;

  // Render SILPA / Surplus (Defisit) Row
  const silpaPersenColor = (silpa.persen || 0) >= 90 ? '#16a34a' : (silpa.persen || 0) >= 60 ? '#d97706' : '#dc2626';
  const silpaRow = `
    <tr style="background:#dbeafe; font-weight:bold; font-size:10pt;">
      <td colspan="2" style="border:2px solid #2563eb; padding:8px 8px;">SURPLUS / (DEFISIT) / SILPA</td>
      <td style="text-align:right; border:2px solid #2563eb; padding:8px 8px;">${formatRupiah(silpa.pagu)}</td>
      <td style="text-align:right; border:2px solid #2563eb; padding:8px 8px;">${formatRupiah(silpa.realisasi)}</td>
      <td style="text-align:right; border:2px solid #2563eb; padding:8px 8px;">${formatRupiah(silpa.sisa)}</td>
      <td style="text-align:center; border:2px solid #2563eb; padding:8px 8px; color:${silpaPersenColor};">${(silpa.persen || 0).toFixed(1)}%</td>
    </tr>
  `;

  const kopHtml = lembaga.namaLembaga
    ? renderKopSurat({ namaLembaga: lembaga.namaLembaga, alamat: lembaga.alamat || '' })
    : `<div class="kop-surat"><div class="kop-text"><div class="kop-lembaga">LAPORAN REALISASI ANGGARAN (LRA)</div></div></div><div class="kop-garis"></div>`;

  const periodeRangeLabel = periodeList.length > 0
    ? (periodeList.length === 1
        ? periodeList[0].label
        : `${periodeList[0].label} s.d. ${periodeList[periodeList.length - 1].label}`)
    : '';

  const footerHtml = lembaga.namaPejabat || lembaga.namaAkuntan
    ? renderFooterTTD([
        { label: 'Dibuat Oleh,', nama: lembaga.namaAkuntan || 'Akuntan SPPG', jabatan: 'Akuntan SPPG' },
        { label: 'Mengetahui,', nama: lembaga.namaPejabat || 'Kepala SPPG', jabatan: 'Kepala SPPG' }
      ], undefined, { ruangTtd: 45 })
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_CSS}
    .lra-table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin-top: 14px; }
    .lra-table th { background: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #1e3a8a; padding: 7px 8px; text-align: center; }
    .lra-table td { border: 1px solid #ccc; }
    .section-header td { background: #f1f5f9; font-weight: bold; font-size: 10pt; color: #0f172a; padding: 6px 8px; border: 1px solid #cbd5e1; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  ${kopHtml}

  <h2 class="judul-dok" style="margin-top:10px;">Laporan Realisasi Anggaran (LRA)</h2>
  <div class="periode-label" style="font-weight:bold; color:#334155; margin-bottom:12px;">
    Standar Akuntansi Pemerintah (SAP BGN) ${periodeRangeLabel ? `— Periode: ${escapeHtml(periodeRangeLabel)}` : ''}
  </div>

  <table class="lra-table">
    <thead>
      <tr>
        <th style="width: 10%;">Kode</th>
        <th style="width: 36%;">Kelompok Akun / Uraian</th>
        <th style="width: 15%;">Pagu Anggaran</th>
        <th style="width: 15%;">Realisasi s.d. Periode Ini</th>
        <th style="width: 14%;">Sisa Pagu</th>
        <th style="width: 10%;">% Realisasi</th>
      </tr>
    </thead>
    <tbody>
      <!-- 1. PENDAPATAN DANA -->
      <tr class="section-header">
        <td colspan="6">1. PENDAPATAN DANA</td>
      </tr>
      ${pendapatanRows}
      ${totalPendapatanRow}

      <!-- 2. BELANJA / PENGELUARAN -->
      <tr class="section-header">
        <td colspan="6">2. BELANJA / PENGELUARAN</td>
      </tr>
      ${belanjaRows}
      ${totalBelanjaRow}

      <!-- 3. SILPA -->
      ${silpaRow}
    </tbody>
  </table>

  ${pendingTransfer ? `
    <div style="margin-top:10px; padding:6px 10px; background:#fffbe6; border:1px solid #ffe58f; border-radius:4px; font-size:8.5pt; color:#8c6b00;">
      Catatan: Realisasi pendapatan ${totalPendapatan.realisasi === 0 ? 'Rp 0' : formatRupiah(totalPendapatan.realisasi || 0)} — dana BGN belum tercatat masuk (pending transfer).
    </div>
  ` : ''}

  ${footerHtml}
</body>
</html>`;
}

module.exports = { renderLraHtml };
