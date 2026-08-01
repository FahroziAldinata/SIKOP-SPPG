/**
 * exportExcel.js — Helper untuk export laporan ke format Excel (.xlsx)
 * Menggunakan library ExcelJS. Semua fungsi mengembalikan Buffer.
 */

const ExcelJS = require('exceljs');

// ─── Style constants ────────────────────────────────────────────────────────

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' } // dark navy
};
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const SUBHEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2D6A9F' }
};
const SUBHEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const SECTION_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD6E4F0' }
};
const SECTION_FONT = { bold: true, size: 10 };
const TOTAL_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF3CD' }
};
const TOTAL_FONT = { bold: true, size: 10 };
const BORDER_THIN = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' }
};
const RP_FMT = '#,##0';

/** Terapkan border thin ke suatu cell */
function applyBorder(cell) {
  cell.border = BORDER_THIN;
}

/** Set header style (fill + font + border + alignment) */
function styleHeader(cell, align = 'center') {
  cell.fill = HEADER_FILL;
  cell.font = HEADER_FONT;
  cell.border = BORDER_THIN;
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
}

/** Set subheader style (section title rows in LRA) */
function styleSubheader(cell) {
  cell.fill = SUBHEADER_FILL;
  cell.font = SUBHEADER_FONT;
  cell.border = BORDER_THIN;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

/** Section / kelompok baris style */
function styleSection(cell) {
  cell.fill = SECTION_FILL;
  cell.font = SECTION_FONT;
  cell.border = BORDER_THIN;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

/** Total / ringkasan baris style */
function styleTotal(cell) {
  cell.fill = TOTAL_FILL;
  cell.font = TOTAL_FONT;
  cell.border = BORDER_THIN;
}

/** Auto-fit lebar kolom berdasarkan konten terpanjang */
function autoFitColumns(worksheet) {
  worksheet.columns.forEach(col => {
    let maxLen = col.header ? String(col.header).length : 8;
    col.eachCell({ includeEmpty: true }, cell => {
      const valStr = cell.value !== null && cell.value !== undefined
        ? String(cell.value)
        : '';
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    col.width = Math.min(maxLen + 4, 50);
  });
}

// ─── 1. BKU Export ──────────────────────────────────────────────────────────

/**
 * exportBkuXlsx — Buku Kas Umum
 * @param {object} data — hasil dari getBkuData()
 * @returns {Buffer}
 */
async function exportBkuXlsx(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SPPG';
  wb.created = new Date();

  const ws = wb.addWorksheet('BKU', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

  // ── Judul ──
  const { ringkasan, transaksi } = data;
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BUKU KAS UMUM (BKU)';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = `${ringkasan.namaLembaga} | Periode: ${ringkasan.periodeLabel}`;
  subtitleCell.font = { italic: true, size: 10 };
  subtitleCell.alignment = { horizontal: 'center' };

  ws.addRow([]); // spacer

  // ── Header kolom ──
  const headerRow = ws.addRow(['No', 'Tanggal', 'No Bukti', 'Kode Akun', 'Uraian', 'Debet (Rp)', 'Kredit (Rp)', 'Saldo (Rp)']);
  headerRow.eachCell(cell => styleHeader(cell));
  headerRow.height = 24;

  // Saldo awal row
  const saldoAwalRow = ws.addRow([
    '', '', '', '', 'Saldo Awal / Sisa Dana Periode Lalu',
    '', '', ringkasan.sisaDanaLalu
  ]);
  saldoAwalRow.getCell(5).font = { italic: true, bold: true };
  saldoAwalRow.getCell(8).numFmt = RP_FMT;
  saldoAwalRow.eachCell(cell => applyBorder(cell));

  // ── Data transaksi ──
  transaksi.forEach((row, idx) => {
    const dataRow = ws.addRow([
      idx + 1,
      row.tanggal,
      row.noBukti,
      row.kodeAkun,
      row.uraian,
      row.debet || null,
      row.kredit || null,
      row.saldoBerjalan
    ]);
    dataRow.getCell(6).numFmt = RP_FMT;
    dataRow.getCell(7).numFmt = RP_FMT;
    dataRow.getCell(8).numFmt = RP_FMT;
    dataRow.eachCell(cell => applyBorder(cell));
  });

  // ── Ringkasan ──
  ws.addRow([]);
  const ringkasanHeader = ws.addRow(['RINGKASAN', '', '', '', '', '', '', '']);
  ringkasanHeader.getCell(1).font = { bold: true, size: 11 };

  const ringkasanData = [
    ['Sisa Dana Periode Lalu', ringkasan.sisaDanaLalu],
    ['Dana Diterima Saat Ini', ringkasan.danaDiterimaSaatIni],
    ['Dana Tersedia', ringkasan.danaTersedia],
    ['Biaya Bahan Baku', ringkasan.biayaBahanBaku],
    ['Biaya Operasional', ringkasan.biayaOperasional],
    ['Biaya Insentif Fasilitas', ringkasan.biayaInsentifFasilitas],
    ['Biaya Lainnya', ringkasan.biayaLainnya],
    ['Total Pengeluaran', ringkasan.totalPengeluaran],
    ['Sisa Dana Saat Ini', ringkasan.sisaDanaSaatIni],
    ['Saldo Bank', ringkasan.saldoBank],
    ['Saldo Tunai', ringkasan.saldoTunai],
    ['Total Kas', ringkasan.totalKas],
  ];

  ringkasanData.forEach(([label, val]) => {
    const r = ws.addRow(['', '', '', '', label, '', '', val]);
    r.getCell(5).font = { bold: label.startsWith('Total') || label.startsWith('Sisa Dana S') };
    r.getCell(8).numFmt = RP_FMT;
    if (label.startsWith('Total') || label.startsWith('Sisa Dana S')) {
      styleTotal(r.getCell(8));
    }
    r.eachCell(cell => applyBorder(cell));
  });

  // ── Kolom setup ──
  ws.columns = [
    { key: 'no', width: 5 },
    { key: 'tgl', width: 13 },
    { key: 'bukti', width: 14 },
    { key: 'kode', width: 12 },
    { key: 'uraian', width: 40 },
    { key: 'debet', width: 16 },
    { key: 'kredit', width: 16 },
    { key: 'saldo', width: 18 },
  ];

  return wb.xlsx.writeBuffer();
}

// ─── 2. LRA Export ──────────────────────────────────────────────────────────

/**
 * exportLraXlsx — Laporan Realisasi Anggaran
 * @param {object} lraData — hasil dari getLraData()
 * @param {object} lembaga — identitas lembaga
 * @returns {Buffer}
 */
async function exportLraXlsx(lraData, lembaga = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SPPG';
  wb.created = new Date();

  const ws = wb.addWorksheet('LRA', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

  const { pendapatan, belanja, ringkasan, periodeList } = lraData;

  // ── Judul ──
  const periodeLabel = periodeList.map(p => p.label).join(' & ');
  ws.mergeCells('A1:F1');
  const t1 = ws.getCell('A1');
  t1.value = 'LAPORAN REALISASI ANGGARAN (LRA)';
  t1.font = { bold: true, size: 14 };
  t1.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  const t2 = ws.getCell('A2');
  t2.value = `${lembaga.namaLembaga || ''} | Periode: ${periodeLabel}`;
  t2.font = { italic: true, size: 10 };
  t2.alignment = { horizontal: 'center' };

  ws.addRow([]);

  // ── Header kolom ──
  const headerRow = ws.addRow(['Kode', 'Kelompok Akun', 'Pagu (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', '% Realisasi']);
  headerRow.eachCell(cell => styleHeader(cell));
  headerRow.height = 24;

  const writeSection = (label, rows, totalRow) => {
    // Section title row
    const secRow = ws.addRow([label, '', '', '', '', '']);
    ws.mergeCells(`B${secRow.number}:F${secRow.number}`);
    styleSubheader(secRow.getCell(1));
    styleSubheader(secRow.getCell(2));

    rows.forEach(item => {
      const r = ws.addRow([
        item.kode,
        item.kelompokAkun,
        item.pagu,
        item.realisasi,
        item.sisa,
        item.persen
      ]);
      r.getCell(3).numFmt = RP_FMT;
      r.getCell(4).numFmt = RP_FMT;
      r.getCell(5).numFmt = RP_FMT;
      r.getCell(6).numFmt = '0.00"%"';
      r.eachCell(cell => applyBorder(cell));
    });

    // Total row
    const totRow = ws.addRow([
      '',
      `TOTAL ${label}`,
      totalRow.pagu,
      totalRow.realisasi,
      totalRow.sisa,
      totalRow.persen
    ]);
    totRow.getCell(3).numFmt = RP_FMT;
    totRow.getCell(4).numFmt = RP_FMT;
    totRow.getCell(5).numFmt = RP_FMT;
    totRow.getCell(6).numFmt = '0.00"%"';
    totRow.eachCell(cell => styleTotal(cell));
  };

  writeSection('A. PENDAPATAN', pendapatan, ringkasan.totalPendapatan);
  ws.addRow([]);
  writeSection('B. BELANJA', belanja, ringkasan.totalBelanja);

  // SILPA row
  ws.addRow([]);
  const silpaRow = ws.addRow([
    'C.',
    'SILPA (Sisa Lebih Pembiayaan Anggaran)',
    ringkasan.silpa.pagu,
    ringkasan.silpa.realisasi,
    ringkasan.silpa.sisa,
    ringkasan.silpa.persen
  ]);
  silpaRow.getCell(3).numFmt = RP_FMT;
  silpaRow.getCell(4).numFmt = RP_FMT;
  silpaRow.getCell(5).numFmt = RP_FMT;
  silpaRow.getCell(6).numFmt = '0.00"%"';
  silpaRow.eachCell(cell => styleSection(cell));

  ws.columns = [
    { key: 'kode', width: 8 },
    { key: 'akun', width: 44 },
    { key: 'pagu', width: 18 },
    { key: 'realisasi', width: 18 },
    { key: 'sisa', width: 18 },
    { key: 'persen', width: 12 },
  ];

  return wb.xlsx.writeBuffer();
}

// ─── 3. Stock Barang Export ──────────────────────────────────────────────────

/**
 * exportStockXlsx — Laporan Stock Barang (Persediaan)
 * @param {Array} data — hasil dari getStockBarangData() -> data array
 * @param {object} meta — { periodeLabel, tanggal }
 * @returns {Buffer}
 */
async function exportStockXlsx(data, meta = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SPPG';
  wb.created = new Date();

  const ws = wb.addWorksheet('Stock Barang', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

  // ── Judul ──
  ws.mergeCells('A1:I1');
  const t1 = ws.getCell('A1');
  t1.value = 'LAPORAN STOCK BARANG (PERSEDIAAN)';
  t1.font = { bold: true, size: 14 };
  t1.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:I2');
  const t2 = ws.getCell('A2');
  t2.value = `Tanggal Cutoff: ${meta.tanggal || '-'}`;
  t2.font = { italic: true, size: 10 };
  t2.alignment = { horizontal: 'center' };

  ws.addRow([]);

  // ── Header ──
  const headerRow = ws.addRow([
    'No',
    'Nama Bahan',
    'Satuan',
    'Saldo Awal',
    'Masuk',
    'Keluar',
    'Saldo Akhir',
    'Harga Terakhir (Rp)',
    'Total Nilai (Rp)'
  ]);
  headerRow.eachCell(cell => styleHeader(cell));
  headerRow.height = 28;

  // ── Data rows ──
  let totalNilai = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;

  data.forEach((item, idx) => {
    const r = ws.addRow([
      idx + 1,
      item.nama,
      item.satuan,
      item.saldoAwalQty,
      item.totalMasukQty,
      item.totalKeluarQty,
      item.saldoAkhirQty,
      item.hargaBeliTerakhir,
      item.nilaiStock
    ]);
    r.getCell(8).numFmt = RP_FMT;
    r.getCell(9).numFmt = RP_FMT;
    r.eachCell(cell => applyBorder(cell));

    totalNilai += item.nilaiStock || 0;
    totalMasuk += item.totalMasukQty || 0;
    totalKeluar += item.totalKeluarQty || 0;
  });

  // ── Total row ──
  const totalRow = ws.addRow([
    '',
    'TOTAL',
    '',
    '',
    totalMasuk,
    totalKeluar,
    '',
    '',
    totalNilai
  ]);
  totalRow.getCell(9).numFmt = RP_FMT;
  totalRow.eachCell(cell => styleTotal(cell));

  ws.columns = [
    { key: 'no', width: 5 },
    { key: 'nama', width: 35 },
    { key: 'satuan', width: 10 },
    { key: 'saldoAwal', width: 12 },
    { key: 'masuk', width: 10 },
    { key: 'keluar', width: 10 },
    { key: 'saldoAkhir', width: 12 },
    { key: 'harga', width: 20 },
    { key: 'nilaiTotal', width: 22 },
  ];

  return wb.xlsx.writeBuffer();
}

module.exports = { exportBkuXlsx, exportLraXlsx, exportStockXlsx };
