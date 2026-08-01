const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Template PDF Nota Pesanan & Realisasi Belanja Bahan Makanan
 * @param {object} opts
 * @param {object} [opts.po]
 * @param {Array}  [opts.items]
 * @param {object} [opts.supplier]
 * @param {object} [opts.lembaga]
 * @param {object} [opts.user]
 * @param {string|number} [opts.tahunAnggaran]
 */
function renderNotaPesananHtml({ po = {}, items, supplier, lembaga = {}, user = {}, tahunAnggaran } = {}) {
  const itemList = items || po.items || [];
  const supp = supplier || po.supplier || {};
  const tahun = tahunAnggaran || lembaga.tahunAnggaran || po.rabHarian?.periode?.setupLembaga?.tahunAnggaran || '';

  const nomorPo = po.nomorBukti || po.id || '—';
  const tanggalPo = po.tanggal
    ? new Date(po.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const suppNama = supp.nama || '—';
  const suppAlamat = supp.alamat || '—';
  const suppKontak = supp.kontak || '—';

  const statusPo = po.status || '—';

  // Baris item tabel
  let grandTotal = 0;
  const itemRows = itemList.length > 0
    ? itemList.map((item, idx) => {
        const no = idx + 1;
        const namaBahan = item.bahanPokok?.nama || item.namaBahan || '—';
        const satuan = item.bahanPokok?.satuanHitungan || item.bahanPokok?.satuan || item.satuan || 'kg';
        
        const qtyPesan = item.qty != null ? Number(item.qty) : 0;
        const hargaSatuan = item.hargaSatuan != null ? Number(item.hargaSatuan) : 0;
        const subtotal = item.subtotal != null ? Number(item.subtotal) : (qtyPesan * hargaSatuan);

        grandTotal += subtotal;

        return `
          <tr>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${no}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(namaBahan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(satuan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumberTabel(qtyPesan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRupiah(hargaSatuan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRupiah(subtotal)}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="6" style="border: 1px solid #000; padding: 12px; text-align: center; font-style: italic;">
          Tidak ada item bahan makanan pada nota pesanan ini.
        </td>
      </tr>
    `;

  // TTD
  const namaAkuntan = po.createdBy?.nama || user.nama || lembaga.namaAkuntanSPPG || '—';
  const namaKepala = lembaga.namaKepalaSPPG || '—';
  const namaPenerima = po.diterimaOleh?.nama || suppNama || '—';

  const tempatPelaporan = lembaga.tempatPelaporan || '';
  const tempatTglStr = tempatPelaporan && tanggalPo !== '—'
    ? `${escapeHtml(tempatPelaporan)}, ${tanggalPo}`
    : (tanggalPo !== '—' ? tanggalPo : '');

  const footerTTD = renderFooterTTD(
    [
      { label: 'Dibuat Oleh,', nama: namaAkuntan, jabatan: 'Akuntan SPPG' },
      { label: 'Mengetahui,', nama: namaKepala, jabatan: 'Kepala SPPG' },
      { label: 'Diterima Oleh,', nama: namaPenerima, jabatan: 'Mitra' }
    ],
    tempatTglStr,
    { ruangTtd: 40 }
  );

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Nota Pesanan — ${escapeHtml(nomorPo)}</title>
  <style>
    ${SHARED_CSS}
    table.tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    table.tbl thead {
      display: table-header-group;
    }
    table.tbl tr {
      page-break-inside: avoid;
    }
    .info-po-tbl td {
      padding: 3px 6px;
      font-size: 10.5pt;
      vertical-align: top;
    }
    h2.judul-dok, .nomor-dok, .info-po-tbl {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}

  <h2 class="judul-dok">NOTA PESANAN &amp; REALISASI BELANJA BAHAN MAKANAN</h2>
  <div class="nomor-dok" style="margin-top: 4px; margin-bottom: 10px;">
    Nomor PO: <span class="highlight">${escapeHtml(nomorPo)}</span>
  </div>

  <table class="info-po-tbl" style="width: 100%; margin-bottom: 12px;">
    <tbody>
      <tr>
        <td style="width: 130px; font-weight: bold;">Tanggal PO</td>
        <td style="width: 35%;">: ${escapeHtml(tanggalPo)}</td>
        <td style="width: 130px; font-weight: bold;">Supplier / Mitra</td>
        <td>: ${escapeHtml(suppNama)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Status PO</td>
        <td>: ${escapeHtml(statusPo)}</td>
        <td style="font-weight: bold;">Kontak Supplier</td>
        <td>: ${escapeHtml(suppKontak)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Tahun Anggaran</td>
        <td>: ${escapeHtml(tahun ? String(tahun) : '—')}</td>
        <td style="font-weight: bold;">Alamat Supplier</td>
        <td>: ${escapeHtml(suppAlamat)}</td>
      </tr>
      ${po.catatan ? `
      <tr>
        <td style="font-weight: bold;">Catatan</td>
        <td colspan="3">: ${escapeHtml(po.catatan)}</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <table class="tbl">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 35px;">No</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Nama Bahan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 75px;">Satuan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 90px;">Qty Pesan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 120px;">Harga Satuan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 130px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="baris-total" style="font-weight: bold; background-color: #f9fafb;">
        <td colspan="5" style="border: 1px solid #000; padding: 6px; text-align: right;">Total Keseluruhan</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  ${footerTTD}
</body>
</html>`;
}

module.exports = {
  renderNotaPesananHtml
};
