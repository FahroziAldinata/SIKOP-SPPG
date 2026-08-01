const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  normalizeDateUTC,
  recalcAktualAnggaran
} = require("../../lib/accountingHelper");
const { validate } = require("../../middleware/validate");
const { logAudit } = require("../../lib/auditHelper");
const schemas = require("../../validators/akuntan");
const { jurnalSnapshot } = require("./_helpers");

const router = express.Router();

// POST /api/akuntan/jurnal-transaksi - Create JurnalTransaksi
router.post("/", requireAuth, requireRole("AKUNTAN"), validate(schemas.jurnalSchema), async (req, res) => {
  try {
    const {
      periodeId,
      tanggal,
      uraian,
      jenis,
      nominal,
      akunDanaBiayaId,
      akunKasId,
      tagPengeluaran,
      transaksiPembelianId
    } = req.body;

    const parsedNominal = parseFloat(nominal) || 0;

    if (akunDanaBiayaId === akunKasId) {
      return res.status(400).json({ error: "akunDanaBiayaId dan akunKasId tidak boleh sama" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Lock Periode to prevent race conditions on nomorBukti calculation
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 2. Validate tanggal is within period range
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal transaksi harus berada di dalam batas rentang periode");
      }

      // 3. Validate accounts exist and are active
      const akunDanaBiaya = await tx.akun.findUnique({ where: { id: akunDanaBiayaId } });
      if (!akunDanaBiaya) {
        throw new Error("[NOT_FOUND] Akun Dana/Biaya tidak ditemukan");
      }
      if (!akunDanaBiaya.aktif) {
        throw new Error("[VALIDASI] Akun Dana/Biaya tidak aktif");
      }

      const akunKas = await tx.akun.findUnique({ where: { id: akunKasId } });
      if (!akunKas) {
        throw new Error("[NOT_FOUND] Akun Kas tidak ditemukan");
      }
      if (!akunKas.aktif) {
        throw new Error("[VALIDASI] Akun Kas tidak aktif");
      }

      // 4. Validate transaksiPembelian exists if provided and nominal matches subtotalRealisasi PO
      if (transaksiPembelianId) {
        const tp = await tx.transaksiPembelian.findUnique({
          where: { id: transaksiPembelianId },
          include: { items: true }
        });
        if (!tp) {
          throw new Error("[NOT_FOUND] Transaksi pembelian tidak ditemukan");
        }
        if (tp.status !== "DIREALISASI") {
          throw new Error("[VALIDASI] PO belum direalisasi penuh, tidak bisa dilink ke jurnal");
        }

        // ANTI-DOBEL: satu PO hanya boleh punya satu jurnal terkait
        const jurnalTerkait = await tx.jurnalTransaksi.findFirst({
          where: { transaksiPembelianId }
        });
        if (jurnalTerkait) {
          throw new Error("[VALIDASI] PO sudah di-jurnalkan");
        }

        const totalRealisasi = tp.items.reduce((sum, item) => {
          const subtotal = item.subtotalRealisasi != null
            ? parseFloat(item.subtotalRealisasi.toString())
            : (item.subtotal != null ? parseFloat(item.subtotal.toString()) : 0);
          return sum + subtotal;
        }, 0);

        const expectedNominal = Math.round(totalRealisasi * 100) / 100;
        const actualNominal = Math.round(parsedNominal * 100) / 100;

        if (Math.abs(actualNominal - expectedNominal) > 0.01) {
          throw new Error(`[VALIDASI] Nominal jurnal (${actualNominal}) harus sama dengan subtotal realisasi PO (${expectedNominal})`);
        }
      }

      // 5. Calculate nomorBukti (auto-increment manual per periode)
      const maxBukti = await tx.jurnalTransaksi.aggregate({
        _max: {
          nomorBukti: true
        },
        where: {
          periodeId
        }
      });
      const nextNomorBukti = (maxBukti._max.nomorBukti || 0) + 1;

      // 6. Create JurnalTransaksi
      const jurnal = await tx.jurnalTransaksi.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          nomorBukti: nextNomorBukti,
          uraian,
          jenis,
          nominal: Math.round(parsedNominal * 100) / 100, // round to 2 decimals
          akunDanaBiayaId,
          akunKasId,
          tagPengeluaran,
          transaksiPembelianId,
          createdById: req.user.sub
        },
        include: {
          akunDanaBiaya: true,
          akunKas: true
        }
      });

      // 7. Recalculate AnggaranHarian.aktual if account has kategoriDana
      if (akunDanaBiaya.kategoriDana) {
        await recalcAktualAnggaran(tx, periodeId, targetTanggal, akunDanaBiaya.kategoriDana);
      }

      // 8. Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JurnalTransaksi",
        entityId: jurnal.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: jurnalSnapshot(jurnal)
      });

      return jurnal;
    }, { timeout: 15000 });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Nomor bukti transaksi sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan jurnal transaksi" });
  }
});

// GET /api/akuntan/jurnal-transaksi - List JurnalTransaksi with pagination
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      periodeId: periodeId || undefined
    };

    const [total, data] = await Promise.all([
      prisma.jurnalTransaksi.count({ where: whereClause }),
      prisma.jurnalTransaksi.findMany({
        where: whereClause,
        include: {
          akunDanaBiaya: true,
          akunKas: true
        },
        orderBy: [
          { tanggal: "desc" },
          { nomorBukti: "desc" }
        ],
        skip,
        take: limitNum
      })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar jurnal transaksi" });
  }
});

// GET /api/akuntan/jurnal-transaksi/prefill/:transaksiPembelianId - Akuntan prefill jurnal data dari PO
router.get("/prefill/:transaksiPembelianId", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { transaksiPembelianId } = req.params;
    const po = await prisma.transaksiPembelian.findUnique({
      where: { id: transaksiPembelianId },
      include: {
        supplier: true,
        items: true
      }
    });

    if (!po) {
      return res.status(404).json({ error: "PO tidak ditemukan" });
    }

    if (po.status !== "DIREALISASI") {
      return res.status(409).json({ error: "PO belum lengkap direalisasi" });
    }

    // ANTI-DOBEL: PO yang sudah punya jurnal tidak bisa di-prefill lagi
    const existingJurnal = await prisma.jurnalTransaksi.findFirst({
      where: { transaksiPembelianId }
    });
    if (existingJurnal) {
      return res.status(409).json({ error: "PO sudah di-jurnalkan" });
    }

    const totalRealisasi = po.items.reduce((sum, item) => {
      const subtotal = item.subtotalRealisasi != null
        ? parseFloat(item.subtotalRealisasi.toString())
        : (item.subtotal != null ? parseFloat(item.subtotal.toString()) : 0);
      return sum + subtotal;
    }, 0);

    const formattedTanggal = po.tanggal instanceof Date ? po.tanggal.toISOString().split("T")[0] : po.tanggal;

    // Search default accounts for PO: kode "2190" (Biaya Bahan Baku) & kode "1102" (Kas di Bank)
    const [akunBiaya, akunBank] = await Promise.all([
      prisma.akun.findFirst({ where: { kode: "2190" } }),
      prisma.akun.findFirst({ where: { kode: "1102" } })
    ]);

    res.json({
      tanggal: formattedTanggal,
      uraian: `Pembelian - ${po.supplier.nama}`,
      nominal: Math.round(totalRealisasi * 100) / 100,
      akunDanaBiayaId: akunBiaya?.id || null,
      akunKasId: akunBank?.id || null,
      transaksiPembelianId: po.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses prefill data jurnal" });
  }
});

// GET /api/akuntan/jurnal-transaksi/bulk-preview?periodeId=X
// List semua PO DIREALISASI yang BELUM di-jurnal — utk modal bulk generate (desain Rozi)
router.get("/bulk-preview", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }

    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const pos = await prisma.transaksiPembelian.findMany({
      where: {
        status: "DIREALISASI",
        rabHarian: { periodeId },
        jurnalTerkait: { none: {} }
      },
      include: {
        supplier: true,
        items: { include: { bahanPokok: true } }
      },
      orderBy: [{ tanggal: "asc" }, { createdAt: "asc" }]
    });

    const data = pos.map((po, idx) => {
      const items = (po.items || []).map((i) => {
        const qty = i.qtyRealisasi != null ? Number(i.qtyRealisasi) : Number(i.qty || 0);
        const harga = i.hargaSatuanRealisasi != null ? Number(i.hargaSatuanRealisasi) : Number(i.hargaSatuan || 0);
        const sub = i.subtotalRealisasi != null ? Number(i.subtotalRealisasi) : Math.round(qty * harga * 100) / 100;
        return {
          id: i.id,
          namaBahan: i.bahanPokok.nama,
          satuan: i.bahanPokok.satuan,
          qtyRealisasi: qty,
          hargaSatuanRealisasi: harga,
          subtotalRealisasi: sub
        };
      });
      const total = Math.round(items.reduce((s, it) => s + it.subtotalRealisasi, 0) * 100) / 100;
      return {
        id: po.id,
        nomorPo: `PO-${String(idx + 1).padStart(3, "0")}`,
        tanggal: po.tanggal,
        supplier: { nama: po.supplier?.nama || "-" },
        items,
        total
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil preview bulk jurnal" });
  }
});

// POST /api/akuntan/jurnal-transaksi/bulk-generate
// Generate jurnal KELUAR sekaligus untuk banyak PO DIREALISASI (desain Rozi)
router.post("/bulk-generate", requireAuth, requireRole("AKUNTAN"), validate(schemas.bulkGenerateSchema), async (req, res) => {
  try {
    const { periodeId, rows } = req.body;

    const createdJurnals = await prisma.$transaction(async (tx) => {
      // 1. Lock Periode utk serialisasi nomorBukti
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 2. Akun default — tiru pola prefill existing (biaya bahan baku + kas bank)
      const [akunBiaya, akunKas] = await Promise.all([
        tx.akun.findFirst({ where: { kategoriDana: "BAHAN_MAKANAN", tipe: "BIAYA", aktif: true } }),
        tx.akun.findFirst({ where: { kode: "1102", aktif: true } })
      ]);
      const akunDanaBiaya = akunBiaya || await tx.akun.findFirst({ where: { kode: "2190" } });
      const akunKasFinal = akunKas || await tx.akun.findFirst({ where: { tipe: "KAS", aktif: true } });
      if (!akunDanaBiaya) {
        throw new Error("[NOT_FOUND] Akun Biaya Bahan Baku tidak ditemukan di database");
      }
      if (!akunKasFinal) {
        throw new Error("[NOT_FOUND] Akun Kas tidak ditemukan di database");
      }

      // 3. Pre-fetch seluruh PO DIREALISASI belum di-jurnal utk nomorPo konsisten dgn preview
      const allUnjournaled = await tx.transaksiPembelian.findMany({
        where: {
          status: "DIREALISASI",
          rabHarian: { periodeId },
          jurnalTerkait: { none: {} }
        },
        orderBy: [{ tanggal: "asc" }, { createdAt: "asc" }]
      });
      const nomorPoMap = {};
      allUnjournaled.forEach((po, idx) => {
        nomorPoMap[po.id] = `PO-${String(idx + 1).padStart(3, "0")}`;
      });

      // 4. ANTI-DOBEL batch: semua PO dalam request harus belum di-jurnal
      const poIds = rows.map(r => r.transaksiPembelianId);
      const journaled = await tx.jurnalTransaksi.findMany({
        where: { transaksiPembelianId: { in: poIds } },
        select: { transaksiPembelianId: true }
      });
      if (journaled.length > 0) {
        throw new Error("[VALIDASI] Ada PO yang sudah di-jurnalkan, proses dibatalkan");
      }

      // 5. Nomor bukti awal (auto-increment per periode, pola POST /jurnal-transaksi)
      const maxBukti = await tx.jurnalTransaksi.aggregate({
        _max: { nomorBukti: true },
        where: { periodeId }
      });
      let nextNomorBukti = (maxBukti._max.nomorBukti || 0) + 1;

      const resultJurnals = [];
      for (const row of rows) {
        const { transaksiPembelianId, items: rowItems } = row;

        const po = await tx.transaksiPembelian.findUnique({
          where: { id: transaksiPembelianId },
          include: { items: { include: { bahanPokok: true } }, supplier: true }
        });
        if (!po) {
          throw new Error(`[NOT_FOUND] PO tidak ditemukan: ${transaksiPembelianId}`);
        }
        if (po.status !== "DIREALISASI") {
          throw new Error(`[VALIDASI] PO ${nomorPoMap[po.id] || po.id} belum direalisasi penuh, tidak bisa di-jurnal`);
        }

        const itemById = {};
        po.items.forEach(i => { itemById[i.id] = i; });

        let totalSubtotal = 0;
        for (const it of rowItems) {
          const item = itemById[it.id];
          if (!item) {
            throw new Error(`[NOT_FOUND] Item PO tidak ditemukan: ${it.id}`);
          }

          const numHarga = Math.round(Number(it.hargaSatuanRealisasi) * 100) / 100;
          if (isNaN(numHarga) || numHarga < 0) {
            throw new Error("[VALIDASI] hargaSatuanRealisasi harus berupa angka non-negatif");
          }

          const qty = item.qtyRealisasi != null ? Number(item.qtyRealisasi) : Number(item.qty || 0);
          const newSubtotal = Math.round(qty * numHarga * 100) / 100;

          // Update harga hanya kalau beda + hitung ulang subtotal realisasi
          const currentHarga = item.hargaSatuanRealisasi != null ? Number(item.hargaSatuanRealisasi) : null;
          const currentSubtotal = item.subtotalRealisasi != null ? Number(item.subtotalRealisasi) : null;
          if (currentHarga === null || Math.abs(currentHarga - numHarga) > 0.01 || currentSubtotal === null || Math.abs(currentSubtotal - newSubtotal) > 0.01) {
            await tx.transaksiPembelianItem.update({
              where: { id: item.id },
              data: {
                hargaSatuanRealisasi: numHarga,
                subtotalRealisasi: newSubtotal,
                updatedById: req.user.sub
              }
            });
          }

          totalSubtotal += newSubtotal;
        }

        totalSubtotal = Math.round(totalSubtotal * 100) / 100;

        // Buat JurnalTransaksi KELUAR
        const jurnal = await tx.jurnalTransaksi.create({
          data: {
            periodeId,
            tanggal: normalizeDateUTC(po.tanggal),
            nomorBukti: nextNomorBukti++,
            uraian: `Realisasi PO ${nomorPoMap[po.id] || po.id}`,
            jenis: "KELUAR",
            nominal: totalSubtotal,
            akunDanaBiayaId: akunDanaBiaya.id,
            akunKasId: akunKasFinal.id,
            transaksiPembelianId: po.id,
            createdById: req.user.sub
          },
          include: { akunDanaBiaya: true, akunKas: true }
        });

        // Recalc AnggaranHarian utk kategori dana akun biaya
        if (akunDanaBiaya.kategoriDana) {
          await recalcAktualAnggaran(tx, periodeId, jurnal.tanggal, akunDanaBiaya.kategoriDana);
        }

        // Audit log — CREATE (pola existing)
        await logAudit(tx, {
          userId: req.user.sub,
          entityType: "JurnalTransaksi",
          entityId: jurnal.id,
          aksi: "CREATE",
          dataLama: null,
          dataBaru: jurnalSnapshot(jurnal)
        });

        resultJurnals.push(jurnal);
      }

      return resultJurnals;
    }, { timeout: 30000 });

    res.status(201).json({
      success: true,
      data: createdJurnals,
      count: createdJurnals.length
    });
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat generate bulk jurnal" });
  }
});

// GET /api/akuntan/jurnal-transaksi/:id - Detail JurnalTransaksi
router.get("/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.jurnalTransaksi.findUnique({
      where: { id },
      include: {
        akunDanaBiaya: true,
        akunKas: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data jurnal transaksi tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail jurnal transaksi" });
  }
});

// PUT /api/akuntan/jurnal-transaksi/:id - Update JurnalTransaksi
router.put("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tanggal,
      uraian,
      jenis,
      nominal,
      akunDanaBiayaId,
      akunKasId,
      tagPengeluaran,
      transaksiPembelianId
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.jurnalTransaksi.findUnique({
        where: { id },
        include: { akunDanaBiaya: true }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data jurnal transaksi tidak ditemukan");
      }

      const targetTanggal = tanggal !== undefined ? normalizeDateUTC(tanggal) : existing.tanggal;
      if (tanggal !== undefined && isNaN(targetTanggal.getTime())) {
        throw new Error("[VALIDASI] Format tanggal tidak valid");
      }

      const targetAkunDanaBiayaId = akunDanaBiayaId !== undefined ? akunDanaBiayaId : existing.akunDanaBiayaId;
      const targetAkunKasId = akunKasId !== undefined ? akunKasId : existing.akunKasId;

      if (targetAkunDanaBiayaId === targetAkunKasId) {
        throw new Error("[VALIDASI] akunDanaBiayaId dan akunKasId tidak boleh sama");
      }

      const targetNominal = nominal !== undefined ? parseFloat(nominal) : parseFloat(existing.nominal);
      if (isNaN(targetNominal) || targetNominal <= 0) {
        throw new Error("[VALIDASI] nominal harus berupa angka positif");
      }

      const targetUraian = uraian !== undefined ? uraian : existing.uraian;
      if (!targetUraian) {
        throw new Error("[VALIDASI] uraian tidak boleh kosong");
      }

      const targetJenis = jenis !== undefined ? jenis : existing.jenis;
      if (targetJenis !== "MASUK" && targetJenis !== "KELUAR") {
        throw new Error("[VALIDASI] jenis transaksi tidak valid (MASUK atau KELUAR)");
      }

      let newAkunDanaBiaya = existing.akunDanaBiaya;
      if (akunDanaBiayaId !== undefined && akunDanaBiayaId !== existing.akunDanaBiayaId) {
        const checkDanaBiaya = await tx.akun.findUnique({ where: { id: akunDanaBiayaId } });
        if (!checkDanaBiaya) {
          throw new Error("[NOT_FOUND] Akun Dana/Biaya tidak ditemukan");
        }
        if (!checkDanaBiaya.aktif) {
          throw new Error("[VALIDASI] Akun Dana/Biaya tidak aktif");
        }
        newAkunDanaBiaya = checkDanaBiaya;
      }

      if (akunKasId !== undefined && akunKasId !== existing.akunKasId) {
        const checkKas = await tx.akun.findUnique({ where: { id: akunKasId } });
        if (!checkKas) {
          throw new Error("[NOT_FOUND] Akun Kas tidak ditemukan");
        }
        if (!checkKas.aktif) {
          throw new Error("[VALIDASI] Akun Kas tidak aktif");
        }
      }

      const targetTransaksiPembelianId = transaksiPembelianId !== undefined ? transaksiPembelianId : existing.transaksiPembelianId;

      if (targetTransaksiPembelianId) {
        const tp = await tx.transaksiPembelian.findUnique({
          where: { id: targetTransaksiPembelianId },
          include: { items: true }
        });
        if (!tp) {
          throw new Error("[NOT_FOUND] Transaksi pembelian tidak ditemukan");
        }
        if (tp.status !== "DIREALISASI") {
          throw new Error("[VALIDASI] PO belum direalisasi penuh, tidak bisa dilink ke jurnal");
        }

        const totalRealisasi = tp.items.reduce((sum, item) => {
          const subtotal = item.subtotalRealisasi != null
            ? parseFloat(item.subtotalRealisasi.toString())
            : (item.subtotal != null ? parseFloat(item.subtotal.toString()) : 0);
          return sum + subtotal;
        }, 0);

        const expectedNominal = Math.round(totalRealisasi * 100) / 100;
        const actualNominal = Math.round(targetNominal * 100) / 100;

        if (Math.abs(actualNominal - expectedNominal) > 0.01) {
          throw new Error(`[VALIDASI] Nominal jurnal (${actualNominal}) harus sama dengan subtotal realisasi PO (${expectedNominal})`);
        }
      }

      if (tanggal !== undefined) {
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal transaksi harus berada di dalam batas rentang periode");
        }
      }

      const oldKategori = existing.akunDanaBiaya.kategoriDana;
      const oldTanggal = existing.tanggal;

      const result = await tx.jurnalTransaksi.update({
        where: { id },
        data: {
          tanggal: targetTanggal,
          uraian: targetUraian,
          jenis: targetJenis,
          nominal: Math.round(targetNominal * 100) / 100,
          akunDanaBiayaId: targetAkunDanaBiayaId,
          akunKasId: targetAkunKasId,
          tagPengeluaran: tagPengeluaran !== undefined ? tagPengeluaran : undefined,
          transaksiPembelianId: transaksiPembelianId !== undefined ? transaksiPembelianId : undefined
        },
        include: {
          akunDanaBiaya: true,
          akunKas: true
        }
      });

      if (oldKategori) {
        await recalcAktualAnggaran(tx, existing.periodeId, oldTanggal, oldKategori);
      }

      const newKategori = result.akunDanaBiaya.kategoriDana;
      const newTanggal = result.tanggal;

      const isSameBudgetLine =
        oldKategori === newKategori &&
        oldTanggal.getTime() === newTanggal.getTime();

      if (newKategori && !isSameBudgetLine) {
        await recalcAktualAnggaran(tx, existing.periodeId, newTanggal, newKategori);
      }

      // Audit log — UPDATE (dataLama = state sebelum update)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JurnalTransaksi",
        entityId: id,
        aksi: "UPDATE",
        dataLama: jurnalSnapshot(existing),
        dataBaru: jurnalSnapshot(result)
      });

      return result;
    }, { timeout: 15000 });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui jurnal transaksi" });
  }
});

// DELETE /api/akuntan/jurnal-transaksi/:id - Delete JurnalTransaksi
router.delete("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.jurnalTransaksi.findUnique({
        where: { id },
        include: { akunDanaBiaya: true }
      });

      if (!existing) {
        throw new Error("[NOT_FOUND] Data jurnal transaksi tidak ditemukan");
      }

      const oldKategori = existing.akunDanaBiaya.kategoriDana;
      const oldTanggal = existing.tanggal;

      const result = await tx.jurnalTransaksi.delete({
        where: { id }
      });

      if (oldKategori) {
        await recalcAktualAnggaran(tx, existing.periodeId, oldTanggal, oldKategori);
      }

      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JurnalTransaksi",
        entityId: id,
        aksi: "DELETE",
        dataLama: jurnalSnapshot(existing),
        dataBaru: null
      });

      return result;
    }, { timeout: 15000 });

    res.json({ success: true, message: "Jurnal transaksi berhasil dihapus", data: deleted });
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus jurnal transaksi" });
  }
});

module.exports = router;
