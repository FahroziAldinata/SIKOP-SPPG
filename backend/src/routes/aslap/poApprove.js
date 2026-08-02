const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");

const router = express.Router();

// PUT /api/aslap/po/:id/approve - Aslap konfirmasi penerimaan fisik
router.put("/po/:id/approve", requireAuth, requireRole("ASLAP"), validate(schemas.poApproveSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const poRows = await tx.$queryRaw`
        SELECT id, status FROM "TransaksiPembelian" WHERE id = ${id} FOR UPDATE
      `;
      if (poRows.length === 0) {
        throw new Error("[404] PO tidak ditemukan");
      }
      const po = poRows[0];

      if (po.status !== "DIREALISASI") {
        throw new Error("[409] Realisasi belanja dari Mitra belum diinput");
      }

      if (items && Array.isArray(items) && items.length > 0) {
        const existingItems = await tx.transaksiPembelianItem.findMany({
          where: { transaksiId: id },
          include: { bahanPokok: true }
        });

        const itemMap = new Map(existingItems.map((item) => [item.id, item]));

        for (const inputItem of items) {
          const poItem = itemMap.get(inputItem.itemId);
          if (!poItem) {
            throw new Error(`[400] Item dengan ID ${inputItem.itemId} tidak ditemukan pada PO ini`);
          }

          const qtyDiterima = Number(inputItem.qtyDiterima);
          if (isNaN(qtyDiterima) || qtyDiterima < 0) {
            throw new Error(`[400] Qty Diterima untuk item ${poItem.bahanPokok?.nama || inputItem.itemId} harus berupa angka non-negatif`);
          }

          const maxQty = poItem.qtyRealisasi !== null && poItem.qtyRealisasi !== undefined
            ? Number(poItem.qtyRealisasi)
            : Number(poItem.qty);

          if (qtyDiterima > maxQty) {
            throw new Error(`[400] Qty Diterima (${qtyDiterima}) untuk item ${poItem.bahanPokok?.nama || inputItem.itemId} tidak boleh melebihi realisasi/kuantitas (${maxQty})`);
          }

          await tx.transaksiPembelianItem.update({
            where: { id: poItem.id },
            data: { qtyDiterima }
          });
        }
      }

      return await tx.transaksiPembelian.update({
        where: { id },
        data: {
          status: "DITERIMA",
          diterimaOlehId: req.user.sub,
          diterimaAt: new Date()
        },
        include: {
          items: { include: { bahanPokok: true } },
          supplier: true,
          diterimaOleh: { select: { id: true, nama: true, role: true } }
        }
      });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.startsWith("[404]")) {
      return res.status(404).json({ error: error.message.replace("[404] ", "") });
    }
    if (error.message && error.message.startsWith("[400]")) {
      return res.status(400).json({ error: error.message.replace("[400] ", "") });
    }
    if (error.message && error.message.startsWith("[409]")) {
      return res.status(409).json({ error: error.message.replace("[409] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyetujui PO" });
  }
});

module.exports = router;
