const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");

const router = express.Router();

// --- MasterTargetGizi ---
router.get('/master-target', requireAuth, requireRole('AHLI_GIZI', 'KEPALA_SPPG'), async (req, res) => {
  try {
    const data = await prisma.masterTargetGizi.findMany({
      include: { kelompokUmurMenu: { select: { id: true, kode: true, nama: true, jalur: true } } },
      orderBy: { kelompokUmurMenu: { kode: 'asc' } }
    });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/master-target/:id', requireAuth, requireRole('AHLI_GIZI'), validate(schemas.masterTargetGiziSchema), async (req, res) => {
  try {
    const { energiKkal, proteinGr, lemakGr, karbohidratGr, seratGr } = req.body;
    const updated = await prisma.masterTargetGizi.update({
      where: { id: req.params.id },
      data: { energiKkal, proteinGr, lemakGr, karbohidratGr, seratGr }
    });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
