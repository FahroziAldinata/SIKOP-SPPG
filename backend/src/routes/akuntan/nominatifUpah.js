const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { normalizeDateUTC } = require("../../lib/accountingHelper");

const router = express.Router();

// POST /api/akuntan/daftar-nominatif-upah - Create DaftarNominatifUpah with nested detailHarian
router.post("/", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const {
      periodeId,
      jenisPekerjaan,
      namaRelawan,
      danaKesehatan,
      tk,
      pj,
      tarifHarian,
      detailHarian
    } = req.body || {};

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!jenisPekerjaan) {
      return res.status(400).json({ error: "jenisPekerjaan wajib diisi" });
    }
    if (!namaRelawan) {
      return res.status(400).json({ error: "namaRelawan wajib diisi" });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1. Validate period exists
      const period = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!period) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);

      // 2. Validate detailHarian if provided
      let normalizedDetails = [];
      if (Array.isArray(detailHarian) && detailHarian.length > 0) {
        const uniqueDates = new Set();
        for (const detail of detailHarian) {
          const { tanggal, nominal } = detail;
          if (!tanggal) {
            throw new Error("[VALIDASI] Setiap detail harian wajib memiliki tanggal");
          }
          
          const targetTanggal = normalizeDateUTC(tanggal);
          if (isNaN(targetTanggal.getTime())) {
            throw new Error("[VALIDASI] Format tanggal detail harian tidak valid");
          }

          if (targetTanggal < start || targetTanggal > end) {
            throw new Error("[VALIDASI] Tanggal detail harian harus berada di dalam batas rentang periode");
          }

          const parsedNominal = parseFloat(nominal);
          if (isNaN(parsedNominal) || parsedNominal <= 0) {
            throw new Error("[VALIDASI] Nominal detail harian harus berupa angka positif");
          }

          const dateStr = targetTanggal.toISOString().split("T")[0];
          if (uniqueDates.has(dateStr)) {
            throw new Error(`[VALIDASI] Duplikasi tanggal ${dateStr} pada detail harian`);
          }
          uniqueDates.add(dateStr);

          normalizedDetails.push({
            tanggal: targetTanggal,
            nominal: Math.round(parsedNominal * 100) / 100
          });
        }
      }

      // 3. Parse optional flat benefits
      const parsedDanaKesehatan = danaKesehatan !== undefined ? parseFloat(danaKesehatan) : null;
      if (parsedDanaKesehatan !== null && (isNaN(parsedDanaKesehatan) || parsedDanaKesehatan < 0)) {
        throw new Error("[VALIDASI] danaKesehatan tidak boleh negatif");
      }

      const parsedTk = tk !== undefined ? parseFloat(tk) : null;
      if (parsedTk !== null && (isNaN(parsedTk) || parsedTk < 0)) {
        throw new Error("[VALIDASI] tk tidak boleh negatif");
      }

      const parsedPj = pj !== undefined ? parseFloat(pj) : null;
      if (parsedPj !== null && (isNaN(parsedPj) || parsedPj < 0)) {
        throw new Error("[VALIDASI] pj tidak boleh negatif");
      }

      const parsedTarifHarian = tarifHarian !== undefined ? parseFloat(tarifHarian) : null;
      if (parsedTarifHarian !== null && (isNaN(parsedTarifHarian) || parsedTarifHarian <= 0)) {
        throw new Error("[VALIDASI] tarifHarian harus berupa angka positif");
      }

      // 4. Create record
      return await tx.daftarNominatifUpah.create({
        data: {
          periodeId,
          jenisPekerjaan,
          namaRelawan,
          danaKesehatan: parsedDanaKesehatan !== null ? Math.round(parsedDanaKesehatan * 100) / 100 : null,
          tk: parsedTk !== null ? Math.round(parsedTk * 100) / 100 : null,
          pj: parsedPj !== null ? Math.round(parsedPj * 100) / 100 : null,
          tarifHarian: parsedTarifHarian !== null ? Math.round(parsedTarifHarian * 100) / 100 : null,
          detailHarian: {
            createMany: {
              data: normalizedDetails
            }
          }
        },
        include: {
          detailHarian: true
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan daftar nominatif upah" });
  }
});

// GET /api/akuntan/daftar-nominatif-upah - List DaftarNominatifUpah
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.daftarNominatifUpah.findMany({
      where: {
        periodeId: periodeId || undefined
      },
      include: {
        detailHarian: true
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = data.map(item => {
      const totalHonorarium = item.detailHarian.reduce((sum, h) => sum + parseFloat(h.nominal), 0);
      const totalUpah = totalHonorarium + 
        (item.danaKesehatan ? parseFloat(item.danaKesehatan) : 0) + 
        (item.tk ? parseFloat(item.tk) : 0) + 
        (item.pj ? parseFloat(item.pj) : 0);

      return {
        ...item,
        totalHonorarium: Math.round(totalHonorarium * 100) / 100,
        totalUpah: Math.round(totalUpah * 100) / 100
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil daftar nominatif upah" });
  }
});

// GET /api/akuntan/daftar-nominatif-upah/:id - Detail of DaftarNominatifUpah
router.get("/:id", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.daftarNominatifUpah.findUnique({
      where: { id },
      include: {
        detailHarian: {
          orderBy: { tanggal: "asc" }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: "Daftar nominatif upah tidak ditemukan" });
    }

    const totalHonorarium = item.detailHarian.reduce((sum, h) => sum + parseFloat(h.nominal), 0);
    const totalUpah = totalHonorarium + 
      (item.danaKesehatan ? parseFloat(item.danaKesehatan) : 0) + 
      (item.tk ? parseFloat(item.tk) : 0) + 
      (item.pj ? parseFloat(item.pj) : 0);

    res.json({
      ...item,
      totalHonorarium: Math.round(totalHonorarium * 100) / 100,
      totalUpah: Math.round(totalUpah * 100) / 100
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil detail nominatif upah" });
  }
});

// PUT /api/akuntan/daftar-nominatif-upah/:id - Update DaftarNominatifUpah and its nested detailHarian
router.put("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      jenisPekerjaan,
      namaRelawan,
      danaKesehatan,
      tk,
      pj,
      tarifHarian,
      detailHarian
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.daftarNominatifUpah.findUnique({
        where: { id }
      });
      if (!existing) {
        throw new Error("[NOT_FOUND] Daftar nominatif upah tidak ditemukan");
      }

      const period = await tx.periode.findUnique({ where: { id: existing.periodeId } });
      const start = new Date(period.tanggalMulai);
      const end = new Date(period.tanggalSelesai);

      const targetJenisPekerjaan = jenisPekerjaan !== undefined ? jenisPekerjaan : existing.jenisPekerjaan;
      if (!targetJenisPekerjaan) {
        throw new Error("[VALIDASI] jenisPekerjaan tidak boleh kosong");
      }

      const targetNamaRelawan = namaRelawan !== undefined ? namaRelawan : existing.namaRelawan;
      if (!targetNamaRelawan) {
        throw new Error("[VALIDASI] namaRelawan tidak boleh kosong");
      }

      const targetDanaKesehatan = danaKesehatan !== undefined ? (danaKesehatan !== null ? parseFloat(danaKesehatan) : null) : (existing.danaKesehatan !== null ? parseFloat(existing.danaKesehatan) : null);
      if (targetDanaKesehatan !== null && (isNaN(targetDanaKesehatan) || targetDanaKesehatan < 0)) {
        throw new Error("[VALIDASI] danaKesehatan tidak boleh negatif");
      }

      const targetTk = tk !== undefined ? (tk !== null ? parseFloat(tk) : null) : (existing.tk !== null ? parseFloat(existing.tk) : null);
      if (targetTk !== null && (isNaN(targetTk) || targetTk < 0)) {
        throw new Error("[VALIDASI] tk tidak boleh negatif");
      }

      const targetPj = pj !== undefined ? (pj !== null ? parseFloat(pj) : null) : (existing.pj !== null ? parseFloat(existing.pj) : null);
      if (targetPj !== null && (isNaN(targetPj) || targetPj < 0)) {
        throw new Error("[VALIDASI] pj tidak boleh negatif");
      }

      const targetTarifHarian = tarifHarian !== undefined ? (tarifHarian !== null ? parseFloat(tarifHarian) : null) : (existing.tarifHarian !== null ? parseFloat(existing.tarifHarian) : null);
      if (targetTarifHarian !== null && (isNaN(targetTarifHarian) || targetTarifHarian <= 0)) {
        throw new Error("[VALIDASI] tarifHarian harus berupa angka positif");
      }

      let normalizedDetails = null;
      if (detailHarian !== undefined) {
        if (Array.isArray(detailHarian)) {
          normalizedDetails = [];
          const uniqueDates = new Set();
          for (const detail of detailHarian) {
            const { tanggal, nominal } = detail;
            if (!tanggal) {
              throw new Error("[VALIDASI] Setiap detail harian wajib memiliki tanggal");
            }
            
            const targetTanggal = normalizeDateUTC(tanggal);
            if (isNaN(targetTanggal.getTime())) {
              throw new Error("[VALIDASI] Format tanggal detail harian tidak valid");
            }

            if (targetTanggal < start || targetTanggal > end) {
              throw new Error("[VALIDASI] Tanggal detail harian harus berada di dalam batas rentang periode");
            }

            const parsedNominal = parseFloat(nominal);
            if (isNaN(parsedNominal) || parsedNominal <= 0) {
              throw new Error("[VALIDASI] Nominal detail harian harus berupa angka positif");
            }

            const dateStr = targetTanggal.toISOString().split("T")[0];
            if (uniqueDates.has(dateStr)) {
              throw new Error(`[VALIDASI] Duplikasi tanggal ${dateStr} pada detail harian`);
            }
            uniqueDates.add(dateStr);

            normalizedDetails.push({
              daftarNominatifId: id,
              tanggal: targetTanggal,
              nominal: Math.round(parsedNominal * 100) / 100
            });
          }
        } else {
          throw new Error("[VALIDASI] detailHarian harus berupa array");
        }
      }

      // Update parent
      await tx.daftarNominatifUpah.update({
        where: { id },
        data: {
          jenisPekerjaan: targetJenisPekerjaan,
          namaRelawan: targetNamaRelawan,
          danaKesehatan: targetDanaKesehatan !== null ? Math.round(targetDanaKesehatan * 100) / 100 : null,
          tk: targetTk !== null ? Math.round(targetTk * 100) / 100 : null,
          pj: targetPj !== null ? Math.round(targetPj * 100) / 100 : null,
          tarifHarian: targetTarifHarian !== null ? Math.round(targetTarifHarian * 100) / 100 : null
        }
      });

      // Update nested detailHarian (using deleteMany + createMany) if provided
      if (normalizedDetails !== null) {
        await tx.daftarNominatifUpahHarian.deleteMany({
          where: { daftarNominatifId: id }
        });
        if (normalizedDetails.length > 0) {
          await tx.daftarNominatifUpahHarian.createMany({
            data: normalizedDetails
          });
        }
      }

      return await tx.daftarNominatifUpah.findUnique({
        where: { id },
        include: { detailHarian: true }
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui daftar nominatif upah" });
  }
});

// DELETE /api/akuntan/daftar-nominatif-upah/:id - Delete DaftarNominatifUpah (Cascade)
router.delete("/:id", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.daftarNominatifUpah.delete({
      where: { id }
    });
    res.json({ success: true, message: "Daftar nominatif upah berhasil dihapus" });
  } catch (error) {
    console.error(error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Daftar nominatif upah tidak ditemukan" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus daftar nominatif upah" });
  }
});

module.exports = router;
