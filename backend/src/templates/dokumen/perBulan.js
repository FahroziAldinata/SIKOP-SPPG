const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

function renderPerBulanHtml(data = {}) {
  const { identitas = {}, periodeInfo = '', months = [] } = data;
  const { namaLembaga = '', alamat = '', namaAkuntan = '', namaKepalaSPPG = '' } = identitas;
  const kepalaNama = namaKepalaSPPG || '';

  const rows = months.length === 0
    ? '<tr><td colspan="4" style="text-align:center;padding:10px;">Tidak ada data</td></tr>'
    : months.map((m, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(m.bulan || m.nama || '—')}</td>
        <td style="text-align:center;">Rp ${formatNumberTabel(m.penerimaan || m.masuk || 0)}</td>
        <td style="text-align:center;">Rp ${formatNumberTabel(m.pengeluaran || m.keluar || 0)}</td>
        <td style="text-align:center;font-weight:600;">Rp ${formatNumberTabel(m.saldo || 0)}</td>
      </tr>`).join('');

  const totalMasuk = months.reduce((s, m) => s + Number(m.penerimaan || m.masuk || 0), 0);
  const totalKeluar = months.reduce((s, m) => s + Number(m.pengeluaran || m.keluar || 0), 0);

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntan || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,', nama: kepalaNama || '—', jabatan: 'Kepala SPPG' }
  ], '');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Kas Bulanan</title><style>${SHARED_CSS}
    body{font-size:9pt;}
    table.tbl{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px;}
    table.tbl th,table.tbl td{border:1px solid #000;padding:4px 6px;}
    table.tbl th{background:#f0f0f0;text-align:center;font-weight:700;}
    .right{text-align:center;}
  </style></head><body>
    ${renderKopSurat({ ...identitas, judul: 'LAPORAN KAS BULANAN' })}
    <div class="info-header"><table><tr><td style="width:120px;">Periode</td><td>: ${escapeHtml(periodeInfo || '—')}</td></tr></table></div>
    <table class="tbl">
      <thead><tr><th>No</th><th>Bulan</th><th>Penerimaan</th><th>Pengeluaran</th><th>Saldo</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:700;background:#f9f9f9;">
        <td colspan="2" style="text-align:center;">TOTAL</td>
        <td class="right">Rp ${formatNumberTabel(totalMasuk)}</td>
        <td class="right">Rp ${formatNumberTabel(totalKeluar)}</td>
        <td class="right">—</td>
      </tr></tfoot>
    </table>
    ${footer}
  </body></html>`;
}

module.exports = { renderPerBulanHtml };
