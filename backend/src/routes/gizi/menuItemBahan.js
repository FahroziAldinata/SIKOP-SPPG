const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { getHargaBahan } = require("./_helpers");

const router = express.Router();

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

module.exports = router;
