const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// GET /api/gizi/kendaraan - List Kendaraan
router.get("/kendaraan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.kendaraan.findMany();
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar kendaraan" });
  }
});

// GET /api/gizi/kendaraan/:id - Detail Kendaraan
router.get("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.kendaraan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail kendaraan" });
  }
});

const kendaraanMovedToMitra = (req, res) => {
  res.status(410).json({
    error: "Pengaturan kendaraan sudah dipindahkan ke Mitra. Gunakan endpoint /api/mitra/kendaraan."
  });
};

router.post("/kendaraan", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);
router.put("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);
router.delete("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);

module.exports = router;
