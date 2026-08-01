const { renderKopSurat, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');

function renderLaporanHarianHtml(data) {
  const {
    tanggal = '',
    menuDescription = '',
    penerimaManfaat = [],
    totalPenerima = 0,
    belanja = [],
    totalBelanja = 0,
    biaya = [],
    totalBiayaKeluar = 0,
    identitas = {}
  } = data || {};

  const {
    namaLembaga = '',
    alamat = '',
    namaMitra = '',
    namaAkuntan = '',
    namaKepalaSPPG = ''
  } = identitas || {};

  const totalL = penerimaManfaat.reduce((s, p) => s + (p.lakiLaki || 0), 0);
  const totalP = penerimaManfaat.reduce((s, p) => s + (p.perempuan || 0), 0);
  const grandTotalPM = penerimaManfaat.reduce((s, p) => s + (p.total != null ? p.total : (p.lakiLaki + p.perempuan) || 0), 0);

  const penerimaRows = penerimaManfaat.map(p => `
    <tr>
      <td>${escapeHtml(p.kategori)}</td>
      <td style="text-align:center;">${formatNumberTabel(p.lakiLaki)}</td>
      <td style="text-align:center;">${formatNumberTabel(p.perempuan)}</td>
      <td style="text-align:center; font-weight:bold;">${formatNumberTabel(p.total != null ? p.total : (p.lakiLaki + p.perempuan))}</td>
    </tr>
  `).join('');

  const belanjaContent = belanja.length === 0
    ? `<p class="empty-state">Tidak ada belanja</p>`
    : belanja.map(po => {
        const itemRows = po.items.map(item => `
          <tr>
            <td>${escapeHtml(item.bahan)}</td>
            <td style="text-align:center;">${formatNumberTabel(item.qty)}</td>
            <td style="text-align:center;">${escapeHtml(item.satuan)}</td>
            <td style="text-align:center;">${formatRupiah(item.hargaSatuan)}</td>
            <td style="text-align:center; font-weight:bold;">${formatRupiah(item.subtotal)}</td>
          </tr>
        `).join('');

        return `
          <div class="po-card">
            <div style="font-weight:bold; font-size:10.5pt; margin-bottom:4px;">
              Supplier: ${escapeHtml(po.supplier || '—')} &nbsp;|&nbsp; Status: ${escapeHtml(po.status || '—')} &nbsp;|&nbsp; Total: ${formatRupiah(po.totalBelanja || 0)}
            </div>
            <table border="1" cellPadding="4" style="width:100%; border-collapse:collapse; font-size:10pt;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th>Bahan</th>
                  <th style="text-align:center; width:80px;">Qty</th>
                  <th style="text-align:center; width:60px;">Satuan</th>
                  <th style="text-align:center; width:110px;">Harga Satuan</th>
                  <th style="text-align:center; width:120px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

  const biayaRows = biaya.map(b => `
    <tr>
      <td>${escapeHtml(b.nomorBukti || '—')}</td>
      <td>${escapeHtml(b.uraian || '—')}</td>
      <td>${escapeHtml(b.akunDanaBiaya || '—')}</td>
      <td style="text-align:center; font-weight:bold;">${formatRupiah(b.nominal)}</td>
    </tr>
  `).join('');

  const biayaContent = biaya.length === 0
    ? `<p class="empty-state">Tidak ada biaya</p>`
    : `
      <table border="1" cellPadding="4" style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="width:120px;">No Bukti</th>
            <th>Uraian</th>
            <th style="width:160px;">Akun Biaya</th>
            <th style="text-align:center; width:130px;">Nominal</th>
          </tr>
        </thead>
        <tbody>
          ${biayaRows}
        </tbody>
      </table>
    `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Harian — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    .section-title { font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 2px; }
    .empty-state { font-style: italic; color: #666; padding: 6px 0; margin: 0; }
    .po-card { border: 1px solid #ccc; padding: 8px; margin-bottom: 10px; border-radius: 4px; }
    .summary-box { border: 1px solid #000; padding: 10px; margin-top: 16px; font-size: 11pt; }
    .ttd-table td { text-align: center; vertical-align: top; padding-top: 20px; border: none; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok">LAPORAN HARIAN PENGGUNAAN DANA PROGRAM MBG TA 2026</h2>
  <div style="text-align:center; font-size:12pt; margin-bottom:16px; font-weight:bold;">
    ${escapeHtml(namaLembaga)} — ${escapeHtml(tanggal)}
  </div>

  <div style="border: 1px solid #000; padding: 8px 12px; margin-bottom: 16px; font-size: 11pt;">
    <strong>Menu:</strong> ${escapeHtml(menuDescription || '—')} &nbsp;|&nbsp; <strong>Total Penerima:</strong> ${Number(totalPenerima || 0).toLocaleString('id-ID')} orang
  </div>

  <div class="section-title">A. PENERIMA MANFAAT</div>
  <table border="1" cellPadding="4" style="width:100%; border-collapse:collapse; margin-bottom: 16px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th>Kategori</th>
        <th style="text-align:center; width:100px;">Laki-laki</th>
        <th style="text-align:center; width:100px;">Perempuan</th>
        <th style="text-align:center; width:120px;">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${penerimaRows.length > 0 ? penerimaRows : '<tr><td colSpan="4" class="empty-state" style="text-align:center;">Tidak ada data penerima manfaat</td></tr>'}
      <tr style="font-weight:bold; background-color: #f9f9f9;">
        <td>TOTAL</td>
        <td style="text-align:center;">${formatNumberTabel(totalL)}</td>
        <td style="text-align:center;">${formatNumberTabel(totalP)}</td>
        <td style="text-align:center;">${formatNumberTabel(grandTotalPM)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">B. RINCIAN BELANJA</div>
  ${belanjaContent}

  <div class="section-title">C. BIAYA</div>
  ${biayaContent}

  <div class="summary-box">
    <div>Total Belanja: <strong>${formatRupiah(totalBelanja)}</strong></div>
    <div>Total Biaya Keluar: <strong>${formatRupiah(totalBiayaKeluar)}</strong></div>
    <div style="font-size: 12pt; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px;">
      <strong>GRAND TOTAL: ${formatRupiah(totalBelanja + totalBiayaKeluar)}</strong>
    </div>
  </div>

  <table style="width:100%; margin-top: 32px; border:none;" class="ttd-table">
    <tr>
      <td style="width:33%; text-align:center; border:none;">
        Pihak Pertama (Mitra)<br><br><br><br>
        <u><strong>${escapeHtml(namaMitra)}</strong></u>
      </td>
      <td style="width:33%; text-align:center; border:none;">
        Staf Pengawas Keuangan<br><br><br><br>
        <u><strong>${escapeHtml(namaAkuntan)}</strong></u>
      </td>
      <td style="width:33%; text-align:center; border:none;">
        Kepala SPPG<br><br><br><br>
        <u><strong>${escapeHtml(namaKepalaSPPG)}</strong></u>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { renderLaporanHarianHtml };
