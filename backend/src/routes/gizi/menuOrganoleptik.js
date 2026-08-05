const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/gizi/menu-organoleptik/:id - Detail MenuOrganoleptik
router.get("/menu-organoleptik/:id", requireAuth, requirePermission("gizi-menu", "READ"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil uji organoleptik" });
  }
});

// POST /api/gizi/menu-organoleptik - Create MenuOrganoleptik
router.post("/menu-organoleptik", requireAuth, requirePermission("gizi-menu", "CREATE"), validate(schemas.organoleptikSchema), async (req, res) => {
  try {
    const { blokId, rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body;

    const cleanJumlahOmpreng = jumlahOmpreng;
    const targetUjiTanggal = ujiPadaTanggal ? new Date(ujiPadaTanggal) : new Date();
    const tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000); // retensi 3 hari

    const created = await prisma.$transaction(async (tx) => {
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuOrganoleptik.create({
        data: {
          blokId,
          rasa,
          aroma,
          tekstur,
          suhuSaji,
          catatan,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Uji organoleptik untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan uji organoleptik" });
  }
});

// PUT /api/gizi/menu-organoleptik/:id - Update MenuOrganoleptik
router.put("/menu-organoleptik/:id", requireAuth, requirePermission("gizi-menu", "UPDATE"), validate(schemas.organoleptikUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuOrganoleptik.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data uji organoleptik tidak ditemukan");

      let cleanJumlahOmpreng = existing.jumlahOmpreng;
      if (jumlahOmpreng !== undefined) {
        cleanJumlahOmpreng = parseInt(jumlahOmpreng, 10);
        if (isNaN(cleanJumlahOmpreng) || cleanJumlahOmpreng <= 0) {
          throw new Error("[VALIDASI] jumlahOmpreng harus berupa bilangan bulat positif");
        }
      }

      let targetUjiTanggal = existing.ujiPadaTanggal;
      let tanggalMusnah = existing.tanggalMusnah;
      if (ujiPadaTanggal !== undefined) {
        targetUjiTanggal = new Date(ujiPadaTanggal);
        if (isNaN(targetUjiTanggal.getTime())) {
          throw new Error("[VALIDASI] Format ujiPadaTanggal tidak valid");
        }
        tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000);
      }

      return await tx.menuOrganoleptik.update({
        where: { id },
        data: {
          rasa: rasa !== undefined ? rasa : undefined,
          aroma: aroma !== undefined ? aroma : undefined,
          tekstur: tekstur !== undefined ? tekstur : undefined,
          suhuSaji: suhuSaji !== undefined ? suhuSaji : undefined,
          catatan: catatan !== undefined ? catatan : undefined,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui uji organoleptik" });
  }
});

// DELETE /api/gizi/menu-organoleptik/:id - Delete MenuOrganoleptik
router.delete("/menu-organoleptik/:id", requireAuth, requirePermission("gizi-menu", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });

    await prisma.menuOrganoleptik.delete({ where: { id } });
    res.json({ success: true, message: "Data uji organoleptik berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus uji organoleptik" });
  }
});

module.exports = router;
