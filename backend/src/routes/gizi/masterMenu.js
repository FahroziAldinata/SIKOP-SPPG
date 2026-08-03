const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { logger } = require("../../lib/logger");

const router = express.Router();

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
    logger.error(error);
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
    logger.error(error);
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
  } catch {
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
    logger.error(error);
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
    logger.error(error);
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
    logger.error(error);
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
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus master menu" });
  }
});

module.exports = router;
