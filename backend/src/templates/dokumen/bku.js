/**
 * HTML template untuk BKU (Buku Kas Umum / Catatan Pengeluaran Bulanan).
 * Field mapping:
 *   ringkasan: namaLembaga, alamat, namaKepalaSPPG, namaAkuntanSPPG, tempatPelaporan, tanggalPelaporan,
 *     periodeLabel, sisaDanaLalu, danaDiterimaSaatIni, danaTersedia, biayaBahanBaku,
 *     biayaOperasional, biayaInsentifFasilitas, totalPengeluaran, sisaDanaSaatIni,
 *     saldoBank, saldoTunai, totalKas
 *   transaksi: array of { bulan, tanggal, noBukti, kodeAkun, uraian, debet, kredit, saldoBerjalan, jumlah, sumberKas }
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');
const { logger } = require('../../lib/logger');

const NAMA_BULAN = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/**
 * @param {object} data - data untuk BKU
 * @returns {string} HTML string
 */
function renderBkuHtml(data) {
  const { ringkasan, transaksi } = data || {};
  const {
    namaLembaga = '',
    alamat = '',
    namaKepalaSPPG = '',
    namaAkuntanSPPG = '',
    tempatPelaporan = '',
    tanggalPelaporan = null,
    periodeLabel = '',
    sisaDanaLalu = 0,
    sisaDanaSaatIni = 0,
    saldoBank = null,
    saldoTunai = null,
    totalKas = null
  } = ringkasan || {};

  let formattedPeriode = periodeLabel;
  try {
    const parts = (periodeLabel || '').split(" - ");
    if (parts.length === 2) {
      const d1 = new Date(parts[0]);
      const d2 = new Date(parts[1]);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const d1Day = d1.getDate();
        const d2Day = d2.getDate();
        const d1Month = d1.toLocaleDateString('id-ID', { month: 'long' });
        const d2Month = d2.toLocaleDateString('id-ID', { month: 'long' });
        const d1Year = d1.getFullYear();
        const d2Year = d2.getFullYear();
        
        if (d1Month === d2Month && d1Year === d2Year) {
          formattedPeriode = `Periode : ${d1Day}-${d2Day} ${d1Month} ${d1Year}`;
        } else if (d1Year === d2Year) {
          formattedPeriode = `Periode : ${d1Day} ${d1Month} - ${d2Day} ${d2Month} ${d1Year}`;
        } else {
          formattedPeriode = `Periode : ${d1Day} ${d1Month} ${d1Year} - ${d2Day} ${d2Month} ${d2Year}`;
        }
      }
    }
  } catch (e) {
    logger.error("Gagal memformat periodeLabel BKU:", e);
  }

  // Format tempat & tanggal pelaporan untuk TTD
  let tempatTglStr = '';
  if (tanggalPelaporan) {
    try {
      const d = new Date(tanggalPelaporan);
      if (!isNaN(d.getTime())) {
        const tglFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        tempatTglStr = tempatPelaporan ? `${tempatPelaporan}, ${tglFormatted}` : tglFormatted;
      }
    } catch (e) {
      logger.error("Gagal memformat tanggalPelaporan BKU:", e);
    }
  }

  const bankAmount = saldoBank !== null ? Number(saldoBank) : Number(sisaDanaSaatIni);
  const tunaiAmount = saldoTunai !== null ? Number(saldoTunai) : 0;
  const kasTotalAmount = totalKas !== null ? Number(totalKas) : (bankAmount + tunaiAmount);

  // Tampilkan semua transaksi (MASUK + KELUAR)
  const filteredTransaksi = transaksi || [];

  const footerTTDHtml = renderFooterTTD([
    { label: 'Dibuat Oleh,', nama: namaAkuntanSPPG || '—', jabatan: 'Akuntan SPPG' },
    { label: 'Mengetahui,', nama: namaKepalaSPPG || '—', jabatan: 'Kepala SPPG' }
  ], tempatTglStr, { ruangTtd: 40 });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Kas Umum — ${escapeHtml(namaLembaga)}</title>
  <style>
    ${SHARED_CSS}
    /* BKU-specific styling */
    .bku-identitas td { padding: 3px 0; font-size: 11pt; }
    .bku-identitas td:first-child { width: 140px; font-weight: bold; }
    
    .tabel-ringkasan-bku td {
      border: 1px solid #000;
      padding: 5px 8px;
    }
  </style>
</head>
<body>

  ${renderKopSurat({ namaLembaga, alamat })}

  <h2 class="judul-dok" style="margin-top: 10px; text-align: center;">BUKU KAS UMUM</h2>
  <div style="text-align: center; font-size: 11pt; margin-bottom: 15px; font-weight: bold;">
    ${escapeHtml(formattedPeriode)}
  </div>

  <table class="bku-identitas" style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tbody>
      <tr>
        <td>Nama Lembaga</td>
        <td>: ${escapeHtml(namaLembaga)}</td>
      </tr>
      <tr>
        <td>Alamat</td>
        <td>: ${escapeHtml(alamat)}</td>
      </tr>
      <tr>
        <td>Saldo Awal</td>
        <td>: Rp${Number(sisaDanaLalu).toLocaleString('id-ID')}</td>
      </tr>
      <tr>
        <td>Saldo Akhir</td>
        <td>: Rp${Number(sisaDanaSaatIni).toLocaleString('id-ID')}</td>
      </tr>
    </tbody>
  </table>

  <table class="tabel-transaksi-bku" style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 9.5pt; page-break-inside: auto;">
    <thead>
      <tr style="background-color: #eaeaea; border-bottom: 1px solid #000;">
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 70px;">Bulan</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 35px;">Tgl</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 80px;">No. Bukti</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 75px;">Kode Akun</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: left;">Uraian Transaksi</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 95px;">Debet</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 95px;">Kredit</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 95px;">Saldo</th>
        <th style="border: 1px solid #000; padding: 5px 4px; text-align: center; width: 90px;">Keterangan</th>
      </tr>
      <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000; font-size: 8.5pt;">
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">1</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">2</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">3</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">4</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">5</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">6</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">7</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">8</th>
        <th style="border: 1px solid #000; padding: 2px; text-align: center;">9</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #000; page-break-inside: avoid; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">—</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: left;">SALDO AWAL</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">0</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">0</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(sisaDanaLalu)}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: left;">—</td>
      </tr>
      ${filteredTransaksi.length === 0 ? `
        <tr>
          <td colspan="9" style="border: 1px solid #000; padding: 12px; text-align: center; font-style: italic; color: #666;">
            Tidak ada transaksi pada periode ini.
          </td>
        </tr>
      ` : filteredTransaksi.map(row => {
          const dateParts = (row.tanggal || '').split('-');
          const tgl = dateParts.length === 3 ? parseInt(dateParts[2], 10) : '';
          const blnIndex = dateParts.length === 3 ? parseInt(dateParts[1], 10) : row.bulan || 1;
          const bulanNama = NAMA_BULAN[blnIndex] || '';
          const kodeAkunVal = row.kodeAkun || row.akunDanaBiaya?.kode || row.akunKas?.kode || '—';
          
          return `
            <tr style="border-bottom: 1px solid #000; page-break-inside: avoid;">
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(bulanNama)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(tgl)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(row.noBukti || '—')}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace;">${escapeHtml(kodeAkunVal)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: left;">${escapeHtml(row.uraian || '')}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.debet)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.kredit)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: center; font-variant-numeric: tabular-nums;">${formatNumberTabel(row.saldoBerjalan)}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: left;">${escapeHtml(row.sumberKas || '')}</td>
            </tr>
          `;
        }).join('')}
    </tbody>
  </table>

  <!-- Ringkasan Penutupan Kas -->
  <div style="margin-top: 18px; page-break-inside: avoid;">
    <div style="font-weight: bold; font-size: 10.5pt; margin-bottom: 5px; text-transform: uppercase;">Ringkasan Penutupan Kas</div>
    <table style="width: 320px; border-collapse: collapse; font-size: 9.5pt; border: 1px solid #000;">
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 4px 8px; width: 170px;">1. Kas di Bank</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-variant-numeric: tabular-nums;">
            ${formatRupiah(bankAmount)}
          </td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 4px 8px;">2. Kas Tunai</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-variant-numeric: tabular-nums;">
            ${formatRupiah(tunaiAmount)}
          </td>
        </tr>
        <tr style="font-weight: bold; background-color: #f5f5f5;">
          <td style="border: 1px solid #000; padding: 4px 8px;">Total Kas</td>
          <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-variant-numeric: tabular-nums;">
            ${formatRupiah(kasTotalAmount)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Area Tanda Tangan (TTD) -->
  ${footerTTDHtml}

</body>
</html>`;
}

module.exports = { renderBkuHtml };

