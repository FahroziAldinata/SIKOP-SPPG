/**
 * Konstanta dan helper fungsi untuk mapping kode KategoriPenerima.
 * Sumber tunggal kebenaran — gantikan hardcode di aslap.js.
 */

// ── Array kode per kelompok ──────────────────────────────────────────────────

const KATEGORI_PESERTA_DIDIK = [
  'PAUD_TK',
  'SD_1_3',
  'SD_4_6',
  'SMP_1_3',
  'SMA_SMK_4_6',
  'ATS_KURANG_9TH',
  'ATS_9_18TH',
  'PENDIDIK',
  'TENAGA_KEPENDIDIKAN',
];

const KATEGORI_NON_PESERTA_DIDIK = [
  'BALITA',
  'BUMIL',
  'BUSUI',
  'KADER_POSYANDU',
];

// Porsi kecil: PAUD/TK, SD kelas 1–3, ATS usia < 9 th
const KATEGORI_PORSI_KECIL = [
  'PAUD_TK',
  'SD_1_3',
  'ATS_KURANG_9TH',
];

// Porsi besar SD 4–6 (bucket terpisah "besar46")
const KATEGORI_PORSI_BESAR_SD46 = [
  'SD_4_6',
];

// Porsi besar SMP/SMA/ATS ≥9th (bucket "besarSmk")
const KATEGORI_PORSI_BESAR_SMK = [
  'SMP_1_3',
  'SMA_SMK_4_6',
  'ATS_9_18TH',
];

// Semua porsi besar (gabungan dua bucket di atas)
const KATEGORI_PORSI_BESAR = [
  ...KATEGORI_PORSI_BESAR_SD46,
  ...KATEGORI_PORSI_BESAR_SMK,
  'PENDIDIK',
  'TENAGA_KEPENDIDIKAN',
  'KADER_POSYANDU',
];

// PIC sekolah (pendidik & tenaga kependidikan)
const KATEGORI_PIC_SEKOLAH = [
  'PENDIDIK',
  'TENAGA_KEPENDIDIKAN',
];

// PIC posyandu (kader)
const KATEGORI_PIC_KADER = [
  'KADER_POSYANDU',
];

// ── Helper functions ─────────────────────────────────────────────────────────

/**
 * Apakah kode termasuk kelompok PESERTA_DIDIK?
 * @param {string} kode
 * @returns {boolean}
 */
function isPesertaDidik(kode) {
  return KATEGORI_PESERTA_DIDIK.includes(kode);
}

/**
 * Apakah kode termasuk kelompok NON_PESERTA_DIDIK?
 * @param {string} kode
 * @returns {boolean}
 */
function isNonPesertaDidik(kode) {
  return KATEGORI_NON_PESERTA_DIDIK.includes(kode);
}

/**
 * Kembalikan label porsi untuk kode kategori tertentu.
 * Dipakai di laporan harian sekolah untuk tentukan bucket.
 *
 * Return values:
 *   'kecil'    → PAUD_TK, SD_1_3, ATS_KURANG_9TH
 *   'besar46'  → SD_4_6
 *   'besarSmk' → SMP_1_3, SMA_SMK_4_6, ATS_9_18TH
 *   'pic'      → PENDIDIK, TENAGA_KEPENDIDIKAN
 *   null       → kode tidak dikenal / tidak ada bucket
 *
 * @param {string} kode
 * @returns {'kecil'|'besar46'|'besarSmk'|'pic'|null}
 */
function getPorsi(kode) {
  if (KATEGORI_PORSI_KECIL.includes(kode)) return 'kecil';
  if (KATEGORI_PORSI_BESAR_SD46.includes(kode)) return 'besar46';
  if (KATEGORI_PORSI_BESAR_SMK.includes(kode)) return 'besarSmk';
  if (KATEGORI_PIC_SEKOLAH.includes(kode)) return 'pic';
  return null;
}

// ── Mapping kode → field row rekap bulanan ────────────────────────────────────

/**
 * Mapping kode kategori → nama field pada row rekap bulanan (mapTanggal).
 * Dipakai untuk menggantikan 13 branch if/else-if di loop rekap bulanan.
 *
 * @type {Record<string, string>}
 */
const KODE_TO_ROW_FIELD = {
  PAUD_TK:            'paudTk',
  SD_1_3:             'sd1_3',
  SD_4_6:             'sd4_6',
  SMP_1_3:            'smp',
  SMA_SMK_4_6:        'sma',
  ATS_KURANG_9TH:     'ats9',
  ATS_9_18TH:         'ats9_18',
  PENDIDIK:           'pendidik',
  TENAGA_KEPENDIDIKAN:'tendik',
  BUMIL:              'bumil',
  BUSUI:              'busui',
  BALITA:             'balita',
  KADER_POSYANDU:     'kader',
};

module.exports = {
  // Array konstanta
  KATEGORI_PESERTA_DIDIK,
  KATEGORI_NON_PESERTA_DIDIK,
  KATEGORI_PORSI_KECIL,
  KATEGORI_PORSI_BESAR_SD46,
  KATEGORI_PORSI_BESAR_SMK,
  KATEGORI_PORSI_BESAR,
  KATEGORI_PIC_SEKOLAH,
  KATEGORI_PIC_KADER,
  // Helper functions
  isPesertaDidik,
  isNonPesertaDidik,
  getPorsi,
  // Mapping objek
  KODE_TO_ROW_FIELD,
};
