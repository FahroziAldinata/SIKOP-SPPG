const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/gizi/menu-item/:id - Detail MenuItem
router.get("/menu-item/:id", requireAuth, requirePermission("gizi-menu", "READ"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        bahan: {
          include: {
            bahanPokok: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu item" });
  }
});

// POST /api/gizi/menu-item - Create MenuItem
router.post("/menu-item", requireAuth, requirePermission("gizi-menu", "CREATE"), validate(schemas.menuItemSchema), async (req, res) => {
  try {
    const { blokId, namaMenu, komponen } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) {
        throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");
      }

      return await tx.menuItem.create({
        data: {
          blokId,
          namaMenu,
          komponen
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data menu item" });
  }
});

// PUT /api/gizi/menu-item/:id - Update MenuItem
router.put("/menu-item/:id", requireAuth, requirePermission("gizi-menu", "UPDATE"), validate(schemas.menuItemUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { namaMenu, komponen } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.menuItem.findUnique({ where: { id } });
      if (!exists) {
        throw new Error("[NOT_FOUND] Data menu item tidak ditemukan");
      }

      return await tx.menuItem.update({
        where: { id },
        data: {
          namaMenu: namaMenu !== undefined ? namaMenu : undefined,
          komponen: komponen !== undefined ? komponen : undefined
        }
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data menu item" });
  }
});

// DELETE /api/gizi/menu-item/:id - Delete MenuItem
router.delete("/menu-item/:id", requireAuth, requirePermission("gizi-menu", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuItem.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    await prisma.menuItem.delete({ where: { id } });

    res.json({ success: true, message: "Data menu item berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu item" });
  }
});

module.exports = router;
