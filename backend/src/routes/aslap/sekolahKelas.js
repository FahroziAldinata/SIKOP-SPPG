const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { inferJenjang } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/aslap/sekolah-kelas-detail - Get list of sekolah kelas detail
router.get("/sekolah-kelas-detail", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, sekolahId } = req.query;
    const data = await prisma.sekolahKelasDetail.findMany({
      where: {
        periodeId: periodeId || undefined,
        sekolahId: sekolahId || undefined
      },
      include: {
        sekolah: true
      },
      orderBy: [
        { sekolahId: "asc" },
        { namaKelas: "asc" }
      ]
    });
    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kelas detail" });
  }
});

// GET /api/aslap/sekolah-kelas-detail/:id - Get single sekolah kelas detail
router.get("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.sekolahKelasDetail.findUnique({
      where: { id },
      include: {
        sekolah: true
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data detail kelas sekolah tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data detail kelas sekolah" });
  }
});

// POST /api/aslap/sekolah-kelas-detail - Create new sekolah kelas detail
router.post("/sekolah-kelas-detail", requireAuth, requireRole("ASLAP"), validate(schemas.grupKelasSchema), async (req, res) => {
  try {
    const { periodeId, sekolahId, sekolahNama, namaKelas, jumlah } = req.body || {};

    const numJumlah = typeof jumlah === "number" ? jumlah : parseInt(jumlah, 10);

    const created = await prisma.$transaction(async (tx) => {
      // 2. Validate period
      const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
      if (!periodExists) {
        throw new Error("[NOT_FOUND] Periode tidak ditemukan");
      }

      // 3. Resolve sekolahId
      let resolvedSekolahId = null;
      if (sekolahId) {
        const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
        if (!exists) {
          throw new Error("[NOT_FOUND] Sekolah tidak ditemukan");
        }
        resolvedSekolahId = sekolahId;
      } else if (sekolahNama) {
        const normalizedNama = sekolahNama.trim();
        if (!normalizedNama) {
          throw new Error("[VALIDASI] nama sekolah tidak boleh kosong");
        }
        let sekolahObj = await tx.sekolah.findFirst({
          where: { nama: { equals: normalizedNama, mode: "insensitive" } }
        });
        if (!sekolahObj) {
          sekolahObj = await tx.sekolah.create({
            data: { nama: normalizedNama, jenjang: inferJenjang(normalizedNama) }
          });
        }
        resolvedSekolahId = sekolahObj.id;
      } else {
        throw new Error("[VALIDASI] sekolahId atau sekolahNama wajib diisi");
      }

      // 4. Validate unique constraint: [periodeId, sekolahId, namaKelas]
      const existing = await tx.sekolahKelasDetail.findUnique({
        where: {
          periodeId_sekolahId_namaKelas: {
            periodeId,
            sekolahId: resolvedSekolahId,
            namaKelas: namaKelas.trim()
          }
        }
      });

      if (existing) {
        throw new Error(`[CONFLICT] Detail kelas '${namaKelas}' untuk sekolah ini pada periode terpilih sudah terdaftar`);
      }

      // 5. Create in database
      const created = await tx.sekolahKelasDetail.create({
        data: {
          periodeId,
          sekolahId: resolvedSekolahId,
          namaKelas: namaKelas.trim(),
          jumlah: numJumlah
        },
        include: {
          sekolah: true
        }
      });

      // Validasi silang balik SekolahKelasDetail vs InputPenerimaManfaatDetail
      const inputPenerimaDetail = await tx.inputPenerimaManfaatDetail.findMany({
        where: {
          inputPenerimaManfaat: {
            periodeId
          },
          sekolahId: resolvedSekolahId
        },
        include: {
          kategori: true
        }
      });

      if (inputPenerimaDetail.length > 0) {
        const sekolahKelasList = await tx.sekolahKelasDetail.findMany({
          where: {
            periodeId,
            sekolahId: resolvedSekolahId
          }
        });

        const totalPerKelas = sekolahKelasList.reduce((sum, kelas) => sum + kelas.jumlah, 0);
        const totalPenerimaAgg = inputPenerimaDetail.reduce((sum, d) => sum + d.lakiLaki + d.perempuan, 0);

        const kategoriAgg = {};
        for (const d of inputPenerimaDetail) {
          const kunci = d.kategoriId;
          if (!kategoriAgg[kunci]) {
            kategoriAgg[kunci] = {
              nama: d.kategori ? d.kategori.nama : kunci,
              total: 0
            };
          }
          kategoriAgg[kunci].total += d.lakiLaki + d.perempuan;
        }

        if (totalPenerimaAgg !== totalPerKelas) {
          const validationResults = Object.values(kategoriAgg).map(item => ({
            kategori: item.nama,
            total_penerima: item.total,
            total_kelas: totalPerKelas,
            selisih: Math.abs(totalPenerimaAgg - totalPerKelas)
          }));
          throw new Error(`[VALIDASI_SILANG_BALIK] ${JSON.stringify(validationResults)}`);
        }
      }

      return created;
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[VALIDASI_SILANG_BALIK]")) {
        const details = JSON.parse(error.message.replace("[VALIDASI_SILANG_BALIK] ", ""));
        return res.status(400).json({
          error: "VALIDASI_SILANG_BALIK",
          message: "Validasi silang gagal: jumlah kelas tidak cocok dengan total penerima",
          details
        });
      }
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
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan detail kelas sekolah" });
  }
});

// PUT /api/aslap/sekolah-kelas-detail/:id - Update existing sekolah kelas detail
router.put("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP"), validate(schemas.grupKelasUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { periodeId, sekolahId, sekolahNama, namaKelas, jumlah } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Check exists
      const existingRecord = await tx.sekolahKelasDetail.findUnique({
        where: { id }
      });
      if (!existingRecord) {
        throw new Error("[NOT_FOUND] Data detail kelas sekolah tidak ditemukan");
      }

      // Determine target values
      const targetPeriodeId = periodeId || existingRecord.periodeId;
      const targetNamaKelas = namaKelas !== undefined ? namaKelas.trim() : existingRecord.namaKelas;
      const targetJumlah = jumlah !== undefined ? parseInt(jumlah, 10) : existingRecord.jumlah;

      if (!targetNamaKelas) {
        throw new Error("[VALIDASI] namaKelas tidak boleh kosong");
      }
      if (isNaN(targetJumlah) || targetJumlah < 0) {
        throw new Error("[VALIDASI] jumlah harus berupa angka non-negatif");
      }

      // Validate target period
      if (periodeId && periodeId !== existingRecord.periodeId) {
        const periodExists = await tx.periode.findUnique({ where: { id: periodeId } });
        if (!periodExists) {
          throw new Error("[NOT_FOUND] Periode tidak ditemukan");
        }
      }

      // Resolve target sekolahId
      let targetSekolahId = existingRecord.sekolahId;
      if (sekolahId || sekolahNama) {
        if (sekolahId) {
          const exists = await tx.sekolah.findUnique({ where: { id: sekolahId } });
          if (!exists) {
            throw new Error("[NOT_FOUND] Sekolah tidak ditemukan");
          }
          targetSekolahId = sekolahId;
        } else if (sekolahNama) {
          const normalizedNama = sekolahNama.trim();
          if (!normalizedNama) {
            throw new Error("[VALIDASI] nama sekolah tidak boleh kosong");
          }
          let sekolahObj = await tx.sekolah.findFirst({
            where: { nama: { equals: normalizedNama, mode: "insensitive" } }
          });
          if (!sekolahObj) {
            sekolahObj = await tx.sekolah.create({
              data: { nama: normalizedNama, jenjang: inferJenjang(normalizedNama) }
            });
          }
          targetSekolahId = sekolahObj.id;
        }
      }

      // Check unique constraint excluding this record itself
      const conflict = await tx.sekolahKelasDetail.findFirst({
        where: {
          periodeId: targetPeriodeId,
          sekolahId: targetSekolahId,
          namaKelas: targetNamaKelas,
          NOT: { id }
        }
      });

      if (conflict) {
        throw new Error(`[CONFLICT] Detail kelas '${targetNamaKelas}' untuk sekolah ini pada periode tersebut sudah terdaftar`);
      }

      // Update
      const updatedRecord = await tx.sekolahKelasDetail.update({
        where: { id },
        data: {
          periodeId: targetPeriodeId,
          sekolahId: targetSekolahId,
          namaKelas: targetNamaKelas,
          jumlah: targetJumlah
        },
        include: {
          sekolah: true
        }
      });

      // Validasi silang balik SekolahKelasDetail vs InputPenerimaManfaatDetail
      const inputPenerimaDetail = await tx.inputPenerimaManfaatDetail.findMany({
        where: {
          inputPenerimaManfaat: {
            periodeId: targetPeriodeId
          },
          sekolahId: targetSekolahId
        },
        include: {
          kategori: true
        }
      });

      if (inputPenerimaDetail.length > 0) {
        const sekolahKelasList = await tx.sekolahKelasDetail.findMany({
          where: {
            periodeId: targetPeriodeId,
            sekolahId: targetSekolahId
          }
        });

        const totalPerKelas = sekolahKelasList.reduce((sum, kelas) => sum + kelas.jumlah, 0);
        const totalPenerimaAgg = inputPenerimaDetail.reduce((sum, d) => sum + d.lakiLaki + d.perempuan, 0);

        const kategoriAgg = {};
        for (const d of inputPenerimaDetail) {
          const kunci = d.kategoriId;
          if (!kategoriAgg[kunci]) {
            kategoriAgg[kunci] = {
              nama: d.kategori ? d.kategori.nama : kunci,
              total: 0
            };
          }
          kategoriAgg[kunci].total += d.lakiLaki + d.perempuan;
        }

        if (totalPenerimaAgg !== totalPerKelas) {
          const validationResults = Object.values(kategoriAgg).map(item => ({
            kategori: item.nama,
            total_penerima: item.total,
            total_kelas: totalPerKelas,
            selisih: Math.abs(totalPenerimaAgg - totalPerKelas)
          }));
          throw new Error(`[VALIDASI_SILANG_BALIK] ${JSON.stringify(validationResults)}`);
        }
      }

      return updatedRecord;
    });

    res.json(updated);
  } catch (error) {
    logger.error(error);
    if (error.message) {
      if (error.message.startsWith("[VALIDASI_SILANG_BALIK]")) {
        const details = JSON.parse(error.message.replace("[VALIDASI_SILANG_BALIK] ", ""));
        return res.status(400).json({
          error: "VALIDASI_SILANG_BALIK",
          message: "Validasi silang gagal: jumlah kelas tidak cocok dengan total penerima",
          details
        });
      }
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
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui detail kelas sekolah" });
  }
});

// DELETE /api/aslap/sekolah-kelas-detail/:id - Delete sekolah kelas detail
router.delete("/sekolah-kelas-detail/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await prisma.sekolahKelasDetail.findUnique({
      where: { id }
    });
    if (!exists) {
      return res.status(404).json({ error: "Data detail kelas sekolah tidak ditemukan" });
    }

    await prisma.sekolahKelasDetail.delete({
      where: { id }
    });

    res.json({ success: true, message: "Data detail kelas sekolah berhasil dihapus" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus detail kelas sekolah" });
  }
});

module.exports = router;
