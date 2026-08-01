const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/gizi");
const { launchPuppeteer } = require("../lib/launchPuppeteer");
const { renderGiziPemenuhanHtml } = require("../templates/dokumen/giziPemenuhan");
const { renderGiziRekapMenuHtml } = require("../templates/dokumen/giziRekapMenu");
const { renderGiziOrganoleptikHtml } = require("../templates/dokumen/giziOrganoleptik");

const router = express.Router();

const { HARI_MAP } = require("../lib/accountingHelper");

async function getPenerimaBlok(tx, periodeId, tanggal, kategoriPenerimaList) {
  if (!kategoriPenerimaList || kategoriPenerimaList.length === 0) return 0;
  const katIds = new Set(kategoriPenerimaList.map(k => k.id));

  const targetDate = new Date(tanggal);
  const day = targetDate.getUTCDay();
  const dayOfWeek = HARI_MAP[day];

  const activeInputs = await tx.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: { detail: true, grupHari: true }
  });

  const inputsForDay = dayOfWeek
    ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
    : [];

  let total = 0;
  for (const input of inputsForDay) {
    for (const det of input.detail) {
      if (katIds.has(det.kategoriId)) {
        total += (det.lakiLaki || 0) + (det.perempuan || 0);
      }
    }
  }
  return total;
}

async function getHargaBahan(tx, periodeId, bahanPokokId) {
  const langsung = await tx.hargaBahanPeriode.findUnique({
    where: {
      periodeId_bahanPokokId: { periodeId, bahanPokokId }
    }
  });
  if (langsung) return { harga: Number(langsung.harga), isFallback: false };

  // fallback: cari harga terakhir dari periode manapun sebelumnya (order by periode.tanggalMulai desc)
  const targetPeriode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!targetPeriode) {
    return { harga: 0, isFallback: true };
  }

  const fallback = await tx.hargaBahanPeriode.findFirst({
    where: {
      bahanPokokId,
      periode: {
        tanggalMulai: { lt: targetPeriode.tanggalMulai }
      }
    },
    orderBy: {
      periode: {
        tanggalMulai: "desc"
      }
    }
  });
  if (fallback) return { harga: Number(fallback.harga), isFallback: true };

  return { harga: 0, isFallback: true }; // belum pernah ada harga sama sekali
}


// GET /api/gizi/kelompok-umur-menu - List all KelompokUmurMenu (dropdown untuk MenuHarianBlok)
router.get("/kelompok-umur-menu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kelompokUmurMenu.findMany({
      orderBy: { kode: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelompok umur menu" });
  }
});

// GET /api/gizi/batas-harga-porsi - Get all batas harga porsi limits
router.get("/batas-harga-porsi", requireAuth, requireRole("AHLI_GIZI", "AKUNTAN", "KEPALA_SPPG", "ASLAP"), async (req, res) => {
  try {
    const data = await prisma.batasHargaPorsi.findMany();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data batas harga porsi" });
  }
});

// ==========================================
// CRUD MENU HARIAN
// ==========================================

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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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

// PUT /api/gizi/menu-harian/:id - Update MenuHarian (e.g. tanggal)
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
    console.error(error);
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
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu harian tidak ditemukan" });
    }
    if (error.code === "P2003" || error.message?.includes("23001") || error.message?.includes("foreign key constraint")) {
      return res.status(409).json({ error: "Menu harian tidak dapat dihapus karena masih memiliki data terkait yang tidak bisa dihapus otomatis" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu harian" });
  }
});

// ==========================================
// CRUD MENU HARIAN BLOK
// ==========================================

// POST /api/gizi/menu-harian-blok - Add block to existing MenuHarian
router.post("/menu-harian-blok", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuHarianBlokSchema), async (req, res) => {
  try {
    const { menuHarianId, kelompokUmurMenuId } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menuHarian = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menuHarian) {
        throw new Error("[NOT_FOUND] Data menu harian tidak ditemukan");
      }

      // Validate kelompokUmurMenu exists
      const kelompokUmur = await tx.kelompokUmurMenu.findUnique({ where: { id: kelompokUmurMenuId } });
      if (!kelompokUmur) {
        throw new Error("[NOT_FOUND] Kelompok umur menu tidak ditemukan");
      }

      // Validate unique constraint: [menuHarianId, kelompokUmurMenuId]
      const existing = await tx.menuHarianBlok.findUnique({
        where: {
          menuHarianId_kelompokUmurMenuId: {
            menuHarianId,
            kelompokUmurMenuId
          }
        }
      });
      if (existing) {
        throw new Error("[CONFLICT] Blok kelompok umur ini sudah terdaftar pada menu harian terpilih");
      }

      return await tx.menuHarianBlok.create({
        data: {
          menuHarianId,
          kelompokUmurMenuId,
          createdById: req.user.sub
        },
        include: {
          kelompokUmurMenu: true
        }
      });
    });

    // Auto-populate target gizi dari master
    try {
      const master = await prisma.masterTargetGizi.findUnique({
        where: { kelompokUmurMenuId: created.kelompokUmurMenuId }
      });
      if (master) {
        await prisma.menuTargetGizi.create({
          data: {
            blokId: created.id,
            targetEnergi: master.energiKkal,
            targetProtein: master.proteinGr,
            targetLemak: master.lemakGr,
            targetKarbohidrat: master.karbohidratGr,
            targetSerat: master.seratGr
          }
        });
      }
    } catch (e) {
      console.error('Auto-populate target gizi gagal:', e.message);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Blok kelompok umur ini sudah terdaftar pada menu harian terpilih" });
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan blok menu harian" });
  }
});

// DELETE /api/gizi/menu-harian-blok/:id - Delete block
router.delete("/menu-harian-blok/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuHarianBlok.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }

    await prisma.menuHarianBlok.delete({ where: { id } });

    res.json({ success: true, message: "Data blok menu harian berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data blok menu harian tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus blok menu harian" });
  }
});

// ==========================================
// CRUD MENU ITEM
// ==========================================

// GET /api/gizi/menu-item/:id - Detail MenuItem
router.get("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        bahan: {
          include: {
            bahanPokok: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data menu item" });
  }
});

// POST /api/gizi/menu-item - Create MenuItem
router.post("/menu-item", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuItemSchema), async (req, res) => {
  try {
    const { blokId, namaMenu, komponen } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) {
        throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");
      }

      return await tx.menuItem.create({
        data: {
          blokId,
          namaMenu,
          komponen
        }
      });
    });

    res.status(201).json(created);
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data menu item" });
  }
});

// PUT /api/gizi/menu-item/:id - Update MenuItem
router.put("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuItemUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { namaMenu, komponen } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.menuItem.findUnique({ where: { id } });
      if (!exists) {
        throw new Error("[NOT_FOUND] Data menu item tidak ditemukan");
      }

      return await tx.menuItem.update({
        where: { id },
        data: {
          namaMenu: namaMenu !== undefined ? namaMenu : undefined,
          komponen: komponen !== undefined ? komponen : undefined
        }
      });
    });

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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data menu item" });
  }
});

// DELETE /api/gizi/menu-item/:id - Delete MenuItem
router.delete("/menu-item/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuItem.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }

    await prisma.menuItem.delete({ where: { id } });

    res.json({ success: true, message: "Data menu item berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data menu item tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data menu item" });
  }
});

// ==========================================
// CRUD MENU ITEM BAHAN
// ==========================================

// GET /api/gizi/menu-item-bahan/:id - Detail MenuItemBahan
router.get("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuItemBahan.findUnique({
      where: { id },
      include: {
        bahanPokok: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data bahan menu item" });
  }
});

// POST /api/gizi/menu-item-bahan - Create MenuItemBahan
router.post("/menu-item-bahan", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuItemBahanSchema), async (req, res) => {
  try {
    const {
      menuItemId,
      bahanPokokId,
      beratBersihGr,
      beratURT,
      energiKkal,
      proteinGr,
      lemakGr,
      karbohidratGr,
      seratGr,
      bddPersen,
      beratSatuanGr,
      jumlahHitungan
    } = req.body;

    const cleanBeratBersih = beratBersihGr;
    const cleanBdd = bddPersen;
    const cleanBeratSatuan = beratSatuanGr;
    const cleanEnergi = energiKkal;
    const cleanProtein = proteinGr;
    const cleanLemak = lemakGr;
    const cleanKarbo = karbohidratGr;
    const cleanSerat = seratGr;
    const cleanJumlahHitungan = jumlahHitungan ?? null;

    const created = await prisma.$transaction(async (tx) => {
      // Validate menuItem exists
      const menuItem = await tx.menuItem.findUnique({
        where: { id: menuItemId },
        include: {
          blok: {
            include: {
              menuHarian: true
            }
          }
        }
      });
      if (!menuItem) {
        throw new Error("[NOT_FOUND] Menu item tidak ditemukan");
      }

      // Validate bahanPokok exists
      const bahanPokok = await tx.bahanPokok.findUnique({ where: { id: bahanPokokId } });
      if (!bahanPokok) {
        throw new Error("[NOT_FOUND] Bahan pokok tidak ditemukan");
      }

      const periodeId = menuItem.blok.menuHarian.periodeId;
      const { harga: cleanHarga, isFallback } = await getHargaBahan(tx, periodeId, bahanPokokId);

      // Calculate formulas in app-layer
      const beratKotorGr = cleanBeratBersih / cleanBdd * 100;
      const totalHargaBahan = beratKotorGr * cleanHarga / cleanBeratSatuan;

      const newBahan = await tx.menuItemBahan.create({
        data: {
          menuItemId,
          bahanPokokId,
          beratBersihGr: cleanBeratBersih,
          beratURT,
          energiKkal: cleanEnergi,
          proteinGr: cleanProtein,
          lemakGr: cleanLemak,
          karbohidratGr: cleanKarbo,
          seratGr: cleanSerat,
          bddPersen: cleanBdd,
          beratKotorGr,
          hargaSatuan: cleanHarga,
          beratSatuanGr: cleanBeratSatuan,
          totalHargaBahan,
          jumlahHitungan: cleanJumlahHitungan
        }
      });

      return {
        ...newBahan,
        isFallback
      };
    });

    res.status(201).json(created);
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan bahan menu item" });
  }
});

// PUT /api/gizi/menu-item-bahan/:id - Update MenuItemBahan
router.put("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuItemBahanUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      beratBersihGr,
      beratURT,
      energiKkal,
      proteinGr,
      lemakGr,
      karbohidratGr,
      seratGr,
      bddPersen,
      beratSatuanGr,
      jumlahHitungan
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItemBahan.findUnique({
        where: { id },
        include: {
          menuItem: {
            include: {
              blok: {
                include: {
                  menuHarian: true
                }
              }
            }
          }
        }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Data bahan menu item tidak ditemukan");
      }

      // Merge current values with updates
      const cleanBeratBersih = beratBersihGr !== undefined ? Number(beratBersihGr) : Number(existing.beratBersihGr);
      const cleanBdd = bddPersen !== undefined ? Number(bddPersen) : Number(existing.bddPersen);
      const cleanBeratSatuan = beratSatuanGr !== undefined ? Number(beratSatuanGr) : Number(existing.beratSatuanGr);

      const cleanEnergi = energiKkal !== undefined ? Number(energiKkal) : Number(existing.energiKkal);
      const cleanProtein = proteinGr !== undefined ? Number(proteinGr) : Number(existing.proteinGr);
      const cleanLemak = lemakGr !== undefined ? Number(lemakGr) : Number(existing.lemakGr);
      const cleanKarbo = karbohidratGr !== undefined ? Number(karbohidratGr) : Number(existing.karbohidratGr);
      const cleanSerat = seratGr !== undefined ? Number(seratGr) : Number(existing.seratGr);

      if (isNaN(cleanBeratBersih) || cleanBeratBersih < 0) throw new Error("[VALIDASI] beratBersihGr harus berupa angka non-negatif");
      if (isNaN(cleanBdd) || cleanBdd <= 0 || cleanBdd > 100) throw new Error("[VALIDASI] bddPersen harus bernilai antara 1 dan 100");
      if (isNaN(cleanBeratSatuan) || cleanBeratSatuan <= 0) throw new Error("[VALIDASI] beratSatuanGr harus bernilai positif lebih besar dari 0");
      if (isNaN(cleanEnergi) || cleanEnergi < 0) throw new Error("[VALIDASI] energiKkal harus berupa angka non-negatif");
      if (isNaN(cleanProtein) || cleanProtein < 0) throw new Error("[VALIDASI] proteinGr harus berupa angka non-negatif");
      if (isNaN(cleanLemak) || cleanLemak < 0) throw new Error("[VALIDASI] lemakGr harus berupa angka non-negatif");
      if (isNaN(cleanKarbo) || cleanKarbo < 0) throw new Error("[VALIDASI] karbohidratGr harus berupa angka non-negatif");
      if (isNaN(cleanSerat) || cleanSerat < 0) throw new Error("[VALIDASI] seratGr harus berupa angka non-negatif");

      let cleanJumlahHitungan = undefined;
      if (jumlahHitungan !== undefined) {
        if (jumlahHitungan === null || jumlahHitungan === '') {
          cleanJumlahHitungan = null;
        } else {
          const val = Number(jumlahHitungan);
          if (isNaN(val) || val < 0) {
            throw new Error("[VALIDASI] jumlahHitungan harus berupa angka non-negatif jika diisi");
          }
          cleanJumlahHitungan = val;
        }
      }

      const periodeId = existing.menuItem.blok.menuHarian.periodeId;
      const { harga: cleanHarga, isFallback } = await getHargaBahan(tx, periodeId, existing.bahanPokokId);

      // Calculate formulas in app-layer
      const beratKotorGr = cleanBeratBersih / cleanBdd * 100;
      const totalHargaBahan = beratKotorGr * cleanHarga / cleanBeratSatuan;

      const updatedBahan = await tx.menuItemBahan.update({
        where: { id },
        data: {
          beratBersihGr: cleanBeratBersih,
          beratURT: beratURT !== undefined ? beratURT : undefined,
          energiKkal: cleanEnergi,
          proteinGr: cleanProtein,
          lemakGr: cleanLemak,
          karbohidratGr: cleanKarbo,
          seratGr: cleanSerat,
          bddPersen: cleanBdd,
          beratKotorGr,
          hargaSatuan: cleanHarga,
          beratSatuanGr: cleanBeratSatuan,
          totalHargaBahan,
          jumlahHitungan: cleanJumlahHitungan !== undefined ? cleanJumlahHitungan : undefined
        }
      });

      return {
        ...updatedBahan,
        isFallback
      };
    });

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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui bahan menu item" });
  }
});

// DELETE /api/gizi/menu-item-bahan/:id - Delete MenuItemBahan
router.delete("/menu-item-bahan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.menuItemBahan.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }

    await prisma.menuItemBahan.delete({ where: { id } });

    res.json({ success: true, message: "Data bahan menu item berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Data bahan menu item tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus bahan menu item" });
  }
});

// ==========================================
// CRUD MENU TARGET GIZI (1:1 with block)
// ==========================================

// GET /api/gizi/menu-target-gizi/:id - Detail MenuTargetGizi
router.get("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil target gizi" });
  }
});

// POST /api/gizi/menu-target-gizi - Create MenuTargetGizi
router.post("/menu-target-gizi", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.targetGiziSchema), async (req, res) => {
  try {
    const { blokId, targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body;

    const cleanEnergi = targetEnergi;
    const cleanProtein = targetProtein;
    const cleanLemak = targetLemak;
    const cleanKarbo = targetKarbohidrat;
    const cleanSerat = targetSerat;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuTargetGizi.create({
        data: {
          blokId,
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Target gizi untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan target gizi" });
  }
});

// PUT /api/gizi/menu-target-gizi/:id - Update MenuTargetGizi
router.put("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.targetGiziUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEnergi, targetProtein, targetLemak, targetKarbohidrat, targetSerat } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuTargetGizi.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data target gizi tidak ditemukan");

      const cleanEnergi = targetEnergi !== undefined ? Number(targetEnergi) : Number(existing.targetEnergi);
      const cleanProtein = targetProtein !== undefined ? Number(targetProtein) : Number(existing.targetProtein);
      const cleanLemak = targetLemak !== undefined ? Number(targetLemak) : Number(existing.targetLemak);
      const cleanKarbo = targetKarbohidrat !== undefined ? Number(targetKarbohidrat) : Number(existing.targetKarbohidrat);
      const cleanSerat = targetSerat !== undefined ? Number(targetSerat) : Number(existing.targetSerat);

      if (isNaN(cleanEnergi) || cleanEnergi < 0) throw new Error("[VALIDASI] targetEnergi harus berupa angka non-negatif");
      if (isNaN(cleanProtein) || cleanProtein < 0) throw new Error("[VALIDASI] targetProtein harus berupa angka non-negatif");
      if (isNaN(cleanLemak) || cleanLemak < 0) throw new Error("[VALIDASI] targetLemak harus berupa angka non-negatif");
      if (isNaN(cleanKarbo) || cleanKarbo < 0) throw new Error("[VALIDASI] targetKarbohidrat harus berupa angka non-negatif");
      if (isNaN(cleanSerat) || cleanSerat < 0) throw new Error("[VALIDASI] targetSerat harus berupa angka non-negatif");

      return await tx.menuTargetGizi.update({
        where: { id },
        data: {
          targetEnergi: cleanEnergi,
          targetProtein: cleanProtein,
          targetLemak: cleanLemak,
          targetKarbohidrat: cleanKarbo,
          targetSerat: cleanSerat
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui target gizi" });
  }
});

// DELETE /api/gizi/menu-target-gizi/:id - Delete MenuTargetGizi
router.delete("/menu-target-gizi/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuTargetGizi.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data target gizi tidak ditemukan" });

    await prisma.menuTargetGizi.delete({ where: { id } });
    res.json({ success: true, message: "Data target gizi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data target gizi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus target gizi" });
  }
});

// ==========================================
// CRUD MENU ORGANOLEPTIK (1:1 with block)
// ==========================================

// GET /api/gizi/menu-organoleptik/:id - Detail MenuOrganoleptik
router.get("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil uji organoleptik" });
  }
});

// POST /api/gizi/menu-organoleptik - Create MenuOrganoleptik
router.post("/menu-organoleptik", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.organoleptikSchema), async (req, res) => {
  try {
    const { blokId, rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body;

    const cleanJumlahOmpreng = jumlahOmpreng;
    const targetUjiTanggal = ujiPadaTanggal ? new Date(ujiPadaTanggal) : new Date();
    const tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000); // retensi 3 hari

    const created = await prisma.$transaction(async (tx) => {
      const block = await tx.menuHarianBlok.findUnique({ where: { id: blokId } });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      return await tx.menuOrganoleptik.create({
        data: {
          blokId,
          rasa,
          aroma,
          tekstur,
          suhuSaji,
          catatan,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Uji organoleptik untuk blok ini sudah terdaftar" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan uji organoleptik" });
  }
});

// PUT /api/gizi/menu-organoleptik/:id - Update MenuOrganoleptik
router.put("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.organoleptikUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { rasa, aroma, tekstur, suhuSaji, catatan, ujiPadaTanggal, jumlahOmpreng } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuOrganoleptik.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data uji organoleptik tidak ditemukan");

      let cleanJumlahOmpreng = existing.jumlahOmpreng;
      if (jumlahOmpreng !== undefined) {
        cleanJumlahOmpreng = parseInt(jumlahOmpreng, 10);
        if (isNaN(cleanJumlahOmpreng) || cleanJumlahOmpreng <= 0) {
          throw new Error("[VALIDASI] jumlahOmpreng harus berupa bilangan bulat positif");
        }
      }

      let targetUjiTanggal = existing.ujiPadaTanggal;
      let tanggalMusnah = existing.tanggalMusnah;
      if (ujiPadaTanggal !== undefined) {
        targetUjiTanggal = new Date(ujiPadaTanggal);
        if (isNaN(targetUjiTanggal.getTime())) {
          throw new Error("[VALIDASI] Format ujiPadaTanggal tidak valid");
        }
        tanggalMusnah = new Date(targetUjiTanggal.getTime() + 3 * 24 * 60 * 60 * 1000);
      }

      return await tx.menuOrganoleptik.update({
        where: { id },
        data: {
          rasa: rasa !== undefined ? rasa : undefined,
          aroma: aroma !== undefined ? aroma : undefined,
          tekstur: tekstur !== undefined ? tekstur : undefined,
          suhuSaji: suhuSaji !== undefined ? suhuSaji : undefined,
          catatan: catatan !== undefined ? catatan : undefined,
          ujiPadaTanggal: targetUjiTanggal,
          jumlahOmpreng: cleanJumlahOmpreng,
          tanggalMusnah
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui uji organoleptik" });
  }
});

// DELETE /api/gizi/menu-organoleptik/:id - Delete MenuOrganoleptik
router.delete("/menu-organoleptik/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.menuOrganoleptik.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });

    await prisma.menuOrganoleptik.delete({ where: { id } });
    res.json({ success: true, message: "Data uji organoleptik berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data uji organoleptik tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus uji organoleptik" });
  }
});

// ==========================================
// CRUD ALERGI CATATAN (1:many with block)
// ==========================================

// GET /api/gizi/alergi-catatan - List AlergiCatatan by block
router.get("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { blokId } = req.query;
    if (!blokId) return res.status(400).json({ error: "blokId query parameter wajib dikirimkan" });

    const list = await prisma.alergiCatatan.findMany({
      where: { blokId }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar catatan alergi" });
  }
});

// GET /api/gizi/alergi-catatan/:id - Detail AlergiCatatan
router.get("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil catatan alergi" });
  }
});

// POST /api/gizi/alergi-catatan - Create AlergiCatatan
router.post("/alergi-catatan", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.alergiSchema), async (req, res) => {
  try {
    const { blokId, jenisAlergi, jumlahSiswa, bahanPengganti } = req.body;

    const cleanJumlah = jumlahSiswa;

    const created = await prisma.$transaction(async (tx) => {
      // Validate block exists
      const block = await tx.menuHarianBlok.findUnique({
        where: { id: blokId },
        include: {
          menuHarian: { select: { id: true, periodeId: true, tanggal: true } },
          kelompokUmurMenu: { include: { kategoriPenerima: true } },
          alergi: true
        }
      });
      if (!block) throw new Error("[NOT_FOUND] Blok menu harian tidak ditemukan");

      // Validasi Total Alergi <= Total Penerima Manfaat
      const totalPenerima = await getPenerimaBlok(
        tx,
        block.menuHarian.periodeId,
        block.menuHarian.tanggal,
        block.kelompokUmurMenu?.kategoriPenerima
      );
      const existingSum = (block.alergi || []).reduce((sum, a) => sum + a.jumlahSiswa, 0);
      const totalAlergi = existingSum + cleanJumlah;
      if (totalAlergi > totalPenerima) {
        throw new Error("[VALIDASI] Total alergi melebihi jumlah penerima manfaat di blok ini");
      }

      return await tx.alergiCatatan.create({
        data: {
          blokId,
          jenisAlergi,
          jumlahSiswa: cleanJumlah,
          bahanPengganti
        }
      });
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan catatan alergi" });
  }
});

// PUT /api/gizi/alergi-catatan/:id - Update AlergiCatatan
router.put("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.alergiUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { jenisAlergi, jumlahSiswa, bahanPengganti } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.alergiCatatan.findUnique({
        where: { id },
        include: {
          blok: {
            include: {
              menuHarian: { select: { id: true, periodeId: true, tanggal: true } },
              kelompokUmurMenu: { include: { kategoriPenerima: true } },
              alergi: true
            }
          }
        }
      });
      if (!existing) throw new Error("[NOT_FOUND] Data catatan alergi tidak ditemukan");

      let cleanJumlah = existing.jumlahSiswa;
      if (jumlahSiswa !== undefined) {
        cleanJumlah = Number(jumlahSiswa);
        if (isNaN(cleanJumlah) || cleanJumlah < 0 || !Number.isInteger(cleanJumlah)) {
          throw new Error("[VALIDASI] jumlahSiswa harus berupa bilangan bulat non-negatif");
        }
      }

      // Validasi Total Alergi <= Total Penerima Manfaat
      const totalPenerima = await getPenerimaBlok(
        tx,
        existing.blok.menuHarian.periodeId,
        existing.blok.menuHarian.tanggal,
        existing.blok.kelompokUmurMenu?.kategoriPenerima
      );
      const existingSumOther = (existing.blok.alergi || [])
        .filter(a => a.id !== id)
        .reduce((sum, a) => sum + a.jumlahSiswa, 0);
      const totalAlergi = existingSumOther + cleanJumlah;

      if (totalAlergi > totalPenerima) {
        throw new Error("[VALIDASI] Total alergi melebihi jumlah penerima manfaat di blok ini");
      }

      return await tx.alergiCatatan.update({
        where: { id },
        data: {
          jenisAlergi: jenisAlergi !== undefined ? jenisAlergi : undefined,
          jumlahSiswa: cleanJumlah,
          bahanPengganti: bahanPengganti !== undefined ? bahanPengganti : undefined
        }
      });
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui catatan alergi" });
  }
});

// DELETE /api/gizi/alergi-catatan/:id - Delete AlergiCatatan
router.delete("/alergi-catatan/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.alergiCatatan.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });

    await prisma.alergiCatatan.delete({ where: { id } });
    res.json({ success: true, message: "Data catatan alergi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data catatan alergi tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus catatan alergi" });
  }
});

// ==========================================
// CRUD KENDARAAN (Logistics Setup)
// ==========================================

// GET /api/gizi/kendaraan - List Kendaraan
router.get("/kendaraan", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const list = await prisma.kendaraan.findMany();
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar kendaraan" });
  }
});

// GET /api/gizi/kendaraan/:id - Detail Kendaraan
router.get("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.kendaraan.findUnique({ where: { id } });
    if (!data) return res.status(404).json({ error: "Data kendaraan tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail kendaraan" });
  }
});

const kendaraanMovedToMitra = (req, res) => {
  res.status(410).json({
    error: "Pengaturan kendaraan sudah dipindahkan ke Mitra. Gunakan endpoint /api/mitra/kendaraan."
  });
};

router.post("/kendaraan", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);
router.put("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);
router.delete("/kendaraan/:id", requireAuth, requireRole("AHLI_GIZI"), kendaraanMovedToMitra);

// ==========================================
// CRUD PENGIRIMAN HARIAN (Logistics Delivery)
// ==========================================

// GET /api/gizi/pengiriman - List PengirimanHarian
router.get("/pengiriman", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { menuHarianId } = req.query;
    const list = await prisma.pengirimanHarian.findMany({
      where: menuHarianId ? { menuHarianId } : {},
      include: {
        kendaraan: true,
        kategoriPenerima: true
      }
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar pengiriman" });
  }
});

// GET /api/gizi/pengiriman/:id - Detail PengirimanHarian
router.get("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.pengirimanHarian.findUnique({
      where: { id },
      include: { 
        kendaraan: true,
        kategoriPenerima: true
      }
    });
    if (!data) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail pengiriman" });
  }
});

// POST /api/gizi/pengiriman - Create PengirimanHarian
router.post("/pengiriman", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.pengirimanSchema), async (req, res) => {
  try {
    const { menuHarianId, kategoriIds, kendaraanId, catatan } = req.body;

    const created = await prisma.$transaction(async (tx) => {
      // Validate MenuHarian exists
      const menu = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
      if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");

      // Validate Kendaraan exists
      const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
      if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

      // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
      if (!vehicle.aktif) {
        throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
      }

      // Validate all kategoriIds
      const uniqueKategoriIds = [...new Set(kategoriIds)];
      const validKategori = await tx.kategoriPenerima.findMany({
        where: { id: { in: uniqueKategoriIds } }
      });
      if (validKategori.length !== uniqueKategoriIds.length) {
        throw new Error("[VALIDASI] Satu atau lebih kategoriPenerimaId tidak valid");
      }

      return await tx.pengirimanHarian.create({
        data: {
          menuHarianId,
          kendaraanId,
          catatan,
          kategoriPenerima: {
            connect: uniqueKategoriIds.map(id => ({ id }))
          }
        },
        include: {
          kendaraan: true,
          kategoriPenerima: true
        }
      });
    }, { timeout: 15000 });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian or kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan pengiriman" });
  }
});

// PUT /api/gizi/pengiriman/:id - Update PengirimanHarian
router.put("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.pengirimanUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { menuHarianId, kategoriIds, kendaraanId, catatan } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.pengirimanHarian.findUnique({ where: { id } });
      if (!existing) throw new Error("[NOT_FOUND] Data pengiriman tidak ditemukan");

      if (menuHarianId !== undefined) {
        const menu = await tx.menuHarian.findUnique({ where: { id: menuHarianId } });
        if (!menu) throw new Error("[NOT_FOUND] Menu harian tidak ditemukan");
      }

      if (kategoriIds !== undefined) {
        if (!Array.isArray(kategoriIds) || kategoriIds.length === 0) {
          throw new Error("[VALIDASI] kategoriIds wajib berupa array dan minimal memiliki 1 item");
        }
      }

      if (kendaraanId !== undefined) {
        const vehicle = await tx.kendaraan.findUnique({ where: { id: kendaraanId } });
        if (!vehicle) throw new Error("[NOT_FOUND] Kendaraan tidak ditemukan");

        // [ASUMSI] Kendaraan harus aktif untuk dapat digunakan mengirim porsi makanan
        if (!vehicle.aktif) {
          throw new Error("[VALIDASI] Kendaraan yang dipilih tidak aktif");
        }
      }

      const updateData = {
        menuHarianId: menuHarianId !== undefined ? menuHarianId : undefined,
        kendaraanId: kendaraanId !== undefined ? kendaraanId : undefined,
        catatan: catatan !== undefined ? catatan : undefined,
      };

      if (kategoriIds !== undefined) {
        const uniqueKategoriIds = [...new Set(kategoriIds)];
        const validKategori = await tx.kategoriPenerima.findMany({
          where: { id: { in: uniqueKategoriIds } }
        });
        if (validKategori.length !== uniqueKategoriIds.length) {
          throw new Error("[VALIDASI] Satu atau lebih kategoriPenerimaId tidak valid");
        }
        updateData.kategoriPenerima = {
          set: uniqueKategoriIds.map(id => ({ id }))
        };
      }

      return await tx.pengirimanHarian.update({
        where: { id },
        data: updateData,
        include: {
          kendaraan: true,
          kategoriPenerima: true
        }
      });
    }, { timeout: 15000 });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Menu harian or kendaraan tidak ditemukan di database" });
    }
    if (error.message) {
      if (error.message.startsWith("[NOT_FOUND]")) return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      if (error.message.startsWith("[VALIDASI]")) return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui pengiriman" });
  }
});

// DELETE /api/gizi/pengiriman/:id - Delete PengirimanHarian
router.delete("/pengiriman/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await prisma.pengirimanHarian.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });

    await prisma.pengirimanHarian.delete({ where: { id } });
    res.json({ success: true, message: "Data pengiriman berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") return res.status(404).json({ error: "Data pengiriman tidak ditemukan" });
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus pengiriman" });
  }
});

// ==========================================
// MASTER MENU MINGGUAN (Referensi historis read-only dari MenuHarian approved)
// ==========================================

const HARI_MENU_BY_DAY = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const MASTER_MENU_KOMPONEN_KEYS = {
  KARBOHIDRAT: "menuKarbohidrat",
  LAUK_HEWANI: "menuLaukHewani",
  LAUK_NABATI: "menuLaukNabati",
  SAYUR: "menuSayur",
  BUAH: "menuBuah"
};

const decimalToNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildMasterMenuReferenceRows = (menus, hargaBahanPeriode) => {
  const hargaByBahanId = new Map(
    hargaBahanPeriode.map((row) => [row.bahanPokokId, decimalToNumber(row.harga)])
  );

  const rows = [];
  for (const menu of menus) {
    for (const blok of menu.blok) {
      const row = {
        id: blok.id,
        menuHarianId: menu.id,
        periodeId: menu.periodeId,
        tanggal: menu.tanggal,
        status: menu.status,
        jalur: blok.kelompokUmurMenu?.jalur || null,
        hari: HARI_MENU_BY_DAY[new Date(menu.tanggal).getDay()] || null,
        kelompokUmurMenu: blok.kelompokUmurMenu || null,
        menuKarbohidrat: null,
        menuLaukHewani: null,
        menuLaukNabati: null,
        menuSayur: null,
        menuBuah: null,
        estimasiHargaPerPorsi: 0,
        estimasiHargaPerPorsiParsial: 0,
        jumlahBahanTanpaHargaPeriode: 0,
        menuItem: []
      };

      for (const item of blok.menuItem) {
        const itemBahan = [];
        let itemTotal = 0;
        let itemHasMissingPrice = false;

        for (const bahan of item.bahan) {
          const hargaPeriode = hargaByBahanId.get(bahan.bahanPokokId) ?? null;
          const beratKotorGr = decimalToNumber(bahan.beratKotorGr) || 0;
          const beratSatuanGr = decimalToNumber(bahan.beratSatuanGr) || 0;
          const totalHargaBahan = hargaPeriode !== null && beratSatuanGr > 0
            ? Math.round((beratKotorGr * hargaPeriode / beratSatuanGr) * 100) / 100
            : null;

          if (totalHargaBahan === null) {
            itemHasMissingPrice = true;
            row.jumlahBahanTanpaHargaPeriode += 1;
          } else {
            itemTotal += totalHargaBahan;
          }

          itemBahan.push({
            id: bahan.id,
            bahanPokokId: bahan.bahanPokokId,
            bahanPokok: bahan.bahanPokok,
            beratKotorGr,
            beratSatuanGr,
            hargaPeriode,
            totalHargaBahan
          });
        }

        const normalizedItem = {
          id: item.id,
          namaMenu: item.namaMenu,
          komponen: item.komponen,
          estimasiHarga: itemHasMissingPrice ? null : Math.round(itemTotal * 100) / 100,
          estimasiHargaParsial: Math.round(itemTotal * 100) / 100,
          bahan: itemBahan
        };
        row.menuItem.push(normalizedItem);

        const komponenKey = MASTER_MENU_KOMPONEN_KEYS[item.komponen];
        if (komponenKey) {
          row[komponenKey] = row[komponenKey]
            ? `${row[komponenKey]}, ${item.namaMenu}`
            : item.namaMenu;
        }

        row.estimasiHargaPerPorsiParsial += normalizedItem.estimasiHargaParsial;
      }

      row.estimasiHargaPerPorsiParsial = Math.round(row.estimasiHargaPerPorsiParsial * 100) / 100;
      row.estimasiHargaPerPorsi = row.jumlahBahanTanpaHargaPeriode > 0
        ? null
        : row.estimasiHargaPerPorsiParsial;
      rows.push(row);
    }
  }

  return rows;
};

const getApprovedMasterMenuReferences = async ({ periodeId, jalur, hari, blokId }) => {
  if (!periodeId && !blokId) {
    throw new Error("[VALIDASI] periodeId wajib disertakan pada query parameter");
  }

  const blokWhere = {
    ...(blokId ? { id: blokId } : {}),
    ...(jalur ? { kelompokUmurMenu: { jalur } } : {})
  };

  const menuWhere = {
    status: "DISETUJUI",
    periodeId: periodeId || undefined
  };

  const menus = await prisma.menuHarian.findMany({
    where: {
      ...menuWhere,
      blok: { some: blokWhere }
    },
    include: {
      blok: {
        where: blokWhere,
        include: {
          kelompokUmurMenu: true,
          menuItem: {
            include: {
              bahan: {
                include: { bahanPokok: true }
              }
            }
          }
        }
      }
    },
    orderBy: { tanggal: "asc" }
  });

  const periodeIds = [...new Set(menus.map((menu) => menu.periodeId))];
  const hargaBahanPeriode = periodeIds.length
    ? await prisma.hargaBahanPeriode.findMany({
      where: { periodeId: { in: periodeIds } },
      include: { bahanPokok: true }
    })
    : [];

  const rows = buildMasterMenuReferenceRows(menus, hargaBahanPeriode);
  return hari ? rows.filter((row) => row.hari === hari) : rows;
};

// GET /api/gizi/master-menu - List referensi historis dari MenuHarian DISETUJUI
router.get("/master-menu", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, jalur, hari } = req.query;
    const list = await getApprovedMasterMenuReferences({ periodeId, jalur, hari });
    res.json(list);
  } catch (error) {
    console.error(error);
    if (error.message?.startsWith("[VALIDASI]")) {
      return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar master menu" });
  }
});

// GET /api/gizi/master-menu/by-hari - Return 1 row master buat hari+jalur+mingguKe itu
router.get("/master-menu/by-hari", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, jalur, hari, mingguKe } = req.query;
    if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
    if (!jalur) return res.status(400).json({ error: "jalur wajib diisi" });
    if (!hari) return res.status(400).json({ error: "hari wajib diisi" });

    // Validate enum values
    if (!["SISWA", "TIGA_B"].includes(jalur)) {
      return res.status(400).json({ error: "jalur tidak valid (harus SISWA atau TIGA_B)" });
    }
    if (!["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"].includes(hari)) {
      return res.status(400).json({ error: "hari tidak valid (harus SENIN s/d SABTU)" });
    }

    const mk = mingguKe ? parseInt(mingguKe, 10) : 1;
    if (![1, 2].includes(mk)) {
      return res.status(400).json({ error: "mingguKe tidak valid (harus 1 atau 2)" });
    }

    const row = await prisma.masterMenuMingguan.findUnique({
      where: {
        periodeId_jalur_hari_mingguKe: {
          periodeId,
          jalur,
          hari,
          mingguKe: mk
        }
      }
    });

    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data master menu by hari" });
  }
});

// GET /api/gizi/master-menu-list - List all MasterMenuMingguan per period
router.get("/master-menu-list", requireAuth, requireRole("AHLI_GIZI", "AKUNTAN", "KEPALA_SPPG", "ASLAP"), async (req, res) => {
  const { periodeId } = req.query;
  if (!periodeId) return res.status(400).json({ error: "periodeId wajib diisi" });
  try {
    const data = await prisma.masterMenuMingguan.findMany({
      where: { periodeId },
      orderBy: [{ jalur: "asc" }, { mingguKe: "asc" }, { hari: "asc" }]
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil daftar master menu" });
  }
});

// GET /api/gizi/master-menu/:id - Detail referensi historis per blok MenuHarian
router.get("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI", "ASLAP", "KEPALA_SPPG", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await getApprovedMasterMenuReferences({ blokId: id });
    const data = rows[0] || null;
    if (!data) return res.status(404).json({ error: "Data master menu tidak ditemukan" });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail master menu" });
  }
});

// POST /api/gizi/master-menu - Create MasterMenuMingguan
router.post("/master-menu", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.menuSchema), async (req, res) => {
  try {
    const {
      periodeId,
      jalur,
      hari,
      mingguKe,
      catatan,
      menuKarbohidrat,
      menuLaukHewani,
      menuLaukNabati,
      menuSayur,
      menuBuah
    } = req.body;

    const mk = mingguKe;

    // Validate Periode exists
    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) return res.status(404).json({ error: "Periode tidak ditemukan" });

    // Check unique constraint manually to avoid generic error
    const existing = await prisma.masterMenuMingguan.findUnique({
      where: {
        periodeId_jalur_hari_mingguKe: {
          periodeId,
          jalur,
          hari,
          mingguKe: mk
        }
      }
    });
    if (existing) {
      return res.status(400).json({ error: "Master menu untuk periode, jalur, hari, dan minggu ini sudah ada" });
    }

    const created = await prisma.masterMenuMingguan.create({
      data: {
        periodeId,
        jalur,
        hari,
        mingguKe: mk,
        catatan: catatan || null,
        menuKarbohidrat: menuKarbohidrat || "",
        menuLaukHewani: menuLaukHewani || "",
        menuLaukNabati: menuLaukNabati || "",
        menuSayur: menuSayur || "",
        menuBuah: menuBuah || "",
        createdById: req.user.sub
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Master menu untuk periode, jalur, hari, dan minggu ini sudah ada" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat master menu" });
  }
});

// PUT /api/gizi/master-menu/:id - Update MasterMenuMingguan
router.put("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI"), validate(schemas.masterMenuUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mingguKe,
      catatan,
      menuKarbohidrat,
      menuLaukHewani,
      menuLaukNabati,
      menuSayur,
      menuBuah
    } = req.body;

    const existing = await prisma.masterMenuMingguan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Master menu tidak ditemukan" });
    }

    const mk = mingguKe !== undefined ? mingguKe : existing.mingguKe;

    const updated = await prisma.masterMenuMingguan.update({
      where: { id },
      data: {
        mingguKe: mk,
        catatan: catatan !== undefined ? (catatan || null) : existing.catatan,
        menuKarbohidrat: menuKarbohidrat !== undefined ? menuKarbohidrat : existing.menuKarbohidrat,
        menuLaukHewani: menuLaukHewani !== undefined ? menuLaukHewani : existing.menuLaukHewani,
        menuLaukNabati: menuLaukNabati !== undefined ? menuLaukNabati : existing.menuLaukNabati,
        menuSayur: menuSayur !== undefined ? menuSayur : existing.menuSayur,
        menuBuah: menuBuah !== undefined ? menuBuah : existing.menuBuah
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Master menu untuk periode, jalur, hari, dan minggu ini sudah ada" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui master menu" });
  }
});

// DELETE /api/gizi/master-menu/:id - Delete MasterMenuMingguan
router.delete("/master-menu/:id", requireAuth, requireRole("AHLI_GIZI"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.masterMenuMingguan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Master menu tidak ditemukan" });
    }

    await prisma.masterMenuMingguan.delete({ where: { id } });
    res.json({ success: true, message: "Master menu berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus master menu" });
  }
});

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

// ==========================================
// LAPORAN PEMENUHAN GIZI
// ==========================================

async function getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
  const whereClause = {};

  if (tanggalList && tanggalList.length > 0) {
    whereClause.tanggal = {
      in: tanggalList.map(d => new Date(d))
    };
  } else {
    whereClause.tanggal = {
      gte: new Date(tanggalMulai),
      lte: new Date(tanggalSelesai)
    };
  }

  whereClause.status = 'DISETUJUI';

  const menuHarianList = await prisma.menuHarian.findMany({
    where: whereClause,
    include: {
      blok: {
        include: {
          kelompokUmurMenu: {
            include: {
              kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
            }
          },
          targetGizi: true,
          menuItem: {
            include: {
              bahan: {
                include: {
                  bahanPokok: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { tanggal: "asc" }
  });

  if (!menuHarianList || menuHarianList.length === 0) {
    return [];
  }

  const periodeIds = Array.from(new Set(menuHarianList.map(m => m.periodeId)));

  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId: { in: periodeIds } },
    include: { detail: true, grupHari: true }
  });

  const reportData = menuHarianList.map(menu => {
    const day = new Date(menu.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek
      ? activeInputs.filter(inp => inp.periodeId === menu.periodeId && (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
      : [];

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + ((det.lakiLaki || 0) + (det.perempuan || 0));
      }
    }

    let blocks = menu.blok;
    if (blokKode) {
      blocks = blocks.filter(b => b.kelompokUmurMenu?.kode === blokKode);
    }

    const mappedBloks = blocks.map(blok => {
      let totalPenerima = 0;
      for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
        totalPenerima += (porsiPerKategori[kat.id] || 0);
      }

      const menuItems = (blok.menuItem || []).map(item => ({
        namaMenu: item.namaMenu,
        komponen: item.komponen
      }));

      let realisasiEnergi = 0;
      let realisasiProtein = 0;
      let realisasiLemak = 0;
      let realisasiKarbohidrat = 0;
      let realisasiSerat = 0;
      let totalBiaya = 0;

      (blok.menuItem || []).forEach(item => {
        (item.bahan || []).forEach(b => {
          realisasiEnergi += Number(b.energiKkal || 0);
          realisasiProtein += Number(b.proteinGr || 0);
          realisasiLemak += Number(b.lemakGr || 0);
          realisasiKarbohidrat += Number(b.karbohidratGr || 0);
          realisasiSerat += Number(b.seratGr || 0);
          totalBiaya += Number(b.totalHargaBahan || 0);
        });
      });

      const targetEnergi = Number(blok.targetGizi?.targetEnergi || 0);
      const targetProtein = Number(blok.targetGizi?.targetProtein || 0);
      const targetLemak = Number(blok.targetGizi?.targetLemak || 0);
      const targetKarbohidrat = Number(blok.targetGizi?.targetKarbohidrat || 0);
      const targetSerat = Number(blok.targetGizi?.targetSerat || 0);

      const calcPersen = (realisasi, target) => {
        if (!target || target <= 0) return 0;
        return Number(((realisasi / target) * 100).toFixed(2));
      };

      const gizi = [
        { key: 'energi', label: 'Energi', satuan: 'kkal', target: targetEnergi, realisasi: realisasiEnergi, persen: calcPersen(realisasiEnergi, targetEnergi) },
        { key: 'protein', label: 'Protein', satuan: 'g', target: targetProtein, realisasi: realisasiProtein, persen: calcPersen(realisasiProtein, targetProtein) },
        { key: 'lemak', label: 'Lemak', satuan: 'g', target: targetLemak, realisasi: realisasiLemak, persen: calcPersen(realisasiLemak, targetLemak) },
        { key: 'karbohidrat', label: 'Karbohidrat', satuan: 'g', target: targetKarbohidrat, realisasi: realisasiKarbohidrat, persen: calcPersen(realisasiKarbohidrat, targetKarbohidrat) },
        { key: 'serat', label: 'Serat', satuan: 'g', target: targetSerat, realisasi: realisasiSerat, persen: calcPersen(realisasiSerat, targetSerat) }
      ];

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        menu: menuItems,
        gizi,
        totalBiaya
      };
    });

    const formattedTanggal = menu.tanggal instanceof Date
      ? menu.tanggal.toISOString().split("T")[0]
      : String(menu.tanggal).split("T")[0];

    return {
      tanggal: formattedTanggal,
      status: menu.status,
      blok: mappedBloks
    };
  });

  return reportData;
}

// GET /api/gizi/laporan/pemenuhan-gizi - Laporan Pemenuhan Gizi Harian
router.get("/laporan/pemenuhan-gizi", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanPemenuhanGiziQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan pemenuhan gizi" });
  }
});

// GET /api/gizi/laporan/pemenuhan-gizi/pdf - Download PDF Laporan Pemenuhan Gizi
router.get("/laporan/pemenuhan-gizi/pdf", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanPemenuhanGiziQuerySchema, "query"), async (req, res) => {
  let browser;
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const reportData = await getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

    const pdfMulai = tanggalMulai || (tanggalList.length > 0 ? tanggalList[0] : "");
    const pdfSelesai = tanggalSelesai || (tanggalList.length > 0 ? tanggalList[tanggalList.length - 1] : "");

    const tMulai = new Date(pdfMulai);
    const tSelesai = new Date(pdfSelesai);
    const targetPeriode = await prisma.periode.findFirst({
      where: {
        tanggalMulai: { lte: tSelesai },
        tanggalSelesai: { gte: tMulai }
      },
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    let setupLembaga = targetPeriode?.setupLembaga;
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
    };

    const namaGizi = req.user?.nama || req.user?.username || "";

    const html = renderGiziPemenuhanHtml({
      lembaga,
      namaGizi,
      tanggalMulai: pdfMulai,
      tanggalSelesai: pdfSelesai,
      data: reportData
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Pemenuhan-Gizi-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/pemenuhan-gizi/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Pemenuhan Gizi" });
  } finally {
    if (browser) await browser.close();
  }
});

// ==========================================
// LAPORAN REKAP MENU
// ==========================================

async function getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
  const whereClause = {};

  if (tanggalList && tanggalList.length > 0) {
    whereClause.tanggal = {
      in: tanggalList.map(d => new Date(d))
    };
  } else {
    whereClause.tanggal = {
      gte: new Date(tanggalMulai),
      lte: new Date(tanggalSelesai)
    };
  }

  whereClause.status = 'DISETUJUI';

  const menuHarianList = await prisma.menuHarian.findMany({
    where: whereClause,
    include: {
      blok: {
        include: {
          kelompokUmurMenu: {
            include: {
              kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
            }
          },
          menuItem: {
            include: {
              bahan: {
                include: {
                  bahanPokok: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { tanggal: "asc" }
  });

  if (!menuHarianList || menuHarianList.length === 0) {
    return [];
  }

  const periodeIds = Array.from(new Set(menuHarianList.map(m => m.periodeId)));

  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId: { in: periodeIds } },
    include: { detail: true, grupHari: true }
  });

  const KOMPONEN_ORDER = ['KARBOHIDRAT', 'LAUK_HEWANI', 'LAUK_NABATI', 'SAYUR', 'BUAH'];

  const reportData = menuHarianList.map(menu => {
    const day = new Date(menu.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek
      ? activeInputs.filter(inp => inp.periodeId === menu.periodeId && (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
      : [];

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + ((det.lakiLaki || 0) + (det.perempuan || 0));
      }
    }

    let blocks = menu.blok;
    if (blokKode) {
      blocks = blocks.filter(b => b.kelompokUmurMenu?.kode === blokKode);
    }

    const mappedBloks = blocks.map(blok => {
      let totalPenerima = 0;
      for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
        totalPenerima += (porsiPerKategori[kat.id] || 0);
      }

      const rows = [];
      (blok.menuItem || []).forEach(item => {
        (item.bahan || []).forEach(b => {
          rows.push({
            komponen: item.komponen,
            namaMenu: item.namaMenu,
            bahan: b.bahanPokok?.nama || '',
            beratBersihGr: Number(b.beratBersihGr || 0),
            beratURT: b.beratURT || ''
          });
        });
      });

      rows.sort((a, b) => {
        const idxA = a.komponen ? KOMPONEN_ORDER.indexOf(a.komponen) : -1;
        const idxB = b.komponen ? KOMPONEN_ORDER.indexOf(b.komponen) : -1;
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        return orderA - orderB;
      });

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        rows
      };
    });

    const formattedTanggal = menu.tanggal instanceof Date
      ? menu.tanggal.toISOString().split("T")[0]
      : String(menu.tanggal).split("T")[0];

    return {
      tanggal: formattedTanggal,
      status: menu.status,
      blok: mappedBloks
    };
  });

  return reportData;
}

// GET /api/gizi/laporan/rekap-menu - Laporan Rekap Menu
router.get("/laporan/rekap-menu", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanRekapMenuQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan rekap menu" });
  }
});

// GET /api/gizi/laporan/rekap-menu/pdf - Download PDF Laporan Rekap Menu
router.get("/laporan/rekap-menu/pdf", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanRekapMenuQuerySchema, "query"), async (req, res) => {
  let browser;
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const reportData = await getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

    const pdfMulai = tanggalMulai || (tanggalList.length > 0 ? tanggalList[0] : "");
    const pdfSelesai = tanggalSelesai || (tanggalList.length > 0 ? tanggalList[tanggalList.length - 1] : "");

    const tMulai = new Date(pdfMulai);
    const tSelesai = new Date(pdfSelesai);
    const targetPeriode = await prisma.periode.findFirst({
      where: {
        tanggalMulai: { lte: tSelesai },
        tanggalSelesai: { gte: tMulai }
      },
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    let setupLembaga = targetPeriode?.setupLembaga;
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
    };

    const namaGizi = req.user?.nama || req.user?.username || "";

    const html = renderGiziRekapMenuHtml({
      lembaga,
      namaGizi,
      tanggalMulai: pdfMulai,
      tanggalSelesai: pdfSelesai,
      data: reportData
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Rekap-Menu-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/rekap-menu/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Rekap Menu" });
  } finally {
    if (browser) await browser.close();
  }
});
// ==========================================
// LAPORAN UJI ORGANOLEPTIK & KEAMANAN PANGAN
// ==========================================

async function getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
  const whereClause = {};

  if (tanggalList && tanggalList.length > 0) {
    whereClause.tanggal = {
      in: tanggalList.map(d => new Date(d))
    };
  } else {
    whereClause.tanggal = {
      gte: new Date(tanggalMulai),
      lte: new Date(tanggalSelesai)
    };
  }

  whereClause.status = 'DISETUJUI';

  const menuHarianList = await prisma.menuHarian.findMany({
    where: whereClause,
    include: {
      blok: {
        include: {
          kelompokUmurMenu: {
            include: {
              kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
            }
          },
          organoleptik: true,
          alergi: true
        }
      }
    },
    orderBy: { tanggal: "asc" }
  });

  if (!menuHarianList || menuHarianList.length === 0) {
    return [];
  }

  const periodeIds = Array.from(new Set(menuHarianList.map(m => m.periodeId)));

  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId: { in: periodeIds } },
    include: { detail: true, grupHari: true }
  });

  const reportData = menuHarianList.map(menu => {
    const day = new Date(menu.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek
      ? activeInputs.filter(inp => inp.periodeId === menu.periodeId && (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
      : [];

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + ((det.lakiLaki || 0) + (det.perempuan || 0));
      }
    }

    let blocks = menu.blok;
    if (blokKode) {
      blocks = blocks.filter(b => b.kelompokUmurMenu?.kode === blokKode);
    }

    const mappedBloks = blocks.map(blok => {
      let totalPenerima = 0;
      for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
        totalPenerima += (porsiPerKategori[kat.id] || 0);
      }

      const organoleptik = blok.organoleptik
        ? {
            rasa: blok.organoleptik.rasa || "",
            aroma: blok.organoleptik.aroma || "",
            tekstur: blok.organoleptik.tekstur || "",
            suhuSaji: blok.organoleptik.suhuSaji || "",
            catatan: blok.organoleptik.catatan || "",
            ujiPadaTanggal: blok.organoleptik.ujiPadaTanggal
              ? (blok.organoleptik.ujiPadaTanggal instanceof Date
                  ? blok.organoleptik.ujiPadaTanggal.toISOString().split("T")[0]
                  : String(blok.organoleptik.ujiPadaTanggal).split("T")[0])
              : "",
            jumlahOmpreng: blok.organoleptik.jumlahOmpreng ?? 1,
            tanggalMusnah: blok.organoleptik.tanggalMusnah
              ? (blok.organoleptik.tanggalMusnah instanceof Date
                  ? blok.organoleptik.tanggalMusnah.toISOString().split("T")[0]
                  : String(blok.organoleptik.tanggalMusnah).split("T")[0])
              : ""
          }
        : null;

      const alergi = (blok.alergi || []).map(a => ({
        jenisAlergi: a.jenisAlergi || "",
        jumlahSiswa: a.jumlahSiswa ?? 0,
        bahanPengganti: a.bahanPengganti || ""
      }));

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        organoleptik,
        alergi
      };
    });

    const formattedTanggal = menu.tanggal instanceof Date
      ? menu.tanggal.toISOString().split("T")[0]
      : String(menu.tanggal).split("T")[0];

    return {
      tanggal: formattedTanggal,
      status: menu.status,
      blok: mappedBloks
    };
  });

  return reportData;
}

// GET /api/gizi/laporan/organoleptik - Laporan Uji Organoleptik & Keamanan Pangan JSON
router.get("/laporan/organoleptik", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanOrganoleptikQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[laporan/organoleptik]", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan uji organoleptik" });
  }
});

// GET /api/gizi/laporan/organoleptik/pdf - Download PDF Laporan Uji Organoleptik & Keamanan Pangan
router.get("/laporan/organoleptik/pdf", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanOrganoleptikQuerySchema, "query"), async (req, res) => {
  let browser;
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const reportData = await getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

    const pdfMulai = tanggalMulai || (tanggalList.length > 0 ? tanggalList[0] : "");
    const pdfSelesai = tanggalSelesai || (tanggalList.length > 0 ? tanggalList[tanggalList.length - 1] : "");

    const tMulai = new Date(pdfMulai);
    const tSelesai = new Date(pdfSelesai);
    const targetPeriode = await prisma.periode.findFirst({
      where: {
        tanggalMulai: { lte: tSelesai },
        tanggalSelesai: { gte: tMulai }
      },
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    let setupLembaga = targetPeriode?.setupLembaga;
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
    };

    const namaGizi = req.user?.nama || req.user?.username || "";

    const html = renderGiziOrganoleptikHtml({
      lembaga,
      namaGizi,
      tanggalMulai: pdfMulai,
      tanggalSelesai: pdfSelesai,
      data: reportData
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Uji-Organoleptik-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/organoleptik/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Uji Organoleptik & Keamanan Pangan" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;


