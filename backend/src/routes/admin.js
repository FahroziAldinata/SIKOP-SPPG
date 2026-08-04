const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logger } = require("../lib/logger");
const { logAudit } = require("../lib/auditHelper");

const router = express.Router();

const VALID_ROLES = ['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN'];

// Apply admin guards to all routes in this file
router.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/users - List all users excluding passwordHash
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        username: true,
        role: true,
        aktif: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Gagal mengambil daftar user" });
  }
});

// POST /api/admin/users - Create new user
router.post("/users", async (req, res) => {
  try {
    const { nama, username, password, role } = req.body || {};

    if (!nama || !username || !password || !role) {
      return res.status(400).json({ error: "nama, username, password, dan role wajib diisi" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      const userRec = await tx.user.create({
        data: {
          nama,
          username,
          passwordHash,
          role,
          aktif: true
        },
        select: {
          id: true,
          nama: true,
          username: true,
          role: true,
          aktif: true,
          createdAt: true
        }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "User",
        entityId: userRec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          nama: userRec.nama,
          username: userRec.username,
          role: userRec.role,
          aktif: userRec.aktif
        }
      });
      return userRec;
    });

    res.status(201).json(newUser);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Username sudah digunakan oleh user lain" });
    }
    res.status(500).json({ error: "Gagal membuat user baru" });
  }
});

// PUT /api/admin/users/:id - Edit user
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, role, aktif, password } = req.body || {};

    const data = {};
    if (nama !== undefined) data.nama = nama;
    if (aktif !== undefined) data.aktif = aktif;

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: "Role tidak valid" });
      }
      data.role = role;
    }

    const isPasswordChanged = password !== undefined && password !== "";
    if (isPasswordChanged) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password minimal 6 karakter" });
      }
      data.passwordHash = await bcrypt.hash(password, 12);
      // Reset password oleh admin → invalidasi semua sesi lama user target (pola C1, sinkron dgn PUT /api/auth/profile)
      data.tokenVersion = { increment: 1 };
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUniqueOrThrow({ where: { id } });
      const rec = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          nama: true,
          username: true,
          role: true,
          aktif: true,
          createdAt: true,
          updatedAt: true
        }
      });
      const dataBaruObj = {
        nama: rec.nama,
        username: rec.username,
        role: rec.role,
        aktif: rec.aktif
      };
      if (isPasswordChanged) {
        dataBaruObj.passwordChanged = true;
      }
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "User",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: {
          nama: existing.nama,
          username: existing.username,
          role: existing.role,
          aktif: existing.aktif
        },
        dataBaru: dataBaruObj
      });
      return rec;
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal memperbarui user" });
  }
});

// DELETE /api/admin/users/:id - Soft delete (non-aktifkan)
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const disabledUser = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUniqueOrThrow({ where: { id } });
      const rec = await tx.user.update({
        where: { id },
        data: { aktif: false },
        select: {
          id: true,
          nama: true,
          username: true,
          role: true,
          aktif: true
        }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "User",
        entityId: rec.id,
        aksi: "DELETE",
        dataLama: {
          nama: existing.nama,
          username: existing.username,
          role: existing.role,
          aktif: existing.aktif
        },
        dataBaru: {
          nama: rec.nama,
          username: rec.username,
          role: rec.role,
          aktif: rec.aktif
        }
      });
      return rec;
    });

    res.json({ success: true, message: `User ${disabledUser.nama} berhasil dinonaktifkan`, user: disabledUser });
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal menonaktifkan user" });
  }
});

module.exports = router;
