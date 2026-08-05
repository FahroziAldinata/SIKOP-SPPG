const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/gizi/kelompok-umur-menu - List all KelompokUmurMenu (dropdown untuk MenuHarianBlok)
router.get("/kelompok-umur-menu", requireAuth, requirePermission("gizi-master", "READ"), async (req, res) => {
  try {
    const data = await prisma.kelompokUmurMenu.findMany({
      orderBy: { kode: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelompok umur menu" });
  }
});

// GET /api/gizi/batas-harga-porsi - Get all batas harga porsi limits
router.get("/batas-harga-porsi", requireAuth, requirePermission("gizi-master", "READ"), async (req, res) => {
  try {
    const data = await prisma.batasHargaPorsi.findMany();
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: "Gagal mengambil data batas harga porsi" });
  }
});

module.exports = router;
