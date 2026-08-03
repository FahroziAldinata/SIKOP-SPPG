const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Pastikan folder upload ada
const uploadDir = path.join(__dirname, "../../uploads/bukti");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // limit 10MB
});

// POST /api/laporan/lpd2m/bukti — multipart/form-data (periodeId, namaBukti, jenis, file)
router.post("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), upload.single("file"), async (req, res) => {
  try {
    const { periodeId, namaBukti, jenis } = req.body;

    if (!periodeId || !namaBukti || !jenis) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ error: "periodeId, namaBukti, dan jenis wajib diisi" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "File bukti wajib diupload" });
    }

    const periode = await prisma.periode.findUnique({
      where: { id: periodeId }
    });

    if (!periode) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const relativePath = path.relative(path.join(__dirname, "../../"), req.file.path).replace(/\\/g, "/");

    const bukti = await prisma.dokumenBuktiLpd2m.create({
      data: {
        periodeId,
        namaBukti,
        jenis,
        filePath: relativePath,
        mimeType: req.file.mimetype,
        uploadedById: req.user.sub
      },
      include: {
        uploadedBy: {
          select: { id: true, nama: true, username: true }
        }
      }
    });

    res.status(201).json({ success: true, data: bukti });
  } catch (error) {
    console.error("[bukti-lpd2m post]", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ error: "Gagal mengupload bukti LPD2M" });
  }
});

// GET /api/laporan/lpd2m/bukti?periodeId= — list bukti
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi di query parameter" });
    }

    const buktiList = await prisma.dokumenBuktiLpd2m.findMany({
      where: { periodeId },
      orderBy: { createdAt: "asc" },
      include: {
        uploadedBy: {
          select: { id: true, nama: true, username: true }
        }
      }
    });

    res.json({ success: true, data: buktiList });
  } catch (error) {
    console.error("[bukti-lpd2m get]", error);
    res.status(500).json({ error: "Gagal mengambil daftar bukti LPD2M" });
  }
});

// DELETE /api/laporan/lpd2m/bukti/:id — hapus record + file dari storage
router.delete("/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;

    const bukti = await prisma.dokumenBuktiLpd2m.findUnique({
      where: { id }
    });

    if (!bukti) {
      return res.status(404).json({ error: "Bukti LPD2M tidak ditemukan" });
    }

    const absolutePath = path.isAbsolute(bukti.filePath)
      ? bukti.filePath
      : path.join(__dirname, "../../", bukti.filePath);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error("Gagal menghapus file bukti fisik:", err);
      }
    }

    await prisma.dokumenBuktiLpd2m.delete({
      where: { id }
    });

    res.json({ success: true, message: "Bukti LPD2M berhasil dihapus" });
  } catch (error) {
    console.error("[bukti-lpd2m delete]", error);
    res.status(500).json({ error: "Gagal menghapus bukti LPD2M" });
  }
});

module.exports = router;
