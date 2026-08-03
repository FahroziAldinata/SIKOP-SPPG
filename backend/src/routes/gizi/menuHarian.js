const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { HARI_MAP } = require("../../lib/accountingHelper");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/gizi/menu-harian - List MenuHarian per period
router.get("/menu-harian", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib disertakan pada query parameter" });
    }

    const data = await prisma.menuHarian.findMany({
      where: { periodeId },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: {
              include: {
                kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
              }
            },
            organoleptik: true,
            alergi: true,
            targetGizi: true,
            menuItem: { include: { bahan: true } }
          }
        }
      },
      orderBy: { tanggal: "asc" }
    });

    // Fetch all HargaBahanPeriode for this period to see which ones are NOT fallback
    const directPrices = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId }
    });
    const directBahanIds = new Set(directPrices.map(p => p.bahanPokokId));

    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    const mapped = data.map(menu => {
      const day = new Date(menu.tanggal).getUTCDay();
      const dayOfWeek = HARI_MAP[day];
      const inputsForDay = dayOfWeek
        ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
        : [];
      const porsiPerKategori = {};
      for (const input of inputsForDay) {
        for (const det of input.detail) {
          porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
        }
      }

      return {
        ...menu,
        blok: menu.blok.map(blok => {
          let totalPenerima = 0;
          for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
            totalPenerima += (porsiPerKategori[kat.id] || 0);
          }
          return {
            ...blok,
            totalPenerima,
            menuItem: blok.menuItem.map(item => ({
              ...item,
              bahan: item.bahan.map(b => ({
                ...b,
                isFallback: !directBahanIds.has(b.bahanPokokId)
              }))
            }))
          };
        })
      };
    });

    res.json(mapped);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu harian" });
  }
});

// GET /api/gizi/menu-harian/:id - Get single MenuHarian with blocks
router.get("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuHarian.findUnique({
      where: { id },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: {
              include: {
                kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
              }
            },
            organoleptik: true,
            alergi: true,
            targetGizi: true,
            menuItem: { include: { bahan: true } }
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }

    const directPrices = await prisma.hargaBahanPeriode.findMany({
      where: { periodeId: data.periodeId }
    });
    const directBahanIds = new Set(directPrices.map(p => p.bahanPokokId));

    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId: data.periodeId },
      include: { detail: true, grupHari: true }
    });
    const day = new Date(data.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek
      ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
      : [];
    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
      }
    }

    const mapped = {
      ...data,
      blok: data.blok.map(blok => {
        let totalPenerima = 0;
        for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
          totalPenerima += (porsiPerKategori[kat.id] || 0);
        }
        return {
          ...blok,
          totalPenerima,
          menuItem: blok.menuItem.map(item => ({
            ...item,
            bahan: item.bahan.map(b => ({
              ...b,
              isFallback: !directBahanIds.has(b.bahanPokokId)
            }))
          }))
        };
      })
    };

    res.json(mapped);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu harian" });
  }
});

// POST /api/gizi/menu-harian - Create MenuHarian and optional blocks
router.post("/menu-harian", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuHarianSchema), async (req, res) => {
  try {
    const { periodeId, tanggal, blok } = req.body;
    const targetTanggal = new Date(tanggal);

    const created = await prisma.$transaction(async (tx) => {
      // 2. Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Validasi: tanggal wajib dalam rentang periode — FINAL, dikonfirmasi user
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);
      if (targetTanggal < start || targetTanggal > end) {
        throw new Error("[VALIDASI] Tanggal menu harian harus berada di dalam batas rentang periode");
      }

      // 4. Validate unique constraint: [periodeId, tanggal]
      const existing = await tx.menuHarian.findUnique({
        where: {
          periodeId_tanggal: {
            periodeId,
            tanggal: targetTanggal
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Menu harian untuk tanggal ini sudah terdaftar pada periode terpilih");
      }

      // 5. Create MenuHarian
      const menuHarian = await tx.menuHarian.create({
        data: {
          periodeId,
          tanggal: targetTanggal,
          status: "DRAFT"
        }
      });

      // 6. Create blocks if provided
      if (blok && Array.isArray(blok) && blok.length > 0) {
        // Prevent duplicate kelompokUmurMenuId in payload
        const seenIds = new Set();
        for (const b of blok) {
          if (!b.kelompokUmurMenuId) {
            throw new Error("[VALIDASI] kelompokUmurMenuId wajib diisi pada setiap blok");
          }
          if (seenIds.has(b.kelompokUmurMenuId)) {
            throw new Error(`[VALIDASI] Duplikasi kelompokUmurMenuId '${b.kelompokUmurMenuId}' dalam payload`);
          }
          seenIds.add(b.kelompokUmurMenuId);

          // Verify kelompokUmurMenu exists
          const exists = await tx.kelompokUmurMenu.findUnique({ where: { id: b.kelompokUmurMenuId } });
          if (!exists) {
            throw new Error(`[NOT_FOUND] Kelompok umur menu ID '${b.kelompokUmurMenuId}' tidak ditemukan`);
          }

          // Create block
          await tx.menuHarianBlok.create({
            data: {
              menuHarianId: menuHarian.id,
              kelompokUmurMenuId: b.kelompokUmurMenuId,
              createdById: req.user.sub
            }
          });
        }
      }

      // Return complete object
      return await tx.menuHarian.findUnique({
        where: { id: menuHarian.id },
        include: {
          blok: {
            include: {
              kelompokUmurMenu: true
            }
          }
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Menu harian atau blok kelompok umur sudah terdaftar" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data menu harian" });
  }
});

// PUT /api/gizi/menu-harian/:id - Update MenuHarian (e.g. tanggal atau status)
router.put("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuHarianUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, status } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuHarian.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data menu harian tidak ditemukan");
      }

      // Validasi: Status existing harus DRAFT atau DITOLAK agar bisa diedit
      if (existing.status !== "DRAFT" && existing.status !== "DITOLAK") {
        throw new Error("[VALIDASI] Menu harian yang sudah diajukan atau disetujui tidak dapat diubah");
      }

      const updateData = {};

      if (tanggal) {
        const targetTanggal = new Date(tanggal);
        if (isNaN(targetTanggal.getTime())) {
          throw new Error("[VALIDASI] Format tanggal tidak valid");
        }

        // Validasi: tanggal wajib dalam rentang periode
        const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
        const start = new Date(period.tanggalMulai);
        const end = new Date(period.tanggalSelesai);
        if (targetTanggal < start || targetTanggal > end) {
          throw new Error("[VALIDASI] Tanggal menu harian harus berada di dalam batas rentang periode");
        }

        // Check unique constraint excluding self
        const conflict = await tx.menuHarian.findFirst({
          where: {
            periodeId: existing.periodeId,
            tanggal: targetTanggal,
            NOT: { id }
          }
        });
        if (conflict) {
          throw new Error("[CONFLICT] Menu harian untuk tanggal ini sudah terdaftar pada periode terpilih");
        }

        updateData.tanggal = targetTanggal;
      }

      if (status) {
        updateData.status = status;
      }

      if (status === "DIAJUKAN" && existing.status !== "DIAJUKAN") {
        const bloks = await tx.menuHarianBlok.findMany({
          where: { menuHarianId: existing.id },
          include: {
            kelompokUmurMenu: {
              include: { kategoriPenerima: { select: { jenisPorsi: true } } }
            },
            menuItem: {
              include: { bahan: true }
            }
          }
        });

        for (const blok of bloks) {
          const totalBiaya = blok.menuItem.reduce((sum, item) => {
            return sum + item.bahan.reduce((s, b) => s + Number(b.totalHargaBahan || 0), 0);
          }, 0);
          const jenisPorsi = blok.kelompokUmurMenu?.kategoriPenerima?.[0]?.jenisPorsi;
          if (jenisPorsi) {
            const batas = await tx.batasHargaPorsi.findUnique({ where: { jenisPorsi } });
            if (batas && totalBiaya > Number(batas.batasMaksimal)) {
              return res.status(400).json({
                error: 'Blok ' + blok.kelompokUmurMenu.nama + ' melebihi batas anggaran: Rp' + Number(totalBiaya).toLocaleString('id-ID') + ' > Rp' + Number(batas.batasMaksimal).toLocaleString('id-ID')
              });
            }
          }
        }

        const kepalaUsers = await tx.user.findMany({
          where: { role: "KEPALA_SPPG", aktif: true },
          select: { id: true }
        });
        if (kepalaUsers.length > 0) {
          const formattedDate = new Date(existing.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' });
          await tx.notifikasi.createMany({
            data: kepalaUsers.map((k) => ({
              userId: k.id,
              judul: "Menu Harian Baru Butuh Persetujuan",
              pesan: `Menu Harian tanggal ${formattedDate} telah diajukan dan menunggu persetujuan Anda.`,
              entityType: "MENU",
              entityId: id
            }))
          });
        }
      }

      return await tx.menuHarian.update({
        where: { id },
        data: updateData,
        include: {
          blok: {
            include: {
              kelompokUmurMenu: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Menu harian untuk tanggal ini sudah terdaftar" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data menu harian" });
  }
});

// DELETE /api/gizi/menu-harian/:id - Delete MenuHarian (and cascade blocks)
router.delete("/menu-harian/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuHarian.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }

    // Cascade delete shipments, approvals, and blocks
    await prisma.$transaction(async (tx) => {
      await tx.pengirimanHarian.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.approval.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.menuHarianBlok.deleteMany({
        where: { menuHarianId: id }
      });
      await tx.menuHarian.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: "Data menu harian berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "Menu harian tidak dapat dihapus karena masih memiliki data terkait yang tidak bisa dihapus otomatis" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu harian" });
  }
});

module.exports = router;
