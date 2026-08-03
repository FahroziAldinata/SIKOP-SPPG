const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { getPenerimaBlok } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/gizi/alergi-catatan - List AlergiCatatan by block
router.get("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { blokId } = req.query;
    if (!blokId) return res.status(400).json({ error: "blokId query parameter wajib dikirimkan" });

    const list = await prisma.alergiCatatan.findMany({
      where: { blokId }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar catatan alergi" });
  }
});

// GET /api/gizi/alergi-catatan/:id - Detail AlergiCatatan
router.get("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil catatan alergi" });
  }
});

// POST /api/gizi/alergi-catatan - Create AlergiCatatan
router.post("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.alergiSchema), async (req, res) => {
  try {
    const { blokId, jenisAlergi, jumlahSiswa, bahanPengganti } = req.body;

    const cleanJumlah = jumlahSiswa;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({
        where: { id: blokId },
        include: {
          menuHarian: { select: { id: true, periodeId: true, tanggal: true } },
          kelompokUmurMenu: { include: { kategoriPenerima: true } },
          alergi: true
        }
      });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      // Validasi Total Alergi <= Total Penerima Manfaat
      const totalPenerima = await getPenerimaBlok(
        tx,
        block.menuHarian.periodeId,
        block.menuHarian.tanggal,
        block.kelompokUmurMenu?.kategoriPenerima
      );
      const existingSum = (block.alergi || []).reduce((sum, a) => sum + a.jumlahSiswa, 0);
      const totalAlergi = existingSum + cleanJumlah;
      if (totalAlergi > totalPenerima) {
        throw new Error("[VALIDASI] Total alergi melebihi jumlah penerima manfaat di blok ini");
      }

      return await tx.alergiCatatan.create({
        data: {
          blokId,
          jenisAlergi,
          jumlahSiswa: cleanJumlah,
          bahanPengganti
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan catatan alergi" });
  }
});

// PUT /api/gizi/alergi-catatan/:id - Update AlergiCatatan
router.put("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.alergiUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { jenisAlergi, jumlahSiswa, bahanPengganti } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.alergiCatatan.findUnique({
        where: { id },
        include: {
          blok: {
            include: {
              menuHarian: { select: { id: true, periodeId: true, tanggal: true } },
              kelompokUmurMenu: { include: { kategoriPenerima: true } },
              alergi: true
            }
          }
        }
      });
      if (!existing) throw new Error("[NOT_FOUND] Data catatan alergi tidak ditemukan");

      let cleanJumlah = existing.jumlahSiswa;
      if (jumlahSiswa !== undefined) {
        cleanJumlah = Number(jumlahSiswa);
        if (isNaN(cleanJumlah) || cleanJumlah < 0 || !Number.isInteger(cleanJumlah)) {
          throw new Error("[VALIDASI] jumlahSiswa harus berupa bilangan bulat non-negatif");
        }
      }

      // Validasi Total Alergi <= Total Penerima Manfaat
      const totalPenerima = await getPenerimaBlok(
        tx,
        existing.blok.menuHarian.periodeId,
        existing.blok.menuHarian.tanggal,
        existing.blok.kelompokUmurMenu?.kategoriPenerima
      );
      const existingSumOther = (existing.blok.alergi || [])
        .filter(a => a.id !== id)
        .reduce((sum, a) => sum + a.jumlahSiswa, 0);
      const totalAlergi = existingSumOther + cleanJumlah;

      if (totalAlergi > totalPenerima) {
        throw new Error("[VALIDASI] Total alergi melebihi jumlah penerima manfaat di blok ini");
      }

      return await tx.alergiCatatan.update({
        where: { id },
        data: {
          jenisAlergi: jenisAlergi !== undefined ? jenisAlergi : undefined,
          jumlahSiswa: cleanJumlah,
          bahanPengganti: bahanPengganti !== undefined ? bahanPengganti : undefined
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui catatan alergi" });
  }
});

// DELETE /api/gizi/alergi-catatan/:id - Delete AlergiCatatan
router.delete("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });

    await prisma.alergiCatatan.delete({ where: { id } });
    res.json({ success: true, message: "Data catatan alergi berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus catatan alergi" });
  }
});

module.exports = router;
