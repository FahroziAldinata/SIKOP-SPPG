const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

function renderKebutuhanBelanjaHtml(data = {}) {
  const { identitas = {}, periodeInfo = '', tanggalMulai = '', tanggalSelesai = '', items = [], totalKeseluruhan = 0 } = data;
  const { namaLembaga = '', alamat = '', namaAkuntan = '', namaKepalaSPPG = '' } = identitas;
  const kepalaNama = namaKepalaSPPG || '';

  const rows = items.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:10px;">Tidak ada data</td></tr>'
    : items.map((it, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(it.bahan || it.nama || '—')}</td>
        <td style="text-align:center;">${formatNumberTabel(it.qty || it.totalQty || 0)}</td>
        <td style="text-align:center;">${escapeHtml(it.satuan || 'kg')}</td>
        <td style="text-align:center;">Rp ${formatNumberTabel(it.hargaSatuan || 0)}</td>
        <td style="text-align:center;font-weight:600;">Rp ${formatNumberTabel(it.jumlah || it.subtotal || 0)}</td>
      </tr>`).join('');

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntan || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,', nama: kepalaNama || '—', jabatan: 'Kepala SPPG' }
  ], '');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Kebutuhan Belanja Bahan</title><style>${SHARED_CSS}
    body{font-size:9pt;}
    table.tbl{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px;}
    table.tbl th,table.tbl td{border:1px solid #000;padding:4px 6px;}
    table.tbl th{background:#f0f0f0;text-align:center;font-weight:700;}
  </style></head><body>
    ${renderKopSurat({ ...identitas, judul: 'KEBUTUHAN BELANJA BAHAN' })}
    <div class="info-header">
      <table><tr><td style="width:120px;">Periode</td><td>: ${escapeHtml(periodeInfo || '—')}</td></tr>
      <tr><td>Tanggal</td><td>: ${escapeHtml(tanggalMulai || '—')} s.d ${escapeHtml(tanggalSelesai || '—')}</td></tr></table>
    </div>
    <table class="tbl">
      <thead><tr><th>No</th><th>Bahan</th><th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:8px;font-size:10pt;"><strong>Total: Rp ${formatNumberTabel(totalKeseluruhan)}</strong></div>
    ${footer}
  </body></html>`;
}

module.exports = { renderKebutuhanBelanjaHtml };
