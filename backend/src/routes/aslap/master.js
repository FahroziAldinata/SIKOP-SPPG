const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/aslap/periode - List all periods
router.get("/periode", requireAuth, requireRole("ASLAP", "MITRA", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.periode.findMany({
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    const formatted = data.map(p => ({
      ...p,
      tanggalMulai: p.tanggalMulai.toISOString().split("T")[0],
      tanggalSelesai: p.tanggalSelesai.toISOString().split("T")[0]
    }));

    res.json(formatted);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data periode" });
  }
});

// GET /api/aslap/kategori - List all categories
router.get("/kategori", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kategoriPenerima.findMany({
      orderBy: { urutan: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kategori" });
  }
});

// GET /api/aslap/sekolah - List all schools
router.get("/sekolah", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.sekolah.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data sekolah" });
  }
});

// POST /api/aslap/sekolah - Create a new school
router.post("/sekolah", requireAuth, requireRole("ASLAP"), validate(schemas.sekolahSchema), async (req, res) => {
  try {
    const { nama, jenjang, npsn, alamat } = req.body;

    if (npsn) {
      const npsnStr = String(npsn);
      const existingNpsn = await prisma.sekolah.findFirst({ where: { npsn: npsnStr } });
      if (existingNpsn) {
        return res.status(409).json({ error: "NPSN already used." });
      }
    }
    const existingNama = await prisma.sekolah.findFirst({
      where: { nama: { equals: nama.trim(), mode: "insensitive" } }
    });
    if (existingNama) {
      return res.status(409).json({ error: "Nama sekolah sudah terdaftar." });
    }

    const sekolah = await prisma.sekolah.create({
      data: {
        nama: nama.trim(),
        jenjang,
        npsn: npsn ? String(npsn) : null,
        alamat: alamat || null
      }
    });
    res.status(201).json({ success: true, data: sekolah });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data sekolah" });
  }
});

// PUT /api/aslap/sekolah/:id - Update a school
router.put("/sekolah/:id", requireAuth, requireRole("ASLAP"), validate(schemas.sekolahUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, jenjang, npsn, alamat } = req.body;

    const existing = await prisma.sekolah.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Sekolah tidak ditemukan." });
    }

    if (npsn) {
      const npsnStr = String(npsn);
      const existingNpsn = await prisma.sekolah.findFirst({
        where: { npsn: npsnStr, id: { not: id } }
      });
      if (existingNpsn) {
        return res.status(409).json({ error: "NPSN already used by another school." });
      }
    }
    if (nama && nama.trim()) {
      const existingNama = await prisma.sekolah.findFirst({
        where: { nama: { equals: nama.trim(), mode: "insensitive" }, id: { not: id } }
      });
      if (existingNama) {
        return res.status(409).json({ error: "Nama sekolah sudah terdaftar." });
      }
    }

    const sekolah = await prisma.sekolah.update({
      where: { id },
      data: {
        ...(nama !== undefined && { nama: nama.trim() }),
        ...(jenjang !== undefined && { jenjang }),
        ...(npsn !== undefined && { npsn: npsn ? String(npsn) : null }),
        ...(alamat !== undefined && { alamat })
      }
    });
    res.json({ success: true, data: sekolah });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data sekolah" });
  }
});

// GET /api/aslap/posyandu - List all posyandus
router.get("/posyandu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.posyandu.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data posyandu" });
  }
});

module.exports = router;
