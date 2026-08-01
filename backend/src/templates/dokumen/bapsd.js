/**
 * HTML template untuk BAPSD (Berita Acara Pengalihan Sisa Dana).
 * Field mapping 1:1 ke output generateBAPSD:
 *   nomorDokumen, periodeLabel, sisaDana, tanggalMulaiBerikutnya,
 *   namaYayasan, ketuaYayasan, namaAkuntan, namaPejabat,
 *   tempatPelaporan, tanggalPelaporan, namaLembaga
 */
const { renderKopSurat, renderFooterTTD, escapeHtml, formatRupiah, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Helper untuk format bagian tanggal Indonesia (Hari, Tanggal, Bulan, Tahun)
 */
function formatIndonesianDateParts(dateVal) {
  if (!dateVal) return { hari: '_______', tanggal: '___', bulan: '_______', tahun: '_______' };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { hari: '_______', tanggal: '___', bulan: '_______', tahun: '_______' };

  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArr = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return {
    hari: hariArr[d.getDay()],
    tanggal: String(d.getDate()),
    bulan: bulanArr[d.getMonth()],
    tahun: String(d.getFullYear())
  };
}

/**
 * @param {object} data - data untuk BAPSD
 * @returns {string} HTML string
 */
function renderBapsdHtml(data) {
  const {
    nomorDokumen,
    periodeLabel,
    sisaDana,
    rincianSisa,
    tanggalMulaiBerikutnya,
    namaYayasan,
    ketuaYayasan,
    namaAkuntan,
    namaPejabat,
    tempatPelaporan,
    tanggalPelaporan,
    namaLembaga,
    alamat,
    nomorRekeningVA
  } = data;

  const tglPelaporanStr = tanggalPelaporan
    ? new Date(tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';
  const tempatTglStr = `${escapeHtml(tempatPelaporan || '')}, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${tglPelaporanStr}`;

  const tglBerikutnyaStr = tanggalMulaiBerikutnya
    ? new Date(tanggalMulaiBerikutnya).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '_______________';

  const dateParts = formatIndonesianDateParts(tanggalPelaporan);

  // Kategori sisa dana fallback / normalization
  const listRincian = (Array.isArray(rincianSisa) && rincianSisa.length > 0)
    ? rincianSisa
    : [
        { label: 'Dana Bahan Baku', sisa: 0 },
        { label: 'Dana Operasional', sisa: 0 },
        { label: 'Dana Insentif Fasilitas', sisa: 0 }
      ];

  const totalSisaDanaCalculated = listRincian.reduce((acc, item) => acc + (Number(item.sisa) || 0), 0);
  const totalSisaVal = totalSisaDanaCalculated > 0 ? totalSisaDanaCalculated : (Number(sisaDana) || 0);

  const tableRows = listRincian.map((item, idx) => `
    <tr>
      <td style="border: 1px solid #000; padding: 4px 8px; text-align: center;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 4px 8px; text-align: left;">${escapeHtml(item.label)}</td>
      <td style="border: 1px solid #000; padding: 4px 8px; text-align: right;">${formatNumberTabel(item.sisa)}</td>
    </tr>
  `).join('');

  // Footer TTD: 2 kolom (Pihak Pertama kiri, Pihak Kedua kanan) + Mengetahui Kepala SPPG terpisah di bawah
  const footerTTD = `
    ${renderFooterTTD([
      { label: 'Pihak Pertama,', org: namaYayasan, nama: ketuaYayasan || '', jabatanBawah: 'Ketua/Mewakili' },
      { label: 'Pihak Kedua,',   jabatan: `Akuntan SPPG ${namaLembaga}`,    nama: namaAkuntan || '' },
    ], tempatTglStr, { ruangTtd: 40 })}
    ${renderFooterTTD([
      { label: 'Mengetahui,', jabatan: `Kepala SPPG ${namaLembaga}`, nama: namaPejabat || '' }
    ], '', { ruangTtd: 40 })}
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>BAPSD — ${escapeHtml(nomorDokumen)}</title>
  <style>
    ${SHARED_CSS}
    /* BAPSD-specific styling */
    .bapsd-pembuka { margin: 15px 0; line-height: 1.6; text-align: justify; }
    .bapsd-poin { margin-left: 20px; margin-bottom: 15px; line-height: 1.6; }
    .bapsd-tabel th, .bapsd-tabel td { font-size: 11pt; }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat, tampilkanBarisYayasan: false })}

  <h2 class="judul-dok" style="margin-top: 15px;">Berita Acara Pengalihan Sisa Dana</h2>
  <div class="nomor-dok">Nomor: <span style="font-weight: bold;">${escapeHtml(nomorDokumen)}</span></div>

  <p class="bapsd-pembuka">
    Pada hari ini, <strong>${dateParts.hari}</strong>, tanggal <strong>${dateParts.tanggal}</strong> bulan <strong>${dateParts.bulan}</strong> tahun <strong>${dateParts.tahun}</strong>, bertempat di <strong>${escapeHtml(alamat || tempatPelaporan || 'lokasi SPPG')}</strong>, telah dilakukan pemeriksaan dan berita acara pengalihan sisa dana Anggaran SPPG <strong>${escapeHtml(namaLembaga)}</strong> untuk periode <strong>${escapeHtml(periodeLabel)}</strong>.
  </p>

  <table class="identitas-lembaga" style="margin-bottom: 12px;">
    <tr>
      <td style="width: 220px;">Nama Satuan Pelayanan</td>
      <td style="width: 10px;">:</td>
      <td><strong>${escapeHtml(namaLembaga)}</strong></td>
    </tr>
    <tr>
      <td>No. Rekening Virtual Account (VA)</td>
      <td>:</td>
      <td><strong>${escapeHtml(nomorRekeningVA || '-')}</strong></td>
    </tr>
    <tr>
      <td>Periode Anggaran</td>
      <td>:</td>
      <td>${escapeHtml(periodeLabel)}</td>
    </tr>
  </table>

  <p style="margin: 10px 0 6px 0;">Rincian Sisa Dana per Kategori Dana BGN adalah sebagai berikut:</p>

  <table class="tabel-rincian bapsd-tabel" style="border: 1px solid #000; border-collapse: collapse; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: #f2f2f2;">
        <th style="border: 1px solid #000; padding: 5px 8px; text-align: center; width: 40px;">No</th>
        <th style="border: 1px solid #000; padding: 5px 8px; text-align: left;">Kategori Dana BGN</th>
        <th style="border: 1px solid #000; padding: 5px 8px; text-align: right; width: 180px;">Sisa Dana (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="baris-total" style="font-weight: bold; background-color: #fafafa;">
        <td colspan="2" style="border: 1px solid #000; padding: 5px 8px; text-align: right;">Jumlah Sisa Dana</td>
        <td style="border: 1px solid #000; padding: 5px 8px; text-align: right;">${formatRupiah(totalSisaVal)}</td>
      </tr>
    </tfoot>
  </table>

  <p class="bapsd-pembuka" style="margin-top: 10px;">
    Sisa dana sebesar <strong>${formatRupiah(totalSisaVal)}</strong> tersebut di atas akan dialihkan ke periode selanjutnya yang dimulai pada tanggal <strong>${escapeHtml(tglBerikutnyaStr)}</strong> untuk mendukung kegiatan yang direncanakan pada periode berikutnya.
  </p>
  <p class="bapsd-pembuka" style="margin-top: 6px;">
    Demikian Berita Acara Pengalihan Sisa Dana ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
  </p>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderBapsdHtml };
