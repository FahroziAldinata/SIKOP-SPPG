const { z } = require("zod");

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

const idParamSchema = z.string().min(1, "ID tidak boleh kosong");

const paginationSchema = z.object({
  page: z.coerce.number().int().positive("page harus berupa angka positif").optional(),
  limit: z.coerce.number().int().positive("limit harus berupa angka positif").max(100, "limit maksimal 100").optional()
});

const periodeIdTanggalQuery = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().regex(dateStringRegex, "Format tanggal tidak valid (YYYY-MM-DD)").optional()
});

const rabItemSchema = z.object({
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  hargaSatuan: z.number().min(0, "hargaSatuan harus berupa angka non-negatif")
});

const rabSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  items: z.array(rabItemSchema).optional()
});

const poItemSchema = z.object({
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  qtyTotal: z.number().positive("qtyTotal harus berupa angka positif"),
  hargaSatuan: z.number().min(0, "hargaSatuan harus berupa angka non-negatif")
});

const poSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  supplierId: z.string().min(1, "supplierId wajib diisi"),
  items: z.array(poItemSchema).min(1, "items PO tidak boleh kosong"),
  catatan: z.string().optional().nullable()
});

const transaksiPembelianSchema = z.object({
  poId: z.string().min(1, "poId wajib diisi"),
  kuantitas: z.number().positive("kuantitas harus berupa angka positif"),
  harga: z.number().min(0, "harga harus berupa angka non-negatif"),
  bukti: z.string().optional().nullable()
});

const jurnalSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  uraian: z.string().min(1, "uraian wajib diisi"),
  jenis: z.enum(["MASUK", "KELUAR"], { errorMap: () => ({ message: "jenis transaksi tidak valid (MASUK atau KELUAR)" }) }),
  nominal: z.number().positive("nominal harus berupa angka positif"),
  akunDanaBiayaId: z.string().min(1, "akunDanaBiayaId wajib diisi"),
  akunKasId: z.string().min(1, "akunKasId wajib diisi"),
  tagPengeluaran: z.string().optional().nullable(),
  transaksiPembelianId: z.string().optional().nullable()
});

const pajakSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  nominal: z.number().positive("nominal harus berupa angka positif"),
  keterangan: z.string().optional().nullable()
});

const laporanQuerySchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi").optional(),
  tanggal: z.string().regex(dateStringRegex, "Format tanggal tidak valid (YYYY-MM-DD)").optional(),
  jenisDokumen: z.enum(["LPA", "SPTJ", "BAPSD"], { errorMap: () => ({ message: "jenisDokumen tidak valid (LPA, SPTJ, atau BAPSD)" }) }).optional(),
  page: z.coerce.number().int().positive("page harus berupa angka positif").optional(),
  limit: z.coerce.number().int().positive("limit harus berupa angka positif").max(100, "limit maksimal 100").optional()
});

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "DIAJUKAN", "DISETUJUI", "DIREALISASI", "DITOLAK"], {
    errorMap: () => ({ message: "status tidak valid" })
  })
});

const anggaranHarianSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  kategoriDana: z.string().min(1, "kategoriDana wajib diisi"),
  totalAnggaran: z.number().min(0, "totalAnggaran harus berupa angka non-negatif"),
  keterangan: z.string().optional().nullable()
});

const dokumenResmiSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  jenisDokumen: z.enum(["LPA", "SPTJ", "BAPSD"], {
    errorMap: () => ({ message: "jenisDokumen tidak valid (LPA, SPTJ, atau BAPSD)" })
  }),
  nomorDokumen: z.string().optional().nullable()
});

const saldoAwalBarangSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  saldoAwalQty: z.number().min(0, "saldoAwalQty harus berupa angka non-negatif"),
  hargaBeliAwal: z.number().min(0, "hargaBeliAwal harus berupa angka non-negatif")
});

const mutasiStokSchema = z.object({
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi"),
  jenis: z.enum(["MASUK", "KELUAR"], { errorMap: () => ({ message: "jenis harus MASUK atau KELUAR" }) }),
  qty: z.number().positive("qty harus berupa angka positif"),
  keterangan: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  hargaBeli: z.number().min(0, "hargaBeli harus berupa angka non-negatif").optional().nullable(),
  kelompokPenerima: z.string().optional().nullable()
});

const bulkGenerateItemSchema = z.object({
  id: z.string().min(1, "id item wajib diisi"),
  hargaSatuanRealisasi: z.number().min(0, "hargaSatuanRealisasi harus berupa angka non-negatif")
});

const bulkGenerateRowSchema = z.object({
  transaksiPembelianId: z.string().min(1, "transaksiPembelianId wajib diisi"),
  items: z.array(bulkGenerateItemSchema).min(1, "items tidak boleh kosong")
});

const bulkGenerateSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  rows: z.array(bulkGenerateRowSchema).min(1, "rows tidak boleh kosong")
});

const rabHarianItemsSchema = z.object({
  items: z.array(rabItemSchema).min(1, "items tidak boleh kosong")
});

const rabHarianUpdateSchema = z.object({
  status: z.enum(["DRAFT", "DIAJUKAN"], {
    errorMap: () => ({ message: "status hanya bisa DRAFT atau DIAJUKAN" })
  }).optional(),
  tanggal: z.string().optional()
});

module.exports = {
  idParamSchema,
  paginationSchema,
  periodeIdTanggalQuery,
  rabSchema,
  rabItemSchema,
  rabHarianItemsSchema,
  rabHarianUpdateSchema,
  poSchema,
  poItemSchema,
  transaksiPembelianSchema,
  jurnalSchema,
  bulkGenerateSchema,
  pajakSchema,
  laporanQuerySchema,
  updateStatusSchema,
  anggaranHarianSchema,
  dokumenResmiSchema,
  saldoAwalBarangSchema,
  mutasiStokSchema
};
