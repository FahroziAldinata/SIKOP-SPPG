const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { logAudit } = require("../../lib/auditHelper");
const schemas = require("../../validators/akuntan");
const {
  generateLPA,
  generateSPTJ,
  generateBAPSD,
  dokumenResmiSnapshot
} = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/akuntan/dokumen-resmi/generate - Generate preview data for a document
router.get("/generate", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, jenisDokumen, nomorDokumen } = req.query;

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!jenisDokumen || (jenisDokumen !== "LPA" && jenisDokumen !== "SPTJ" && jenisDokumen !== "BAPSD")) {
      return res.status(400).json({ error: "jenisDokumen tidak valid (LPA, SPTJ, atau BAPSD)" });
    }

    let data;
    if (jenisDokumen === "LPA") {
      data = await generateLPA(prisma, periodeId, nomorDokumen);
    } else if (jenisDokumen === "SPTJ") {
      data = await generateSPTJ(prisma, periodeId);
    } else {
      data = await generateBAPSD(prisma, periodeId, nomorDokumen);
    }

    res.json(data);
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
    res.status(500).json({ error: "Terjadi kesalahan server saat men-generate dokumen resmi" });
  }
});

// GET /api/akuntan/dokumen-resmi - List published DokumenResmi
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.dokumenResmi.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        createdBy: {
          select: { id: true, nama: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar dokumen resmi" });
  }
});

// POST /api/akuntan/dokumen-resmi - Publish a DokumenResmi
router.post("/", requireAuth, requireRole("AKUNTAN"), validate(schemas.dokumenResmiSchema), async (req, res) => {
  try {
    const { periodeId, jenisDokumen, nomorDokumen } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // Check unique constraint [periodeId, jenisDokumen]
      const exists = await tx.dokumenResmi.findUnique({
        where: {
          periodeId_jenisDokumen: {
            periodeId,
            jenisDokumen
          }
        }
      });
      if (exists) {
        throw new Error("[CONFLICT] Dokumen resmi jenis ini sudah diterbitkan untuk periode terpilih");
      }

      const created = await tx.dokumenResmi.create({
        data: {
          periodeId,
          jenisDokumen,
          nomorDokumen: nomorDokumen || null,
          createdById: req.user.sub
        }
      });

      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "DokumenResmi",
        entityId: created.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: dokumenResmiSnapshot(created)
      });

      return created;
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Dokumen resmi jenis ini sudah diterbitkan untuk periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menerbitkan dokumen resmi" });
  }
});

// DELETE /api/akuntan/dokumen-resmi/:id - Delete (unpublish) a DokumenResmi
router.delete("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.dokumenResmi.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Dokumen resmi tidak ditemukan");
      }

      await tx.dokumenResmi.delete({ where: { id } });

      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "DokumenResmi",
        entityId: id,
        aksi: "DELETE",
        dataLama: dokumenResmiSnapshot(existing),
        dataBaru: null
      });
    });
    res.json({ success: true, message: "Dokumen resmi berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025" || (error.message && error.message.startsWith("[NOT_FOUND]"))) {
      return res.status(404).json({ error: "Dokumen resmi tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus dokumen resmi" });
  }
});

module.exports = router;
