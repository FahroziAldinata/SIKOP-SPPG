const { z } = require("zod");

const KOMPONEN = ["KARBOHIDRAT", "LAUK_HEWANI", "LAUK_NABATI", "SAYUR", "BUAH"];
const JALUR = ["SISWA", "TIGA_B"];
const HARI = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

const idParamSchema = z.string().min(1, "ID tidak boleh kosong");

const querySchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib disertakan").optional(),
  blokId: z.string().min(1, "blokId query parameter wajib dikirimkan").optional(),
  menuHarianId: z.string().optional(),
  jalur: z.string().optional(),
  hari: z.string().optional(),
  mingguKe: z.string().optional()
});

const byHariQuerySchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  jalur: z.enum(JALUR, { errorMap: () => ({ message: "jalur tidak valid (harus SISWA atau TIGA_B)" }) }),
  hari: z.enum(HARI, { errorMap: () => ({ message: "hari tidak valid (harus SENIN s/d SABTU)" }) }),
  mingguKe: z.coerce.number().int().refine(v => [1, 2].includes(v), { message: "mingguKe tidak valid (harus 1 atau 2)" }).optional()
});

const menuHarianSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi").refine(val => !isNaN(new Date(val).getTime()), {
    message: "Format tanggal tidak valid"
  }),
  blok: z.array(
    z.object({
      kelompokUmurMenuId: z.string().min(1, "kelompokUmurMenuId wajib diisi pada setiap blok")
    })
  ).optional()
});

const menuHarianUpdateSchema = z.object({
  tanggal: z.string().refine(val => !isNaN(new Date(val).getTime()), {
    message: "Format tanggal tidak valid"
  }).optional(),
  status: z.enum(["DRAFT", "DIAJUKAN"], {
    errorMap: () => ({ message: "Ahli Gizi hanya dapat mengubah status menjadi DRAFT atau DIAJUKAN" })
  }).optional()
}).refine(data => data.tanggal || data.status, {
  message: "tanggal atau status wajib diisi untuk melakukan perubahan"
});

const menuHarianBlokSchema = z.object({
  menuHarianId: z.string().min(1, "menuHarianId wajib diisi"),
  kelompokUmurMenuId: z.string().min(1, "kelompokUmurMenuId wajib diisi")
});

const menuItemSchema = z.object({
  blokId: z.string().min(1, "blokId wajib diisi"),
  namaMenu: z.string().min(1, "namaMenu wajib diisi"),
  komponen: z.enum(KOMPONEN, {
    errorMap: () => ({ message: `komponen harus berupa salah satu dari: ${KOMPONEN.join(", ")}` })
  }).optional()
});

const menuItemUpdateSchema = z.object({
  namaMenu: z.string().optional(),
  komponen: z.enum(KOMPONEN, {
    errorMap: () => ({ message: `komponen harus berupa salah satu dari: ${KOMPONEN.join(", ")}` })
  }).optional()
});

const menuItemBahanSchema = z.object({
  menuItemId: z.string().min(1, "menuItemId wajib diisi"),
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  beratBersihGr: z.coerce.number().min(0, "beratBersihGr harus berupa angka non-negatif"),
  bddPersen: z.coerce.number().min(1, "bddPersen harus bernilai antara 1 dan 100").max(100, "bddPersen harus bernilai antara 1 dan 100"),
  beratSatuanGr: z.coerce.number().positive("beratSatuanGr harus bernilai positif lebih besar dari 0"),
  energiKkal: z.coerce.number().min(0, "energiKkal harus berupa angka non-negatif"),
  proteinGr: z.coerce.number().min(0, "proteinGr harus berupa angka non-negatif"),
  lemakGr: z.coerce.number().min(0, "lemakGr harus berupa angka non-negatif"),
  karbohidratGr: z.coerce.number().min(0, "karbohidratGr harus berupa angka non-negatif"),
  seratGr: z.coerce.number().min(0, "seratGr harus berupa angka non-negatif"),
  beratURT: z.string().optional().nullable(),
  jumlahHitungan: z.preprocess(
    (v) => (v === "" || v === null ? null : v),
    z.coerce.number().min(0, "jumlahHitungan harus berupa angka non-negatif jika diisi").nullable().optional()
  )
});

const targetGiziSchema = z.object({
  blokId: z.string().min(1, "blokId wajib diisi"),
  targetEnergi: z.coerce.number().min(0, "targetEnergi harus berupa angka non-negatif"),
  targetProtein: z.coerce.number().min(0, "targetProtein harus berupa angka non-negatif"),
  targetLemak: z.coerce.number().min(0, "targetLemak harus berupa angka non-negatif"),
  targetKarbohidrat: z.coerce.number().min(0, "targetKarbohidrat harus berupa angka non-negatif"),
  targetSerat: z.coerce.number().min(0, "targetSerat harus berupa angka non-negatif")
});

const masterTargetGiziSchema = z.object({
  energiKkal: z.coerce.number().min(0, "energiKkal harus berupa angka non-negatif").optional(),
  proteinGr: z.coerce.number().min(0, "proteinGr harus berupa angka non-negatif").optional(),
  lemakGr: z.coerce.number().min(0, "lemakGr harus berupa angka non-negatif").optional(),
  karbohidratGr: z.coerce.number().min(0, "karbohidratGr harus berupa angka non-negatif").optional(),
  seratGr: z.coerce.number().min(0, "seratGr harus berupa angka non-negatif").optional()
});

const menuSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  jalur: z.enum(JALUR, { errorMap: () => ({ message: "jalur tidak valid (harus SISWA atau TIGA_B)" }) }),
  hari: z.enum(HARI, { errorMap: () => ({ message: "hari tidak valid (harus SENIN s/d SABTU)" }) }),
  mingguKe: z.coerce.number().int().refine(v => [1, 2].includes(v), { message: "mingguKe tidak valid (harus 1 atau 2)" }).default(1),
  catatan: z.string().optional().nullable(),
  menuKarbohidrat: z.string().optional().default(""),
  menuLaukHewani: z.string().optional().default(""),
  menuLaukNabati: z.string().optional().default(""),
  menuSayur: z.string().optional().default(""),
  menuBuah: z.string().optional().default("")
});

const masterMenuUpdateSchema = z.object({
  mingguKe: z.coerce.number().int().refine(v => [1, 2].includes(v), { message: "mingguKe tidak valid (harus 1 atau 2)" }).optional(),
  catatan: z.string().optional().nullable(),
  menuKarbohidrat: z.string().optional(),
  menuLaukHewani: z.string().optional(),
  menuLaukNabati: z.string().optional(),
  menuSayur: z.string().optional(),
  menuBuah: z.string().optional()
});

const organoleptikSchema = z.object({
  blokId: z.string().min(1, "blokId wajib diisi"),
  rasa: z.string().min(1, "rasa wajib diisi"),
  aroma: z.string().min(1, "aroma wajib diisi"),
  tekstur: z.string().min(1, "tekstur wajib diisi"),
  suhuSaji: z.string().min(1, "suhuSaji wajib diisi"),
  catatan: z.string().optional().nullable(),
  ujiPadaTanggal: z.string().refine(val => !isNaN(new Date(val).getTime()), {
    message: "Format ujiPadaTanggal tidak valid"
  }).optional(),
  jumlahOmpreng: z.coerce.number().int().positive("jumlahOmpreng harus berupa bilangan bulat positif").default(1)
});

const organoleptikUpdateSchema = z.object({
  rasa: z.string().optional(),
  aroma: z.string().optional(),
  tekstur: z.string().optional(),
  suhuSaji: z.string().optional(),
  catatan: z.string().optional().nullable(),
  ujiPadaTanggal: z.string().refine(val => !isNaN(new Date(val).getTime()), {
    message: "Format ujiPadaTanggal tidak valid"
  }).optional(),
  jumlahOmpreng: z.coerce.number().int().positive("jumlahOmpreng harus berupa bilangan bulat positif").optional()
});

const alergiSchema = z.object({
  blokId: z.string().min(1, "blokId wajib diisi"),
  jenisAlergi: z.string().min(1, "jenisAlergi wajib diisi"),
  jumlahSiswa: z.coerce.number().int().min(0, "jumlahSiswa harus berupa bilangan bulat non-negatif"),
  bahanPengganti: z.string().optional().nullable()
});

const alergiUpdateSchema = z.object({
  jenisAlergi: z.string().optional(),
  jumlahSiswa: z.coerce.number().int().min(0, "jumlahSiswa harus berupa bilangan bulat non-negatif").optional(),
  bahanPengganti: z.string().optional().nullable()
});

const pengirimanSchema = z.object({
  menuHarianId: z.string().min(1, "menuHarianId wajib diisi"),
  kategoriIds: z.array(z.string().min(1)).min(1, "kategoriIds wajib berupa array dan minimal memiliki 1 item"),
  kendaraanId: z.string().min(1, "kendaraanId wajib diisi"),
  catatan: z.string().optional().nullable()
});

const pengirimanUpdateSchema = z.object({
  menuHarianId: z.string().optional(),
  kategoriIds: z.array(z.string().min(1)).min(1, "kategoriIds wajib berupa array dan minimal memiliki 1 item").optional(),
  kendaraanId: z.string().optional(),
  catatan: z.string().optional().nullable()
});

const targetGiziUpdateSchema = z.object({
  targetEnergi: z.coerce.number().min(0, "targetEnergi harus berupa angka non-negatif").optional(),
  targetProtein: z.coerce.number().min(0, "targetProtein harus berupa angka non-negatif").optional(),
  targetLemak: z.coerce.number().min(0, "targetLemak harus berupa angka non-negatif").optional(),
  targetKarbohidrat: z.coerce.number().min(0, "targetKarbohidrat harus berupa angka non-negatif").optional(),
  targetSerat: z.coerce.number().min(0, "targetSerat harus berupa angka non-negatif").optional()
});

const menuItemBahanUpdateSchema = z.object({
  beratBersihGr: z.coerce.number().min(0, "beratBersihGr harus berupa angka non-negatif").optional(),
  beratURT: z.string().optional().nullable(),
  energiKkal: z.coerce.number().min(0, "energiKkal harus berupa angka non-negatif").optional(),
  proteinGr: z.coerce.number().min(0, "proteinGr harus berupa angka non-negatif").optional(),
  lemakGr: z.coerce.number().min(0, "lemakGr harus berupa angka non-negatif").optional(),
  karbohidratGr: z.coerce.number().min(0, "karbohidratGr harus berupa angka non-negatif").optional(),
  seratGr: z.coerce.number().min(0, "seratGr harus berupa angka non-negatif").optional(),
  bddPersen: z.coerce.number().min(1, "bddPersen harus bernilai antara 1 dan 100").max(100, "bddPersen harus bernilai antara 1 dan 100").optional(),
  beratSatuanGr: z.coerce.number().positive("beratSatuanGr harus bernilai positif lebih besar dari 0").optional(),
  jumlahHitungan: z.preprocess(
    (v) => (v === "" || v === null ? null : v),
    z.coerce.number().min(0, "jumlahHitungan harus berupa angka non-negatif jika diisi").nullable().optional()
  )
});

const laporanPemenuhanGiziQuerySchema = z.object({
  tanggalMulai: z.string().optional().refine(val => !val || !isNaN(new Date(val).getTime()), {
    message: "Format tanggalMulai tidak valid"
  }),
  tanggalSelesai: z.string().optional().refine(val => !val || !isNaN(new Date(val).getTime()), {
    message: "Format tanggalSelesai tidak valid"
  }),
  tanggal: z.union([z.string(), z.array(z.string())]).optional(),
  blokKode: z.string().optional()
});

const laporanRekapMenuQuerySchema = laporanPemenuhanGiziQuerySchema;
const laporanOrganoleptikQuerySchema = laporanPemenuhanGiziQuerySchema;

module.exports = {
  idParamSchema,
  querySchema,
  byHariQuerySchema,
  menuSchema,
  menuHarianSchema,
  menuHarianUpdateSchema,
  menuHarianBlokSchema,
  menuItemSchema,
  menuItemUpdateSchema,
  menuItemBahanSchema,
  targetGiziSchema,
  masterTargetGiziSchema,
  masterMenuUpdateSchema,
  organoleptikSchema,
  organoleptikUpdateSchema,
  targetGiziUpdateSchema,
  menuItemBahanUpdateSchema,
  alergiSchema,
  alergiUpdateSchema,
  pengirimanSchema,
  pengirimanUpdateSchema,
  laporanPemenuhanGiziQuerySchema,
  laporanRekapMenuQuerySchema,
  laporanOrganoleptikQuerySchema
};


