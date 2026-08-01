const { renderKopSurat, renderFooterTTD, escapeHtml, formatNumberTabel, SHARED_CSS } = require('./shared');

/**
 * Render HTML template untuk FORMAT PEMERIKSAAN BAHAN MAKANAN (14 kolom Excel).
 *
 * Data yang dibutuhkan:
 *   nomorDokumen, tanggalPemeriksaan, namaLembaga, alamat,
 *   supplier { nama, alamat, kontak },
 *   bahanMakanan [ { nama, satuan, qtySiswa, qtyB3, qty, kategori } ],
 *   totalNilai,
 *   pemeriksa { nama, jabatan },
 *   namaKepalaSPPG, tempatPelaporan
 */
function renderPemeriksaanBahanHtml(data) {
  const {
    nomorDokumen,
    tanggalPemeriksaan,
    namaLembaga,
    alamat,
    supplier,
    bahanMakanan = [],
    totalNilai,
    pemeriksa,
    namaKepalaSPPG,
    tempatPelaporan,
  } = data;

  const tglStr = tanggalPemeriksaan
    ? new Date(tanggalPemeriksaan).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '_______________';

  const tglParts = tanggalPemeriksaan ? tanggalPemeriksaan.split('-') : [];
  const tglLabel = tglParts.length === 3 ? `${tglParts[2]}/${tglParts[1]}/${tglParts[0]}` : '';

  // Baris tabel 14 kolom
  const barisItems = bahanMakanan.map((item, idx) => `
    <tr>
      <td class="col-no">${idx + 1}</td>
      <td class="col-kosong"></td>
      <td class="col-kosong"></td>
      <td class="col-nama">${escapeHtml(item.nama)}</td>
      <td class="col-angka">${formatNumberTabel(item.qtySiswa)}</td>
      <td class="col-angka">${formatNumberTabel(item.qtyB3)}</td>
      <td class="col-angka">${formatNumberTabel(item.qty)}</td>
      <td class="col-satuan">${escapeHtml(item.satuan)}</td>
      <td class="col-kosong"></td>
      <td class="col-kosong"></td>
      <td class="col-kosong"></td>
      <td class="col-kosong"></td>
      <td class="col-supplier">${escapeHtml(supplier?.nama || '-')}</td>
      <td class="col-supplier">${escapeHtml(supplier?.alamat || '-')}</td>
    </tr>
  `).join('');

  const footerTTD = renderFooterTTD([
    {
      label: 'Pemeriksa,',
      jabatan: escapeHtml(pemeriksa?.jabatan || 'Petugas ASLAP'),
      nama: escapeHtml(pemeriksa?.nama || ''),
    },
    {
      label: 'Mengetahui,',
      jabatan: `Kepala Satuan Pelayanan Pemenuhan Gizi`,
      nama: escapeHtml(namaKepalaSPPG || ''),
    },
  ], `${escapeHtml(tempatPelaporan || '')}, ${tglStr}`);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Pemeriksaan Bahan Makanan — ${escapeHtml(nomorDokumen)}</title>
  <style>
    ${SHARED_CSS}

    body { padding: 8mm 8mm 1mm 8mm; }

    .info-block {
      margin: 6px 0;
      font-size: 10pt;
      line-height: 1.4;
    }
    .info-block table td {
      padding: 1px 4px;
      vertical-align: top;
    }
    .info-block table td:first-child {
      width: 120px;
    }
    .info-block table td:nth-child(2) {
      width: 10px;
      text-align: center;
    }

    table.tabel-pemeriksaan {
      border-collapse: collapse;
      width: 100%;
      margin: 6px 0;
      font-size: 8pt;
    }
    table.tabel-pemeriksaan th,
    table.tabel-pemeriksaan td {
      border: 1px solid #000;
      padding: 2px 3px;
    }
    table.tabel-pemeriksaan th {
      background: #f0f0f0;
      text-align: center;
      font-weight: bold;
      font-size: 7.5pt;
      vertical-align: bottom;
    }
    table.tabel-pemeriksaan .col-no       { text-align: center; width: 18px; }
    table.tabel-pemeriksaan .col-kosong   { text-align: center; min-width: 22px; }
    table.tabel-pemeriksaan .col-nama     { text-align: left;   min-width: 60px; }
    table.tabel-pemeriksaan .col-angka    { text-align: right;  min-width: 28px; }
    table.tabel-pemeriksaan .col-satuan   { text-align: center; width: 24px; }
    table.tabel-pemeriksaan .col-supplier { text-align: left;   min-width: 50px; }

    .subtitle {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .no-dok {
      text-align: center;
      font-size: 10pt;
    }

    .catatan-kolom {
      margin: 4px 0;
      font-size: 8pt;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${renderKopSurat({ namaLembaga, alamat, tampilkanBarisYayasan: false })}

  <h2 class="judul-dok" style="margin-top: 12px; font-size: 12pt;">FORMAT PEMERIKSAAN BAHAN MAKANAN</h2>
  <div class="no-dok">No. <strong>${escapeHtml(nomorDokumen)}</strong></div>

  <!-- Info Identitas Lembaga & Supplier -->
  <div class="info-block">
    <table>
      <tr>
        <td>Nama SPPG</td>
        <td>:</td>
        <td><strong>${escapeHtml(namaLembaga || '-')}</strong></td>
      </tr>
      <tr>
        <td>ID SPPG</td>
        <td>:</td>
        <td><strong>${escapeHtml(namaLembaga ? namaLembaga.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 8) : '-')}</strong></td>
      </tr>
      <tr>
        <td>Supplier</td>
        <td>:</td>
        <td><strong>${escapeHtml(supplier?.nama || '-')}</strong></td>
      </tr>
      ${supplier?.alamat ? `
      <tr>
        <td>Alamat Supplier</td>
        <td>:</td>
        <td>${escapeHtml(supplier.alamat)}</td>
      </tr>` : ''}
    </table>
  </div>

  <!-- Tabel 14 Kolom -->
  <table class="tabel-pemeriksaan">
    <thead>
      <tr>
        <th class="col-no" rowspan="2">No</th>
        <th colspan="2">Waktu Pemeriksaan</th>
        <th class="col-nama" rowspan="2">Bahan Makanan</th>
        <th colspan="2">Kebutuhan</th>
        <th class="col-angka" rowspan="2">QTY</th>
        <th class="col-satuan" rowspan="2">Sat</th>
        <th colspan="2">Kualitas</th>
        <th colspan="2">Kondisi</th>
        <th class="col-supplier" rowspan="2">Suplier</th>
        <th class="col-supplier" rowspan="2">Alamat</th>
      </tr>
      <tr>
        <th style="min-width:28px;">Waktu</th>
        <th style="min-width:32px;">Tanggal</th>
        <th style="min-width:22px;">SISWA${tglLabel ? '<br>(' + tglLabel + ')' : ''}</th>
        <th style="min-width:22px;">B3${tglLabel ? '<br>(' + tglLabel + ')' : ''}</th>
        <th style="min-width:20px;">Sesuai</th>
        <th style="min-width:20px;">Tidak</th>
        <th style="min-width:18px;">Baik</th>
        <th style="min-width:18px;">Rusak</th>
      </tr>
    </thead>
    <tbody>
      ${barisItems || '<tr><td colspan="14" style="text-align:center;font-style:italic;">Tidak ada item</td></tr>'}
    </tbody>
  </table>

  <div class="catatan-kolom">
    Kolom Waktu Pemeriksaan, Tanggal Pemeriksaan, Sesuai, Tidak, Baik, Rusak diisi manual setelah pemeriksaan fisik.
  </div>

  ${footerTTD}
</body>
</html>`;
}

module.exports = { renderPemeriksaanBahanHtml };
