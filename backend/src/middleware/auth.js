const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { logger } = require('../lib/logger');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // gagal cepat drpd jalan diam2 pakai secret kosong/undefined
  throw new Error('JWT_SECRET belum diset di .env');
}

// In-memory cache for dynamic RBAC permissions: Map<Role, Set<"resourceKode:aksi">>
const permissionCache = new Map();

async function loadPermissionCache() {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      include: { resource: true }
    });

    permissionCache.clear();
    for (const rp of rolePermissions) {
      if (rp.resource && rp.resource.aktif !== false) {
        if (!permissionCache.has(rp.role)) {
          permissionCache.set(rp.role, new Set());
        }
        permissionCache.get(rp.role).add(`${rp.resource.kode}:${rp.aksi}`);
      }
    }
    return permissionCache;
  } catch (err) {
    logger.error(err);
    throw err;
  }
}

function invalidatePermissionCache(key) {
  if (!key) {
    permissionCache.clear();
    return;
  }
  const parts = key.split(':');
  if (parts.length === 3) {
    const [role, resource, aksi] = parts;
    const roleSet = permissionCache.get(role);
    if (roleSet) {
      roleSet.delete(`${resource}:${aksi}`);
    }
  } else {
    permissionCache.delete(key);
  }
}

// Cek header "Authorization: Bearer <token>", verifikasi, taruh payload di req.user
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token tidak ada. Kirim header Authorization: Bearer <token>' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }

  req.user = payload; // { sub, username, role, nama }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { aktif: true, tokenVersion: true }
    });

    if (!user || !user.aktif) {
      return res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan, silakan hubungi admin' });
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: 'Sesi tidak valid, silakan login kembali' });
    }

    next();
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat verifikasi akun' });
  }
}

// Dipanggil SETELAH requireAuth. Contoh: requireRole("AKUNTAN", "KEPALA_SPPG")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Belum login' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role ${req.user.role} tidak diizinkan akses ini` });
    }
    next();
  };
}

// Dipanggil SETELAH requireAuth. Express middleware untuk dynamic RBAC
function requirePermission(resource, aksi) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Belum login' });
    }

    const { role } = req.user;

    // Superuser bypass: role ADMIN diizinkan untuk semua resource & aksi
    if (role === 'ADMIN') {
      return next();
    }

    try {
      if (permissionCache.size === 0) {
        await loadPermissionCache();
      }

      const rolePermissions = permissionCache.get(role);
      const permKey = `${resource}:${aksi}`;

      if (rolePermissions && rolePermissions.has(permKey)) {
        return next();
      }

      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses resource ini' });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ error: 'Terjadi kesalahan server saat verifikasi hak akses' });
    }
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  permissionCache,
  loadPermissionCache,
  invalidatePermissionCache,
  JWT_SECRET
};