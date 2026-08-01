const { z } = require("zod");

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

const idParamSchema = z.object({
  id: z.string().min(1, "ID tidak boleh kosong")
});

const poItemSchema = z.object({
  itemId: z.string().min(1, "itemId wajib ada di setiap item realisasi").optional(),
  bahanPokokId: z.string().optional(),
  qtyTotal: z.number().positive("qtyTotal harus berupa angka positif").optional(),
  qtyRealisasi: z.coerce.number().min(0, "qtyRealisasi tidak valid").optional(),
  hargaSatuanRealisasi: z.coerce.number().min(0, "hargaSatuanRealisasi tidak valid").optional(),
  hargaSatuan: z.number().min(0).optional()
});

const poSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi").optional(),
  tanggal: z.string().optional(),
  supplierId: z.string().optional(),
  items: z.array(poItemSchema).optional(),
  catatan: z.string().optional().nullable()
});

const realisasiPoSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1, "itemId wajib ada di setiap item realisasi"),
      qtyRealisasi: z.coerce.number().min(0, "qtyRealisasi tidak valid"),
      hargaSatuanRealisasi: z.coerce.number().min(0, "hargaSatuanRealisasi tidak valid")
    })
  ).min(1, "items realisasi tidak boleh kosong")
});

const penerimaanItemSchema = z.object({
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  qtyDiterima: z.number().min(0, "qtyDiterima harus berupa angka non-negatif"),
  hargaSatuan: z.number().min(0).optional(),
  catatan: z.string().optional().nullable()
});

const penerimaanSchema = z.object({
  poId: z.string().min(1, "poId wajib diisi").optional(),
  supplierId: z.string().optional(),
  tanggal: z.string().optional(),
  items: z.array(penerimaanItemSchema).optional(),
  catatan: z.string().optional().nullable()
});

const pengirimanSchema = z.object({
  kendaraanId: z.string().optional(),
  tanggal: z.string().optional(),
  tujuan: z.string().optional(),
  status: z.string().optional(),
  catatan: z.string().optional().nullable()
});

const laporanSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi").optional(),
  tanggal: z.string().regex(dateStringRegex, "Format tanggal tidak valid (YYYY-MM-DD)").optional(),
  tanggalMulai: z.string().optional(),
  tanggalSelesai: z.string().optional(),
  jenis: z.string().optional()
});

const bahanPokokSchema = z.object({
  konversiPerKg: z.union([z.number(), z.string(), z.null()]).optional(),
  satuanHitungan: z.string().optional().nullable()
});

const kendaraanSchema = z.object({
  namaKendaraan: z.string().min(1, "namaKendaraan wajib diisi"),
  platNomor: z.string().optional().nullable(),
  aktif: z.boolean().optional()
});

const updateKendaraanSchema = z.object({
  namaKendaraan: z.string().optional(),
  platNomor: z.string().optional().nullable(),
  aktif: z.boolean().optional()
});

const hargaBahanSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  bahanPokokId: z.string().min(1, "bahanPokokId wajib diisi"),
  harga: z.coerce.number().min(0, "harga harus berupa angka non-negatif"),
  isFallback: z.boolean().optional()
});

const updateHargaBahanSchema = z.object({
  periodeId: z.string().optional(),
  bahanPokokId: z.string().optional(),
  harga: z.coerce.number().min(0, "harga harus berupa angka non-negatif").optional(),
  isFallback: z.boolean().optional()
});

const realisasiPoQuerySchema = z.object({
  periodeId: z.string({ required_error: "periodeId wajib diisi" }).min(1, "periodeId wajib diisi")
});

module.exports = {
  idParamSchema,
  poItemSchema,
  poSchema,
  realisasiPoSchema,
  penerimaanItemSchema,
  penerimaanSchema,
  pengirimanSchema,
  laporanSchema,
  realisasiPoQuerySchema,
  bahanPokokSchema,
  kendaraanSchema,
  updateKendaraanSchema,
  hargaBahanSchema,
  updateHargaBahanSchema
};

