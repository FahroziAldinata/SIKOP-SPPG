const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, SHARED_CSS } = require('./shared');

/**
 * Render HTML untuk PDF Laporan Perkembangan Dana Dua Mingguan (LPD2M).
 * @param {object} data - { periodeData, lembaga }
 */
function renderLpd2mHtml(data) {
  const { periodeData = [], lembaga = {}, buktiList = [], pendingTransfer: isPending } = data;
  const hasPending = isPending || periodeData.some(p => p.pendingTransfer);

  const rows = periodeData.map((p, idx) => {
    const bgStyle = idx % 2 === 0 ? '' : 'background:#fafafa;';
    const persenColor = (p.persenPenyerapan || 0) >= 90 ? '#16a34a' : (p.persenPenyerapan || 0) >= 60 ? '#d97706' : '#dc2626';
    return `
      <tr>
        <td style="border:1px solid #ddd; padding:3px 8px; font-size:9pt; ${bgStyle}">${escapeHtml(p.periodeLabel)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; ${bgStyle}">${formatRupiah(p.saldoAwal)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; ${bgStyle} color:#16a34a;">${formatRupiah(p.penerimaan)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; ${bgStyle} color:#dc2626;">${formatRupiah(p.pengeluaran)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; font-weight:bold; ${bgStyle}">${formatRupiah(p.saldoAkhir)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; ${bgStyle}">${formatRupiah(p.totalRAB)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; ${bgStyle}">${formatRupiah(p.totalRealisasi)}</td>
        <td style="text-align:center; border:1px solid #ddd; padding:3px 6px; font-size:9pt; font-weight:bold; ${bgStyle} color:${persenColor};">${(p.persenPenyerapan || 0).toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  const kopHtml = lembaga.namaLembaga
    ? renderKopSurat({ namaLembaga: lembaga.namaLembaga, alamat: lembaga.alamat || '' })
    : `<div class="kop-surat"><div class="kop-text"><div class="kop-lembaga">LAPORAN PERKEMBANGAN DANA DUA MINGGUAN</div></div></div><div class="kop-garis"></div>`;

  const periodeRangeLabel = periodeData.length > 0
    ? `${periodeData[0].periodeLabel} s.d. ${periodeData[periodeData.length - 1].periodeLabel}`
    : '';

  const footerHtml = lembaga.namaPejabat
    ? renderFooterTTD([
        { label: 'Dibuat Oleh', nama: lembaga.namaAkuntan || '', jabatan: 'Akuntan SPPG' },
        { label: 'Mengetahui', nama: lembaga.namaPejabat, jabatan: 'Kepala SPPG' }
      ])
    : '';

  const lampiranHtml = buktiList && buktiList.length > 0 ? `
    <div style="page-break-before: always;"></div>
    <h3 style="font-size:12pt; font-weight:bold; margin-top:20px; border-bottom:2px solid #333; padding-bottom:4px;">Lampiran Bukti LPD2M</h3>
    <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
      ${buktiList.map(b => {
        const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const isImage = b.mimeType && b.mimeType.startsWith('image/');
        return `
          <div style="display:flex; align-items:center; gap:12px; border:1px solid #ccc; padding:10px; border-radius:4px; page-break-inside:avoid;">
            <div style="flex:1; min-width:0;">
              <div style="font-size:9pt; color:#333; font-weight:bold;">${escapeHtml(b.namaBukti)}</div>
              <div style="font-size:9pt; color:#555;">(${escapeHtml(b.jenis)})</div>
              <div style="font-size:8pt; color:#666; margin-top:2px;">Diupload pada: ${escapeHtml(dateStr)}</div>
            </div>
            <div style="flex-shrink:0;">
              ${isImage
                ? `<img src="${b.base64Data}" alt="${escapeHtml(b.namaBukti)}"
                      style="max-height:80px; max-width:120px; object-fit:contain; border-radius:4px; border:1px solid #ccc; background:#fff; display:block;"
                      onerror="this.style.display='none'; var fb=this.nextElementSibling; if(fb) fb.style.display='flex';" />
                   <div style="display:none; width:80px; height:60px; background:#e2e8f0; border:1px solid #ccc; border-radius:4px; align-items:center; justify-content:center; flex-direction:column; font-size:11px; color:#666; text-align:center; padding:4px; box-sizing:border-box;">
                     🖼️<br/>[Gagal Load]
                   </div>`
                : `<div style="display:flex; width:80px; height:60px; background:#e2e8f0; border:1px solid #ccc; border-radius:4px; align-items:center; justify-content:center; flex-direction:column; font-size:11px; color:#666; text-align:center; padding:4px; box-sizing:border-box;">
                     📄<br/>[Non-Gambar]
                   </div>`
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    ${SHARED_CSS}
    .lpd2m-table { border-collapse: collapse; width: 100%; font-size: 9pt; margin-top: 12px; }
    .lpd2m-table th { background: #e8e8e8; font-weight: bold; border: 1px solid #000; padding: 4px 6px; text-align: center; }
    .lpd2m-table td { border: 1px solid #ddd; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  ${kopHtml}

  <h2 class="judul-dok">Laporan Perkembangan Dana Dua Mingguan (LPD2M)</h2>
  <div class="periode-label">Periode: ${escapeHtml(periodeRangeLabel)}</div>

  <table class="lpd2m-table">
    <thead>
      <tr>
        <th style="text-align:left; width:180px; border:1px solid #000; padding:4px 8px;">Periode</th>
        <th style="border:1px solid #000; padding:4px 6px;">Saldo Awal</th>
        <th style="border:1px solid #000; padding:4px 6px;">Penerimaan</th>
        <th style="border:1px solid #000; padding:4px 6px;">Pengeluaran</th>
        <th style="border:1px solid #000; padding:4px 6px;">Saldo Akhir</th>
        <th style="border:1px solid #000; padding:4px 6px;">Pagu (RAB)</th>
        <th style="border:1px solid #000; padding:4px 6px;">Realisasi</th>
        <th style="border:1px solid #000; padding:4px 6px;">% Penyerapan</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  ${hasPending ? `
    <div style="margin-top:10px; padding:6px 10px; background:#fffbe6; border:1px solid #ffe58f; border-radius:4px; font-size:8.5pt; color:#8c6b00;">
      Catatan: Realisasi penerimaan dana belum tercatat masuk di jurnal transaksi (pending transfer).
    </div>
  ` : ''}

  ${footerHtml}

  ${lampiranHtml}
</body>
</html>`;
}

module.exports = { renderLpd2mHtml };
