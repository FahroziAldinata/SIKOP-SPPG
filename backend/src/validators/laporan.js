const { z } = require("zod");

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

const laporanBkuSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().regex(dateStringRegex, "Format tanggal tidak valid (YYYY-MM-DD)").optional()
});

const laporanArusKasSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

const laporanNeracaSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

const laporanStokSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().regex(dateStringRegex, "Format tanggal tidak valid (YYYY-MM-DD)").optional(),
  bahanPokokId: z.string().optional()
});

const laporanAnggaranSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  tahun: z.coerce.number().int().min(2000).optional()
});

const laporanRekapSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

const laporanParamsSchema = z.object({
  id: z.string().min(1, "id wajib diisi")
});

const laporanBpSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  akunId: z.string().min(1, "akunId wajib diisi")
});

const laporanLpaSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  nomorDokumen: z.string().optional(),
  isLr: z.string().optional()
});

const laporanBapsdSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  nomorDokumen: z.string().min(1, "nomorDokumen wajib diisi")
});

const laporanKebutuhanBelanjaSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggalMulai: z.string().min(1, "tanggalMulai wajib diisi"),
  tanggalSelesai: z.string().min(1, "tanggalSelesai wajib diisi")
});

const laporanHarianSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  tanggal: z.string().min(1, "tanggal wajib diisi")
});

const laporanMultiPeriodeSchema = z.object({
  periodeIds: z.string().min(1, "periodeIds wajib diisi")
});

const laporanBttSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi"),
  kategori: z.enum(["operasional", "sewa"], {
    errorMap: () => ({ message: "kategori harus 'operasional' atau 'sewa'" })
  })
});

const laporanLbbpSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

const laporanBkkSchema = z.object({
  periodeId: z.string().min(1, "periodeId wajib diisi")
});

module.exports = {
  laporanBkuSchema,
  laporanArusKasSchema,
  laporanNeracaSchema,
  laporanStokSchema,
  laporanAnggaranSchema,
  laporanRekapSchema,
  laporanParamsSchema,
  laporanBpSchema,
  laporanLpaSchema,
  laporanBapsdSchema,
  laporanKebutuhanBelanjaSchema,
  laporanHarianSchema,
  laporanMultiPeriodeSchema,
  laporanBttSchema,
  laporanLbbpSchema,
  laporanBkkSchema
};
