const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const {
  normalizeDateUTC,
  HARI_MAP,
  getTotalPorsiBlok
} = require("../../lib/accountingHelper");
const { validate } = require("../../middleware/validate");
const { logAudit } = require("../../lib/auditHelper");
const schemas = require("../../validators/akuntan");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/akuntan/akun - List all active accounts
router.get("/akun", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const list = await prisma.akun.findMany({
      where: {
        aktif: true
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        tipe: true,
        kategoriDana: true
      },
      orderBy: {
        kode: "asc"
      }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data akun" });
  }
});


// GET /api/akuntan/supplier - List all active suppliers
router.get("/supplier", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const list = await prisma.supplier.findMany({
      where: {
        aktif: true
      },
      select: {
        id: true,
        nama: true,
        kontak: true
      },
      orderBy: {
        nama: "asc"
      }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data supplier" });
  }
});

// POST /api/akuntan/supplier - Akuntan membuat supplier baru
router.post("/supplier", requireAuth, requirePermission("akuntan-master", "CREATE"), async (req, res) => {
  try {
    const { nama, kontak } = req.body || {};
    if (!nama) {
      return res.status(400).json({ error: "Nama supplier wajib diisi" });
    }
    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.supplier.create({
        data: {
          nama,
          kontak,
          aktif: true
        }
      });
      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Supplier",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: { nama: rec.nama, kontak: rec.kontak, aktif: rec.aktif }
      });
      return rec;
    });
    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan supplier baru" });
  }
});

// GET /api/akuntan/periode/latest-setup - Mendapatkan SetupLembaga periode terakhir untuk autofill
router.get("/periode/latest-setup", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const latest = await prisma.periode.findFirst({
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });
    
    if (latest) {
      // Ubah date object ke string date-only YYYY-MM-DD
      const formatted = {
        ...latest,
        tanggalMulai: latest.tanggalMulai.toISOString().split("T")[0],
        tanggalSelesai: latest.tanggalSelesai.toISOString().split("T")[0],
        setupLembaga: latest.setupLembaga ? {
          ...latest.setupLembaga,
          awalPeriodeBerikutnya: latest.setupLembaga.awalPeriodeBerikutnya.toISOString().split("T")[0],
          tanggalPelaporan: latest.setupLembaga.tanggalPelaporan.toISOString().split("T")[0]
        } : null
      };
      return res.json({ success: true, data: formatted });
    }
    
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data periode terakhir" });
  }
});

// POST /api/akuntan/periode - Membuat periode baru beserta SetupLembaga
router.post("/periode", requireAuth, requirePermission("akuntan-master", "CREATE"), async (req, res) => {
  try {
    const {
      tanggalMulai,
      tanggalSelesai,
      anggaranAlokasi,
      totalDanaDiterima,
      namaLembaga,
      alamat,
      namaKepalaSPPG,
      namaAkuntanSPPG,
      namaYayasan,
      ketuaYayasan,
      nomorRekeningVA,
      tahunAnggaran,
      awalPeriodeBerikutnya,
      tanggalPelaporan,
      tempatPelaporan
    } = req.body;

    // Validasi field wajib
    if (!tanggalMulai || !tanggalSelesai || !anggaranAlokasi ||
        !namaLembaga || !alamat || !namaKepalaSPPG || !namaAkuntanSPPG ||
        !namaYayasan || !ketuaYayasan || !nomorRekeningVA || !tahunAnggaran ||
        !awalPeriodeBerikutnya || !tanggalPelaporan || !tempatPelaporan) {
      return res.status(400).json({ error: "Seluruh field wajib harus diisi" });
    }

    const start = normalizeDateUTC(tanggalMulai);
    const end = normalizeDateUTC(tanggalSelesai);
    const nextStart = normalizeDateUTC(awalPeriodeBerikutnya);
    const reportDate = normalizeDateUTC(tanggalPelaporan);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(nextStart.getTime()) || isNaN(reportDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "Tanggal mulai harus sebelum tanggal selesai" });
    }

    // Cek irisan periode
    const overlap = await prisma.periode.findFirst({
      where: {
        OR: [
          { tanggalMulai: { lte: end }, tanggalSelesai: { gte: start } }
        ]
      }
    });

    if (overlap) {
      return res.status(400).json({ error: "Rentang tanggal tumpang tindih dengan periode yang sudah ada" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newPeriode = await tx.periode.create({
        data: {
          tanggalMulai: start,
          tanggalSelesai: end,
          anggaranAlokasi: parseFloat(anggaranAlokasi),
          totalDanaDiterima: totalDanaDiterima ? parseFloat(totalDanaDiterima) : null,
          setupLembaga: {
            create: {
              namaLembaga,
              alamat,
              namaKepalaSPPG,
              namaAkuntanSPPG,
              namaYayasan,
              ketuaYayasan,
              nomorRekeningVA,
              tahunAnggaran: parseInt(tahunAnggaran, 10),
              awalPeriodeBerikutnya: nextStart,
              tanggalPelaporan: reportDate,
              tempatPelaporan
            }
          }
        },
        include: { setupLembaga: true }
      });
      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Periode",
        entityId: newPeriode.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          id: newPeriode.id,
          tanggalMulai: newPeriode.tanggalMulai,
          tanggalSelesai: newPeriode.tanggalSelesai,
          anggaranAlokasi: newPeriode.anggaranAlokasi,
          totalDanaDiterima: newPeriode.totalDanaDiterima
        }
      });
      return newPeriode;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat periode baru" });
  }
});

// POST /api/akuntan/periode/:id/tutup-periode - Otomatisasi carry-over saldo awal & tutup periode
router.post("/periode/:id/tutup-periode", requireAuth, requirePermission("akuntan-master", "APPROVE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeTargetId, overwrite } = req.body || {};

    // 1. Fetch Periode Sumber
    const sourcePeriode = await prisma.periode.findUnique({
      where: { id },
      include: { setupLembaga: true }
    });

    if (!sourcePeriode) {
      return res.status(404).json({ error: "Periode sumber tidak ditemukan" });
    }

    if (sourcePeriode.status === "SELESAI") {
      return res.status(400).json({ error: "Periode ini sudah berstatus SELESAI" });
    }

    // 2. Cari Periode Target
    let targetPeriode = null;
    if (periodeTargetId) {
      targetPeriode = await prisma.periode.findUnique({
        where: { id: periodeTargetId }
      });
      if (!targetPeriode) {
        return res.status(400).json({ error: "Periode target yang ditentukan tidak ditemukan" });
      }
    } else {
      // Periode target default: status DRAFT yang tanggalMulai > tanggalSelesai periode sumber
      targetPeriode = await prisma.periode.findFirst({
        where: {
          status: "DRAFT",
          tanggalMulai: { gt: sourcePeriode.tanggalSelesai }
        },
        orderBy: { tanggalMulai: "asc" }
      });

      // Fallback: cari periode apapun yang tanggalMulai > tanggalSelesai periode sumber
      if (!targetPeriode) {
        targetPeriode = await prisma.periode.findFirst({
          where: {
            tanggalMulai: { gt: sourcePeriode.tanggalSelesai }
          },
          orderBy: { tanggalMulai: "asc" }
        });
      }
    }

    if (!targetPeriode) {
      return res.status(400).json({
        error: "Periode target (periode berikutnya) tidak ditemukan. Buat periode target terlebih dahulu."
      });
    }

    // 3. Validasi double-carry (apakah saldo awal di target periode sudah ada)
    const existingSaldoPeriodeCount = await prisma.saldoAwalPeriode.count({
      where: { periodeId: targetPeriode.id }
    });
    const existingSaldoBarangCount = await prisma.saldoAwalBarang.count({
      where: { periodeId: targetPeriode.id }
    });

    if ((existingSaldoPeriodeCount > 0 || existingSaldoBarangCount > 0) && !overwrite) {
      return res.status(409).json({
        error: "Saldo awal untuk periode target sudah ada.",
        requiresConfirmation: true,
        targetPeriodeId: targetPeriode.id
      });
    }

    // 4. Hitung Saldo Akhir Kas / Bank (1101 Kas Bank, 1102 Kas Tunai & Akun Tipe KAS)
    // Saldo akhir = SaldoAwalPeriode + MASUK - KELUAR
    const kasAkuns = await prisma.akun.findMany({
      where: {
        OR: [
          { tipe: "KAS" },
          { kode: { in: ["1101", "1102"] } }
        ],
        aktif: true
      }
    });

    const kasBalancesToCarry = [];
    for (const a of kasAkuns) {
      const saRow = await prisma.saldoAwalPeriode.findUnique({
        where: { periodeId_akunId: { periodeId: sourcePeriode.id, akunId: a.id } }
      });
      const saldoAwalVal = Number(saRow?.saldoAwal || 0);

      const masukAgg = await prisma.jurnalTransaksi.aggregate({
        where: {
          periodeId: sourcePeriode.id,
          akunKasId: a.id,
          jenis: "MASUK"
        },
        _sum: { nominal: true }
      });

      const keluarAgg = await prisma.jurnalTransaksi.aggregate({
        where: {
          periodeId: sourcePeriode.id,
          akunKasId: a.id,
          jenis: "KELUAR"
        },
        _sum: { nominal: true }
      });

      const totalMasuk = Number(masukAgg._sum.nominal || 0);
      const totalKeluar = Number(keluarAgg._sum.nominal || 0);
      const saldoAkhirVal = saldoAwalVal + totalMasuk - totalKeluar;

      kasBalancesToCarry.push({
        akunId: a.id,
        saldoAkhir: saldoAkhirVal
      });
    }

    // 5. Hitung Saldo Akhir Qty Barang (SaldoAwalBarang + MutasiStok MASUK - KELUAR)
    const bahanList = await prisma.bahanPokok.findMany({ where: { aktif: true } });
    const barangBalancesToCarry = [];

    for (const b of bahanList) {
      const sabRow = await prisma.saldoAwalBarang.findUnique({
        where: { periodeId_bahanPokokId: { periodeId: sourcePeriode.id, bahanPokokId: b.id } }
      });
      const saldoAwalQtyVal = Number(sabRow?.saldoAwalQty || 0);
      const hargaBeliAwalVal = Number(sabRow?.hargaBeliAwal || 0);

      const mutasiMasukAgg = await prisma.mutasiStok.aggregate({
        where: {
          bahanPokokId: b.id,
          jenis: "MASUK",
          tanggal: { gte: sourcePeriode.tanggalMulai, lte: sourcePeriode.tanggalSelesai }
        },
        _sum: { qty: true }
      });

      const mutasiKeluarAgg = await prisma.mutasiStok.aggregate({
        where: {
          bahanPokokId: b.id,
          jenis: "KELUAR",
          tanggal: { gte: sourcePeriode.tanggalMulai, lte: sourcePeriode.tanggalSelesai }
        },
        _sum: { qty: true }
      });

      const totalMasukQty = Number(mutasiMasukAgg._sum.qty || 0);
      const totalKeluarQty = Number(mutasiKeluarAgg._sum.qty || 0);
      const saldoAkhirQtyVal = saldoAwalQtyVal + totalMasukQty - totalKeluarQty;

      // Cari harga beli terbaru dari mutasi MASUK
      const latestMasuk = await prisma.mutasiStok.findFirst({
        where: {
          bahanPokokId: b.id,
          jenis: "MASUK",
          tanggal: { lte: sourcePeriode.tanggalSelesai },
          hargaBeli: { not: null }
        },
        orderBy: [
          { tanggal: "desc" },
          { createdAt: "desc" }
        ],
        select: { hargaBeli: true }
      });

      const targetHargaBeli = latestMasuk && latestMasuk.hargaBeli !== null
        ? Number(latestMasuk.hargaBeli)
        : hargaBeliAwalVal;

      barangBalancesToCarry.push({
        bahanPokokId: b.id,
        saldoAkhirQty: saldoAkhirQtyVal,
        hargaBeliAwal: targetHargaBeli
      });
    }

    // 6. Jalankan Prisma Transaction (Atomik)
    const result = await prisma.$transaction(async (tx) => {
      // A. Carry-over SaldoAwalPeriode untuk Kas/Bank
      for (const item of kasBalancesToCarry) {
        await tx.saldoAwalPeriode.upsert({
          where: {
            periodeId_akunId: {
              periodeId: targetPeriode.id,
              akunId: item.akunId
            }
          },
          update: {
            saldoAwal: item.saldoAkhir
          },
          create: {
            periodeId: targetPeriode.id,
            akunId: item.akunId,
            saldoAwal: item.saldoAkhir
          }
        });
      }

      // B. Carry-over SaldoAwalBarang
      for (const item of barangBalancesToCarry) {
        await tx.saldoAwalBarang.upsert({
          where: {
            periodeId_bahanPokokId: {
              periodeId: targetPeriode.id,
              bahanPokokId: item.bahanPokokId
            }
          },
          update: {
            saldoAwalQty: item.saldoAkhirQty,
            hargaBeliAwal: item.hargaBeliAwal
          },
          create: {
            periodeId: targetPeriode.id,
            bahanPokokId: item.bahanPokokId,
            saldoAwalQty: item.saldoAkhirQty,
            hargaBeliAwal: item.hargaBeliAwal
          }
        });
      }

      // C. Update status periode sumber -> SELESAI
      const updatedSource = await tx.periode.update({
        where: { id: sourcePeriode.id },
        data: { status: "SELESAI" }
      });

      // D. Update status periode target -> AKTIF jika sebelumnya DRAFT
      let updatedTarget = targetPeriode;
      if (targetPeriode.status === "DRAFT") {
        updatedTarget = await tx.periode.update({
          where: { id: targetPeriode.id },
          data: { status: "AKTIF" }
        });
      }

      // Audit log — tutup-periode (dataLama status sumber sebelum, dataBaru sesudah + ringkasan carry-over)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Periode",
        entityId: sourcePeriode.id,
        aksi: "UPDATE",
        dataLama: {
          id: sourcePeriode.id,
          status: sourcePeriode.status
        },
        dataBaru: {
          id: updatedSource.id,
          statusSumber: updatedSource.status,
          statusTarget: updatedTarget.status,
          periodeTargetId: targetPeriode.id,
          kasCarriedCount: kasBalancesToCarry.length,
          barangCarriedCount: barangBalancesToCarry.length
        }
      });

      return {
        periodeSumber: updatedSource,
        periodeTarget: updatedTarget,
        kasCarriedCount: kasBalancesToCarry.length,
        barangCarriedCount: barangBalancesToCarry.length
      };
    });

    res.json({
      success: true,
      message: `Periode berhasil ditutup dan saldo awal berhasil di-carry over ke periode berikutnya.`,
      data: result
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menutup periode" });
  }
});

// PUT /api/akuntan/periode/:id - Update status / detail periode
router.put("/periode/:id", requireAuth, requirePermission("akuntan-master", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, anggaranAlokasi, totalDanaDiterima } = req.body;

    const existing = await prisma.periode.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const data = {};
    if (status) {
      if (!["DRAFT", "AKTIF", "SELESAI"].includes(status)) {
        return res.status(400).json({ error: "Status periode tidak valid" });
      }
      data.status = status;
    }
    if (anggaranAlokasi !== undefined) {
      data.anggaranAlokasi = parseFloat(anggaranAlokasi);
    }
    if (totalDanaDiterima !== undefined) {
      data.totalDanaDiterima = totalDanaDiterima ? parseFloat(totalDanaDiterima) : null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.periode.update({
        where: { id },
        data
      });
      // Audit log — UPDATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "Periode",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: {
          status: existing.status,
          anggaranAlokasi: existing.anggaranAlokasi,
          totalDanaDiterima: existing.totalDanaDiterima
        },
        dataBaru: {
          status: rec.status,
          anggaranAlokasi: rec.anggaranAlokasi,
          totalDanaDiterima: rec.totalDanaDiterima
        }
      });
      return rec;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data periode" });
  }
});

// ==========================================
// CRUD MASTER JENIS PEKERJAAN
// ==========================================

// GET /api/akuntan/jenis-pekerjaan - List JenisPekerjaan
router.get("/jenis-pekerjaan", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const { all } = req.query;
    const where = {};
    if (all !== "true") {
      where.aktif = true;
    }
    const list = await prisma.jenisPekerjaan.findMany({
      where,
      orderBy: { nama: "asc" }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar jenis pekerjaan" });
  }
});

// POST /api/akuntan/jenis-pekerjaan - Create JenisPekerjaan
router.post("/jenis-pekerjaan", requireAuth, requirePermission("akuntan-master", "CREATE"), async (req, res) => {
  try {
    const { nama, tarifHarian, aktif } = req.body || {};
    if (!nama) {
      return res.status(400).json({ error: "nama wajib diisi" });
    }
    if (tarifHarian === undefined || tarifHarian === null) {
      return res.status(400).json({ error: "tarifHarian wajib diisi" });
    }
    const parsedTarif = parseFloat(tarifHarian);
    if (isNaN(parsedTarif) || parsedTarif <= 0) {
      return res.status(400).json({ error: "tarifHarian harus berupa angka positif" });
    }

    const existing = await prisma.jenisPekerjaan.findUnique({
      where: { nama }
    });
    if (existing) {
      return res.status(400).json({ error: "Jenis pekerjaan dengan nama tersebut sudah terdaftar" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.jenisPekerjaan.create({
        data: {
          nama,
          tarifHarian: Math.round(parsedTarif * 100) / 100,
          aktif: aktif !== undefined ? Boolean(aktif) : true
        }
      });
      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JenisPekerjaan",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: { nama: rec.nama, tarifHarian: rec.tarifHarian, aktif: rec.aktif }
      });
      return rec;
    });
    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Jenis pekerjaan dengan nama tersebut sudah terdaftar" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan jenis pekerjaan" });
  }
});

// PUT /api/akuntan/jenis-pekerjaan/:id - Update JenisPekerjaan
router.put("/jenis-pekerjaan/:id", requireAuth, requirePermission("akuntan-master", "UPDATE"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, tarifHarian, aktif } = req.body || {};

    const existing = await prisma.jenisPekerjaan.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: "Jenis pekerjaan tidak ditemukan" });
    }

    const updateData = {};
    if (nama !== undefined) {
      if (!nama.trim()) {
        return res.status(400).json({ error: "nama tidak boleh kosong" });
      }
      updateData.nama = nama;
    }
    if (tarifHarian !== undefined) {
      const parsedTarif = parseFloat(tarifHarian);
      if (isNaN(parsedTarif) || parsedTarif <= 0) {
        return res.status(400).json({ error: "tarifHarian harus berupa angka positif" });
      }
      updateData.tarifHarian = Math.round(parsedTarif * 100) / 100;
    }
    if (aktif !== undefined) {
      updateData.aktif = Boolean(aktif);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.jenisPekerjaan.update({
        where: { id },
        data: updateData
      });
      // Audit log — UPDATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JenisPekerjaan",
        entityId: rec.id,
        aksi: "UPDATE",
        dataLama: { nama: existing.nama, tarifHarian: existing.tarifHarian, aktif: existing.aktif },
        dataBaru: { nama: rec.nama, tarifHarian: rec.tarifHarian, aktif: rec.aktif }
      });
      return rec;
    });
    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Jenis pekerjaan dengan nama tersebut sudah terdaftar" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Jenis pekerjaan tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui jenis pekerjaan" });
  }
});

// DELETE /api/akuntan/jenis-pekerjaan/:id - Delete JenisPekerjaan
router.delete("/jenis-pekerjaan/:id", requireAuth, requirePermission("akuntan-master", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.jenisPekerjaan.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: "Jenis pekerjaan tidak ditemukan" });
    }
    await prisma.$transaction(async (tx) => {
      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "JenisPekerjaan",
        entityId: existing.id,
        aksi: "DELETE",
        dataLama: { nama: existing.nama, tarifHarian: existing.tarifHarian, aktif: existing.aktif },
        dataBaru: null
      });
      await tx.jenisPekerjaan.delete({
        where: { id }
      });
    });
    res.json({ success: true, message: "Jenis pekerjaan berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Jenis pekerjaan tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus jenis pekerjaan" });
  }
});

// ==========================================
// CRUD HARI LIBUR
// ==========================================

// GET /api/akuntan/hari-libur - List HariLibur
router.get("/hari-libur", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const list = await prisma.hariLibur.findMany({
      orderBy: { tanggal: "asc" }
    });
    res.json(list);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar hari libur" });
  }
});

// POST /api/akuntan/hari-libur - Create HariLibur
router.post("/hari-libur", requireAuth, requirePermission("akuntan-master", "CREATE"), async (req, res) => {
  try {
    const { tanggal, keterangan } = req.body || {};
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }
    const parsedDate = new Date(tanggal);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }
    const targetDate = normalizeDateUTC(tanggal);

    const existing = await prisma.hariLibur.findUnique({
      where: { tanggal: targetDate }
    });
    if (existing) {
      return res.status(400).json({ error: "Tanggal libur tersebut sudah terdaftar" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.hariLibur.create({
        data: {
          tanggal: targetDate,
          keterangan: keterangan || null
        }
      });
      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "HariLibur",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: { tanggal: rec.tanggal, keterangan: rec.keterangan }
      });
      return rec;
    });
    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Tanggal libur tersebut sudah terdaftar" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan hari libur" });
  }
});

// DELETE /api/akuntan/hari-libur/:id - Delete HariLibur
router.delete("/hari-libur/:id", requireAuth, requirePermission("akuntan-master", "DELETE"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.hariLibur.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: "Hari libur tidak ditemukan" });
    }
    await prisma.$transaction(async (tx) => {
      // Audit log — DELETE (dataLama = data yang dihapus)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "HariLibur",
        entityId: existing.id,
        aksi: "DELETE",
        dataLama: { tanggal: existing.tanggal, keterangan: existing.keterangan },
        dataBaru: null
      });
      await tx.hariLibur.delete({
        where: { id }
      });
    });
    res.json({ success: true, message: "Hari libur berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Hari libur tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus hari libur" });
  }
});

// ==========================================
// PURCHASE ORDER (PO) — Akuntan initiates
// ==========================================

// POST /api/akuntan/po - Akuntan membuat PO baru
router.post("/po", requireAuth, requirePermission("akuntan-master", "CREATE"), validate(schemas.poSchema), async (req, res) => {
  try {
    const { periodeId, tanggal, supplierId, items, catatan } = req.body;

    const targetDate = normalizeDateUTC(tanggal);

    const result = await prisma.$transaction(async (tx) => {
      // 0. Validate targetDate within periode range (lock periode row)
      const periode = await tx.$queryRaw`
        SELECT id, "tanggalMulai", "tanggalSelesai" FROM "Periode" WHERE id = ${periodeId} FOR UPDATE
      `;
      if (periode.length === 0) {
        throw new Error("[VALIDASI] Periode tidak ditemukan");
      }
      const p = periode[0];
      if (targetDate < p.tanggalMulai || targetDate > p.tanggalSelesai) {
        throw new Error("[VALIDASI] Tanggal PO harus dalam rentang periode aktif");
      }

      // 1. Find-or-create RabHarian with row lock (prevent race condition)
      const dateStr = targetDate.toISOString().split("T")[0]; // "2026-01-10"
      const existing = await tx.$queryRaw`
        SELECT id FROM "RabHarian"
        WHERE "periodeId" = ${periodeId} AND "tanggal" = ${dateStr}::date
        FOR UPDATE
      `;
      let rabHarianId;
      if (existing.length > 0) {
        rabHarianId = existing[0].id;
      } else {
        try {
          const created = await tx.rabHarian.create({
            data: {
              periodeId,
              tanggal: targetDate,
              status: "DRAFT",
              createdById: req.user.sub
            }
          });
          rabHarianId = created.id;
        } catch (createErr) {
          if (createErr.code === "P2002") {
            const retry = await tx.$queryRaw`
              SELECT id FROM "RabHarian"
              WHERE "periodeId" = ${periodeId} AND "tanggal" = ${dateStr}::date
              FOR UPDATE
            `;
            if (retry.length === 0) throw createErr;
            rabHarianId = retry[0].id;
          }
        }
      }

      // ========== B.13: Validasi RAB harus DISETUJUI ==========
      const rabCheck = await tx.rabHarian.findUnique({
        where: { id: rabHarianId },
        select: { status: true }
      });
      if (rabCheck.status !== "DISETUJUI") {
        throw new Error("[VALIDASI] RAB Harian untuk tanggal ini belum disetujui Kepala SPPG. Silakan ajukan persetujuan terlebih dahulu.");
      }
      // ========================================================

      // 2. Create TransaksiPembelian + items
      const tp = await tx.transaksiPembelian.create({
        data: {
          rabHarianId,
          supplierId,
          tanggal: targetDate,
          catatan: catatan || null,
          createdById: req.user.sub
          // status defaults to DIAJUKAN via schema default
        }
      });

      // Trigger notifikasi ke semua user role MITRA yang aktif
      const mitraUsers = await tx.user.findMany({
        where: { role: "MITRA", aktif: true },
        select: { id: true }
      });
      if (mitraUsers.length > 0) {
        const formattedPoDate = new Date(targetDate).toLocaleDateString('id-ID', { dateStyle: 'medium' });
        await tx.notifikasi.createMany({
          data: mitraUsers.map((m) => ({
            userId: m.id,
            judul: "Purchase Order Baru",
            pesan: `PO untuk RAB tanggal ${formattedPoDate} telah diterbitkan. Silakan lakukan realisasi.`,
            entityType: "PO",
            entityId: tp.id
          }))
        });
      }

      for (const item of items) {
        const qty = parseFloat(item.qtyTotal);
        const harga = parseFloat(item.hargaSatuan);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`[VALIDASI] Qty untuk bahan pokok ID ${item.bahanPokokId} tidak valid`);
        }
        if (isNaN(harga) || harga < 0) {
          throw new Error(`[VALIDASI] Harga untuk bahan pokok ID ${item.bahanPokokId} tidak valid`);
        }

        await tx.transaksiPembelianItem.create({
          data: {
            transaksiId: tp.id,
            bahanPokokId: item.bahanPokokId,
            qty: Math.round(qty * 1000) / 1000,
            hargaSatuan: Math.round(harga * 100) / 100,
            subtotal: Math.round((qty * harga) * 100) / 100
          }
        });
      }

      // Audit log — CREATE (PO)
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "TransaksiPembelian",
        entityId: tp.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          id: tp.id,
          rabHarianId,
          supplierId,
          tanggal: targetDate,
          catatan: catatan || null,
          jumlahItem: items.length
        }
      });

      return await tx.transaksiPembelian.findUnique({
        where: { id: tp.id },
        include: {
          items: { include: { bahanPokok: true } },
          supplier: true,
          createdBy: { select: { id: true, nama: true, role: true } }
        }
      });
    }, { timeout: 15000 });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[VALIDASI]")) {
      return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan PO" });
  }
});

// GET /api/akuntan/kebutuhan-hitungan - Get food requirements calculation for a specific date
router.get("/kebutuhan-hitungan", requireAuth, requirePermission("akuntan-master", "READ"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!periodeId || !tanggal) {
      return res.status(400).json({ error: "periodeId dan tanggal wajib diisi" });
    }

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // ========== B.13: Validasi RAB harus DISETUJUI ==========
    const rabValid = await prisma.rabHarian.findFirst({
      where: { periodeId, tanggal: targetDate, status: "DISETUJUI" }
    });
    if (!rabValid) {
      return res.json({ success: false, error: `RAB Harian untuk tanggal ${tanggal} belum disetujui Kepala SPPG.`, hitungan: [], rekap: null, menuDescription: "" });
    }
    // =======================================================

    // Query MenuHarian for this date and period
    const menuHarian = await prisma.menuHarian.findFirst({
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

    if (!menuHarian) {
      return res.json({ success: true, data: [] });
    }

    // Fetch active InputPenerimaManfaat for the period
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });



    const day = targetDate.getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    let inputsForDay = [];
    if (dayOfWeek) {
      inputsForDay = activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek));
    }

    // Calculate porsiPerKategori
    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
      }
    }

    const bahanMap = {};

    for (const blok of menuHarian.blok) {
      const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);

      for (const item of blok.menuItem) {
        for (const b of item.bahan) {
          if (b.jumlahHitungan !== null && b.bahanPokok.konversiPerKg !== null) {
            const valJumlahHitungan = Number(b.jumlahHitungan);
            const valKonversiPerKg = Number(b.bahanPokok.konversiPerKg);
            const bid = b.bahanPokokId;

            if (!bahanMap[bid]) {
              bahanMap[bid] = {
                bahanPokokId: bid,
                nama: b.bahanPokok.nama,
                satuanHitungan: b.bahanPokok.satuanHitungan || "",
                permintaanAG: 0,
                konversiPerKg: valKonversiPerKg
              };
            }

            bahanMap[bid].permintaanAG += valJumlahHitungan * totalPorsiBlok;
          }
        }
      }
    }

    const result = Object.values(bahanMap).map(item => {
      const permintaanAG = Math.round(item.permintaanAG * 100) / 100;
      const total = Math.round((permintaanAG / item.konversiPerKg) * 100) / 100;
      const final = Math.ceil(total);
      return {
        bahanPokokId: item.bahanPokokId,
        nama: item.nama,
        satuanHitungan: item.satuanHitungan,
        permintaanAG,
        konversiPerKg: item.konversiPerKg,
        total,
        final
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil kebutuhan hitungan" });
  }
});

// POST /api/akuntan/bahan-pokok - Create new master food ingredient
router.post("/bahan-pokok", requireAuth, requirePermission("akuntan-master", "CREATE"), async (req, res) => {
  try {
    const { nama, satuan, tipePenyimpanan, konversiPerKg, satuanHitungan } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: "Nama bahan pokok wajib diisi" });
    }
    if (!satuan || !satuan.trim()) {
      return res.status(400).json({ error: "Satuan bahan pokok wajib diisi" });
    }

    const cleanNama = nama.trim();
    const cleanSatuan = satuan.trim();

    const existing = await prisma.bahanPokok.findUnique({
      where: { nama: cleanNama }
    });
    if (existing) {
      return res.status(409).json({ error: `Bahan pokok "${cleanNama}" sudah ada` });
    }

    let validTipe = tipePenyimpanan;
    if (validTipe === "TAHAN_LAMA") validTipe = "STOK_GUDANG";
    if (!["HABIS_HARI_ITU", "STOK_GUDANG"].includes(validTipe)) {
      validTipe = "HABIS_HARI_ITU";
    }

    const data = await prisma.$transaction(async (tx) => {
      const rec = await tx.bahanPokok.create({
        data: {
          nama: cleanNama,
          satuan: cleanSatuan,
          tipePenyimpanan: validTipe,
          konversiPerKg: konversiPerKg !== undefined && konversiPerKg !== null && konversiPerKg !== "" ? parseFloat(konversiPerKg) : null,
          satuanHitungan: satuanHitungan !== undefined && satuanHitungan !== null && satuanHitungan !== "" ? satuanHitungan.toUpperCase().trim() : null
        }
      });
      // Audit log — CREATE
      await logAudit(tx, {
        userId: req.user.sub,
        entityType: "BahanPokok",
        entityId: rec.id,
        aksi: "CREATE",
        dataLama: null,
        dataBaru: {
          nama: rec.nama,
          satuan: rec.satuan,
          tipePenyimpanan: rec.tipePenyimpanan,
          konversiPerKg: rec.konversiPerKg,
          satuanHitungan: rec.satuanHitungan
        }
      });
      return rec;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat bahan pokok" });
  }
});

module.exports = router;
