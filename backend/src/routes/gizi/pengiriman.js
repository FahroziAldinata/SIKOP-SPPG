const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");

const router = express.Router();

// GET /api/gizi/pengiriman - List PengirimanHarian
router.get("/pengiriman", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { menuHarianId } = req.query;
    const list = await prisma.pengirimanHarian.findMany({
      where: menuHarianId ? { menuHarianId } : {},
      include: {
        kendaraan: true,
        kategoriPenerima: true
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar pengiriman" });
  }
});

// GET /api/gizi/pengiriman/:id - Detail PengirimanHarian
router.get("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.pengirimanHarian.findUnique({
      where: { id },
      include: { 
        kendaraan: true,
        kategoriPenerima: true
      }
    });
    if (!data) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail pengiriman" });
  }
});

// POST /api/gizi/pengiriman - Create PengirimanHarian
router.post("/pengiriman", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.pengirimanSchema), async (req, res) => {
  try {
    const { menuHarianId, kategoriIds, kendaraanId, catatan } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menu = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");

      // Validate Kendaraan exists
      const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
      if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

      // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
      if (!vehicle.aktif) {
        throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
      }

      // Validate all kategoriIds
      const uniqueKategoriIds = [...new Set(kategoriIds)];
      const validKategori = await tx.kategoriPenerima.findMany({
        where: { id: { in: uniqueKategoriIds } }
      });
      if (validKategori.length !== uniqueKategoriIds.length) {
        throw new Error("[VALIDASI] Satu atau lebih kategoriPenerimaId tidak valid");
      }

      return await tx.pengirimanHarian.create({
        data: {
          menuHarianId,
          kendaraanId,
          catatan,
          kategoriPenerima: {
            connect: uniqueKategoriIds.map(id => ({ id }))
          }
        },
        include: {
          kendaraan: true,
          kategoriPenerima: true
        }
      });
    }, { timeout: 15000 });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian or kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan pengiriman" });
  }
});

// PUT /api/gizi/pengiriman/:id - Update PengirimanHarian
router.put("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.pengirimanUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { menuHarianId, kategoriIds, kendaraanId, catatan } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.pengirimanHarian.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data pengiriman tidak ditemukan");

      if (menuHarianId !== undefined) {
        const menu = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
        if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");
      }

      if (kategoriIds !== undefined) {
        if (!Array.isArray(kategoriIds) || kategoriIds.length === 0) {
          throw new Error("[VALIDASI] kategoriIds wajib berupa array dan minimal memiliki 1 item");
        }
      }

      if (kendaraanId !== undefined) {
        const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
        if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

        // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
        if (!vehicle.aktif) {
          throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
        }
      }

      const updateData = {
        menuHarianId: menuHarianId !== undefined ? menuHarianId : undefined,
        kendaraanId: kendaraanId !== undefined ? kendaraanId : undefined,
        catatan: catatan !== undefined ? catatan : undefined,
      };

      if (kategoriIds !== undefined) {
        const uniqueKategoriIds = [...new Set(kategoriIds)];
        const validKategori = await tx.kategoriPenerima.findMany({
          where: { id: { in: uniqueKategoriIds } }
        });
        if (validKategori.length !== uniqueKategoriIds.length) {
          throw new Error("[VALIDASI] Satu atau lebih kategoriPenerimaId tidak valid");
        }
        updateData.kategoriPenerima = {
          set: uniqueKategoriIds.map(id => ({ id }))
        };
      }

      return await tx.pengirimanHarian.update({
        where: { id },
        data: updateData,
        include: {
          kendaraan: true,
          kategoriPenerima: true
        }
      });
    }, { timeout: 15000 });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian or kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui pengiriman" });
  }
});

// DELETE /api/gizi/pengiriman/:id - Delete PengirimanHarian
router.delete("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.pengirimanHarian.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });

    await prisma.pengirimanHarian.delete({ where: { id } });
    res.json({ success: true, message: "Data pengiriman berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus pengiriman" });
  }
});

module.exports = router;
