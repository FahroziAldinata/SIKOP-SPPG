const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { logger } = require("../../lib/logger");

const router = express.Router();

function isOverlap(hariAktifA, hariAktifB) {
  if (!Array.isArray(hariAktifA) || !Array.isArray(hariAktifB)) return false;
  return hariAktifA.some(day => hariAktifB.includes(day));
}

// GET /api/aslap/grup-hari - List all GrupHari for a period
router.get("/grup-hari", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.grupHari.findMany({
      where: periodeId ? { periodeId } : undefined,
      include: {
        penerimaManfaat: {
          include: {
            createdBy: {
              select: { id: true, nama: true, username: true, role: true }
            },
            detail: {
              include: {
                kategori: true,
                sekolah: true,
                posyandu: true
              }
            }
          }
        }
      },
      orderBy: { label: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data grup hari" });
  }
});

// POST /api/aslap/grup-hari - Create new GrupHari
router.post("/grup-hari", requireAuth, requireRole("ASLAP"), validate(schemas.grupHariSchema), async (req, res) => {
  try {
    const { label, hariAktif, periodeId } = req.body || {};

    const trimmedLabel = label.trim();

    const existingLabel = await prisma.grupHari.findUnique({
      where: { periodeId_label: { periodeId, label: trimmedLabel } }
    });
    if (existingLabel) {
      return res.status(400).json({ error: `Grup hari dengan label '${trimmedLabel}' sudah ada untuk periode ini` });
    }

    const existingGroups = await prisma.grupHari.findMany({
      where: { periodeId }
    });

    for (const group of existingGroups) {
      if (isOverlap(hariAktif, group.hariAktif)) {
        const overlappingDays = hariAktif.filter(d => group.hariAktif.includes(d));
        return res.status(400).json({
          error: `Hari aktif (${overlappingDays.join(", ")}) bertabrakan dengan grup '${group.label}'`
        });
      }
    }

    const created = await prisma.grupHari.create({
      data: {
        periodeId,
        label: trimmedLabel,
        hariAktif
      }
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat grup hari" });
  }
});

// PUT /api/aslap/grup-hari/:id - Update GrupHari
router.put("/grup-hari/:id", requireAuth, requireRole("ASLAP"), validate(schemas.grupHariUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, hariAktif } = req.body || {};

    const existingGroup = await prisma.grupHari.findUnique({ where: { id } });
    if (!existingGroup) {
      return res.status(404).json({ error: "Grup hari tidak ditemukan" });
    }

    const updateData = {};

    if (label !== undefined) {
      const trimmedLabel = label.trim();
      const duplicateLabel = await prisma.grupHari.findFirst({
        where: {
          periodeId: existingGroup.periodeId,
          label: trimmedLabel,
          NOT: { id }
        }
      });
      if (duplicateLabel) {
        return res.status(400).json({ error: `Grup hari dengan label '${trimmedLabel}' sudah ada untuk periode ini` });
      }
      updateData.label = trimmedLabel;
    }

    if (hariAktif !== undefined) {
      const otherGroups = await prisma.grupHari.findMany({
        where: {
          periodeId: existingGroup.periodeId,
          NOT: { id }
        }
      });

      for (const group of otherGroups) {
        if (isOverlap(hariAktif, group.hariAktif)) {
          const overlappingDays = hariAktif.filter(d => group.hariAktif.includes(d));
          return res.status(400).json({
            error: `Hari aktif (${overlappingDays.join(", ")}) bertabrakan dengan grup '${group.label}'`
          });
        }
      }

      updateData.hariAktif = hariAktif;
    }

    const updated = await prisma.grupHari.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui grup hari" });
  }
});

// DELETE /api/aslap/grup-hari/:id - Delete GrupHari
router.delete("/grup-hari/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;
    const existingGroup = await prisma.grupHari.findUnique({ where: { id } });
    if (!existingGroup) {
      return res.status(404).json({ error: "Grup hari tidak ditemukan" });
    }

    await prisma.$transaction([
      prisma.inputPenerimaManfaat.deleteMany({
        where: { grupHariId: id }
      }),
      prisma.grupHari.delete({
        where: { id }
      })
    ]);

    res.json({ message: "Grup hari dan data penerima manfaat terkait berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus grup hari" });
  }
});

module.exports = router;
