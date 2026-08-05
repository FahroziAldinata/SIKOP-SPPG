const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { KATEGORI_PESERTA_DIDIK, KATEGORI_NON_PESERTA_DIDIK } = require("../../constants/kategori");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/aslap/laporan/aggregate?periodeId=X
router.get(["/laporan/aggregate", "/api/aslap/laporan/aggregate"], requireAuth, requirePermission("aslap-laporan", "READ"), validate(schemas.laporanPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    // Get all detail records for the periode with kategori relation
    const details = await prisma.inputPenerimaManfaatDetail.findMany({
      where: {
        inputPenerimaManfaat: { periodeId }
      },
      include: {
        kategori: true,
        sekolah: { select: { id: true, nama: true } },
        posyandu: { select: { id: true, nama: true } }
      }
    });

    // Group by (sekolahId OR posyanduId) + kategoriKode
    const groups = {};
    for (const d of details) {
      const groupKey = d.sekolahId || d.posyanduId || "UNKNOWN";
      const katKode = d.kategori.kode;
      const compositeKey = `${groupKey}::${katKode}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          sekolahId: d.sekolahId || null,
          posyanduId: d.posyanduId || null,
          nama: d.sekolah?.nama || d.posyandu?.nama || "Unknown",
          kategoriKode: katKode,
          kategoriNama: d.kategori.nama,
          totalL: 0,
          totalP: 0,
          total: 0
        };
      }
      groups[compositeKey].totalL += d.lakiLaki;
      groups[compositeKey].totalP += d.perempuan;
      groups[compositeKey].total += d.lakiLaki + d.perempuan;
    }

    const formatted = Object.values(groups);

    // Pisah Section A (PESERTA_DIDIK) & Section B (NON_PESERTA_DIDIK)
    const sectionA = formatted.filter(item => KATEGORI_PESERTA_DIDIK.includes(item.kategoriKode));
    const sectionB = formatted.filter(item => KATEGORI_NON_PESERTA_DIDIK.includes(item.kategoriKode));

    // Sort
    sectionA.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
    sectionB.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

    const grandTotal = sectionA.reduce((s, i) => s + i.total, 0) + sectionB.reduce((s, i) => s + i.total, 0);

    res.json({
      sectionA,
      sectionB,
      total: grandTotal
    });
  } catch (error) {
    logger.error("Aggregate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
