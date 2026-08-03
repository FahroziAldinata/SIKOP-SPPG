const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { inferJenjang } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/aslap/penerima-manfaat - Get list of penerima manfaat
router.get("/penerima-manfaat", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.inputPenerimaManfaat.findMany({
      where: periodeId ? { periodeId } : undefined,
      include: {
        grupHari: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data penerima manfaat" });
  }
});

// GET /api/aslap/penerima-manfaat/:id - Get single penerima manfaat
router.get("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.inputPenerimaManfaat.findUnique({
      where: { id },
      include: {
        grupHari: true,
        createdBy: {
          select: { id: true, nama: true, username: true, role: true }
        },
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data penerima manfaat tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data penerima manfaat" });
  }
});

// POST /api/aslap/penerima-manfaat - Create new penerima manfaat
router.post("/penerima-manfaat", requireAuth, requireRole("ASLAP"), validate(schemas.penerimaManfaatSchema), async (req, res) => {
  try {
    const { periodeId: rawPeriodeId, grupHariId: rawGrupHariId, hariAktif, detail } = req.body || {};

    let grupHariId = rawGrupHariId || null;
    let periodeId = rawPeriodeId;

    if (grupHariId) {
      const g = await prisma.grupHari.findUnique({ where: { id: grupHariId } });
      if (!g) {
        return res.status(404).json({ error: `Grup hari dengan ID ${grupHariId} tidak ditemukan` });
      }
      periodeId = g.periodeId;
    } else if (hariAktif && Array.isArray(hariAktif) && hariAktif.length > 0 && periodeId) {
      const label = hariAktif.join("-");
      let g = await prisma.grupHari.findUnique({
        where: { periodeId_label: { periodeId, label } }
      });
      if (!g) {
        g = await prisma.grupHari.create({
          data: { periodeId, label, hariAktif }
        });
      }
      grupHariId = g.id;
    } else if (periodeId) {
      // NON_PESERTA_DIDIK tidak terikat grup hari
      grupHariId = null;
    } else {
      return res.status(400).json({ error: "grupHariId atau periodeId wajib diisi" });
    }

    if (!detail || !Array.isArray(detail) || detail.length === 0) {
      return res.status(400).json({ error: "detail penerima manfaat wajib diisi dengan array yang tidak kosong" });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error(`[NOT_FOUND] Periode dengan ID ${periodeId} tidak ditemukan`);
      }

      const allCategories = await tx.kategoriPenerima.findMany();
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));

      const resolvedDetails = [];
      const sekolahAgg = {};

      for (let i = 0; i < detail.length; i++) {
        const item = detail[i];
        const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan, sekolahJenjang, npsn, alamat } = item;

        if (!kategoriId) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: kategoriId wajib diisi`);
        }

        const kategori = categoryMap.get(kategoriId);
        if (!kategori) {
          throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Kategori dengan ID ${kategoriId} tidak ditemukan`);
        }

        if (kategori.jenisSasaran === "NON_PESERTA_DIDIK") {
          // NON_PESERTA_DIDIK tidak terikat grup hari
          // simpan dengan grupHariId = null
          // finalGrupHariId tetap null
        } else {
          // PESERTA_DIDIK — ikut logika existing
        }

        const numLaki = parseInt(lakiLaki, 10);
        const numPerempuan = parseInt(perempuan, 10);
        if (isNaN(numLaki) || numLaki < 0) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah laki-laki harus berupa angka non-negatif`);
        }
        if (isNaN(numPerempuan) || numPerempuan < 0) {
          throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah perempuan harus berupa angka non-negatif`);
        }

        let finalSekolahId = null;
        let finalPosyanduId = null;

        if (kategori.jenisSasaran === "PESERTA_DIDIK") {
          if (sekolahId) {
            const sek = await tx.sekolah.findUnique({ where: { id: sekolahId } });
            if (!sek) throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Sekolah dengan ID ${sekolahId} tidak ditemukan`);
            finalSekolahId = sek.id;
          } else if (sekolahNama) {
            let sek = await tx.sekolah.findFirst({ where: { nama: { equals: sekolahNama, mode: "insensitive" } } });
            if (!sek) {
              const bodySekolahJenjang = sekolahJenjang || item.jenjang || req.body?.sekolahJenjang;
              const bodyNpsn = npsn || item.npsn || req.body?.npsn;
              const bodyAlamat = alamat || item.alamat || req.body?.alamat;
              sek = await tx.sekolah.create({
                data: {
                  nama: sekolahNama,
                  jenjang: bodySekolahJenjang || inferJenjang(sekolahNama),
                  npsn: bodyNpsn ? String(bodyNpsn) : null,
                  alamat: bodyAlamat || null
                }
              });
            }
            finalSekolahId = sek.id;
          } else {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' (PESERTA_DIDIK) memerlukan sekolahId atau sekolahNama`);
          }
        } else {
          if (posyanduId) {
            const pos = await tx.posyandu.findUnique({ where: { id: posyanduId } });
            if (!pos) throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Posyandu dengan ID ${posyanduId} tidak ditemukan`);
            finalPosyanduId = pos.id;
          } else if (posyanduNama) {
            let pos = await tx.posyandu.findFirst({ where: { nama: { equals: posyanduNama, mode: "insensitive" } } });
            if (!pos) {
              pos = await tx.posyandu.create({ data: { nama: posyanduNama } });
            }
            finalPosyanduId = pos.id;
          } else if (kategori.kode?.startsWith("ATS_")) {
            finalPosyanduId = null;
          } else {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Kategori '${kategori.nama}' (NON_PESERTA_DIDIK) memerlukan posyanduId atau posyanduNama`);
          }
        }

        resolvedDetails.push({
          kategoriId: kategori.id,
          sekolahId: finalSekolahId,
          posyanduId: finalPosyanduId,
          lakiLaki: numLaki,
          perempuan: numPerempuan
        });

        if (finalSekolahId) {
          if (!sekolahAgg[finalSekolahId]) {
            sekolahAgg[finalSekolahId] = { total: 0, kategoriItems: {} };
          }
          sekolahAgg[finalSekolahId].total += numLaki + numPerempuan;
          const kunci = item.kategoriId;
          if (!sekolahAgg[finalSekolahId].kategoriItems[kunci]) {
            sekolahAgg[finalSekolahId].kategoriItems[kunci] = {
              nama: kategori ? kategori.nama : kunci,
              total: 0
            };
          }
          sekolahAgg[finalSekolahId].kategoriItems[kunci].total += numLaki + numPerempuan;
        }
      }

      const validationResults = [];
      let capacityWarning = null;

      for (const [sekolahId, agg] of Object.entries(sekolahAgg)) {
        const sekolahKelasList = await tx.sekolahKelasDetail.findMany({
          where: { periodeId, sekolahId }
        });

        if (sekolahKelasList.length > 0) {
          const totalPerKelas = sekolahKelasList.reduce((sum, kelas) => sum + kelas.jumlah, 0);

          if (agg.total > totalPerKelas) {
            capacityWarning = `Total penerima (${agg.total}) melebihi kapasitas SekolahKelasDetail (${totalPerKelas})`;
          }

          if (agg.total !== totalPerKelas) {
            for (const item of Object.values(agg.kategoriItems)) {
              validationResults.push({
                kategori: item.nama,
                total_penerima: item.total,
                total_kelas: totalPerKelas,
                selisih: Math.abs(agg.total - totalPerKelas),
                sekolah_id: sekolahId
              });
            }
          }
        }
      }

      if (validationResults.length > 0) {
        throw new Error(`[VALIDASI_SILANG] ${JSON.stringify(validationResults)}`);
      }

      const hasPesertaDidik = detail.some(item => {
        const kat = categoryMap.get(item.kategoriId);
        return kat && kat.jenisSasaran === "PESERTA_DIDIK";
      });
      const recordGrupHariId = hasPesertaDidik ? grupHariId : null;

      const createdRecord = await tx.inputPenerimaManfaat.create({
        data: {
          periodeId,
          grupHariId: recordGrupHariId,
          createdById: req.user.sub,
          detail: {
            create: resolvedDetails
          }
        },
        include: {
          grupHari: true,
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      });

      if (capacityWarning) {
        createdRecord.warning = true;
        createdRecord.warningMessage = capacityWarning;
      }

      return createdRecord;
    }, { timeout: 15000 });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[VALIDASI_SILANG]")) {
        const details = JSON.parse(error.message.replace("[VALIDASI_SILANG] ", ""));
        return res.status(400).json({
          error: "VALIDASI_SILANG",
          message: "Validasi silang gagal: total penerima tidak cocok dengan jumlah kelas",
          details
        });
      }
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data penerima manfaat" });
  }
});

// PUT /api/aslap/penerima-manfaat/:id - Update existing penerima manfaat
router.put("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP"), validate(schemas.penerimaManfaatUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { grupHariId, hariAktif, detail } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const existingParent = await tx.inputPenerimaManfaat.findUnique({
        where: { id }
      });
      if (!existingParent) {
        throw new Error("[NOT_FOUND] Data penerima manfaat tidak ditemukan");
      }

      const { periodeId } = existingParent;

      await tx.$queryRaw`SELECT id FROM "Periode" WHERE id = ${periodeId} FOR UPDATE`;

      let targetGrupHariId = grupHariId || existingParent.grupHariId;

      if (grupHariId) {
        const g = await tx.grupHari.findUnique({ where: { id: grupHariId } });
        if (!g) throw new Error(`[NOT_FOUND] Grup hari dengan ID ${grupHariId} tidak ditemukan`);
      } else if (hariAktif && Array.isArray(hariAktif) && hariAktif.length > 0) {
        const label = hariAktif.join("-");
        let g = await tx.grupHari.findUnique({
          where: { periodeId_label: { periodeId, label } }
        });
        if (!g) {
          g = await tx.grupHari.create({
            data: { periodeId, label, hariAktif }
          });
        }
        targetGrupHariId = g.id;
      }

      let resolvedDetails = null;
      if (detail) {
        if (!Array.isArray(detail)) {
          throw new Error("[VALIDASI] detail harus berupa array");
        }

        const allCategories = await tx.kategoriPenerima.findMany();
        const categoryMap = new Map(allCategories.map(c => [c.id, c]));

        resolvedDetails = [];
        const sekolahAgg = {};

        for (let i = 0; i < detail.length; i++) {
          const item = detail[i];
          const { kategoriId, sekolahId, sekolahNama, posyanduId, posyanduNama, lakiLaki, perempuan, sekolahJenjang, npsn, alamat } = item;

          if (!kategoriId) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: kategoriId wajib diisi`);
          }

          const kategori = categoryMap.get(kategoriId);
          if (!kategori) {
            throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Kategori dengan ID ${kategoriId} tidak ditemukan`);
          }

          const numLaki = parseInt(lakiLaki, 10);
          const numPerempuan = parseInt(perempuan, 10);
          if (isNaN(numLaki) || numLaki < 0 || isNaN(numPerempuan) || numPerempuan < 0) {
            throw new Error(`[VALIDASI] Detail indeks ke-${i}: Jumlah laki-laki dan perempuan harus berupa angka non-negatif`);
          }

          let finalSekolahId = null;
          let finalPosyanduId = null;

          if (kategori.jenisSasaran === "PESERTA_DIDIK") {
            if (sekolahId) {
              const sek = await tx.sekolah.findUnique({ where: { id: sekolahId } });
              if (!sek) throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Sekolah dengan ID ${sekolahId} tidak ditemukan`);
              finalSekolahId = sek.id;
            } else if (sekolahNama) {
              let sek = await tx.sekolah.findFirst({ where: { nama: { equals: sekolahNama, mode: "insensitive" } } });
              if (!sek) {
                const bodySekolahJenjang = sekolahJenjang || item.jenjang || req.body?.sekolahJenjang;
                const bodyNpsn = npsn || item.npsn || req.body?.npsn;
                const bodyAlamat = alamat || item.alamat || req.body?.alamat;
                sek = await tx.sekolah.create({
                  data: {
                    nama: sekolahNama,
                    jenjang: bodySekolahJenjang || inferJenjang(sekolahNama),
                    npsn: bodyNpsn ? String(bodyNpsn) : null,
                    alamat: bodyAlamat || null
                  }
                });
              }
              finalSekolahId = sek.id;
            }
          } else {
            if (posyanduId) {
              const pos = await tx.posyandu.findUnique({ where: { id: posyanduId } });
              if (!pos) throw new Error(`[NOT_FOUND] Detail indeks ke-${i}: Posyandu dengan ID ${posyanduId} tidak ditemukan`);
              finalPosyanduId = pos.id;
            } else if (posyanduNama) {
              let pos = await tx.posyandu.findFirst({ where: { nama: { equals: posyanduNama, mode: "insensitive" } } });
              if (!pos) {
                pos = await tx.posyandu.create({ data: { nama: posyanduNama } });
              }
              finalPosyanduId = pos.id;
            }
          }

          resolvedDetails.push({
            kategoriId: kategori.id,
            sekolahId: finalSekolahId,
            posyanduId: finalPosyanduId,
            lakiLaki: numLaki,
            perempuan: numPerempuan
          });

          if (finalSekolahId) {
            if (!sekolahAgg[finalSekolahId]) {
              sekolahAgg[finalSekolahId] = { total: 0, kategoriItems: {} };
            }
            sekolahAgg[finalSekolahId].total += numLaki + numPerempuan;
            const kunci = item.kategoriId;
            if (!sekolahAgg[finalSekolahId].kategoriItems[kunci]) {
              sekolahAgg[finalSekolahId].kategoriItems[kunci] = {
                nama: kategori ? kategori.nama : kunci,
                total: 0
              };
            }
            sekolahAgg[finalSekolahId].kategoriItems[kunci].total += numLaki + numPerempuan;
          }
        }

        const validationResults = [];
        for (const [sekolahId, agg] of Object.entries(sekolahAgg)) {
          const sekolahKelasList = await tx.sekolahKelasDetail.findMany({
            where: { periodeId, sekolahId }
          });

          if (sekolahKelasList.length > 0) {
            const totalPerKelas = sekolahKelasList.reduce((sum, kelas) => sum + kelas.jumlah, 0);

            if (agg.total !== totalPerKelas) {
              for (const item of Object.values(agg.kategoriItems)) {
                validationResults.push({
                  kategori: item.nama,
                  total_penerima: item.total,
                  total_kelas: totalPerKelas,
                  selisih: Math.abs(agg.total - totalPerKelas),
                  sekolah_id: sekolahId
                });
              }
            }
          }
        }

        const hasPesertaDidik = detail.some(item => {
          const kat = categoryMap.get(item.kategoriId);
          return kat && kat.jenisSasaran === "PESERTA_DIDIK";
        });
        if (!hasPesertaDidik) {
          targetGrupHariId = null;
        }
      }

      if (resolvedDetails !== null) {
        await tx.inputPenerimaManfaatDetail.deleteMany({
          where: { inputPenerimaManfaatId: id }
        });
      }

      return await tx.inputPenerimaManfaat.update({
        where: { id },
        data: {
          grupHariId: targetGrupHariId,
          detail: resolvedDetails !== null ? {
            create: resolvedDetails
          } : undefined
        },
        include: {
          grupHari: true,
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[VALIDASI_SILANG]")) {
        const details = JSON.parse(error.message.replace("[VALIDASI_SILANG] ", ""));
        return res.status(400).json({
          error: "VALIDASI_SILANG",
          message: "Validasi silang gagal: total penerima tidak cocok dengan jumlah kelas",
          details
        });
      }
      if (error.message.startsWith("[NOT_FOUND]")) {
        return res.status(404).json({ error: error.message.replace("[NOT_FOUND] ", "") });
      }
      if (error.message.startsWith("[VALIDASI]")) {
        return res.status(400).json({ error: error.message.replace("[VALIDASI] ", "") });
      }
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data penerima manfaat" });
  }
});

// DELETE /api/aslap/penerima-manfaat/:id - Delete penerima manfaat
router.delete("/penerima-manfaat/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.inputPenerimaManfaat.findUnique({
      where: { id }
    });
    if (!exists) {
      return res.status(404).json({ error: "Data penerima manfaat tidak ditemukan" });
    }

    // Cascade delete is defined in schema (onDelete: Cascade on InputPenerimaManfaatDetail)
    await prisma.inputPenerimaManfaat.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data penerima manfaat beserta detailnya berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data penerima manfaat" });
  }
});

module.exports = router;
