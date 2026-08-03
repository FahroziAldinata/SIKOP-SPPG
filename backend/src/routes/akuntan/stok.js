const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { normalizeDateUTC } = require("../../lib/accountingHelper");
const { validate } = require("../../middleware/validate");
const { logAudit } = require("../../lib/auditHelper");
const schemas = require("../../validators/akuntan");
const { saldoAwalBarangSnapshot } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();
const mutasiStokRouter = express.Router();
const validasiStokRouter = express.Router();

// ==========================================
// STOK: SALDO AWAL BARANG
// ==========================================

// POST /api/akuntan/saldo-awal-barang - Create SaldoAwalBarang
router.post("/", requireAuth, requireRole("AKUNTAN"), validate(schemas.saldoAwalBarangSchema), async (req, res) => {
  try {
    const { periodeId, bahanPokokId, saldoAwalQty, hargaBeliAwal } = req.body;

    const qty = parseFloat(saldoAwalQty);
    const harga = parseFloat(hargaBeliAwal);

    const bahanPokok = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahanPokok) {
      return res.status(404).json({ error: "Bahan Pokok tidak ditemukan" });
    }
    if (!bahanPokok.aktif) {
      return res.status(400).json({ error: "Bahan Pokok tidak aktif" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.saldoAwalBarang.create({
        data: {
          periodeId,
          bahanPokokId,
          saldoAwalQty: Math.round(qty * 1000) / 1000,
          hargaBeliAwal: Math.round(harga * 100) / 100
        },
        include: {
          bahanPokok: true
        }
      });

      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "SaldoAwalBarang",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: saldoAwalBarangSnapshot(rec)
      });

      return rec;
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Saldo awal untuk bahan pokok ini di periode yang sama sudah ada" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Periode atau Bahan Pokok tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan saldo awal barang" });
  }
});

// GET /api/akuntan/saldo-awal-barang - List SaldoAwalBarang for a period
router.get("/", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    const data = await prisma.saldoAwalBarang.findMany({
      where: { periodeId },
      include: { bahanPokok: true }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil saldo awal barang" });
  }
});

// PUT /api/akuntan/saldo-awal-barang/:id - Update SaldoAwalBarang
router.put("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { saldoAwalQty, hargaBeliAwal } = req.body || {};

    if (saldoAwalQty === undefined && hargaBeliAwal === undefined) {
      return res.status(400).json({ error: "Aturan setidaknya satu field (saldoAwalQty / hargaBeliAwal) dikirim" });
    }

    const dataToUpdate = {};

    if (saldoAwalQty !== undefined) {
      const qty = parseFloat(saldoAwalQty);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ error: "saldoAwalQty harus berupa angka non-negatif" });
      }
      dataToUpdate.saldoAwalQty = Math.round(qty * 1000) / 1000;
    }

    if (hargaBeliAwal !== undefined) {
      const harga = parseFloat(hargaBeliAwal);
      if (isNaN(harga) || harga < 0) {
        return res.status(400).json({ error: "hargaBeliAwal harus berupa angka non-negatif" });
      }
      dataToUpdate.hargaBeliAwal = Math.round(harga * 100) / 100;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.saldoAwalBarang.findUnique({
        where: { id },
        include: { bahanPokok: true }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Saldo awal barang tidak ditemukan");
      }

      const rec = await tx.saldoAwalBarang.update({
        where: { id },
        data: dataToUpdate,
        include: { bahanPokok: true }
      });

      // Audit log — UPDATE (dataLama = state sebelum update)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "SaldoAwalBarang",
        entityId: id,
        aksi: "UPDATE",
        dataLama: saldoAwalBarangSnapshot(existing),
        dataBaru: saldoAwalBarangSnapshot(rec)
      });

      return rec;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025" || (error.message && error.message.startsWith("[NOT_FOUND]"))) {
      return res.status(404).json({ error: "Saldo awal barang tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui saldo awal barang" });
  }
});

// DELETE /api/akuntan/saldo-awal-barang/:id - Delete SaldoAwalBarang
router.delete("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.saldoAwalBarang.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Saldo awal barang tidak ditemukan");
      }

      await tx.saldoAwalBarang.delete({ where: { id } });

      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "SaldoAwalBarang",
        entityId: id,
        aksi: "DELETE",
        dataLama: saldoAwalBarangSnapshot(existing),
        dataBaru: null
      });
    });
    res.json({ success: true, message: "Saldo awal barang berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025" || (error.message && error.message.startsWith("[NOT_FOUND]"))) {
      return res.status(404).json({ error: "Saldo awal barang tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus saldo awal barang" });
  }
});

// POST /api/akuntan/saldo-awal-barang/bulk - Bulk upsert SaldoAwalBarang
router.post("/bulk", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, items } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items wajib berupa array tidak kosong" });
    }

    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    let berhasil = 0;
    let gagal = 0;
    const detailGagal = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const { bahanPokokId, saldoAwalQty, hargaBeliAwal } = item || {};

        if (!bahanPokokId || saldoAwalQty === undefined || hargaBeliAwal === undefined) {
          gagal++;
          detailGagal.push({ index: i, error: "Field bahanPokokId, saldoAwalQty, dan hargaBeliAwal wajib diisi" });
          continue;
        }

        const qty = parseFloat(saldoAwalQty);
        const harga = parseFloat(hargaBeliAwal);

        if (isNaN(qty) || qty < 0 || isNaN(harga) || harga < 0) {
          gagal++;
          detailGagal.push({ index: i, error: "saldoAwalQty dan hargaBeliAwal harus berupa angka non-negatif" });
          continue;
        }

        const bahan = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
        if (!bahan || !bahan.aktif) {
          gagal++;
          detailGagal.push({ index: i, error: "Bahan Pokok tidak ditemukan atau tidak aktif" });
          continue;
        }

        const sebelum = await tx.saldoAwalBarang.findUnique({
          where: {
            periodeId_bahanPokokId: {
              periodeId,
              bahanPokokId
            }
          }
        });

        const rec = await tx.saldoAwalBarang.upsert({
          where: {
            periodeId_bahanPokokId: {
              periodeId,
              bahanPokokId
            }
          },
          update: {
            saldoAwalQty: Math.round(qty * 1000) / 1000,
            hargaBeliAwal: Math.round(harga * 100) / 100
          },
          create: {
            periodeId,
            bahanPokokId,
            saldoAwalQty: Math.round(qty * 1000) / 1000,
            hargaBeliAwal: Math.round(harga * 100) / 100
          }
        });

        // Audit log — 1 baris per item: CREATE bila row baru, UPDATE bila ada sebelum
        if (sebelum) {
          await logAudit(tx, {
            userId: req.user.sub,
            entityType: "SaldoAwalBarang",
            entityId: rec.id,
            aksi: "UPDATE",
            dataLama: saldoAwalBarangSnapshot(sebelum),
            dataBaru: saldoAwalBarangSnapshot(rec)
          });
        } else {
          await logAudit(tx, {
            userId: req.user.sub,
            entityType: "SaldoAwalBarang",
            entityId: rec.id,
            aksi: "CREATE",
            dataLama: null,
            dataBaru: saldoAwalBarangSnapshot(rec)
          });
        }

        berhasil++;
      }
    });

    res.json({
      success: true,
      total: items.length,
      berhasil,
      gagal,
      detailGagal
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses bulk saldo awal barang" });
  }
});


// POST /api/akuntan/mutasi-stok - Create MutasiStok
mutasiStokRouter.post("/", requireAuth, requireRole("AKUNTAN"), validate(schemas.mutasiStokSchema), async (req, res) => {
  try {
    const {
      bahanPokokId,
      tanggal,
      jenis,
      qty,
      keterangan,
      supplierId,
      hargaBeli,
      kelompokPenerima
    } = req.body;

    const parsedQty = parseFloat(qty);

    const targetTanggal = normalizeDateUTC(tanggal);

    const bahanPokok = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahanPokok) {
      return res.status(404).json({ error: "Bahan Pokok tidak ditemukan" });
    }
    if (!bahanPokok.aktif) {
      return res.status(400).json({ error: "Bahan Pokok tidak aktif" });
    }

    let targetSupplierId = null;
    let targetHargaBeli = null;
    let targetKelompokPenerima = null;

    if (jenis === "MASUK") {
      if (!supplierId) return res.status(400).json({ error: "supplierId wajib diisi untuk mutasi MASUK" });
      if (hargaBeli === undefined || hargaBeli === null) return res.status(400).json({ error: "hargaBeli wajib diisi untuk mutasi MASUK" });
      
      const parsedHarga = parseFloat(hargaBeli);
      if (isNaN(parsedHarga) || parsedHarga < 0) {
        return res.status(400).json({ error: "hargaBeli harus berupa angka non-negatif" });
      }

      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
         return res.status(404).json({ error: "Supplier tidak ditemukan" });
      }
      if (!supplier.aktif) {
        return res.status(400).json({ error: "Supplier tidak aktif" });
      }

      targetSupplierId = supplierId;
      targetHargaBeli = Math.round(parsedHarga * 100) / 100;
      
      if (kelompokPenerima) {
        return res.status(400).json({ error: "kelompokPenerima tidak boleh diisi untuk mutasi MASUK" });
      }
    } else if (jenis === "KELUAR") {
      if (!kelompokPenerima) {
        return res.status(400).json({ error: "kelompokPenerima wajib diisi untuk mutasi KELUAR" });
      }
      if (kelompokPenerima !== "SISWA" && kelompokPenerima !== "B3") {
        return res.status(400).json({ error: "kelompokPenerima harus SISWA atau B3" });
      }
      if (supplierId != null || hargaBeli != null) {
        return res.status(400).json({ error: "supplierId dan hargaBeli harus null atau tidak diisi untuk mutasi KELUAR" });
      }
      
      targetKelompokPenerima = kelompokPenerima;

      // [ASUMSI] Saldo tidak divalidasi (bisa minus), sistem hanya melakukan pencatatan mutasi.
    }

    const created = await prisma.mutasiStok.create({
      data: {
        bahanPokokId,
        tanggal: targetTanggal,
        jenis,
        qty: Math.round(parsedQty * 1000) / 1000,
        keterangan: keterangan || null,
        supplierId: targetSupplierId,
        hargaBeli: targetHargaBeli,
        kelompokPenerima: targetKelompokPenerima,
        createdById: req.user.sub
      },
      include: {
        bahanPokok: true,
        supplier: true
      }
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan mutasi stok" });
  }
});

// GET /api/akuntan/mutasi-stok - List MutasiStok
mutasiStokRouter.get("/", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    
    let whereClause = {};
    if (periodeId) {
      const period = await prisma.periode.findUnique({ where: { id: periodeId } });
      if (period) {
        whereClause.tanggal = {
          gte: period.tanggalMulai,
          lte: period.tanggalSelesai
        };
      }
    }

    const list = await prisma.mutasiStok.findMany({
      where: whereClause,
      include: {
        bahanPokok: true,
        supplier: true
      },
      orderBy: {
        tanggal: "desc"
      }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data mutasi stok" });
  }
});

// ==========================================
// VALIDASI STOK (Akuntan-only)
// ==========================================

// POST /api/akuntan/validasi-stok - Simpan validasi fisik baru
validasiStokRouter.post("/", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal, qtyDibeli, qtyTerpakai, catatan } = req.body || {};

    if (!bahanPokokId) {
      return res.status(400).json({ error: "bahanPokokId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }
    if (qtyDibeli === undefined || qtyDibeli === null) {
      return res.status(400).json({ error: "qtyDibeli wajib diisi" });
    }
    if (qtyTerpakai === undefined || qtyTerpakai === null) {
      return res.status(400).json({ error: "qtyTerpakai wajib diisi" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Pastikan bahanPokok ada di database
    const bahan = await prisma.bahanPokok.findUnique({ where: { id: bahanPokokId } });
    if (!bahan) {
      return res.status(404).json({ error: "Bahan pokok tidak ditemukan" });
    }

    // Hitung selisih server-side (derived value): selisih = qtyDibeli - qtyTerpakai
    const selisih = Number(qtyDibeli) - Number(qtyTerpakai);

    const created = await prisma.validasiStok.create({
      data: {
        bahanPokokId,
        tanggal: targetTanggal,
        qtyDibeli: Number(qtyDibeli),
        qtyTerpakai: Number(qtyTerpakai),
        selisih: selisih,
        catatan: catatan ? String(catatan).trim() : null,
        validatedById: req.user.sub
      }
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Validasi stok untuk bahan pokok pada tanggal ini sudah tercatat" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data validasi stok" });
  }
});

// GET /api/akuntan/validasi-stok - Riwayat validasi stok
validasiStokRouter.get("/", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal, limit, offset } = req.query;

    let take = limit ? parseInt(limit, 10) : 10;
    const skip = offset ? parseInt(offset, 10) : 0;
    if (isNaN(take) || take < 0 || isNaN(skip) || skip < 0) {
      return res.status(400).json({ error: "Parameter limit dan offset harus berupa angka non-negatif" });
    }
    take = Math.min(take, 100);

    const where = {};
    if (bahanPokokId) {
      where.bahanPokokId = bahanPokokId;
    }
    if (tanggal) {
      const targetTanggal = normalizeDateUTC(tanggal);
      if (isNaN(targetTanggal.getTime())) {
        return res.status(400).json({ error: "Format tanggal tidak valid" });
      }
      where.tanggal = targetTanggal;
    }

    const [list, total] = await Promise.all([
      prisma.validasiStok.findMany({
        where,
        take,
        skip,
        orderBy: { tanggal: "desc" },
        include: {
          bahanPokok: {
            select: {
              id: true,
              nama: true
            }
          },
          validatedBy: {
            select: {
              id: true,
              nama: true,
              username: true
            }
          }
        }
      }),
      prisma.validasiStok.count({ where })
    ]);

    res.json({
      data: list,
      pagination: {
        total,
        limit: take,
        offset: skip
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data validasi stok" });
  }
});

// GET /api/akuntan/validasi-stok/preview - Preview akumulasi MutasiStok s.d. tanggal terpilih
validasiStokRouter.get("/preview", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { bahanPokokId, tanggal } = req.query;

    if (!bahanPokokId) {
      return res.status(400).json({ error: "bahanPokokId wajib disertakan pada query parameter" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib disertakan pada query parameter" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Aggregation logic: sum qty dari MutasiStok lte targetTanggal
    const aggregations = await prisma.mutasiStok.groupBy({
      by: ["jenis"],
      where: {
        bahanPokokId,
        tanggal: {
          lte: targetTanggal
        }
      },
      _sum: {
        qty: true
      }
    });

    let qtyDibeli = 0;
    let qtyTerpakai = 0;

    for (const agg of aggregations) {
      if (agg.jenis === "MASUK") {
        qtyDibeli = agg._sum.qty ? Number(agg._sum.qty) : 0;
      } else if (agg.jenis === "KELUAR") {
        qtyTerpakai = agg._sum.qty ? Number(agg._sum.qty) : 0;
      }
    }

    const sisaSistem = qtyDibeli - qtyTerpakai;

    res.json({
      bahanPokokId,
      tanggal: targetTanggal.toISOString().split("T")[0],
      qtyDibeli,
      qtyTerpakai,
      sisaSistem
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses preview validasi stok" });
  }
});

module.exports = router;
module.exports.mutasiStokRouter = mutasiStokRouter;
module.exports.validasiStokRouter = validasiStokRouter;
