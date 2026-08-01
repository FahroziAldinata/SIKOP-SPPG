const { z } = require("zod");

// idParamSchema - param :id validation
const idParamSchema = z.object({
  id: z.string().min(1, "ID tidak boleh kosong")
});

// laporanHarianSchema — query params (periodeId, tanggal, grup)
const laporanHarianSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().optional(),
  grup: z.string().optional()
});

// laporanPeriodeSchema — query params (periodeId)
const laporanPeriodeSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

// laporanBulananSchema — query params (bulan, tahun, periodeId)
const laporanBulananSchema = z.object({
  bulan: z.coerce.number().int().min(1, "Bulan (1-12) dan tahun wajib diisi dengan benar").max(12, "Bulan (1-12) dan tahun wajib diisi dengan benar"),
  tahun: z.coerce.number().int().min(1900, "Bulan (1-12) dan tahun wajib diisi dengan benar"),
  periodeId: z.string().optional()
});

// laporanPerKelasSchema — query params (periodeId, sekolahId)
const laporanPerKelasSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  sekolahId: z.string().optional()
});

// Sekolah Schemas
const sekolahSchema = z.object({
  nama: z.string().min(1, "Nama sekolah wajib diisi.").transform((v) => v.trim()),
  jenjang: z.enum(["TK", "SD", "SMP", "SMA_SMK"], {
    errorMap: () => ({ message: "Jenjang tidak valid. Pilihan: TK, SD, SMP, SMA_SMK." })
  }),
  npsn: z.union([z.string(), z.number()]).optional().nullable().transform((v) => (v ? String(v) : null)).refine((v) => !v || /^\d{8}$/.test(v), {
    message: "NPSN harus 8 digit angka."
  }),
  alamat: z.string().optional().nullable()
});

const sekolahUpdateSchema = z.object({
  nama: z.string().min(1, "Nama sekolah tidak boleh kosong").transform((v) => v.trim()).optional(),
  jenjang: z.enum(["TK", "SD", "SMP", "SMA_SMK"], {
    errorMap: () => ({ message: "Jenjang tidak valid. Pilihan: TK, SD, SMP, SMA_SMK." })
  }).optional(),
  npsn: z.union([z.string(), z.number()]).optional().nullable().transform((v) => (v ? String(v) : null)).refine((v) => !v || /^\d{8}$/.test(v), {
    message: "NPSN harus 8 digit angka."
  }),
  alamat: z.string().optional().nullable()
});

// GrupHari Schemas
const grupHariSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  label: z.string().min(1, "label wajib diisi").transform((v) => v.trim()),
  hariAktif: z.array(
    z.enum(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"], {
      errorMap: (issue) => ({ message: `Hari '${issue.received}' tidak valid. Harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU` })
    })
  ).min(1, "hariAktif wajib diisi dengan array hari yang tidak kosong")
});

const grupHariUpdateSchema = z.object({
  label: z.string().min(1, "label tidak boleh kosong").transform((v) => v.trim()).optional(),
  hariAktif: z.array(
    z.enum(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"], {
      errorMap: (issue) => ({ message: `Hari '${issue.received}' tidak valid. Harus salah satu dari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU` })
    })
  ).min(1, "hariAktif wajib diisi dengan array hari yang tidak kosong").optional()
});

// penerimaManfaatDetailSchema — POST body (penerimaManfaatId, kelasId, jumlah) & item detail
const penerimaManfaatDetailItemSchema = z.object({
  kategoriId: z.string().min(1, "kategoriId wajib diisi"),
  sekolahId: z.string().optional().nullable(),
  sekolahNama: z.string().optional().nullable(),
  posyanduId: z.string().optional().nullable(),
  posyanduNama: z.string().optional().nullable(),
  lakiLaki: z.coerce.number().min(0, "Jumlah laki-laki harus berupa angka non-negatif"),
  perempuan: z.coerce.number().min(0, "Jumlah perempuan harus berupa angka non-negatif"),
  sekolahJenjang: z.string().optional().nullable(),
  jenjang: z.string().optional().nullable(),
  npsn: z.union([z.string(), z.number()]).optional().nullable(),
  alamat: z.string().optional().nullable()
});

const penerimaManfaatDetailSchema = z.object({
  penerimaManfaatId: z.string().optional(),
  kelasId: z.string().optional(),
  jumlah: z.coerce.number().optional(),
  kategoriId: z.string().optional(),
  sekolahId: z.string().optional().nullable(),
  posyanduId: z.string().optional().nullable(),
  lakiLaki: z.coerce.number().optional(),
  perempuan: z.coerce.number().optional()
});

// penerimaManfaatSchema — POST body (periodeId, kategoriId, data array) or (periodeId, grupHariId, hariAktif, detail)
const penerimaManfaatSchema = z.object({
  periodeId: z.string().optional().nullable(),
  grupHariId: z.string().optional().nullable(),
  hariAktif: z.array(z.string()).optional(),
  kategoriId: z.string().optional(),
  data: z.array(z.any()).optional(),
  detail: z.array(penerimaManfaatDetailItemSchema).min(1, "detail penerima manfaat wajib diisi dengan array yang tidak kosong").optional()
}).refine(
  (d) => d.grupHariId || d.periodeId || (d.detail && d.detail.length > 0) || (d.data && d.data.length > 0),
  { message: "grupHariId atau periodeId wajib diisi" }
);

const penerimaManfaatUpdateSchema = z.object({
  grupHariId: z.string().optional().nullable(),
  hariAktif: z.array(z.string()).optional(),
  detail: z.array(penerimaManfaatDetailItemSchema).optional()
});

// grupKelasSchema — POST/PUT (sekolah-kelas-detail)
const grupKelasSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  sekolahId: z.string().optional().nullable(),
  sekolahNama: z.string().optional().nullable(),
  namaKelas: z.string().min(1, "namaKelas wajib diisi").transform((v) => v.trim()),
  jumlah: z.coerce.number().min(0, "jumlah harus berupa angka non-negatif")
}).refine((d) => d.sekolahId || (d.sekolahNama && d.sekolahNama.trim()), {
  message: "sekolahId atau sekolahNama wajib diisi"
});

const grupKelasUpdateSchema = z.object({
  periodeId: z.string().optional(),
  sekolahId: z.string().optional().nullable(),
  sekolahNama: z.string().optional().nullable(),
  namaKelas: z.string().min(1, "namaKelas tidak boleh kosong").transform((v) => v.trim()).optional(),
  jumlah: z.coerce.number().min(0, "jumlah harus berupa angka non-negatif").optional()
});

// mappingSchema — POST/PUT
const mappingSchema = z.object({
  periodeId: z.string().optional(),
  sekolahId: z.string().optional(),
  grupHariId: z.string().optional(),
  kategoriId: z.string().optional(),
  data: z.array(z.any()).optional()
});

// poApproveSchema — PUT /api/aslap/po/:id/approve
const poApproveItemSchema = z.object({
  itemId: z.string().min(1, "itemId wajib diisi"),
  qtyDiterima: z.coerce.number().min(0, "qtyDiterima harus berupa angka non-negatif")
});

const poApproveSchema = z.object({
  items: z.array(poApproveItemSchema).optional()
});

module.exports = {
  idParamSchema,
  laporanHarianSchema,
  laporanPeriodeSchema,
  laporanBulananSchema,
  laporanPerKelasSchema,
  sekolahSchema,
  sekolahUpdateSchema,
  grupHariSchema,
  grupHariUpdateSchema,
  penerimaManfaatSchema,
  penerimaManfaatDetailSchema,
  penerimaManfaatUpdateSchema,
  grupKelasSchema,
  grupKelasUpdateSchema,
  mappingSchema,
  poApproveSchema
};

