const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { requireAuth, requirePermission, invalidatePermissionCache } = require("../middleware/auth");
const { logger } = require("../lib/logger");
const { logAudit } = require("../lib/auditHelper");

const router = express.Router();

const VALID_ROLES = ['ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN'];
const VALID_AKSI = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'];

// Apply authentication guard to all routes in this file
router.use(requireAuth);

// GET /api/admin/users - List all users excluding passwordHash
router.get("/users", requirePermission("admin-user", "READ"), async (req, res) => {
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
router.post("/users", requirePermission("admin-user", "CREATE"), async (req, res) => {
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
router.put("/users/:id", requirePermission("admin-user", "UPDATE"), async (req, res) => {
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
router.delete("/users/:id", requirePermission("admin-user", "DELETE"), async (req, res) => {
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

// GET /api/admin/resources - List all resources
router.get("/resources", requirePermission("admin-permission", "READ"), async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { kode: "asc" }
    });
    res.json(resources);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Gagal mengambil daftar resource" });
  }
});

// POST /api/admin/resources - Create new resource (Task A gap fix: admin bisa buat resource baru dari UI)
router.post("/resources", requirePermission("admin-permission", "CREATE"), async (req, res) => {
  try {
    const { kode, nama, modul } = req.body || {};

    if (!kode || !nama || !modul) {
      return res.status(400).json({ error: "kode, nama, dan modul wajib diisi" });
    }

    // Validasi format kode: lowercase, huruf/angka/dash saja
    if (!/^[a-z0-9-]+$/.test(kode)) {
      return res.status(400).json({ error: "kode harus lowercase, huruf/angka/dash saja (contoh: mitra-setup-periode)" });
    }

    const newResource = await prisma.$transaction(async (tx) => {
      const rec = await tx.resource.create({
        data: { kode, nama, modul, aktif: true }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Resource",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: { kode: rec.kode, nama: rec.nama, modul: rec.modul }
      });
      return rec;
    });

    // Resource baru bisa langsung di-grant ke role — cache harus di-refresh
    invalidatePermissionCache();
    res.status(201).json(newResource);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Kode resource sudah digunakan" });
    }
    res.status(500).json({ error: "Gagal membuat resource baru" });
  }
});

// PUT /api/admin/resources/:id - Update resource (nama/modul/aktif)
router.put("/resources/:id", requirePermission("admin-permission", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, modul, aktif } = req.body || {};

    const data = {};
    if (nama !== undefined) data.nama = nama;
    if (modul !== undefined) data.modul = modul;
    if (aktif !== undefined) data.aktif = aktif;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang diperbarui" });
    }

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Resource tidak ditemukan" });
    }

    const updatedResource = await prisma.$transaction(async (tx) => {
      const rec = await tx.resource.update({ where: { id }, data });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Resource",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: { kode: existing.kode, nama: existing.nama, modul: existing.modul, aktif: existing.aktif },
        dataBaru: { kode: rec.kode, nama: rec.nama, modul: rec.modul, aktif: rec.aktif }
      });
      return rec;
    });

    // Resource diubah (nama/modul/aktif) bisa mempengaruhi set permission valid — flush cache
    invalidatePermissionCache();
    res.json(updatedResource);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Resource tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal memperbarui resource" });
  }
});

// DELETE /api/admin/resources/:id - Soft delete (nonaktifkan resource)
// Hard delete tidak disediakan karena resource yang aktif bisa punya RolePermission terkait.
router.delete("/resources/:id", requirePermission("admin-permission", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Resource tidak ditemukan" });
    }

    // Guard 409: tolak soft-delete bila resource masih punya grant aktif
    const activeGrants = await prisma.rolePermission.count({ where: { resourceId: id } });
    if (activeGrants > 0) {
      return res.status(409).json({ error: `Resource masih memiliki ${activeGrants} grant aktif. Cabut grant terlebih dahulu.` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.resource.update({ where: { id }, data: { aktif: false } });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Resource",
        entityId: id,
        aksi: "DELETE",
        dataLama: { kode: existing.kode, nama: existing.nama, aktif: existing.aktif },
        dataBaru: { aktif: false }
      });
    });

    // Resource dinonaktifkan: semua RolePermission terkait tidak lagi valid di cache
    invalidatePermissionCache();
    res.json({ success: true, message: `Resource '${existing.kode}' berhasil dinonaktifkan` });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Gagal menonaktifkan resource" });
  }
});

// GET /api/admin/permissions - List role permissions (filter by role, resourceId, resource kode)
router.get("/permissions", requirePermission("admin-permission", "READ"), async (req, res) => {
  try {
    const { role, resourceId, resource } = req.query;
    const where = {};
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: "Role tidak valid" });
      }
      where.role = role;
    }
    if (resourceId) where.resourceId = resourceId;
    if (resource) where.resource = { kode: resource };

    const permissions = await prisma.rolePermission.findMany({
      where,
      include: { resource: true },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }]
    });

    res.json(permissions);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Gagal mengambil daftar permission" });
  }
});

// POST /api/admin/permissions - Create role permission
router.post("/permissions", requirePermission("admin-permission", "CREATE"), async (req, res) => {
  try {
    const { role, resourceId, resourceKode, aksi } = req.body || {};

    if (!role || (!resourceId && !resourceKode) || !aksi) {
      return res.status(400).json({ error: "role, resource (resourceId atau resourceKode), dan aksi wajib diisi" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    if (!VALID_AKSI.includes(aksi)) {
      return res.status(400).json({ error: "Aksi tidak valid" });
    }

    let targetResourceId = resourceId;
    if (!targetResourceId && resourceKode) {
      const foundRes = await prisma.resource.findUnique({ where: { kode: resourceKode } });
      if (!foundRes) {
        return res.status(404).json({ error: `Resource dengan kode ${resourceKode} tidak ditemukan` });
      }
      targetResourceId = foundRes.id;
    }

    const resExists = await prisma.resource.findUnique({ where: { id: targetResourceId } });
    if (!resExists) {
      return res.status(404).json({ error: "Resource tidak ditemukan" });
    }

    const newPermission = await prisma.$transaction(async (tx) => {
      const rec = await tx.rolePermission.create({
        data: {
          role,
          resourceId: targetResourceId,
          aksi
        },
        include: { resource: true }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RolePermission",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          role: rec.role,
          resourceKode: rec.resource.kode,
          aksi: rec.aksi
        }
      });

      return rec;
    });

    invalidatePermissionCache(role);

    res.status(201).json(newPermission);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Permission untuk role, resource, dan aksi ini sudah ada" });
    }
    res.status(500).json({ error: "Gagal membuat permission baru" });
  }
});

// PUT /api/admin/permissions/:id - Update role permission
router.put("/permissions/:id", requirePermission("admin-permission", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, resourceId, resourceKode, aksi } = req.body || {};

    const data = {};
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: "Role tidak valid" });
      }
      data.role = role;
    }

    if (aksi !== undefined) {
      if (!VALID_AKSI.includes(aksi)) {
        return res.status(400).json({ error: "Aksi tidak valid" });
      }
      data.aksi = aksi;
    }

    if (resourceId !== undefined) {
      const resExists = await prisma.resource.findUnique({ where: { id: resourceId } });
      if (!resExists) {
        return res.status(404).json({ error: "Resource tidak ditemukan" });
      }
      data.resourceId = resourceId;
    } else if (resourceKode !== undefined) {
      const foundRes = await prisma.resource.findUnique({ where: { kode: resourceKode } });
      if (!foundRes) {
        return res.status(404).json({ error: `Resource dengan kode ${resourceKode} tidak ditemukan` });
      }
      data.resourceId = foundRes.id;
    }

    const existing = await prisma.rolePermission.findUnique({
      where: { id },
      include: { resource: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Permission tidak ditemukan" });
    }

    const updatedPermission = await prisma.$transaction(async (tx) => {
      const rec = await tx.rolePermission.update({
        where: { id },
        data,
        include: { resource: true }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RolePermission",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: {
          role: existing.role,
          resourceKode: existing.resource.kode,
          aksi: existing.aksi
        },
        dataBaru: {
          role: rec.role,
          resourceKode: rec.resource.kode,
          aksi: rec.aksi
        }
      });

      return rec;
    });

    invalidatePermissionCache(existing.role);
    if (data.role && data.role !== existing.role) {
      invalidatePermissionCache(data.role);
    }

    res.json(updatedPermission);
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Permission untuk role, resource, dan aksi ini sudah ada" });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Permission tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal memperbarui permission" });
  }
});

// DELETE /api/admin/permissions/:id - Delete role permission
router.delete("/permissions/:id", requirePermission("admin-permission", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rolePermission.findUnique({
      where: { id },
      include: { resource: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Permission tidak ditemukan" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.delete({
        where: { id }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RolePermission",
        entityId: id,
        aksi: "DELETE",
        dataLama: {
          role: existing.role,
          resourceKode: existing.resource.kode,
          aksi: existing.aksi
        },
        dataBaru: null
      });
    });

    invalidatePermissionCache(existing.role);

    res.json({ success: true, message: "Permission berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Permission tidak ditemukan" });
    }
    res.status(500).json({ error: "Gagal menghapus permission" });
  }
});

module.exports = router;
