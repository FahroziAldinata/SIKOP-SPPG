const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");

const router = express.Router();

// POST /api/gizi/menu-harian-blok - Add block to existing MenuHarian
router.post("/menu-harian-blok", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuHarianBlokSchema), async (req, res) => {
  try {
    const { menuHarianId, kelompokUmurMenuId } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menuHarian = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menuHarian) {
        throw new Error("[NOT_FOUND] Data menu harian tidak ditemukan");
      }

      // Validate kelompokUmurMenu exists
      const kelompokUmur = await tx.kelompokUmurMenu.findUnique({ where: { id: kelompokUmurMenuId } });
      if (!kelompokUmur) {
        throw new Error("[NOT_FOUND] Kelompok umur menu tidak ditemukan");
      }

      // Validate unique constraint: [menuHarianId, kelompokUmurMenuId]
      const existing = await tx.menuHarianBlok.findUnique({
        where: {
          menuHarianId_kelompokUmurMenuId: {
            menuHarianId,
            kelompokUmurMenuId
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Blok kelompok umur ini sudah terdaftar pada menu harian terpilih");
      }

      return await tx.menuHarianBlok.create({
        data: {
          menuHarianId,
          kelompokUmurMenuId,
          createdById: req.user.sub
        },
        include: {
          kelompokUmurMenu: true
        }
      });
    });

    // Auto-populate target gizi dari master
    try {
      const master = await prisma.masterTargetGizi.findUnique({
        where: { kelompokUmurMenuId: created.kelompokUmurMenuId }
      });
      if (master) {
        await prisma.menuTargetGizi.create({
          data: {
            blokId: created.id,
            targetEnergi: master.energiKkal,
            targetProtein: master.proteinGr,
            targetLemak: master.lemakGr,
            targetKarbohidrat: master.karbohidratGr,
            targetSerat: master.seratGr
          }
        });
      }
    } catch (e) {
      console.error('Auto-populate target gizi gagal:', e.message);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Blok kelompok umur ini sudah terdaftar pada menu harian terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan blok menu harian" });
  }
});

// DELETE /api/gizi/menu-harian-blok/:id - Delete block
router.delete("/menu-harian-blok/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuHarianBlok.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }

    await prisma.menuHarianBlok.delete({ where: { id } });

    res.json({ success: true, message: "Data blok menu harian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus blok menu harian" });
  }
});

module.exports = router;
