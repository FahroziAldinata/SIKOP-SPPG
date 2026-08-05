const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const {
  normalizeDateUTC,
  HARI_MAP,
  getPorsiPerJenisPorsi,
  getTotalPorsiBlok
} = require("../../lib/accountingHelper");
const { validate } = require("../../middleware/validate");
const { logAudit } = require("../../lib/auditHelper");
const schemas = require("../../validators/akuntan");
const {
  hitungPaguHarian,
  getRabItemCalculations,
  rabHeaderSnapshot,
  rabItemsSnapshot
} = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();
const anggaranHarianRouter = express.Router();

// ==========================================
// PREVIEW RAB HARIAN — lihat bahan + harga dari MenuHarian DISETUJUI
// ==========================================

// GET /api/akuntan/rab-harian/preview?periodeId=X&tanggal=YYYY-MM-DD
router.get("/preview", requireAuth, requirePermission("akuntan-rab", "READ"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
    if (!tanggal) return res.status(400).json({ error: "tanggal wajib diisi" });

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) return res.status(400).json({ error: "Format tanggal tidak valid" });

    // 1. Cari MenuHarian DISETUJUI
    const menu = await prisma.menuHarian.findFirst({
      where: { periodeId, tanggal: targetDate, status: "DISETUJUI" },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: { include: { kategoriPenerima: true } },
            menuItem: { include: { bahan: { include: { bahanPokok: true } } } }
          }
        }
      }
    });

    if (!menu) {
      return res.json({
        success: true,
        data: {
          tersedia: false,
          pesan: "Menu Harian untuk tanggal ini belum disetujui Kepala SPPG.",
          menuHarianId: null,
          menu: [],
          porsi: { KECIL: 0, BESAR: 0 },
          pagu: { KECIL: 0, BESAR: 0, total: 0 },
          items: [],
          totalKebutuhan: 0,
          selisih: 0
        }
      });
    }

    // 2. Menu description
    const menuNames = [];
    for (const blok of menu.blok) {
      for (const item of blok.menuItem) {
        if (!menuNames.includes(item.namaMenu)) menuNames.push(item.namaMenu);
      }
    }

    // 3. Porsi + pagu
    const { porsi, pagu } = await hitungPaguHarian(prisma, periodeId, tanggal);

    // 4. Pre-fetch data
    const priceList = await prisma.hargaBahanPeriode.findMany({ where: { periodeId } });
    const priceMap = {};
    priceList.forEach(p => { priceMap[p.bahanPokokId] = Number(p.harga); });

    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    const day = targetDate.getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek)) : [];

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
      }
    }

    // 5. Group ingredients by bahanPokokId, split SISWA/B3
    const akumulasiBahan = {};
    for (const blok of menu.blok) {
      const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);
      for (const item of blok.menuItem) {
        for (const b of item.bahan) {
          const bid = b.bahanPokokId;
          if (!akumulasiBahan[bid]) {
            akumulasiBahan[bid] = {
              bahanPokokId: bid,
              nama: b.bahanPokok.nama,
              satuan: b.bahanPokok.satuan,
              konversiPerKg: Number(b.bahanPokok.konversiPerKg) || null,
              satuanHitungan: b.bahanPokok.satuanHitungan || null,
              qtySiswa: 0,
              qtyB3: 0,
              qtyTotal: 0,
              hargaSatuan: priceMap[bid] || 0
            };
          }
          const qtyNeed = (Number(b.beratKotorGr) * totalPorsiBlok) / 1000;
          if (blok.kelompokUmurMenu.jalur === "SISWA") {
            akumulasiBahan[bid].qtySiswa += qtyNeed;
          } else {
            akumulasiBahan[bid].qtyB3 += qtyNeed;
          }
          akumulasiBahan[bid].qtyTotal += qtyNeed;
        }
      }
    }

    // 6. Convert to response
    const items = Object.values(akumulasiBahan).map(b => ({
      ...b,
      qtySiswa: Math.round(b.qtySiswa * 1000) / 1000,
      qtyB3: Math.round(b.qtyB3 * 1000) / 1000,
      qtyTotal: Math.round(b.qtyTotal * 1000) / 1000,
      subtotal: Math.round(b.qtyTotal * b.hargaSatuan * 100) / 100
    }));

    const totalKebutuhan = items.reduce((sum, i) => sum + i.subtotal, 0);
    const selisih = Math.round((pagu.total - totalKebutuhan) * 100) / 100;

    res.json({
      success: true,
      data: {
        tersedia: true,
        menuHarianId: menu.id,
        menu: menuNames,
        porsi,
        pagu,
        items,
        totalKebutuhan,
        selisih
      }
    });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[BATAS_TIDAK_ADA]")) {
      return res.status(500).json({ error: "Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses preview RAB harian" });
  }
});

// ==========================================
// CRUD RAB HARIAN
// ==========================================


// POST /api/akuntan/rab-harian - Create RabHarian with optional TransaksiPembelian nested
router.post("/", requireAuth, requirePermission("akuntan-rab", "CREATE"), validate(schemas.rabSchema), async (req, res) => {
  try {
    const { periodeId, tanggal, items } = req.body;

    const targetTanggal = normalizeDateUTC(tanggal);

    const created = await prisma.$transaction(async (tx) => {
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) throw new Error("[NOT_FOUND] Periode tidak ditemukan");

      const start = normalizeDateUTC(period.tanggalMulai);
      const end = normalizeDateUTC(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal RAB harian harus berada di dalam batas rentang periode");
      }

      // Auto-detect MenuHarian DISETUJUI
      const menuHarian = await tx.menuHarian.findFirst({
        where: { periodeId, tanggal: targetTanggal, status: "DISETUJUI" }
      });

      // Pre-fetch data for item calculations
      const priceList = await tx.hargaBahanPeriode.findMany({ where: { periodeId } });
      const priceMap = {};
      priceList.forEach(p => { priceMap[p.bahanPokokId] = Number(p.harga); });

      const activeInputs = await tx.inputPenerimaManfaat.findMany({
        where: { periodeId },
        include: { detail: true, grupHari: true }
      });

      const calculations = await getRabItemCalculations(tx, periodeId, tanggal, priceMap, activeInputs);

      // Upsert RabHarian header
      const existingRab = await tx.rabHarian.findUnique({
        where: { periodeId_tanggal: { periodeId, tanggal: targetTanggal } }
      });

      let rabHarian;
      if (existingRab) {
        // Row shell dari PO (menuHarianId null, belum ada items) —
        // boleh diisi. Row yang SUDAH pernah diverifikasi (verifiedAt
        // terisi) TIDAK BOLEH ditimpa ulang — tolak dengan 409.
        if (existingRab.verifiedAt) {
          throw new Error("[VERIFIED] RAB harian untuk tanggal ini sudah diverifikasi sebelumnya. Gunakan PUT /rab-harian/:id/items untuk ubah harga.");
        }
        rabHarian = await tx.rabHarian.update({
          where: { id: existingRab.id },
          data: { menuHarianId: menuHarian?.id || null }
        });
      } else {
        rabHarian = await tx.rabHarian.create({
          data: {
            periodeId,
            tanggal: targetTanggal,
            status: "DRAFT",
            menuHarianId: menuHarian?.id || null,
            createdById: req.user.sub
          }
        });
      }

      // Hapus items lama jika ada (agar tidak duplikat saat upsert/re-save)
      await tx.rabHarianItem.deleteMany({
        where: { rabHarianId: rabHarian.id }
      });

      // Create RabHarianItems
      let totalKebutuhan = 0;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const { bahanPokokId, hargaSatuan } = item;
          if (!bahanPokokId) throw new Error("[VALIDASI] bahanPokokId wajib diisi");

          const calc = calculations[bahanPokokId];
          if (!calc) {
            throw new Error(`[NOT_FOUND] Bahan pokok ${bahanPokokId} tidak ditemukan di menu hari ini`);
          }

          const numHarga = parseFloat(hargaSatuan);
          if (isNaN(numHarga) || numHarga < 0) {
            throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");
          }

          const defaultHarga = priceMap[bahanPokokId] || 0;
          const hargaOverride = Math.abs(numHarga - defaultHarga) > 0.01;
          const subtotal = Math.round(calc.qtyTotal * numHarga * 100) / 100;
          totalKebutuhan += subtotal;

          await tx.rabHarianItem.create({
            data: {
              rabHarianId: rabHarian.id,
              bahanPokokId,
              qtySiswa: calc.qtySiswa,
              qtyB3: calc.qtyB3,
              qtyTotal: calc.qtyTotal,
              satuan: calc.satuan,
              hargaSatuan: numHarga,
              hargaOverride,
              subtotal
            }
          });
        }
      }

      // Hitung pagu dari database
      const paguResult = await hitungPaguHarian(tx, periodeId, tanggal);
      totalKebutuhan = Math.round(totalKebutuhan * 100) / 100;
      const totalPagu = paguResult.pagu.total;
      const selisih = Math.round((totalPagu - totalKebutuhan) * 100) / 100;

      // Update header dengan totals
      await tx.rabHarian.update({
        where: { id: rabHarian.id },
        data: { totalKebutuhan, totalPagu, selisih }
      });

      // Audit log — CREATE (RAB harian + items)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RabHarian",
        entityId: rabHarian.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          id: rabHarian.id,
          periodeId,
          tanggal: targetTanggal,
          status: rabHarian.status,
          totalKebutuhan,
          totalPagu,
          selisih,
          jumlahItem: items && Array.isArray(items) ? items.length : 0
        }
      });

      return await tx.rabHarian.findUnique({
        where: { id: rabHarian.id },
        include: {
          items: { include: { bahanPokok: true } },
          menuHarian: true
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih" });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Bahan pokok tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[VERIFIED]")) {
        return res.status(409).json({ error: error.message.replace("[VERIFIED] ", "") });
      }
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan RAB harian" });
  }
});

// GET /api/akuntan/rab-harian - List RabHarian
router.get("/", requireAuth, requirePermission("akuntan-rab", "READ"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.rabHarian.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        items: {
          select: { id: true, bahanPokokId: true, qtyTotal: true, subtotal: true }
        },
        menuHarian: {
          select: { id: true, status: true }
        },
        transaksiPembelian: {
          include: {
            items: {
              include: {
                bahanPokok: true
              }
            },
            supplier: true
          }
        }
      },
      orderBy: { tanggal: "desc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar RAB harian" });
  }
});

// GET /api/akuntan/rab-harian/:id - Detail RabHarian
router.get("/:id", requireAuth, requirePermission("akuntan-rab", "READ"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.rabHarian.findUnique({
      where: { id },
      include: {
        items: { include: { bahanPokok: true } },
        menuHarian: {
          include: {
            blok: {
              include: {
                kelompokUmurMenu: true,
                menuItem: { select: { id: true, namaMenu: true, komponen: true } }
              }
            }
          }
        },
        verifiedBy: {
          select: { id: true, nama: true, username: true }
        },
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        transaksiPembelian: {
          include: {
            items: {
              include: {
                bahanPokok: true
              }
            },
            supplier: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail RAB harian" });
  }
});

// PUT /api/akuntan/rab-harian/:id - Update RabHarian (tanggal & status)
router.put("/:id", requireAuth, requirePermission("akuntan-rab", "UPDATE"), validate(schemas.rabHarianUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, status } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rabHarian.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data RAB harian tidak ditemukan");
      }

      // Validasi status: Akuntan hanya dapat mengubah status ke DRAFT atau DIAJUKAN (FINAL v5.12).
      // Mengubah status ke DISETUJUI/DITOLAK secara langsung dilarang karena harus melalui alur approval Kepala SPPG.

      const targetTanggal = tanggal !== undefined ? new Date(tanggal) : existing.tanggal;
      if (tanggal !== undefined) {
        if (isNaN(targetTanggal.getTime())) {
          throw new Error("[VALIDASI] Format tanggal tidak valid");
        }

        // Re-validasi rentang tanggal terhadap Periode (FINAL v5.11)
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal RAB harian harus berada di dalam batas rentang periode");
        }

        // Conflict check (exclusion pattern)
        const conflict = await tx.rabHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih");
        }
      }

      if (status === "DIAJUKAN" && existing.status !== "DIAJUKAN") {
        const kepalaUsers = await tx.user.findMany({
          where: { role: "KEPALA_SPPG", aktif: true },
          select: { id: true }
        });
        if (kepalaUsers.length > 0) {
          const formattedDate = new Date(existing.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' });
          await tx.notifikasi.createMany({
            data: kepalaUsers.map((k) => ({
              userId: k.id,
              judul: "RAB Harian Baru Butuh Persetujuan",
              pesan: `RAB Harian tanggal ${formattedDate} telah diajukan dan menunggu persetujuan Anda.`,
              entityType: "RAB",
              entityId: id
            }))
          });
        }
      }

      const rec = await tx.rabHarian.update({
        where: { id },
        data: {
          tanggal: tanggal !== undefined ? targetTanggal : undefined,
          status: status !== undefined ? status : undefined
        },
        include: {
          items: { include: { bahanPokok: true } },
          menuHarian: { select: { id: true, status: true } },
          transaksiPembelian: {
            include: {
              items: {
                include: {
                  bahanPokok: true
                }
              },
              supplier: true
            }
          }
        }
      });

      // Audit log — UPDATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RabHarian",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: {
          tanggal: existing.tanggal,
          status: existing.status,
          totalKebutuhan: existing.totalKebutuhan,
          totalPagu: existing.totalPagu,
          selisih: existing.selisih
        },
        dataBaru: {
          tanggal: rec.tanggal,
          status: rec.status,
          totalKebutuhan: rec.totalKebutuhan,
          totalPagu: rec.totalPagu,
          selisih: rec.selisih
        }
      });

      return rec;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "RAB harian untuk tanggal ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui RAB harian" });
  }
});

// PUT /api/akuntan/rab-harian/:id/items - Update harga items (override sebelum verifikasi)
router.put("/:id/items", requireAuth, requirePermission("akuntan-rab", "UPDATE"), validate(schemas.rabHarianItemsSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rabHarian.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!existing) throw new Error("[NOT_FOUND] Data RAB harian tidak ditemukan");
      if (existing.status !== "DRAFT") throw new Error("[VALIDASI] Hanya RAB dengan status DRAFT yang bisa diubah itemnya");

      // Fetch default prices for override detection
      const priceList = await tx.hargaBahanPeriode.findMany({ where: { periodeId: existing.periodeId } });
      const priceMap = {};
      priceList.forEach(p => { priceMap[p.bahanPokokId] = Number(p.harga); });

      let totalKebutuhan = 0;
      for (const item of items) {
        const { bahanPokokId, hargaSatuan } = item;
        if (!bahanPokokId) throw new Error("[VALIDASI] bahanPokokId wajib diisi");

        const numHarga = parseFloat(hargaSatuan);
        if (isNaN(numHarga) || numHarga < 0) throw new Error("[VALIDASI] hargaSatuan harus berupa angka non-negatif");

        const rabItem = await tx.rabHarianItem.findUnique({
          where: { rabHarianId_bahanPokokId: { rabHarianId: id, bahanPokokId } }
        });
        if (!rabItem) throw new Error(`[NOT_FOUND] Bahan pokok ${bahanPokokId} tidak ditemukan di RAB ini`);

        const defaultHarga = priceMap[bahanPokokId] || 0;
        const hargaOverride = Math.abs(numHarga - defaultHarga) > 0.01;
        const subtotal = Math.round(Number(rabItem.qtyTotal) * numHarga * 100) / 100;
        totalKebutuhan += subtotal;

        await tx.rabHarianItem.update({
          where: { id: rabItem.id },
          data: { hargaSatuan: numHarga, hargaOverride, subtotal }
        });
      }

      totalKebutuhan = Math.round(totalKebutuhan * 100) / 100;
      const selisih = Math.round((Number(existing.totalPagu) - totalKebutuhan) * 100) / 100;

      await tx.rabHarian.update({
        where: { id },
        data: { totalKebutuhan, selisih }
      });

      const result = await tx.rabHarian.findUnique({
        where: { id },
        include: { items: { include: { bahanPokok: true } } }
      });

      // Audit log — UPDATE override harga item RAB (dataLama vs dataBaru)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RabHarian",
        entityId: id,
        aksi: "UPDATE",
        dataLama: {
          ...rabHeaderSnapshot(existing),
          items: rabItemsSnapshot(existing.items)
        },
        dataBaru: {
          ...rabHeaderSnapshot(result),
          items: rabItemsSnapshot(result.items)
        }
      });

      return result;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui item RAB" });
  }
});

// PUT /api/akuntan/rab-harian/:id/verify - Verifikasi harga (finalisasi review)
router.put("/:id/verify", requireAuth, requirePermission("akuntan-rab", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rabHarian.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!existing) throw new Error("[NOT_FOUND] Data RAB harian tidak ditemukan");
      if (existing.status !== "DRAFT") throw new Error("[VALIDASI] Hanya RAB dengan status DRAFT yang bisa diverifikasi");
      if (existing.items.length === 0) throw new Error("[VALIDASI] RAB tidak memiliki item — simpan item terlebih dahulu");

      // Validasi semua item punya harga > 0
      const zeroPriceItems = existing.items.filter(i => Number(i.hargaSatuan) <= 0);
      if (zeroPriceItems.length > 0) {
        throw new Error("[VALIDASI] Semua item harus memiliki harga satuan > 0 sebelum verifikasi");
      }

      // Validasi totalKebutuhan tidak exceed pagu (warning saja — tetap bisa diverifikasi)
      if (Number(existing.totalKebutuhan) > Number(existing.totalPagu)) {
        throw new Error("[VALIDASI] Total kebutuhan melebihi pagu. Sesuaikan harga atau hubungi Kepala SPPG");
      }

      // Sync ke AnggaranHarian BAHAN_MAKANAN — supaya recalcAktualAnggaran
      // (dipanggil tiap JurnalTransaksi baru) bisa menemukan row ini dan
      // menghitung realisasi belanja bahan makanan.
      const porsiHariIni = await getPorsiPerJenisPorsi(prisma, existing.periodeId, existing.tanggal);
      const totalPorsiHariIni = porsiHariIni.KECIL + porsiHariIni.BESAR;
      const rabValue = Number(existing.totalKebutuhan);

      const anggaranExisting = await tx.anggaranHarian.findUnique({
        where: {
          periodeId_tanggal_kategoriDana: {
            periodeId: existing.periodeId,
            tanggal: existing.tanggal,
            kategoriDana: "BAHAN_MAKANAN"
          }
        }
      });

      if (anggaranExisting) {
        await tx.anggaranHarian.update({
          where: { id: anggaranExisting.id },
          data: {
            jumlahPaket: totalPorsiHariIni,
            rab: rabValue,
            selisih: Math.round((rabValue - Number(anggaranExisting.aktual)) * 100) / 100
          }
        });
      } else {
        await tx.anggaranHarian.create({
          data: {
            periodeId: existing.periodeId,
            tanggal: existing.tanggal,
            kategoriDana: "BAHAN_MAKANAN",
            jumlahPaket: totalPorsiHariIni,
            hargaSatuan: null,
            rab: rabValue,
            aktual: 0,
            selisih: rabValue
          }
        });
      }

      const rec = await tx.rabHarian.update({
        where: { id },
        data: {
          verifiedAt: new Date(),
          verifiedById: req.user.sub,
          status: "DRAFT" // tetap DRAFT, siap diajukan via PUT status
        },
        include: {
          items: { include: { bahanPokok: true } },
          menuHarian: true
        }
      });

      // Audit log — UPDATE (verifikasi RAB)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RabHarian",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: { status: existing.status, verifiedAt: existing.verifiedAt, totalKebutuhan: existing.totalKebutuhan, totalPagu: existing.totalPagu },
        dataBaru: { status: rec.status, verifiedAt: rec.verifiedAt, totalKebutuhan: rec.totalKebutuhan, totalPagu: rec.totalPagu }
      });

      return rec;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat verifikasi RAB" });
  }
});

// DELETE /api/akuntan/rab-harian/:id - Delete RabHarian with manual cascade deletion of related child records
router.delete("/:id", requireAuth, requirePermission("akuntan-rab", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.rabHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }

    await prisma.$transaction(async (tx) => {
      // Get all transaksiPembelian ids for this RabHarian
      const tpList = await tx.transaksiPembelian.findMany({
        where: { rabHarianId: id },
        select: { id: true }
      });
      const tpIds = tpList.map(tp => tp.id);

      // 1. Check if any JurnalTransaksi refers to these TransaksiPembelian
      if (tpIds.length > 0) {
        const linkedJurnal = await tx.jurnalTransaksi.findFirst({
          where: { transaksiPembelianId: { in: tpIds } }
        });
        if (linkedJurnal) {
          throw new Error("[CONFLICT] RAB harian tidak bisa dihapus karena sudah memiliki transaksi jurnal terkait");
        }
      }

      // 2. Delete associated approvals
      await tx.approval.deleteMany({
        where: { rabHarianId: id }
      });

      // 3. Delete associated transaksiPembelian (which cascades to TransaksiPembelianItem in DB schema)
      await tx.transaksiPembelian.deleteMany({
        where: { rabHarianId: id }
      });

      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "RabHarian",
        entityId: exists.id,
        aksi: "DELETE",
        dataLama: {
          id: exists.id,
          periodeId: exists.periodeId,
          tanggal: exists.tanggal,
          status: exists.status,
          totalKebutuhan: exists.totalKebutuhan,
          totalPagu: exists.totalPagu,
          selisih: exists.selisih
        },
        dataBaru: null
      });

      // 4. Delete parent RabHarian
      await tx.rabHarian.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: "Data RAB harian beserta seluruh transaksi dan approval terkait berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data RAB harian tidak ditemukan" });
    }
    if (error.message) {
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
    }
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "RAB harian tidak dapat dihapus karena masih memiliki data terkait yang tidak bisa dihapus otomatis" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus RAB harian" });
  }
});

// ==========================================
// CRUD ANGGARAN HARIAN
// ==========================================

// POST /api/akuntan/anggaran-harian - Create AnggaranHarian with optional nested AnggaranBahanMakananDetail
anggaranHarianRouter.post("/", requireAuth, requirePermission("akuntan-rab", "CREATE"), validate(schemas.anggaranHarianSchema), async (req, res) => {
  try {
    const { periodeId, tanggal, kategoriDana, totalAnggaran, keterangan } = req.body;

    if (kategoriDana === "BAHAN_MAKANAN") {
      return res.status(400).json({ error: "BAHAN_MAKANAN sudah tidak didukung, gunakan fitur RAB Harian" });
    }

    const targetTanggal = new Date(tanggal);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Validate Periode exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 2. Validate date is within period range
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal anggaran harus berada di dalam batas rentang periode");
      }

      let computedRab = 0;
      let detailsToCreate = [];

      if (kategoriDana === "BAHAN_MAKANAN") {
        if (!detailBahanMakanan || !Array.isArray(detailBahanMakanan) || detailBahanMakanan.length === 0) {
          throw new Error("[VALIDASI] detailBahanMakanan wajib diisi untuk kategori BAHAN_MAKANAN");
        }
        if (new Set(detailBahanMakanan.map(d => d.kategoriId)).size !== detailBahanMakanan.length) {
          throw new Error("[VALIDASI] Kategori penerima dalam rincian tidak boleh duplikat");
        }

        for (const item of detailBahanMakanan) {
          const { kategoriId, jumlahPaket: detailQty, hargaSatuan: detailHarga } = item;
          if (!kategoriId) {
            throw new Error("[VALIDASI] kategoriId wajib diisi pada rincian bahan makanan");
          }

          const q = parseInt(detailQty, 10);
          const h = parseFloat(detailHarga);

          if (isNaN(q) || q <= 0) {
            throw new Error("[VALIDASI] jumlahPaket pada rincian harus berupa angka bulat positif");
          }
          if (isNaN(h) || h < 0) {
            throw new Error("[VALIDASI] hargaSatuan pada rincian harus berupa angka non-negatif");
          }

          // Check if KategoriPenerima exists
          const kat = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
          if (!kat) {
            throw new Error(`[NOT_FOUND] Kategori penerima dengan ID ${kategoriId} tidak ditemukan`);
          }

          // Validasi batas harga porsi: Kategori tanpa jenisPorsi dilarang dianggarkan (FINAL v5.13)
          if (kat.jenisPorsi === null) {
            throw new Error(`[VALIDASI] Kategori ${kat.nama} belum memiliki jenis porsi terkonfirmasi, tidak dapat dianggarkan`);
          }

          const batas = await tx.batasHargaPorsi.findUnique({
            where: { jenisPorsi: kat.jenisPorsi }
          });
          // [ASUMSI] Jika row BatasHargaPorsi belum di-seed/ditemukan untuk jenis porsi ini, lewati pengecekan batas maksimal.
          if (batas && h > parseFloat(batas.batasMaksimal)) {
            throw new Error(`[VALIDASI] hargaSatuan kategori ${kat.nama} (${h}) melebihi batas maksimal porsi ${kat.jenisPorsi} (${batas.batasMaksimal})`);
          }

          const subtotal = Math.round(q * h * 100) / 100;
          computedRab += subtotal;

          detailsToCreate.push({
            kategoriId,
            jumlahPaket: q,
            hargaSatuan: h,
            subtotal
          });
        }
      } else {
        // OPERASIONAL / INSENTIF_FASILITAS — lumpsum
        const total = parseFloat(totalAnggaran);
        if (isNaN(total) || total < 0) {
          throw new Error("[VALIDASI] totalAnggaran harus berupa angka non-negatif");
        }

        computedRab = Math.round(total * 100) / 100;
      }

      // Create AnggaranHarian
      return await tx.anggaranHarian.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          kategoriDana,
          jumlahPaket: null,
          hargaSatuan: null,
          rab: computedRab,
          aktual: 0,
          selisih: computedRab, // rab - aktual (0)
          keterangan,
          detailBahanMakanan: {
            create: detailsToCreate
          }
        },
        include: {
          detailBahanMakanan: {
            include: {
              kategori: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan anggaran harian" });
  }
});

// GET /api/akuntan/anggaran-harian - List AnggaranHarian
anggaranHarianRouter.get("/", requireAuth, requirePermission("akuntan-rab", "READ"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.anggaranHarian.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        detailBahanMakanan: {
          include: {
            kategori: true
          }
        }
      },
      orderBy: { tanggal: "desc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar anggaran harian" });
  }
});

// GET /api/akuntan/anggaran-harian/:id - Detail AnggaranHarian
anggaranHarianRouter.get("/:id", requireAuth, requirePermission("akuntan-rab", "READ"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.anggaranHarian.findUnique({
      where: { id },
      include: {
        detailBahanMakanan: {
          include: {
            kategori: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail anggaran harian" });
  }
});

// PUT /api/akuntan/anggaran-harian/:id - Update AnggaranHarian
anggaranHarianRouter.put("/:id", requireAuth, requirePermission("akuntan-rab", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, kategoriDana, totalAnggaran, keterangan } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.anggaranHarian.findUnique({
        where: { id },
        include: { detailBahanMakanan: true }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data anggaran harian tidak ditemukan");
      }

      if (kategoriDana !== undefined && kategoriDana !== existing.kategoriDana && parseFloat(existing.aktual) !== 0) {
        throw new Error("[CONFLICT] Tidak bisa mengubah kategoriDana karena sudah ada transaksi aktual tercatat");
      }

      if (kategoriDana === "BAHAN_MAKANAN") {
        throw new Error("[VALIDASI] BAHAN_MAKANAN sudah tidak didukung, gunakan fitur RAB Harian");
      }
      const targetKategoriDana = kategoriDana !== undefined ? kategoriDana : existing.kategoriDana;

      const targetTanggal = tanggal !== undefined ? new Date(tanggal) : existing.tanggal;
      if (tanggal !== undefined && isNaN(targetTanggal.getTime())) {
        throw new Error("[VALIDASI] Format tanggal tidak valid");
      }

      // Check unique constraint excluding self
      if (tanggal !== undefined || kategoriDana !== undefined) {
        // Re-validasi rentang tanggal terhadap Periode (FINAL v5.11)
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal anggaran harus berada di dalam batas rentang periode");
        }

        const conflict = await tx.anggaranHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            kategoriDana: targetKategoriDana,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih");
        }
      }

      let computedRab = 0;
      let detailsToCreate = [];
      let shouldDeleteOldDetails = false;

      if (targetKategoriDana === "BAHAN_MAKANAN") {
        
        // If new details are provided, we use them. Otherwise, if we only updated e.g. tanggal, we keep existing details.
        // But if we switched kategoriDana to BAHAN_MAKANAN, detailBahanMakanan must be provided!
        if (detailBahanMakanan !== undefined) {
          if (!Array.isArray(detailBahanMakanan) || detailBahanMakanan.length === 0) {
            throw new Error("[VALIDASI] detailBahanMakanan wajib diisi untuk kategori BAHAN_MAKANAN");
          }
          if (new Set(detailBahanMakanan.map(d => d.kategoriId)).size !== detailBahanMakanan.length) {
            throw new Error("[VALIDASI] Kategori penerima dalam rincian tidak boleh duplikat");
          }
          
          shouldDeleteOldDetails = true;
          for (const item of detailBahanMakanan) {
            const { kategoriId, jumlahPaket: detailQty, hargaSatuan: detailHarga } = item;
            if (!kategoriId) {
              throw new Error("[VALIDASI] kategoriId wajib diisi pada rincian bahan makanan");
            }

            const q = parseInt(detailQty, 10);
            const h = parseFloat(detailHarga);

            if (isNaN(q) || q <= 0) {
              throw new Error("[VALIDASI] jumlahPaket pada rincian harus berupa angka bulat positif");
            }
            if (isNaN(h) || h < 0) {
              throw new Error("[VALIDASI] hargaSatuan pada rincian harus berupa angka non-negatif");
            }

            const kat = await tx.kategoriPenerima.findUnique({ where: { id: kategoriId } });
            if (!kat) {
              throw new Error(`[NOT_FOUND] Kategori penerima dengan ID ${kategoriId} tidak ditemukan`);
            }

            // Validasi batas harga porsi: Kategori tanpa jenisPorsi dilarang dianggarkan (FINAL v5.13)
            if (kat.jenisPorsi === null) {
              throw new Error(`[VALIDASI] Kategori ${kat.nama} belum memiliki jenis porsi terkonfirmasi, tidak dapat dianggarkan`);
            }

            const batas = await tx.batasHargaPorsi.findUnique({
              where: { jenisPorsi: kat.jenisPorsi }
            });
            // [ASUMSI] Jika row BatasHargaPorsi belum di-seed/ditemukan untuk jenis porsi ini, lewati pengecekan batas maksimal.
            if (batas && h > parseFloat(batas.batasMaksimal)) {
              throw new Error(`[VALIDASI] hargaSatuan kategori ${kat.nama} (${h}) melebihi batas maksimal porsi ${kat.jenisPorsi} (${batas.batasMaksimal})`);
            }

            const subtotal = Math.round(q * h * 100) / 100;
            computedRab += subtotal;

            detailsToCreate.push({
              kategoriId,
              jumlahPaket: q,
              hargaSatuan: h,
              subtotal
            });
          }
        } else {
          // No new details provided. If previously BAHAN_MAKANAN, we sum existing details.
          // If we switched from non-BAHAN_MAKANAN to BAHAN_MAKANAN without details, this is an error.
          if (existing.kategoriDana !== "BAHAN_MAKANAN") {
            throw new Error("[VALIDASI] detailBahanMakanan wajib diisi saat mengubah kategori ke BAHAN_MAKANAN");
          }
          
          // Recompute RAB from existing details
          computedRab = existing.detailBahanMakanan.reduce((acc, det) => {
            return acc + parseFloat(det.subtotal);
          }, 0);
          computedRab = Math.round(computedRab * 100) / 100;
        }
      } else {
        // OPERASIONAL / INSENTIF_FASILITAS — lumpsum
        if (existing.kategoriDana === "BAHAN_MAKANAN") {
          shouldDeleteOldDetails = true;
        }

        const currentTotal = totalAnggaran !== undefined ? totalAnggaran : Number(existing.rab);
        if (isNaN(parseFloat(currentTotal)) || parseFloat(currentTotal) < 0) {
          throw new Error("[VALIDASI] totalAnggaran harus berupa angka non-negatif");
        }

        computedRab = Math.round(parseFloat(currentTotal) * 100) / 100;
      }

      // Execute Replace All if flag is active
      // [ASUMSI] detailBahanMakanan di-update dengan strategi Replace-All (deleteOld + createNew) untuk menjamin kesederhanaan dan konsistensi data.
      if (shouldDeleteOldDetails) {
        await tx.anggaranBahanMakananDetail.deleteMany({
          where: { anggaranHarianId: id }
        });
      }

      const currentAktual = parseFloat(existing.aktual);
      const newSelisih = Math.round((computedRab - currentAktual) * 100) / 100;

      return await tx.anggaranHarian.update({
        where: { id },
        data: {
          tanggal: tanggal !== undefined ? targetTanggal : undefined,
          kategoriDana: kategoriDana !== undefined ? targetKategoriDana : undefined,
          jumlahPaket: null,
          hargaSatuan: null,
          rab: computedRab,
          selisih: newSelisih,
          keterangan: keterangan !== undefined ? keterangan : undefined,
          detailBahanMakanan: detailsToCreate.length > 0 ? {
            create: detailsToCreate
          } : undefined
        },
        include: {
          detailBahanMakanan: {
            include: {
              kategori: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Anggaran harian untuk tanggal dan kategori dana ini sudah terdaftar pada periode terpilih" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
      if (error.message.startsWith("[CONFLICT]")) {
        return res.status(409).json({ error: error.message.replace("[CONFLICT] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui anggaran harian" });
  }
});

// DELETE /api/akuntan/anggaran-harian/:id - Delete AnggaranHarian
anggaranHarianRouter.delete("/:id", requireAuth, requirePermission("akuntan-rab", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.anggaranHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }

    // TODO: wrap in $transaction + re-check aktual saat modul JurnalTransaksi/recalcAktualAnggaran mulai jalan, race TOCTOU jadi nyata.
    if (parseFloat(exists.aktual) !== 0) {
      return res.status(409).json({ error: "Anggaran harian tidak bisa dihapus karena sudah memiliki transaksi aktual terkait" });
    }

    await prisma.anggaranHarian.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data anggaran harian berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data anggaran harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus anggaran harian" });
  }
});

module.exports = router;
module.exports.anggaranHarianRouter = anggaranHarianRouter;
