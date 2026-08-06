const express = require('express');
const { requireAuth, permissionCache, loadPermissionCache } = require('../middleware/auth');
const { logger } = require('../lib/logger');

const router = express.Router();

// GET /api/my-permissions — FE source of truth for user role & permissions
router.get('/', requireAuth, async (req, res) => {
  try {
    // Reload bila role user tidak ada di cache (konsisten dengan requirePermission) —
    // cegah my-permissions kosong setelah invalidatePermissionCache(role).
    if (!permissionCache.has(req.user.role)) {
      await loadPermissionCache();
    }

    const role = req.user.role;
    const roleSet = permissionCache.get(role) || new Set();

    const permissions = Array.from(roleSet).map((item) => {
      const [resource, aksi] = item.split(':');
      return { resource, aksi };
    });

    return res.json({
      success: true,
      data: {
        role,
        permissions
      }
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'Gagal mengambil data my-permissions' });
  }
});

module.exports = router;
