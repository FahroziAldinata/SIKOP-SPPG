const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { normalizeDateUTC, HARI_MAP, getTotalPorsiBlok } = require("../lib/accountingHelper");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/mitra");
const { launchPuppeteer } = require("../lib/launchPuppeteer");
const { renderNotaPesananHtml } = require("../templates/dokumen/notaPesanan");
const { renderPoRealisasiHtml } = require("../templates/dokumen/poRealisasi");
const { injectTtdImages } = require("../templates/dokumen/shared");
const { logger } = require("../lib/logger");
const { logAudit } = require("../lib/auditHelper");

const router = express.Router();

// ==========================================
// CRUD BAHAN POKOK (READ-ONLY FOR MITRA & OTHERS)
// ==========================================

// GET /api/mitra/bahan-pokok - List all master food ingredients
router.get("/bahan-pokok", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.bahanPokok.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data bahan pokok" });
  }
});

// PUT /api/mitra/bahan-pokok/:id - Update master food ingredient conversion config
router.put("/bahan-pokok/:id", requireAuth, requireRole("MITRA"), validate(schemas.bahanPokokSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { konversiPerKg, satuanHitungan } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.bahanPokok.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
      }
      const updated = await tx.bahanPokok.update({
        where: { id },
        data: {
          konversiPerKg: konversiPerKg !== undefined && konversiPerKg !== null && konversiPerKg !== "" ? parseFloat(konversiPerKg) : null,
          satuanHitungan: satuanHitungan !== undefined && satuanHitungan !== null && satuanHitungan !== "" ? satuanHitungan.toUpperCase() : null
        }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "BahanPokok",
        entityId: updated.id,
        aksi: "UPDATE",
        dataLama: existing,
        dataBaru: updated
      });
      return updated;
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[NOT_FOUND]")) {
      return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data bahan pokok" });
  }
});

// ==========================================
// CRUD KENDARAAN (MITRA OWNS LOGISTICS VEHICLE SETUP)
// ==========================================

// GET /api/mitra/kendaraan - List Kendaraan
router.get("/kendaraan", requireAuth, requireRole("MITRA", "AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.kendaraan.findMany({
      orderBy: [
        { aktif: "desc" },
        { namaKendaraan: "asc" }
      ]
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar kendaraan" });
  }
});

// GET /api/mitra/kendaraan/:id - Detail Kendaraan
router.get("/kendaraan/:id", requireAuth, requireRole("MITRA", "AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.kendaraan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail kendaraan" });
  }
});

// POST /api/mitra/kendaraan - Create Kendaraan
router.post("/kendaraan", requireAuth, requireRole("MITRA"), validate(schemas.kendaraanSchema), async (req, res) => {
  try {
    const { namaKendaraan, platNomor, aktif } = req.body || {};

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.kendaraan.create({
        data: {
          namaKendaraan,
          platNomor,
          aktif: aktif !== undefined ? Boolean(aktif) : true
        }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Kendaraan",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: rec
      });
      return rec;
    });
    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan kendaraan" });
  }
});

// PUT /api/mitra/kendaraan/:id - Update Kendaraan
router.put("/kendaraan/:id", requireAuth, requireRole("MITRA"), validate(schemas.updateKendaraanSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { namaKendaraan, platNomor, aktif } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.kendaraan.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data kendaraan tidak ditemukan");
      }

      const rec = await tx.kendaraan.update({
        where: { id },
        data: {
          namaKendaraan: namaKendaraan !== undefined ? namaKendaraan : undefined,
          platNomor: platNomor !== undefined ? platNomor : undefined,
          aktif: aktif !== undefined ? Boolean(aktif) : undefined
        }
      });
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Kendaraan",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: existing,
        dataBaru: rec
      });
      return rec;
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[NOT_FOUND]")) {
      return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui kendaraan" });
  }
});

// DELETE /api/mitra/kendaraan/:id - Delete Kendaraan
router.delete("/kendaraan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const exists = await tx.kendaraan.findUnique({ where: { id } });
      if (!exists) {
        throw new Error("[NOT_FOUND] Data kendaraan tidak ditemukan");
      }
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Kendaraan",
        entityId: exists.id,
        aksi: "DELETE",
        dataLama: exists,
        dataBaru: null
      });
      await tx.kendaraan.delete({ where: { id } });
    });
    res.json({ success: true, message: "Data kendaraan berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[NOT_FOUND]")) {
      return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
    }
    if (error.code === "P2025") return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "Kendaraan tidak dapat dihapus karena masih digunakan pada data pengiriman" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus kendaraan" });
  }
});

// ==========================================
// CRUD HARGA BAHAN PERIODE
// ==========================================

// GET /api/mitra/harga-bahan - Get list of ingredient prices per period
// Catatan keputusan desain: periodeId wajib di query param karena data harga bahan
// per periode bisa sangat banyak, membatasi load DB untuk skala performa.
router.get("/harga-bahan", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const data = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId },
      include: {
        bahanPokok: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        }
      },
      orderBy: {
        bahanPokok: { nama: "asc" }
      }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data harga bahan" });
  }
});

// GET /api/mitra/harga-bahan/:id - Get single ingredient price entry
router.get("/harga-bahan/:id", requireAuth, requireRole("MITRA", "ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.hargaBahanPeriode.findUnique({
      where: { id },
      include: {
        bahanPokok: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data harga bahan" });
  }
});

// POST /api/mitra/harga-bahan - Create new ingredient price for a period
router.post("/harga-bahan", requireAuth, requireRole("MITRA"), validate(schemas.hargaBahanSchema), async (req, res) => {
  try {
    const { periodeId, bahanPokokId, harga, isFallback } = req.body || {};
    const numHarga = parseFloat(harga);

    const created = await prisma.$transaction(async (tx) => {
      // 2. Validate period exists
      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Validate food ingredient exists
      const ingredientExists = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
      if (!ingredientExists) {
        throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
      }

      // 4. Validate unique constraint: [periodeId, bahanPokokId]
      const existing = await tx.hargaBahanPeriode.findUnique({
        where: {
          periodeId_bahanPokokId: {
            periodeId,
            bahanPokokId
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Harga bahan pokok untuk periode ini sudah terdaftar");
      }

      // 5. Create in database
      const rec = await tx.hargaBahanPeriode.create({
        data: {
          periodeId,
          bahanPokokId,
          harga: numHarga,
          isFallback: !!isFallback,
          createdById: req.user.sub
        },
        include: {
          bahanPokok: true
        }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "HargaBahanPeriode",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: rec
      });

      return rec;
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Harga bahan pokok untuk periode ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan harga bahan" });
  }
});

// PUT /api/mitra/harga-bahan/:id - Update existing ingredient price for a period
router.put("/harga-bahan/:id", requireAuth, requireRole("MITRA"), validate(schemas.updateHargaBahanSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeId, bahanPokokId, harga, isFallback } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Check exists
      const existingRecord = await tx.hargaBahanPeriode.findUnique({
        where: { id }
      });
      if (!existingRecord) {
        throw new Error("[NOT_FOUND] Data harga bahan pokok tidak ditemukan");
      }

      // Determine target values
      const targetPeriodeId = periodeId || existingRecord.periodeId;
      const targetBahanPokokId = bahanPokokId || existingRecord.bahanPokokId;
      const targetHarga = harga !== undefined ? parseFloat(harga) : parseFloat(existingRecord.harga);
      const targetIsFallback = isFallback !== undefined ? !!isFallback : existingRecord.isFallback;

      if (isNaN(targetHarga) || targetHarga < 0) {
        throw new Error("[VALIDASI] harga harus berupa angka non-negatif");
      }

      // Validate target period
      if (periodeId && periodeId !== existingRecord.periodeId) {
        const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
        if (!periodExists) {
          throw new Error("[NOT_FOUND] Periode tidak ditemukan");
        }
      }

      // Validate target food ingredient
      if (bahanPokokId && bahanPokokId !== existingRecord.bahanPokokId) {
        const ingredientExists = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
        if (!ingredientExists) {
          throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
        }
      }

      // Check unique constraint excluding this record itself
      const conflict = await tx.hargaBahanPeriode.findFirst({
        where: {
          periodeId: targetPeriodeId,
          bahanPokokId: targetBahanPokokId,
          NOT: { id }
        }
      });
      if (conflict) {
        throw new Error("[CONFLICT] Harga bahan pokok untuk periode ini sudah terdaftar");
      }

      // Update
      const rec = await tx.hargaBahanPeriode.update({
        where: { id },
        data: {
          periodeId: targetPeriodeId,
          bahanPokokId: targetBahanPokokId,
          harga: targetHarga,
          isFallback: targetIsFallback
        },
        include: {
          bahanPokok: true
        }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "HargaBahanPeriode",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: existingRecord,
        dataBaru: rec
      });

      return rec;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Harga bahan pokok untuk periode ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui harga bahan" });
  }
});

// DELETE /api/mitra/harga-bahan/:id - Delete existing ingredient price entry
router.delete("/harga-bahan/:id", requireAuth, requireRole("MITRA"), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      const exists = await tx.hargaBahanPeriode.findUnique({
        where: { id }
      });
      if (!exists) {
        throw new Error("[NOT_FOUND] Data harga bahan pokok tidak ditemukan");
      }

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "HargaBahanPeriode",
        entityId: exists.id,
        aksi: "DELETE",
        dataLama: exists,
        dataBaru: null
      });

      await tx.hargaBahanPeriode.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: "Data harga bahan pokok berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[NOT_FOUND]")) {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data harga bahan pokok tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus harga bahan" });
  }
});



// GET /api/mitra/po/kebutuhan - Get ingredient requirements for a specific date
router.get("/po/kebutuhan", requireAuth, requireRole("MITRA", "AKUNTAN"), async (req, res) => {
  try {
    const { tanggal, periodeId } = req.query;
    if (!tanggal || !periodeId) {
      return res.status(400).json({ error: "tanggal dan periodeId wajib diisi" });
    }

    // ========== B.13: Validasi RAB untuk setiap tanggal ==========
    for (const tgl of tanggal.split(',').map(t => t.trim()).filter(Boolean)) {
      const rabExists = await prisma.rabHarian.findFirst({
        where: {
          periodeId,
          tanggal: normalizeDateUTC(tgl),
          status: "DISETUJUI"
        }
      });
      if (!rabExists) {
        return res.status(400).json({
          success: false,
          error: `RAB Harian untuk tanggal ${tgl} belum disetujui. PO tidak dapat dibuat.`,
          ingredients: []
        });
      }
    }
    // =============================================================

    const tanggalArr = tanggal.split(',').map(t => t.trim()).filter(Boolean);
    if (tanggalArr.length === 0) {
      return res.status(400).json({ error: "tanggal tidak boleh kosong" });
    }

    // Get active price list for this period
    const priceList = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId }
    });
    const priceMap = {};
    priceList.forEach(p => {
      priceMap[p.bahanPokokId] = Number(p.harga);
    });

    // Fetch active InputPenerimaManfaat once
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    const menuByTanggal = {};
    const akumulasiBahan = {};

    for (const tgl of tanggalArr) {
      const targetDate = normalizeDateUTC(tgl);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: `Format tanggal tidak valid: ${tgl}` });
      }

      // Fetch MenuHarian for this date & period
      const menu = await prisma.menuHarian.findFirst({
        where: {
          periodeId,
          tanggal: targetDate
        },
        include: {
          blok: {
            include: {
              kelompokUmurMenu: {
                include: { kategoriPenerima: true }
              },
              menuItem: {
                include: {
                  bahan: {
                    include: { bahanPokok: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!menu) {
        menuByTanggal[tgl] = "";
        continue;
      }

      // Construct Menu description string for this date
      const menuNames = [];
      menu.blok.forEach(b => {
        b.menuItem.forEach(item => {
          if (!menuNames.includes(item.nama)) {
            menuNames.push(item.nama);
          }
        });
      });
      menuByTanggal[tgl] = menuNames.join(", ");

      const day = targetDate.getUTCDay();
      const dayOfWeek = HARI_MAP[day];
      let inputsForDay = [];
      if (dayOfWeek) {
        inputsForDay = activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek));
      }

      const porsiPerKategori = {};
      for (const input of inputsForDay) {
        for (const det of input.detail) {
          porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
        }
      }

      for (const blok of menu.blok) {
        // Calculate total portions for this block
        const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);

        for (const item of blok.menuItem) {
          for (const b of item.bahan) {
            const bid = b.bahanPokokId;
            if (!akumulasiBahan[bid]) {
              akumulasiBahan[bid] = {
                bahanPokokId: bid,
                nama: b.bahanPokok.nama,
                satuan: b.bahanPokok.satuan,
                qtySiswa: 0,
                qtyB3: 0,
                qtyTotal: 0,
                hargaSatuan: priceMap[bid] || 0,
                perTanggal: {}
              };
            }

            if (!akumulasiBahan[bid].perTanggal[tgl]) {
              akumulasiBahan[bid].perTanggal[tgl] = { siswa: 0, b3: 0 };
            }

            // Kebutuhan bahan = porsi * beratKotorGr / 1000
            const qtyNeed = (Number(b.beratKotorGr) * totalPorsiBlok) / 1000;
            
            if (blok.kelompokUmurMenu.jalur === "SISWA") {
              akumulasiBahan[bid].qtySiswa += qtyNeed;
              akumulasiBahan[bid].perTanggal[tgl].siswa += qtyNeed;
            } else {
              akumulasiBahan[bid].qtyB3 += qtyNeed;
              akumulasiBahan[bid].perTanggal[tgl].b3 += qtyNeed;
            }
            akumulasiBahan[bid].qtyTotal += qtyNeed;
          }
        }
      }
    }

    // Convert to rounded values
    const result = Object.values(akumulasiBahan).map(b => {
      const roundedPerTanggal = {};
      for (const tgl of tanggalArr) {
        const pt = b.perTanggal[tgl] || { siswa: 0, b3: 0 };
        roundedPerTanggal[tgl] = {
          siswa: Math.round(pt.siswa * 1000) / 1000,
          b3: Math.round(pt.b3 * 1000) / 1000
        };
      }
      return {
        bahanPokokId: b.bahanPokokId,
        nama: b.nama,
        satuan: b.satuan,
        hargaSatuan: b.hargaSatuan,
        qtySiswa: Math.round(b.qtySiswa * 1000) / 1000,
        qtyB3: Math.round(b.qtyB3 * 1000) / 1000,
        qtyTotal: Math.round(b.qtyTotal * 1000) / 1000,
        subtotal: Math.round((b.qtyTotal * b.hargaSatuan) * 100) / 100,
        perTanggal: roundedPerTanggal
      };
    });

    res.json({
      success: true,
      tanggalList: tanggalArr,
      menuDescription: Object.values(menuByTanggal).filter(Boolean).join(", "),
      menuByTanggal,
      ingredients: result
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses kebutuhan PO" });
  }
});

// POST /api/mitra/po - DEPRECATED: PO sekarang dibuat oleh Akuntan
router.post("/po", requireAuth, requireRole("MITRA"), (req, res) => {
  res.status(410).json({
    error: "PO sekarang dibuat oleh Akuntan. Gunakan endpoint POST /api/akuntan/po."
  });
});

// PUT /api/mitra/po/:id/realisasi - Mitra menginput realisasi belanja
router.put("/po/:id/realisasi", requireAuth, requireRole("MITRA"), validate(schemas.realisasiPoSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body || {};

    const po = await prisma.transaksiPembelian.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ error: "PO tidak ditemukan" });

    if (po.status !== "DIAJUKAN") {
      return res.status(409).json({
        error: "PO sudah direalisasi atau diterima, tidak bisa diubah lagi"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const { itemId, qtyRealisasi, hargaSatuanRealisasi } = item;

        if (!itemId) throw new Error("[VALIDASI] itemId wajib ada di setiap item realisasi");

        // Validate item ownership — item must belong to this PO
        const dbItem = await tx.transaksiPembelianItem.findUnique({ where: { id: itemId } });
        if (!dbItem || dbItem.transaksiId !== po.id) {
          throw new Error("[VALIDASI] Item tidak ditemukan pada PO ini");
        }

        const qty = parseFloat(qtyRealisasi);
        const harga = parseFloat(hargaSatuanRealisasi);
        if (isNaN(qty) || qty < 0) {
          throw new Error(`[VALIDASI] qtyRealisasi untuk item ${itemId} tidak valid`);
        }
        if (isNaN(harga) || harga < 0) {
          throw new Error(`[VALIDASI] hargaSatuanRealisasi untuk item ${itemId} tidak valid`);
        }

        await tx.transaksiPembelianItem.update({
          where: { id: itemId },
          data: {
            qtyRealisasi: Math.round(qty * 1000) / 1000,
            hargaSatuanRealisasi: Math.round(harga * 100) / 100,
            subtotalRealisasi: Math.round((qty * harga) * 100) / 100,
            updatedById: req.user.sub
          }
        });
      }

      // Check if ALL items of this PO now have qtyRealisasi
      const allItems = await tx.transaksiPembelianItem.findMany({
        where: { transaksiId: po.id },
        select: { qtyRealisasi: true }
      });
      const allRealized = allItems.every(i => i.qtyRealisasi !== null);
      const newStatus = allRealized ? "DIREALISASI" : "DIAJUKAN";

      const updatedPo = await tx.transaksiPembelian.update({
        where: { id },
        data: { status: newStatus },
        include: {
          items: { include: { bahanPokok: true } },
          supplier: true
        }
      });

      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "TransaksiPembelian",
        entityId: id,
        aksi: "UPDATE",
        dataLama: { status: po.status },
        dataBaru: { status: updatedPo.status }
      });

      return updatedPo;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[VALIDASI]")) {
      return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan realisasi PO" });
  }
});

// GET /api/mitra/po/list - List all TransaksiPembelian (POs) for a period
router.get("/po/list", requireAuth, requireRole("MITRA", "AKUNTAN", "ASLAP"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }

    const data = await prisma.transaksiPembelian.findMany({
      where: {
        rabHarian: { periodeId }
      },
      include: {
        supplier: true,
        rabHarian: {
          include: { periode: true }
        },
        createdBy: {
          select: { id: true, nama: true, role: true }
        },
        diterimaOleh: {
          select: { id: true, nama: true, role: true }
        },
        items: {
          include: { bahanPokok: true }
        }
      },
      orderBy: {
        tanggal: "desc"
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil list PO" });
  }
});

// GET /api/mitra/po/:id/pdf - Download PDF Nota Pesanan PO
router.get("/po/:id/pdf", requireAuth, requireRole("MITRA", "AKUNTAN", "ASLAP"), validate(schemas.idParamSchema, "params"), async (req, res) => {
  let browser;
  try {
    const { id } = req.params;

    const po = await prisma.transaksiPembelian.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, nama: true, role: true } },
        diterimaOleh: { select: { id: true, nama: true, role: true } },
        items: { include: { bahanPokok: true } },
        rabHarian: { include: { periode: true } }
      }
    });

    if (!po) {
      return res.status(404).json({ error: "PO / Nota Pesanan tidak ditemukan" });
    }

    const periodeId = po.rabHarian?.periodeId;
    let setupLembaga;
    if (periodeId) {
      setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    }
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || "",
      namaAkuntanSPPG: setupLembaga?.namaAkuntanSPPG || "",
      tahunAnggaran: setupLembaga?.tahunAnggaran || "",
      tempatPelaporan: setupLembaga?.tempatPelaporan || ""
    };

    const html = renderNotaPesananHtml({
      po,
      items: po.items,
      supplier: po.supplier,
      lembaga,
      user: req.user,
      tahunAnggaran: lembaga.tahunAnggaran
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Nota-Pesanan-${po.id}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[po/:id/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Nota Pesanan" });
  } finally {
    if (browser) await browser.close();
  }
});

// ==========================================
// HELPER DATA LAPORAN REALISASI PO
// ==========================================

async function getRealisasiPoData(periodeId) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId }
  });

  const rawPoList = await prisma.transaksiPembelian.findMany({
    where: {
      rabHarian: { periodeId }
    },
    include: {
      supplier: true,
      createdBy: {
        select: { id: true, nama: true, role: true }
      },
      diterimaOleh: {
        select: { id: true, nama: true, role: true }
      },
      items: {
        include: {
          bahanPokok: true
        }
      }
    },
    orderBy: {
      tanggal: "asc"
    }
  });

  let grandTotal = {
    totalPesan: 0,
    totalRealisasi: 0,
    totalDiterima: 0,
    subtotalPesan: 0,
    subtotalRealisasi: 0,
    jumlahItem: 0
  };

  const poList = rawPoList.map((po) => {
    let totalPesan = 0;
    let totalRealisasi = 0;
    let totalDiterima = 0;
    let subtotalPesan = 0;
    let subtotalRealisasi = 0;

    const items = (po.items || []).map((item) => {
      const qtyPesan = Number(item.qty || 0);
      const qtyRealisasi = item.qtyRealisasi != null ? Number(item.qtyRealisasi) : qtyPesan;
      const qtyDiterima = item.qtyDiterima != null ? Number(item.qtyDiterima) : 0;
      const subPesan = item.subtotal != null ? Number(item.subtotal) : 0;
      const subRealisasi = item.subtotalRealisasi != null ? Number(item.subtotalRealisasi) : 0;

      totalPesan += qtyPesan;
      totalRealisasi += qtyRealisasi;
      totalDiterima += qtyDiterima;
      subtotalPesan += subPesan;
      subtotalRealisasi += subRealisasi;

      return {
        ...item,
        qty: qtyPesan,
        hargaSatuan: Number(item.hargaSatuan || 0),
        subtotal: subPesan,
        qtyRealisasi,
        hargaSatuanRealisasi: item.hargaSatuanRealisasi != null ? Number(item.hargaSatuanRealisasi) : null,
        subtotalRealisasi: item.subtotalRealisasi != null ? subRealisasi : null,
        qtyDiterima: item.qtyDiterima != null ? qtyDiterima : null
      };
    });

    const jumlahItem = po.items ? po.items.length : 0;

    grandTotal.totalPesan += totalPesan;
    grandTotal.totalRealisasi += totalRealisasi;
    grandTotal.totalDiterima += totalDiterima;
    grandTotal.subtotalPesan += subtotalPesan;
    grandTotal.subtotalRealisasi += subtotalRealisasi;
    grandTotal.jumlahItem += jumlahItem;

    return {
      ...po,
      items,
      jumlahItem,
      totalPesan,
      totalRealisasi,
      totalDiterima,
      subtotalPesan,
      subtotalRealisasi,
      status: po.status,
      penerima: po.diterimaOleh?.nama || "—",
      waktuTerima: po.diterimaAt || null
    };
  });

  return {
    periode,
    poList,
    grandTotal
  };
}

router.getRealisasiPoData = getRealisasiPoData;

// ==========================================
// LAPORAN REALISASI PO VS PESANAN ENDPOINTS
// ==========================================

// GET /api/mitra/laporan/realisasi-po - JSON Laporan Realisasi PO vs Pesanan
router.get("/laporan/realisasi-po", requireAuth, requireRole("MITRA", "AKUNTAN", "KEPALA_SPPG"), validate(schemas.realisasiPoQuerySchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const { periode, poList, grandTotal } = await getRealisasiPoData(periodeId);
    res.json({
      success: true,
      data: {
        periode,
        poList,
        grandTotal
      }
    });
  } catch (error) {
    logger.error("[GET /laporan/realisasi-po]", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan realisasi PO" });
  }
});

// GET /api/mitra/laporan/realisasi-po/pdf - PDF Laporan Realisasi PO vs Pesanan
router.get("/laporan/realisasi-po/pdf", requireAuth, requireRole("MITRA", "AKUNTAN", "KEPALA_SPPG"), validate(schemas.realisasiPoQuerySchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const { periode, poList, grandTotal } = await getRealisasiPoData(periodeId);

    let setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || "",
      namaAkuntanSPPG: setupLembaga?.namaAkuntanSPPG || "",
      tahunAnggaran: setupLembaga?.tahunAnggaran || "",
      tempatPelaporan: setupLembaga?.tempatPelaporan || ""
    };

    const html = renderPoRealisasiHtml({
      periode,
      lembaga,
      poList,
      grandTotal,
      user: req.user
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Realisasi-PO-${periodeId}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[GET /laporan/realisasi-po/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Realisasi PO" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;

