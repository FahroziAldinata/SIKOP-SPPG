const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanAnggaranSchema } = require("../../validators/laporan");

const router = express.Router();

// GET /api/laporan/ringkasan-anggaran?periodeId=X
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const KATEGORI = [
      { key: "BAHAN_MAKANAN",      label: "BAHAN MAKANAN" },
      { key: "OPERASIONAL",        label: "OPERASIONAL" },
      { key: "INSENTIF_FASILITAS", label: "INSENTIF FASILITAS (SEWA)" }
    ];

    const [aggBahan, aggOps, aggInsentif] = await Promise.all(
      KATEGORI.map(k =>
        prisma.anggaranHarian.aggregate({
          where: { periodeId, kategoriDana: k.key },
          _sum: { rab: true, aktual: true, selisih: true },
          _count: { id: true }
        })
      )
    );

    const aggs = [aggBahan, aggOps, aggInsentif];
    const data = KATEGORI.map((k, i) => ({
      kategoriDana:      k.key,
      label:             k.label,
      totalRAB:          parseFloat(aggs[i]._sum.rab     || 0),
      totalAktual:       parseFloat(aggs[i]._sum.aktual  || 0),
      totalSelisih:      parseFloat(aggs[i]._sum.selisih || 0),
      jumlahTransaksi:   aggs[i]._count.id
    }));

    const totalRAB     = data.reduce((s, d) => s + d.totalRAB,     0);
    const totalAktual  = data.reduce((s, d) => s + d.totalAktual,  0);
    const totalSelisih = data.reduce((s, d) => s + d.totalSelisih, 0);

    res.json({
      success: true,
      data,
      total: {
        totalRAB,
        totalAktual,
        totalSelisih,
        surplusUtang: totalSelisih
      },
      periode: {
        id:    periode.id,
        label: `${new Date(periode.tanggalMulai).getFullYear()}/${periode.tanggalMulai} - ${periode.tanggalSelesai}`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses ringkasan anggaran" });
  }
});

module.exports = router;
