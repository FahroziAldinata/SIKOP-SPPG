const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

function renderPerPeriodeHtml(data = {}) {
  const { identitas = {}, periodeInfo = '', categories = [] } = data;
  const { namaLembaga = '', alamat = '', namaAkuntan = '', namaKepalaSPPG = '' } = identitas;
  const kepalaNama = namaKepalaSPPG || '';

  const rows = categories.length === 0
    ? '<tr><td colspan="4" style="text-align:center;padding:10px;">Tidak ada data</td></tr>'
    : categories.map((cat, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(cat.kategori || cat.nama || '—')}</td>
        <td style="text-align:center;">Rp ${formatNumberTabel(cat.rab || cat.diajukan || 0)}</td>
        <td style="text-align:center;">Rp ${formatNumberTabel(cat.realisasi || cat.aktual || 0)}</td>
        <td style="text-align:center;font-weight:600;">Rp ${formatNumberTabel(cat.sisa || cat.selisih || 0)}</td>
      </tr>`).join('');

  const totalRab = categories.reduce((s, c) => s + Number(c.rab || c.diajukan || 0), 0);
  const totalRealisasi = categories.reduce((s, c) => s + Number(c.realisasi || c.aktual || 0), 0);
  const totalSisa = totalRab - totalRealisasi;

  const footer = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntan || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,', nama: kepalaNama || '—', jabatan: 'Kepala SPPG' }
  ], '');

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Per Periode</title><style>${SHARED_CSS}
    body{font-size:9pt;}
    table.tbl{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px;}
    table.tbl th,table.tbl td{border:1px solid #000;padding:4px 6px;}
    table.tbl th{background:#f0f0f0;text-align:center;font-weight:700;}
    .right{text-align:center;}
  </style></head><body>
    ${renderKopSurat({ ...identitas, judul: 'LAPORAN PER PERIODE — PAGU VS REALISASI' })}
    <div class="info-header"><table><tr><td style="width:120px;">Periode</td><td>: ${escapeHtml(periodeInfo || '—')}</td></tr></table></div>
    <table class="tbl">
      <thead><tr><th>No</th><th>Kategori Dana</th><th>Pagu (RAB)</th><th>Realisasi</th><th>Sisa/(Kurang)</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:700;background:#f9f9f9;">
        <td colspan="2" style="text-align:center;">TOTAL</td>
        <td class="right">Rp ${formatNumberTabel(totalRab)}</td>
        <td class="right">Rp ${formatNumberTabel(totalRealisasi)}</td>
        <td class="right">Rp ${formatNumberTabel(totalSisa)}</td>
      </tr></tfoot>
    </table>
    ${footer}
  </body></html>`;
}

module.exports = { renderPerPeriodeHtml };
