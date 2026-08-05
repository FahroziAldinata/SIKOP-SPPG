const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { logger } = require("../../lib/logger");

const router = express.Router();

// --- MasterTargetGizi ---
router.get('/master-target', requireAuth, requirePermission('gizi-master', 'READ'), async (req, res) => {
  try {
    const data = await prisma.masterTargetGizi.findMany({
      include: { kelompokUmurMenu: { select: { id: true, kode: true, nama: true, jalur: true } } },
      orderBy: { kelompokUmurMenu: { kode: 'asc' } }
    });
    res.json(data);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data master target gizi" });
  }
});

router.put('/master-target/:id', requireAuth, requirePermission('gizi-master', 'UPDATE'), validate(schemas.masterTargetGiziSchema), async (req, res) => {
  try {
    const { energiKkal, proteinGr, lemakGr, karbohidratGr, seratGr } = req.body;
    const updated = await prisma.masterTargetGizi.update({
      where: { id: req.params.id },
      data: { energiKkal, proteinGr, lemakGr, karbohidratGr, seratGr }
    });
    res.json(updated);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data master target gizi" });
  }
});

module.exports = router;
