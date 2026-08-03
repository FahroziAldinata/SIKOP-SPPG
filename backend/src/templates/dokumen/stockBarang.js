const { renderKopSurat, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Mapping kategori bahan makanan jika tidak tersedia di data item.
 */
function getKategoriItem(it) {
  if (it.kategori) return it.kategori;
  const name = (it.nama || '').toLowerCase();

  if (/beras|tepung|terigu|tapioka|maizena|mie|bihun|kentang|singkong|ubi|roti|pasta|oatmeal/.test(name)) {
    return 'Bahan Pokok';
  }
  if (/ayam|daging|sapi|kambing|ikan|udang|cumi|telur|susu|keju|sosis|bakso|kornet/.test(name)) {
    return 'Protein Hewani';
  }
  if (/tahu|tempe|kacang|kedelai|edamame|oncom/.test(name)) {
    return 'Protein Nabati';
  }
  if (/bayam|kangkung|wortel|buncis|brokoli|kembang kol|kubis|kol|sawi|terong|labu|daun|jagung|oyong|kacang panjang|mentimun|timun|tomat|lobak|caisim|selada|jamur|tauge|toge/.test(name)) {
    return 'Sayuran';
  }
  if (/pisang|apel|jeruk|semangka|melon|pepaya|mangga|anggur|buah|kelengkeng|pir|pear|nanas|alpukat/.test(name)) {
    return 'Buah';
  }
  return 'Bumbu & Lainnya';
}

/**
 * Helper lokal 3 Kolom TTD untuk laporan Stock Barang:
 * Petugas Logistik | Akuntan SPPG | Kepala SPPG
 */
function renderFooterTTDStockBarang({ namaPetugasLogistik = '', namaAkuntan = '', namaKepalaSPPG = '', tempatPelaporan = '', tanggal = '' }) {
  const tglStr = tempatPelaporan ? `${escapeHtml(tempatPelaporan)}, ${escapeHtml(tanggal || '—')}` : escapeHtml(tanggal || '—');
  return `
    <div class="footer-ttd" style="margin-top:24px; page-break-inside:avoid;">
      <div style="text-align:right; margin-bottom:12px; font-size:9pt;">
        ${tglStr}
      </div>
      <div style="display:flex; justify-content:space-between; text-align:center; font-size:9.5pt;">
        <div style="width:30%;">
          <div>Dibuat Oleh,</div>
          <div style="margin-top:2px;">Petugas Logistik</div>
          <div class="ttd-ruang" data-ttd-nama="${escapeHtml(namaPetugasLogistik)}" style="height:45px;"></div>
          <div><strong>${escapeHtml(namaPetugasLogistik || '—')}</strong></div>
        </div>
        <div style="width:30%;">
          <div>Diperiksa Oleh,</div>
          <div style="margin-top:2px;">Akuntan SPPG</div>
          <div class="ttd-ruang" data-ttd-nama="${escapeHtml(namaAkuntan)}" style="height:45px;"></div>
          <div><strong>${escapeHtml(namaAkuntan || '—')}</strong></div>
        </div>
        <div style="width:30%;">
          <div>Mengetahui,</div>
          <div style="margin-top:2px;">Kepala SPPG</div>
          <div class="ttd-ruang" data-ttd-nama="${escapeHtml(namaKepalaSPPG)}" style="height:45px;"></div>
          <div><strong>${escapeHtml(namaKepalaSPPG || '—')}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderStockBarangHtml(data = {}) {
  const { identitas = {}, periodeInfo = '', tanggal = '', items = [] } = data;
  const {
    namaLembaga = '',
    alamat = '',
    namaAkuntan = '',
    namaKepalaSPPG = '',
    namaPetugasLogistik = '',
    tempatPelaporan = ''
  } = identitas;

  // Group items by Category
  const grouped = {};
  for (const it of items) {
    const cat = getKategoriItem(it);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  }

  const categoryOrder = ['Bahan Pokok', 'Protein Hewani', 'Protein Nabati', 'Sayuran', 'Buah', 'Bumbu & Lainnya'];
  const allCategories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c))
  ];

  let tableRows = '';
  let itemCounter = 0;

  let grandAwal = 0;
  let grandMasuk = 0;
  let grandKeluar = 0;
  let grandAkhir = 0;
  let grandNilai = 0;

  if (items.length === 0) {
    tableRows = '<tr><td colspan="9" style="text-align:center;padding:10px;">Tidak ada data</td></tr>';
  } else {
    for (const catName of allCategories) {
      const catItems = grouped[catName];
      if (!catItems || catItems.length === 0) continue;

      tableRows += `
        <tr style="background:#eaf2fb; font-weight:700;">
          <td colspan="9" style="text-align:left; padding:5px 8px; font-size:9pt; text-transform:uppercase;">
            Kategori: ${escapeHtml(catName)}
          </td>
        </tr>
      `;

      let subAwal = 0;
      let subMasuk = 0;
      let subKeluar = 0;
      let subAkhir = 0;
      let subNilai = 0;

      for (const it of catItems) {
        itemCounter++;
        const saQty = Number(it.saldoAwalQty) || 0;
        const masQty = Number(it.totalMasukQty) || 0;
        const kelQty = Number(it.totalKeluarQty) || 0;
        const akhQty = Number(it.saldoAkhirQty) || 0;
        const hrgBeli = Number(it.hargaBeliTerakhir) || 0;
        const totalNilaiItem = it.nilaiStock !== undefined ? Number(it.nilaiStock) : (akhQty * hrgBeli);

        subAwal += saQty;
        subMasuk += masQty;
        subKeluar += kelQty;
        subAkhir += akhQty;
        subNilai += totalNilaiItem;

        tableRows += `
          <tr>
            <td style="text-align:center;">${itemCounter}</td>
            <td>${escapeHtml(it.nama || '—')}</td>
            <td style="text-align:center;">${escapeHtml(it.satuan || '—')}</td>
            <td style="text-align:center;">${formatNumberTabel(saQty)}</td>
            <td style="text-align:center;">${formatNumberTabel(masQty)}</td>
            <td style="text-align:center;">${formatNumberTabel(masQty ? kelQty : kelQty)}</td>
            <td style="text-align:center;font-weight:700;">${formatNumberTabel(akhQty)}</td>
            <td style="text-align:right;">${hrgBeli ? 'Rp ' + formatNumberTabel(hrgBeli) : '-'}</td>
            <td style="text-align:right;font-weight:700;">${totalNilaiItem ? 'Rp ' + formatNumberTabel(totalNilaiItem) : '-'}</td>
          </tr>
        `;
      }

      grandAwal += subAwal;
      grandMasuk += subMasuk;
      grandKeluar += subKeluar;
      grandAkhir += subAkhir;
      grandNilai += subNilai;

      tableRows += `
        <tr style="background:#f4f6f9; font-weight:700; border-top:1px solid #000; border-bottom:1px solid #000;">
          <td colspan="3" style="text-align:right; padding:4px 6px;">JUMLAH ${escapeHtml(catName).toUpperCase()}:</td>
          <td style="text-align:center;">${formatNumberTabel(subAwal)}</td>
          <td style="text-align:center;">${formatNumberTabel(subMasuk)}</td>
          <td style="text-align:center;">${formatNumberTabel(subKeluar)}</td>
          <td style="text-align:center;">${formatNumberTabel(subAkhir)}</td>
          <td style="text-align:center;">—</td>
          <td style="text-align:right;">Rp ${formatNumberTabel(subNilai)}</td>
        </tr>
      `;
    }

    tableRows += `
      <tr style="background:#d9e2ec; font-weight:700; font-size:9.5pt; border-top:2px solid #000; border-bottom:2px solid #000;">
        <td colspan="3" style="text-align:right; padding:5px 6px;">TOTAL KESELURUHAN:</td>
        <td style="text-align:center;">${formatNumberTabel(grandAwal)}</td>
        <td style="text-align:center;">${formatNumberTabel(grandMasuk)}</td>
        <td style="text-align:center;">${formatNumberTabel(grandKeluar)}</td>
        <td style="text-align:center;">${formatNumberTabel(grandAkhir)}</td>
        <td style="text-align:center;">—</td>
        <td style="text-align:right;">Rp ${formatNumberTabel(grandNilai)}</td>
      </tr>
    `;
  }

  const footer = renderFooterTTDStockBarang({
    namaPetugasLogistik,
    namaAkuntan,
    namaKepalaSPPG,
    tempatPelaporan,
    tanggal
  });

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Stock Barang</title><style>${SHARED_CSS}
    body{font-size:9pt;}
    table.stock{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px;}
    table.stock th,table.stock td{border:1px solid #000;padding:4px 6px;}
    table.stock th{background:#f0f0f0;text-align:center;font-weight:700;}
  </style></head><body>
    ${renderKopSurat(identitas)}
    <h2 class="judul-dok">LAPORAN STOCK BARANG (PERSEDIAAN)</h2>
    <div class="info-header" style="margin-bottom:10px;">
      <table><tr><td style="width:120px;">Periode</td><td>: ${escapeHtml(periodeInfo || '—')}</td></tr>
      <tr><td>Tanggal</td><td>: ${escapeHtml(tanggal || '—')}</td></tr></table>
    </div>
    <table class="stock">
      <thead><tr>
        <th style="width:30px;">No</th>
        <th>Nama Bahan</th>
        <th style="width:55px;">Satuan</th>
        <th style="width:70px;">Saldo Awal</th>
        <th style="width:70px;">Total Masuk</th>
        <th style="width:70px;">Total Keluar</th>
        <th style="width:70px;">Saldo Akhir</th>
        <th style="width:90px;">Harga Beli</th>
        <th style="width:110px;">Total Nilai Akhir (Rp)</th>
      </tr></thead><tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top:8px;"><strong>Total Qty Akhir: ${formatNumberTabel(grandAkhir)}</strong> &nbsp;|&nbsp; <strong>Total Nilai Akhir: Rp ${formatNumberTabel(grandNilai)}</strong></div>
    ${footer}
  </body></html>`;
}

module.exports = { renderStockBarangHtml };
