const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const { logger } = require("../lib/logger");

const router = express.Router();

const TOKEN_EXPIRY = "8h"; // 1 shift kerja. Sesuaikan kalau perlu.

// --- Konfigurasi multer untuk upload TTD ---
// auth.js ada di backend/src/routes, jadi ../../ = backend/
const uploadDir = path.join(__dirname, "../../uploads/ttd");
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
  limits: { fileSize: 5 * 1024 * 1024 }, // limit 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
      cb(null, true);
    } else {
      cb(new Error("Hanya PNG/JPG"));
    }
  }
});

// POST /api/auth/login  { username, password }
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "username dan password wajib diisi" });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  // Sengaja pesan error SAMA buat "user gak ada" & "password salah" —
  // jangan bocorin username mana yg valid ke penyerang.
  if (!user || !user.aktif) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const cocok = await bcrypt.compare(password, user.passwordHash);
  if (!cocok) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, nama: user.nama },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );

  res.json({
    token,
    user: { id: user.id, nama: user.nama, username: user.username, role: user.role },
  });
});

// GET /api/auth/me — cek token masih valid + data user terbaru (mis. kalau aktif di-nonaktifkan)
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

  if (!user || !user.aktif) {
    return res.status(401).json({ error: "User tidak aktif atau sudah dihapus" });
  }

  res.json({ id: user.id, nama: user.nama, username: user.username, role: user.role });
});

// PUT /api/auth/profile - Update user profile & settings
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { nama, username, password } = req.body || {};
    const userId = req.user.sub;

    const data = {};
    if (nama) data.nama = nama;

    if (username) {
      // Check unique username conflict
      const exist = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });
      if (exist) {
        return res.status(409).json({ error: "Username sudah digunakan oleh user lain" });
      }
      data.username = username;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password minimal 6 karakter" });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });

    res.json({
      success: true,
      user: { id: updated.id, nama: updated.nama, username: updated.username, role: updated.role }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui profil" });
  }
});

// POST /api/auth/ttd — Upload file TTD basah (PNG/JPG, maks 5MB)
router.post("/ttd", requireAuth, (req, res) => {
  upload.single("ttd")(req, res, async (err) => {
    if (err) {
      // Error dari multer (ukuran/tipe file)
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Ukuran file terlalu besar, maksimal 5MB" });
      }
      return res.status(400).json({ error: err.message || "Gagal upload file TTD" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "File TTD wajib diupload" });
    }

    try {
      const userId = req.user.sub;
      const filename = req.file.filename;
      const ttdPath = "/uploads/ttd/" + filename;

      // Hapus file TTD lama dari disk kalau ada
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { ttdPath: true }
      });
      if (existing && existing.ttdPath) {
        const oldFilename = path.basename(existing.ttdPath);
        const oldFilePath = path.join(uploadDir, oldFilename);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch {
          // Abaikan error hapus file lama
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { ttdPath }
      });

      res.json({ ttdPath });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan TTD" });
    }
  });
});

// GET /api/auth/ttd — Ambil path TTD user saat ini
router.get("/ttd", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { ttdPath: true }
    });
    res.json({ ttdPath: user ? user.ttdPath : null });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data TTD" });
  }
});

// DELETE /api/auth/ttd — Hapus TTD user (file fisik + DB)
router.delete("/ttd", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ttdPath: true }
    });

    if (user && user.ttdPath) {
      const filename = path.basename(user.ttdPath);
      const filePath = path.join(uploadDir, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // File tidak ada di disk — tetap lanjut update DB
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { ttdPath: null }
    });

    res.json({ ttdPath: null });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus TTD" });
  }
});

module.exports = router;