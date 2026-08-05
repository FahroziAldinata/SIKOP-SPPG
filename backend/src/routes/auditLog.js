const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logger } = require('../lib/logger');

const router = express.Router();

const AKSI_VALID = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'KOREKSI'];

// GET /api/audit-log — daftar AuditLog (filter + pagination, pola endpoint lain)
// Filter: tanggalMulai, tanggalSelesai, userId, aksi, resource (entityType), page, limit
router.get('/', requireAuth, requirePermission('audit-log', 'READ'), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, userId, aksi, resource, page, limit } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    // Validasi filter
    if (aksi && !AKSI_VALID.includes(aksi)) {
      return res.status(400).json({ error: `aksi harus salah satu dari: ${AKSI_VALID.join(', ')}` });
    }
    const from = tanggalMulai ? new Date(tanggalMulai) : null;
    const to = tanggalSelesai ? new Date(tanggalSelesai) : null;
    if (from && isNaN(from.getTime())) {
      return res.status(400).json({ error: 'tanggalMulai tidak valid' });
    }
    if (to && isNaN(to.getTime())) {
      return res.status(400).json({ error: 'tanggalSelesai tidak valid' });
    }

    const whereClause = {};
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = from;
      if (to) whereClause.createdAt.lte = to;
    }
    if (userId) whereClause.userId = userId;
    if (aksi) whereClause.aksi = aksi;
    if (resource) whereClause.entityType = resource;

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, nama: true, username: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mengambil audit log' });
  }
});

module.exports = router;
