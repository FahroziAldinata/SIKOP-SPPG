const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");

const router = express.Router();

// GET /api/gizi/menu-target-gizi/:id - Detail MenuTargetGizi
router.get("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil target gizi" });
  }
});

// POST /api/gizi/menu-target-gizi - Create MenuTargetGizi
router.post("/menu-target-gizi", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.targetGiziSchema), async (req, res) => {
  try {
    const { blokId, targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body;

    const cleanEnergi = targetEnergi;
    const cleanProtein = targetProtein;
    const cleanLemak = targetLemak;
    const cleanKarbo = targetKarbohidrat;
    const cleanSerat = targetSerat;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuTargetGizi.create({
        data: {
          blokId,
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Target gizi untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan target gizi" });
  }
});

// PUT /api/gizi/menu-target-gizi/:id - Update MenuTargetGizi
router.put("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.targetGiziUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuTargetGizi.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data target gizi tidak ditemukan");

      const cleanEnergi = targetEnergi !== undefined ? Number(targetEnergi) : Number(existing.targetEnergi);
      const cleanProtein = targetProtein !== undefined ? Number(targetProtein) : Number(existing.targetProtein);
      const cleanLemak = targetLemak !== undefined ? Number(targetLemak) : Number(existing.targetLemak);
      const cleanKarbo = targetKarbohidrat !== undefined ? Number(targetKarbohidrat) : Number(existing.targetKarbohidrat);
      const cleanSerat = targetSerat !== undefined ? Number(targetSerat) : Number(existing.targetSerat);

      if (isNaN(cleanEnergi) || cleanEnergi < 0) throw new Error("[VALIDASI] targetEnergi harus berupa angka non-negatif");
      if (isNaN(cleanProtein) || cleanProtein < 0) throw new Error("[VALIDASI] targetProtein harus berupa angka non-negatif");
      if (isNaN(cleanLemak) || cleanLemak < 0) throw new Error("[VALIDASI] targetLemak harus berupa angka non-negatif");
      if (isNaN(cleanKarbo) || cleanKarbo < 0) throw new Error("[VALIDASI] targetKarbohidrat harus berupa angka non-negatif");
      if (isNaN(cleanSerat) || cleanSerat < 0) throw new Error("[VALIDASI] targetSerat harus berupa angka non-negatif");

      return await tx.menuTargetGizi.update({
        where: { id },
        data: {
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui target gizi" });
  }
});

// DELETE /api/gizi/menu-target-gizi/:id - Delete MenuTargetGizi
router.delete("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });

    await prisma.menuTargetGizi.delete({ where: { id } });
    res.json({ success: true, message: "Data target gizi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus target gizi" });
  }
});

module.exports = router;
