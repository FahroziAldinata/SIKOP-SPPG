const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// GET /api/gizi/kelompok-umur-menu - List all KelompokUmurMenu (dropdown untuk MenuHarianBlok)
router.get("/kelompok-umur-menu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kelompokUmurMenu.findMany({
      orderBy: { kode: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelompok umur menu" });
  }
});

// GET /api/gizi/batas-harga-porsi - Get all batas harga porsi limits
router.get("/batas-harga-porsi", requireAuth, requireRole("AHLI_GIZI", "AKUNTAN", "KEPALA_SPPG", "ASLAP"), async (req, res) => {
  try {
    const data = await prisma.batasHargaPorsi.findMany();
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: "Gagal mengambil data batas harga porsi" });
  }
});

module.exports = router;
