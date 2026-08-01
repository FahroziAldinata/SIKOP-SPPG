const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Helper format tanggal dd/mm/yyyy
 */
function formatDate(d) {
  if (!d) return '—';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '—';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Helper format tanggal & jam dd/mm/yyyy HH:mm
 */
function formatDateTime(d) {
  if (!d) return '—';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '—';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

/**
 * Helper badge warna status
 */
function renderStatusBadge(status) {
  let color = '#3b82f6'; // DIAJUKAN (biru)
  if (status === 'DIREALISASI') color = '#f59e0b'; // DIREALISASI (kuning/amber)
  if (status === 'DITERIMA') color = '#22c55e'; // DITERIMA (hijau)
  return `<span style="background-color: ${color}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 8.5pt; font-weight: bold; display: inline-block;">${escapeHtml(status || '—')}</span>`;
}

/**
 * Render HTML Laporan Realisasi PO vs Pesanan
 * @param {object} opts
 * @param {object} opts.periode
 * @param {object} opts.lembaga
 * @param {Array}  opts.poList
 * @param {object} opts.grandTotal
 * @param {object} opts.user
 */
function renderPoRealisasiHtml({ periode = {}, lembaga = {}, poList = [], grandTotal = {}, user = {} } = {}) {
  const tglMulaiStr = periode?.tanggalMulai ? formatDate(periode.tanggalMulai) : '';
  const tglSelesaiStr = periode?.tanggalSelesai ? formatDate(periode.tanggalSelesai) : '';
  const periodeText = (tglMulaiStr && tglSelesaiStr)
    ? `${tglMulaiStr} - ${tglSelesaiStr}`
    : (periode?.nama || '—');

  const rowsHtml = poList.length > 0
    ? poList.map((po, idx) => {
        const no = idx + 1;
        const tglPoStr = formatDate(po.tanggal);
        const noPo = po.nomorBukti || po.id || '—';
        const suppNama = po.supplier?.nama || '—';
        const jumlahItem = po.jumlahItem != null ? po.jumlahItem : (po.items ? po.items.length : 0);
        const totalPesan = po.totalPesan || 0;
        const totalRealisasi = po.totalRealisasi || 0;
        const totalDiterima = po.totalDiterima || 0;
        const subtotalPesan = po.subtotalPesan || 0;
        const subtotalRealisasi = po.subtotalRealisasi || 0;
        const statusBadge = renderStatusBadge(po.status);
        const penerimaNama = po.penerima || po.diterimaOleh?.nama || '—';
        const waktuTerimaStr = formatDateTime(po.waktuTerima || po.diterimaAt);

        return `
          <tr style="background-color: #fef9c3;">
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${no}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(tglPoStr)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(noPo)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(suppNama)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumberTabel(jumlahItem)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumberTabel(totalPesan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumberTabel(totalRealisasi)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatNumberTabel(totalDiterima)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRupiah(subtotalPesan)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right;">${formatRupiah(subtotalRealisasi)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${statusBadge}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: left;">${escapeHtml(penerimaNama)}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${escapeHtml(waktuTerimaStr)}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="13" style="border: 1px solid #000; padding: 12px; text-align: center; font-style: italic;">
          Tidak ada data Transaksi Pembelian (PO) pada periode ini.
        </td>
      </tr>
    `;

  const grandTotalHtml = `
    <tr class="baris-grand-total" style="font-weight: bold; background-color: #fde047;">
      <td colspan="4" style="border: 1px solid #000; padding: 6px; text-align: right;">GRAND TOTAL</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumberTabel(grandTotal?.jumlahItem || 0)}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumberTabel(grandTotal?.totalPesan || 0)}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumberTabel(grandTotal?.totalRealisasi || 0)}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatNumberTabel(grandTotal?.totalDiterima || 0)}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(grandTotal?.subtotalPesan || 0)}</td>
      <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRupiah(grandTotal?.subtotalRealisasi || 0)}</td>
      <td colspan="3" style="border: 1px solid #000; padding: 6px; text-align: center;">—</td>
    </tr>
  `;

  // TTD
  const namaPembuat = user?.nama || user?.namaLengkap || user?.username || '—';
  const rolePembuat = user?.role ? String(user.role).replace(/_/g, ' ') : 'Petugas';
  const namaKepala = lembaga?.namaKepalaSPPG || '—';

  const tempatPelaporan = lembaga?.tempatPelaporan || '';
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const tempatTglStr = tempatPelaporan ? `${escapeHtml(tempatPelaporan)}, ${todayStr}` : todayStr;

  const footerTTD = renderFooterTTD(
    [
      { label: 'Dibuat Oleh,', nama: namaPembuat, jabatan: rolePembuat },
      { label: 'Mengetahui,', nama: namaKepala, jabatan: 'Kepala SPPG' }
    ],
    tempatTglStr,
    { ruangTtd: 40 }
  );

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Realisasi PO vs Pesanan</title>
  <style>
    ${SHARED_CSS}
    table.tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    table.tbl thead {
      display: table-header-group;
    }
    table.tbl tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.tbl th, table.tbl td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: middle;
    }
    h2.judul-dok, .periode-label {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${renderKopSurat(lembaga)}

  <h2 class="judul-dok">LAPORAN REALISASI PO VS PESANAN</h2>
  <div class="periode-label" style="text-align: center; font-size: 11pt; margin-top: 4px; margin-bottom: 12px;">
    Periode: <strong>${escapeHtml(periodeText)}</strong>
  </div>

  <table class="tbl">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 30px;">No</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 75px;">Tanggal</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 90px;">No PO</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left;">Supplier</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 65px;">Jumlah Item</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 75px;">Qty Pesan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 75px;">Qty Realisasi</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 75px;">Qty Diterima</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 100px;">Subtotal Pesan</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: right; width: 100px;">Subtotal Realisasi</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 85px;">Status</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: left; width: 100px;">Penerima</th>
        <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 95px;">Waktu Terima</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${poList.length > 0 ? grandTotalHtml : ''}
    </tbody>
  </table>

  ${footerTTD}
</body>
</html>`;
}

module.exports = {
  renderPoRealisasiHtml
};
