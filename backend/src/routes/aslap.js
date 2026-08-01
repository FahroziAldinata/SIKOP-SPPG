const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const schemas = require("../validators/aslap");
const {
  KATEGORI_PESERTA_DIDIK,
  KATEGORI_NON_PESERTA_DIDIK,
  KATEGORI_PORSI_KECIL,
  KATEGORI_PORSI_BESAR_SD46,
  KATEGORI_PORSI_BESAR_SMK,
  KATEGORI_PIC_SEKOLAH,
  KATEGORI_PIC_KADER,
  KODE_TO_ROW_FIELD,
} = require("../constants/kategori");
const { launchPuppeteer } = require("../lib/launchPuppeteer");
const { renderAslapHarianHtml } = require("../templates/dokumen/aslapHarian");
const { renderAslapPerPeriodeHtml } = require("../templates/dokumen/aslapPerPeriode");
const { renderAslapPerBulanHtml } = require("../templates/dokumen/aslapPerBulan");
const { renderAslapPerKelasHtml } = require("../templates/dokumen/aslapPerKelas");

const router = express.Router();

function inferJenjang(nama) {
  const upper = nama.toUpperCase();
  if (upper.includes("SD") || upper.includes("MIN") || upper.includes("ELEMENTARY")) return "SD";
  if (upper.includes("SMP") || upper.includes("MTS") || upper.includes("JUNIOR")) return "SMP";
  if (upper.includes("SMA") || upper.includes("SMK") || upper.includes("MA") || upper.includes("HIGH")) return "SMA_SMK";
  return "TK";
}

async function getLembaga(periodeId) {
  const setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  return {
    namaLembaga: setupLembaga?.namaLembaga || "",
    alamat: setupLembaga?.alamat || "",
    namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
  };
}

// ==========================================
// HELPERS / MASTER READ-ONLY ENDPOINTS
// ==========================================

// GET /api/aslap/periode - List all periods
router.get("/periode", requireAuth, requireRole("ASLAP", "MITRA", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.periode.findMany({
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    const formatted = data.map(p => ({
      ...p,
      tanggalMulai: p.tanggalMulai.toISOString().split("T")[0],
      tanggalSelesai: p.tanggalSelesai.toISOString().split("T")[0]
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data periode" });
  }
});

// GET /api/aslap/kategori - List all categories
router.get("/kategori", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.kategoriPenerima.findMany({
      orderBy: { urutan: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data kategori" });
  }
});

// GET /api/aslap/sekolah - List all schools
router.get("/sekolah", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.sekolah.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data sekolah" });
  }
});

// POST /api/aslap/sekolah - Create a new school
router.post("/sekolah", requireAuth, requireRole("ASLAP"), validate(schemas.sekolahSchema), async (req, res) => {
  try {
    const { nama, jenjang, npsn, alamat } = req.body;

    if (npsn) {
      const npsnStr = String(npsn);
      const existingNpsn = await prisma.sekolah.findFirst({ where: { npsn: npsnStr } });
      if (existingNpsn) {
        return res.status(409).json({ error: "NPSN already used." });
      }
    }
    const existingNama = await prisma.sekolah.findFirst({
      where: { nama: { equals: nama.trim(), mode: "insensitive" } }
    });
    if (existingNama) {
      return res.status(409).json({ error: "Nama sekolah sudah terdaftar." });
    }

    const sekolah = await prisma.sekolah.create({
      data: {
        nama: nama.trim(),
        jenjang,
        npsn: npsn ? String(npsn) : null,
        alamat: alamat || null
      }
    });
    res.status(201).json({ success: true, data: sekolah });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menyimpan data sekolah" });
  }
});

// PUT /api/aslap/sekolah/:id - Update a school
router.put("/sekolah/:id", requireAuth, requireRole("ASLAP"), validate(schemas.sekolahUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, jenjang, npsn, alamat } = req.body;

    const existing = await prisma.sekolah.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Sekolah tidak ditemukan." });
    }

    if (npsn) {
      const npsnStr = String(npsn);
      const existingNpsn = await prisma.sekolah.findFirst({
        where: { npsn: npsnStr, id: { not: id } }
      });
      if (existingNpsn) {
        return res.status(409).json({ error: "NPSN already used by another school." });
      }
    }
    if (nama && nama.trim()) {
      const existingNama = await prisma.sekolah.findFirst({
        where: { nama: { equals: nama.trim(), mode: "insensitive" }, id: { not: id } }
      });
      if (existingNama) {
        return res.status(409).json({ error: "Nama sekolah sudah terdaftar." });
      }
    }

    const sekolah = await prisma.sekolah.update({
      where: { id },
      data: {
        ...(nama !== undefined && { nama: nama.trim() }),
        ...(jenjang !== undefined && { jenjang }),
        ...(npsn !== undefined && { npsn: npsn ? String(npsn) : null }),
        ...(alamat !== undefined && { alamat })
      }
    });
    res.json({ success: true, data: sekolah });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui data sekolah" });
  }
});

// GET /api/aslap/posyandu - List all posyandus
router.get("/posyandu", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const data = await prisma.posyandu.findMany({
      orderBy: { nama: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data posyandu" });
  }
});


function isOverlap(hariAktifA, hariAktifB) {
  if (!Array.isArray(hariAktifA) || !Array.isArray(hariAktifB)) return false;
  return hariAktifA.some(day => hariAktifB.includes(day));
}

// ==========================================
// CRUD GRUP HARI
// ==========================================

// GET /api/aslap/grup-hari - List all GrupHari for a period
router.get("/grup-hari", requireAuth, requireRole("ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await prisma.grupHari.findMany({
      where: periodeId ? { periodeId } : undefined,
      include: {
        penerimaManfaat: {
          include: {
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
        }
      },
      orderBy: { label: "asc" }
    });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil data grup hari" });
  }
});

// POST /api/aslap/grup-hari - Create new GrupHari
router.post("/grup-hari", requireAuth, requireRole("ASLAP"), validate(schemas.grupHariSchema), async (req, res) => {
  try {
    const { label, hariAktif, periodeId } = req.body || {};

    const trimmedLabel = label.trim();

    const existingLabel = await prisma.grupHari.findUnique({
      where: { periodeId_label: { periodeId, label: trimmedLabel } }
    });
    if (existingLabel) {
      return res.status(400).json({ error: `Grup hari dengan label '${trimmedLabel}' sudah ada untuk periode ini` });
    }

    const existingGroups = await prisma.grupHari.findMany({
      where: { periodeId }
    });

    for (const group of existingGroups) {
      if (isOverlap(hariAktif, group.hariAktif)) {
        const overlappingDays = hariAktif.filter(d => group.hariAktif.includes(d));
        return res.status(400).json({
          error: `Hari aktif (${overlappingDays.join(", ")}) bertabrakan dengan grup '${group.label}'`
        });
      }
    }

    const created = await prisma.grupHari.create({
      data: {
        periodeId,
        label: trimmedLabel,
        hariAktif
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat grup hari" });
  }
});

// PUT /api/aslap/grup-hari/:id - Update GrupHari
router.put("/grup-hari/:id", requireAuth, requireRole("ASLAP"), validate(schemas.grupHariUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, hariAktif } = req.body || {};

    const existingGroup = await prisma.grupHari.findUnique({ where: { id } });
    if (!existingGroup) {
      return res.status(404).json({ error: "Grup hari tidak ditemukan" });
    }

    const updateData = {};

    if (label !== undefined) {
      const trimmedLabel = label.trim();
      const duplicateLabel = await prisma.grupHari.findFirst({
        where: {
          periodeId: existingGroup.periodeId,
          label: trimmedLabel,
          NOT: { id }
        }
      });
      if (duplicateLabel) {
        return res.status(400).json({ error: `Grup hari dengan label '${trimmedLabel}' sudah ada untuk periode ini` });
      }
      updateData.label = trimmedLabel;
    }

    if (hariAktif !== undefined) {
      const otherGroups = await prisma.grupHari.findMany({
        where: {
          periodeId: existingGroup.periodeId,
          NOT: { id }
        }
      });

      for (const group of otherGroups) {
        if (isOverlap(hariAktif, group.hariAktif)) {
          const overlappingDays = hariAktif.filter(d => group.hariAktif.includes(d));
          return res.status(400).json({
            error: `Hari aktif (${overlappingDays.join(", ")}) bertabrakan dengan grup '${group.label}'`
          });
        }
      }

      updateData.hariAktif = hariAktif;
    }

    const updated = await prisma.grupHari.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memperbarui grup hari" });
  }
});

// DELETE /api/aslap/grup-hari/:id - Delete GrupHari
router.delete("/grup-hari/:id", requireAuth, requireRole("ASLAP"), async (req, res) => {
  try {
    const { id } = req.params;
    const existingGroup = await prisma.grupHari.findUnique({ where: { id } });
    if (!existingGroup) {
      return res.status(404).json({ error: "Grup hari tidak ditemukan" });
    }

    await prisma.$transaction([
      prisma.inputPenerimaManfaat.deleteMany({
        where: { grupHariId: id }
      }),
      prisma.grupHari.delete({
        where: { id }
      })
    ]);

    res.json({ message: "Grup hari dan data penerima manfaat terkait berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus grup hari" });
  }
});

// ==========================================
// CRUD INPUT PENERIMA MANFAAT
// ==========================================

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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus data penerima manfaat" });
  }
});


// ==========================================
// CRUD SEKOLAH KELAS DETAIL
// ==========================================

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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat menghapus detail kelas sekolah" });
  }
});

// LAPORAN PER KELAS
const authMiddleware = (roles) => [requireAuth, requireRole(...(Array.isArray(roles) ? roles : [roles]))];

// ==========================================
// KOMPOSISI DATA LAPORAN (dipakai ulang oleh endpoint JSON & PDF)
// ==========================================

async function getLaporanPerKelasAslapData(periodeId, sekolahId) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    include: { setupLembaga: true }
  });

  if (!periode) {
    throw new Error("[VALIDASI] Periode tidak ditemukan");
  }

  const formattedPeriode = {
    ...periode,
    tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
    tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
  };

  const where = { periodeId };
  if (sekolahId) where.sekolahId = sekolahId;

  const data = await prisma.sekolahKelasDetail.findMany({
    where,
    include: {
      sekolah: {
        select: { id: true, nama: true, npsn: true, alamat: true, jenjang: true }
      }
    },
    orderBy: [
      { sekolah: { nama: "asc" } },
      { namaKelas: "asc" }
    ]
  });

  const grouped = {};
  for (const item of data) {
    const sId = item.sekolahId;
    if (!grouped[sId]) {
      grouped[sId] = {
        sekolah: item.sekolah,
        kelas: [],
        totalKelas: 0,
        totalJumlah: 0
      };
    }
    grouped[sId].kelas.push({ namaKelas: item.namaKelas, jumlah: item.jumlah });
    grouped[sId].totalKelas++;
    grouped[sId].totalJumlah += item.jumlah;
  }

  return {
    periode: formattedPeriode,
    data: Object.values(grouped)
  };
}

async function getLaporanHarianAslapData(periodeId) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    include: { setupLembaga: true }
  });

  if (!periode) {
    throw new Error("[VALIDASI] Periode tidak ditemukan");
  }

  const formattedPeriode = {
    ...periode,
    tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
    tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
  };

  const grupHariList = await prisma.grupHari.findMany({
    where: { periodeId },
    include: {
      penerimaManfaat: {
        include: {
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      }
    },
    orderBy: { label: "asc" }
  });

  // Section B: NON_PESERTA_DIDIK — 1 blok untuk seluruh periode (group by periodeId)
  const allPmPeriode = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: {
      detail: {
        include: {
          kategori: true,
          sekolah: true,
          posyandu: true
        }
      }
    }
  });

  const allNonPesertaDetails = allPmPeriode.flatMap(pm => pm.detail || []).filter(d => d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK");
  const posyanduMapGlobal = new Map();
  let grandTotalBGlobal = 0;

  for (const d of allNonPesertaDetails) {
    const pId = d.posyanduId || "LAINNYA";
    const pNama = d.posyandu?.nama || "Lainnya / Non-Posyandu";

    if (!posyanduMapGlobal.has(pId)) {
      posyanduMapGlobal.set(pId, {
        id: pId,
        nama: pNama,
        kategoriMap: new Map(),
        total: 0,
        picKader: 0
      });
    }

    const posObj = posyanduMapGlobal.get(pId);
    const kKode = d.kategori?.kode || "UNKNOWN";
    const kNama = d.kategori?.nama || "Lainnya";

    if (!posObj.kategoriMap.has(kKode)) {
      posObj.kategoriMap.set(kKode, {
        kode: kKode,
        nama: kNama,
        urutan: d.kategori?.urutan ?? 999,
        l: 0,
        p: 0,
        total: 0
      });
    }

    const katObj = posObj.kategoriMap.get(kKode);
    const l = d.lakiLaki || 0;
    const p = d.perempuan || 0;
    const tot = l + p;

    katObj.l += l;
    katObj.p += p;
    katObj.total += tot;

    // Accumulate PIC kader (KADER_POSYANDU)
    if (KATEGORI_PIC_KADER.includes(kKode)) {
      posObj.picKader += tot;
    }

    posObj.total += tot;
    grandTotalBGlobal += tot;
  }

  const posyanduListGlobal = Array.from(posyanduMapGlobal.values()).map(p => {
    const kategoriArr = Array.from(p.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
    return {
      id: p.id,
      nama: p.nama,
      kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
      total: p.total,
      picKader: p.picKader
    };
  });

  const sesiBGlobal = {
    posyandu: posyanduListGlobal,
    grandTotal: grandTotalBGlobal
  };

  const grupHariResult = grupHariList.map(gh => {
    const allDetails = gh.penerimaManfaat.flatMap(pm => pm.detail || []);

    // Section A: PESERTA_DIDIK
    const detailsA = allDetails.filter(d => d.kategori?.jenisSasaran === "PESERTA_DIDIK");
    const sekolahMap = new Map();
    let grandTotalA = 0;

    for (const d of detailsA) {
      const sId = d.sekolahId || "LAINNYA";
      const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
      const sJenjang = d.sekolah?.jenjang || "-";

      if (!sekolahMap.has(sId)) {
        sekolahMap.set(sId, {
          id: sId,
          nama: sNama,
          jenjang: sJenjang,
          kategoriMap: new Map(),
          total: 0,
          lkPic: 0,
          pPic: 0
        });
      }

      const sekObj = sekolahMap.get(sId);
      const kKode = d.kategori?.kode || "UNKNOWN";
      const kNama = d.kategori?.nama || "Lainnya";

      if (!sekObj.kategoriMap.has(kKode)) {
        sekObj.kategoriMap.set(kKode, {
          kode: kKode,
          nama: kNama,
          urutan: d.kategori?.urutan ?? 999,
          l: 0,
          p: 0,
          total: 0
        });
      }

      const katObj = sekObj.kategoriMap.get(kKode);
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      katObj.l += l;
      katObj.p += p;
      katObj.total += tot;

      // Accumulate PIC counts (PENDIDIK + TENAGA_KEPENDIDIKAN)
      if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
        sekObj.lkPic += l;
        sekObj.pPic += p;
      }

      sekObj.total += tot;
      grandTotalA += tot;
    }

    const sekolahList = Array.from(sekolahMap.values()).map(s => {
      const kategoriArr = Array.from(s.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
      return {
        id: s.id,
        nama: s.nama,
        jenjang: s.jenjang,
        kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
        total: s.total,
        lkPic: s.lkPic,
        pPic: s.pPic,
        jmlPic: s.lkPic + s.pPic
      };
    });

    return {
      id: gh.id,
      label: gh.label,
      hariAktif: gh.hariAktif,
      sesiA: {
        sekolah: sekolahList,
        grandTotal: grandTotalA
      },
      sesiB: sesiBGlobal
    };
  });

  return {
    periode: formattedPeriode,
    grupHari: grupHariResult,
    sesiB: sesiBGlobal
  };
}

async function getLaporanPeriodeAslapData(periodeId) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    include: { setupLembaga: true }
  });

  if (!periode) {
    throw new Error("[VALIDASI] Periode tidak ditemukan");
  }

  const formattedPeriode = {
    ...periode,
    tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
    tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
  };

  const pmList = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: {
      detail: {
        include: {
          kategori: true,
          sekolah: true,
          posyandu: true
        }
      }
    }
  });

  const allDetails = pmList.flatMap(pm => pm.detail || []);

  // 1. Group PESERTA_DIDIK by sekolah
  const sekolahMap = new Map();

  for (const d of allDetails) {
    if (d.kategori?.jenisSasaran === "PESERTA_DIDIK" && (d.sekolah || d.sekolahId)) {
      const sId = d.sekolahId || d.sekolah?.id || "LAINNYA";
      const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
      const sNpsn = d.sekolah?.npsn || "-";
      const sAlamat = d.sekolah?.alamat || "-";

      if (!sekolahMap.has(sId)) {
        sekolahMap.set(sId, {
          id: sId,
          nama: sNama,
          npsn: sNpsn,
          alamat: sAlamat,
          kecil: 0,
          besar46: 0,
          besarSmk: 0,
          lk13: 0,
          p13: 0,
          lk46: 0,
          p46: 0,
          lkSmk: 0,
          pSmk: 0,
          lkPic: 0,
          pPic: 0,
          jmlPic: 0,
          jumlahPm: 0
        });
      }

      const sekObj = sekolahMap.get(sId);
      const kKode = d.kategori?.kode;
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      if (KATEGORI_PORSI_KECIL.includes(kKode)) {
        sekObj.lk13 += l;
        sekObj.p13 += p;
        sekObj.kecil += tot;
      } else if (KATEGORI_PORSI_BESAR_SD46.includes(kKode)) {
        sekObj.lk46 += l;
        sekObj.p46 += p;
        sekObj.besar46 += tot;
      } else if (KATEGORI_PORSI_BESAR_SMK.includes(kKode)) {
        sekObj.lkSmk += l;
        sekObj.pSmk += p;
        sekObj.besarSmk += tot;
      } else if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
        sekObj.lkPic += l;
        sekObj.pPic += p;
        sekObj.jmlPic += tot;
      }
    }
  }

  const sekolahList = Array.from(sekolahMap.values()).map(s => {
    s.jumlahPm = s.kecil + s.besar46 + s.besarSmk + s.jmlPic;
    return s;
  });

  const totalSekolah = sekolahList.reduce((acc, s) => ({
    kecil: acc.kecil + s.kecil,
    besar46: acc.besar46 + s.besar46,
    besarSmk: acc.besarSmk + s.besarSmk,
    lk13: acc.lk13 + s.lk13,
    p13: acc.p13 + s.p13,
    lk46: acc.lk46 + s.lk46,
    p46: acc.p46 + s.p46,
    lkSmk: acc.lkSmk + s.lkSmk,
    pSmk: acc.pSmk + s.pSmk,
    lkPic: acc.lkPic + s.lkPic,
    pPic: acc.pPic + s.pPic,
    jmlPic: acc.jmlPic + s.jmlPic,
    jumlahPm: acc.jumlahPm + s.jumlahPm
  }), {
    kecil: 0,
    besar46: 0,
    besarSmk: 0,
    lk13: 0,
    p13: 0,
    lk46: 0,
    p46: 0,
    lkSmk: 0,
    pSmk: 0,
    lkPic: 0,
    pPic: 0,
    jmlPic: 0,
    jumlahPm: 0
  });

  // 2. Group NON_PESERTA_DIDIK by posyandu
  const posyanduMap = new Map();

  for (const d of allDetails) {
    if (d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK" && (d.posyandu || d.posyanduId)) {
      const pId = d.posyanduId || d.posyandu?.id || "LAINNYA";
      const pNama = d.posyandu?.nama || "Lainnya / Tanpa Posyandu";
      const pAlamat = d.posyandu?.alamat || "-";

      if (!posyanduMap.has(pId)) {
        posyanduMap.set(pId, {
          id: pId,
          nama: pNama,
          alamat: pAlamat,
          balita: 0,
          bumil: 0,
          busui: 0,
          lkBalita: 0,
          pBalita: 0,
          lkBumil: 0,
          pBumil: 0,
          lkBusui: 0,
          pBusui: 0,
          lkKader: 0,
          pKader: 0,
          picKader: 0,
          jumlah: 0
        });
      }

      const posObj = posyanduMap.get(pId);
      const kKode = d.kategori?.kode;
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      if (kKode === "BALITA") {
        posObj.lkBalita += l;
        posObj.pBalita += p;
        posObj.balita += tot;
      } else if (kKode === "BUMIL") {
        posObj.lkBumil += l;
        posObj.pBumil += p;
        posObj.bumil += tot;
      } else if (kKode === "BUSUI") {
        posObj.lkBusui += l;
        posObj.pBusui += p;
        posObj.busui += tot;
      } else if (kKode === "KADER_POSYANDU") {
        posObj.lkKader += l;
        posObj.pKader += p;
        posObj.picKader += tot;
      }
    }
  }

  const posyanduList = Array.from(posyanduMap.values()).map(p => {
    p.jumlah = (p.lkBalita || 0) + (p.pBalita || 0) +
               (p.lkBumil || 0) + (p.pBumil || 0) +
               (p.lkBusui || 0) + (p.pBusui || 0) +
               (p.lkKader || 0) + (p.pKader || 0);
    return p;
  });

  const totalPosyanduSum = posyanduList.reduce((acc, p) => ({
    balita: acc.balita + p.balita,
    bumil: acc.bumil + p.bumil,
    busui: acc.busui + p.busui,
    lkBalita: acc.lkBalita + p.lkBalita,
    pBalita: acc.pBalita + p.pBalita,
    lkKader: acc.lkKader + (p.lkKader || 0),
    pKader: acc.pKader + (p.pKader || 0),
    picKader: acc.picKader + p.picKader,
  }), {
    balita: 0,
    bumil: 0,
    busui: 0,
    lkBalita: 0,
    pBalita: 0,
    lkKader: 0,
    pKader: 0,
    picKader: 0,
  });

  const totalPosyandu = {
    ...totalPosyanduSum,
    jumlah: totalPosyanduSum.balita + totalPosyanduSum.bumil + totalPosyanduSum.busui + totalPosyanduSum.picKader
  };

  return {
    periode: formattedPeriode,
    pendidikan: {
      sekolah: sekolahList,
      total: totalSekolah
    },
    posyandu: {
      posyandu: posyanduList,
      total: totalPosyandu
    }
  };
}

async function getLaporanBulananAslapData(bulan, tahun) {
  // awalBulan & akhirBulan
  const awalBulan = new Date(Date.UTC(tahun, bulan - 1, 1, 0, 0, 0, 0));
  const akhirBulan = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59, 999));

  // Cari periode yang overlap: tanggalMulai <= akhirBulan AND tanggalSelesai >= awalBulan
  const overlappingPeriods = await prisma.periode.findMany({
    where: {
      tanggalMulai: { lte: akhirBulan },
      tanggalSelesai: { gte: awalBulan }
    },
    select: { id: true }
  });

  const periodIds = overlappingPeriods.map(p => p.id);

  const emptyTotal = {
    paudTk: 0,
    sd1_3: 0,
    sd4_6: 0,
    smp: 0,
    sma: 0,
    ats9: 0,
    ats9_18: 0,
    pendidik: 0,
    tendik: 0,
    bumil: 0,
    busui: 0,
    balita: 0,
    kader: 0,
    total: 0,
    jmlPic: 0
  };

  if (periodIds.length === 0) {
    return {
      bulan,
      tahun,
      hari: [],
      total: emptyTotal
    };
  }

  const pmList = await prisma.inputPenerimaManfaat.findMany({
    where: {
      periodeId: { in: periodIds }
    },
    include: {
      periode: true,
      detail: {
        include: {
          kategori: true
        }
      }
    }
  });

  const daysName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const mapTanggal = new Map();

  for (const pm of pmList) {
    if (!pm.createdAt) continue;
    const d = new Date(pm.createdAt);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;

    // Ensure data is within requested month & year
    if (yr !== tahun || mo !== bulan) continue;

    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(mo).padStart(2, "0");
    const tglStr = `${yr}-${monthStr}-${dayStr}`;

    if (!mapTanggal.has(tglStr)) {
      const dayIdx = new Date(yr, mo - 1, d.getDate()).getDay();
      mapTanggal.set(tglStr, {
        tanggal: tglStr,
        hari: daysName[dayIdx],
        periodeId: pm.periodeId || "-",
        paudTk: 0,
        sd1_3: 0,
        sd4_6: 0,
        smp: 0,
        sma: 0,
        ats9: 0,
        ats9_18: 0,
        pendidik: 0,
        tendik: 0,
        bumil: 0,
        busui: 0,
        balita: 0,
        kader: 0,
        total: 0,
        jmlPic: 0
      });
    }

    const row = mapTanggal.get(tglStr);

    for (const det of pm.detail || []) {
      const kKode = det.kategori?.kode;
      const count = (det.lakiLaki || 0) + (det.perempuan || 0);

      const rowField = KODE_TO_ROW_FIELD[kKode];
      if (rowField) row[rowField] += count;

      // Accumulate jmlPic (PENDIDIK + TENAGA_KEPENDIDIKAN)
      if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
        row.jmlPic += count;
      }

      row.total += count;
    }
  }

  const hariArr = Array.from(mapTanggal.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const grandTotal = hariArr.reduce((acc, row) => {
    acc.paudTk += row.paudTk;
    acc.sd1_3 += row.sd1_3;
    acc.sd4_6 += row.sd4_6;
    acc.smp += row.smp;
    acc.sma += row.sma;
    acc.ats9 += row.ats9;
    acc.ats9_18 += row.ats9_18;
    acc.pendidik += row.pendidik;
    acc.tendik += row.tendik;
    acc.bumil += row.bumil;
    acc.busui += row.busui;
    acc.balita += row.balita;
    acc.kader += row.kader;
    acc.total += row.total;
    acc.jmlPic += row.jmlPic;
    return acc;
  }, { ...emptyTotal });

  return {
    bulan,
    tahun,
    hari: hariArr,
    total: grandTotal
  };
}

// LAPORAN PER KELAS

router.get(["/laporan/per-kelas", "/api/aslap/laporan/per-kelas"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AKUNTAN"]), validate(schemas.laporanPerKelasSchema, "query"), async (req, res) => {
  try {
    const { periodeId, sekolahId } = req.query;

    const where = { periodeId };
    if (sekolahId) where.sekolahId = sekolahId;

    const data = await prisma.sekolahKelasDetail.findMany({
      where,
      include: {
        sekolah: {
          select: { id: true, nama: true, npsn: true, alamat: true, jenjang: true }
        }
      },
      orderBy: [
        { sekolah: { nama: "asc" } },
        { namaKelas: "asc" }
      ]
    });

    // Group by sekolah
    const grouped = {};
    for (const item of data) {
      const sId = item.sekolahId;
      if (!grouped[sId]) {
        grouped[sId] = {
          sekolah: item.sekolah,
          kelas: [],
          totalKelas: 0,
          totalJumlah: 0
        };
      }
      grouped[sId].kelas.push({ namaKelas: item.namaKelas, jumlah: item.jumlah });
      grouped[sId].totalKelas++;
      grouped[sId].totalJumlah += item.jumlah;
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("Error get laporan per kelas:", error);
    res.status(500).json({ error: "Gagal mengambil laporan per kelas" });
  }
});

// GET /api/aslap/laporan/per-kelas/pdf - PDF Laporan Per Kelas
router.get(["/laporan/per-kelas/pdf", "/api/aslap/laporan/per-kelas/pdf"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AKUNTAN"]), validate(schemas.laporanPerKelasSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, sekolahId } = req.query;

    const { periode, data } = await getLaporanPerKelasAslapData(periodeId, sekolahId);
    const lembaga = await getLembaga(periodeId);
    const html = renderAslapPerKelasHtml({
      periode,
      lembaga,
      namaAslap: req.user?.nama || req.user?.username || "",
      data
    });

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Per-Kelas-${periodeId}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/per-kelas/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Per Kelas";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// LAPORAN HARIAN ASLAP (PENERIMA MANFAAT PER GRUP HARI)
router.get(["/laporan/harian", "/api/aslap/laporan/harian"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanHarianSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const periode = await prisma.periode.findUnique({
      where: { id: periodeId },
      include: { setupLembaga: true }
    });

    if (!periode) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const formattedPeriode = {
      ...periode,
      tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
      tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
    };

    const grupHariList = await prisma.grupHari.findMany({
      where: { periodeId },
      include: {
        penerimaManfaat: {
          include: {
            detail: {
              include: {
                kategori: true,
                sekolah: true,
                posyandu: true
              }
            }
          }
        }
      },
      orderBy: { label: "asc" }
    });

    // Section B: NON_PESERTA_DIDIK — 1 blok untuk seluruh periode (group by periodeId)
    const allPmPeriode = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: {
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      }
    });

    const allNonPesertaDetails = allPmPeriode.flatMap(pm => pm.detail || []).filter(d => d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK");
    const posyanduMapGlobal = new Map();
    let grandTotalBGlobal = 0;

    for (const d of allNonPesertaDetails) {
      const pId = d.posyanduId || "LAINNYA";
      const pNama = d.posyandu?.nama || "Lainnya / Non-Posyandu";

      if (!posyanduMapGlobal.has(pId)) {
        posyanduMapGlobal.set(pId, {
          id: pId,
          nama: pNama,
          kategoriMap: new Map(),
          total: 0,
          picKader: 0
        });
      }

      const posObj = posyanduMapGlobal.get(pId);
      const kKode = d.kategori?.kode || "UNKNOWN";
      const kNama = d.kategori?.nama || "Lainnya";

      if (!posObj.kategoriMap.has(kKode)) {
        posObj.kategoriMap.set(kKode, {
          kode: kKode,
          nama: kNama,
          urutan: d.kategori?.urutan ?? 999,
          l: 0,
          p: 0,
          total: 0
        });
      }

      const katObj = posObj.kategoriMap.get(kKode);
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      katObj.l += l;
      katObj.p += p;
      katObj.total += tot;

      // Accumulate PIC kader (KADER_POSYANDU)
      if (KATEGORI_PIC_KADER.includes(kKode)) {
        posObj.picKader += tot;
      }

      posObj.total += tot;
      grandTotalBGlobal += tot;
    }

    const posyanduListGlobal = Array.from(posyanduMapGlobal.values()).map(p => {
      const kategoriArr = Array.from(p.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
      return {
        id: p.id,
        nama: p.nama,
        kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
        total: p.total,
        picKader: p.picKader
      };
    });

    const sesiBGlobal = {
      posyandu: posyanduListGlobal,
      grandTotal: grandTotalBGlobal
    };

    const grupHariResult = grupHariList.map(gh => {
      const allDetails = gh.penerimaManfaat.flatMap(pm => pm.detail || []);

      // Section A: PESERTA_DIDIK
      const detailsA = allDetails.filter(d => d.kategori?.jenisSasaran === "PESERTA_DIDIK");
      const sekolahMap = new Map();
      let grandTotalA = 0;

      for (const d of detailsA) {
        const sId = d.sekolahId || "LAINNYA";
        const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
        const sJenjang = d.sekolah?.jenjang || "-";

        if (!sekolahMap.has(sId)) {
          sekolahMap.set(sId, {
            id: sId,
            nama: sNama,
            jenjang: sJenjang,
            kategoriMap: new Map(),
            total: 0,
            lkPic: 0,
            pPic: 0
          });
        }

        const sekObj = sekolahMap.get(sId);
        const kKode = d.kategori?.kode || "UNKNOWN";
        const kNama = d.kategori?.nama || "Lainnya";

        if (!sekObj.kategoriMap.has(kKode)) {
          sekObj.kategoriMap.set(kKode, {
            kode: kKode,
            nama: kNama,
            urutan: d.kategori?.urutan ?? 999,
            l: 0,
            p: 0,
            total: 0
          });
        }

        const katObj = sekObj.kategoriMap.get(kKode);
        const l = d.lakiLaki || 0;
        const p = d.perempuan || 0;
        const tot = l + p;

        katObj.l += l;
        katObj.p += p;
        katObj.total += tot;

        // Accumulate PIC counts (PENDIDIK + TENAGA_KEPENDIDIKAN)
        if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
          sekObj.lkPic += l;
          sekObj.pPic += p;
        }

        sekObj.total += tot;
        grandTotalA += tot;
      }

      const sekolahList = Array.from(sekolahMap.values()).map(s => {
        const kategoriArr = Array.from(s.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
        return {
          id: s.id,
          nama: s.nama,
          jenjang: s.jenjang,
          kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
          total: s.total,
          lkPic: s.lkPic,
          pPic: s.pPic,
          jmlPic: s.lkPic + s.pPic
        };
      });

      return {
        id: gh.id,
        label: gh.label,
        hariAktif: gh.hariAktif,
        sesiA: {
          sekolah: sekolahList,
          grandTotal: grandTotalA
        },
        sesiB: sesiBGlobal
      };
    });

    res.json({
      success: true,
      data: {
        periode: formattedPeriode,
        grupHari: grupHariResult,
        sesiB: sesiBGlobal
      }
    });
  } catch (error) {
    console.error("Error get laporan harian aslap:", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan harian aslap" });
  }
});

// GET /api/aslap/laporan/harian/pdf - PDF Laporan Harian
router.get(["/laporan/harian/pdf", "/api/aslap/laporan/harian/pdf"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanHarianSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getLaporanHarianAslapData(periodeId);
    const lembaga = await getLembaga(periodeId);
    const html = renderAslapHarianHtml({
      ...data,
      lembaga,
      namaAslap: req.user?.nama || req.user?.username || ""
    });

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Harian-${periodeId}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/harian/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Harian";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// LAPORAN PER PERIODE ASLAP
router.get(["/laporan/periode", "/laporan/per-periode", "/api/aslap/laporan/periode", "/api/aslap/laporan/per-periode"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const periode = await prisma.periode.findUnique({
      where: { id: periodeId },
      include: { setupLembaga: true }
    });

    if (!periode) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const formattedPeriode = {
      ...periode,
      tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
      tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
    };

    const pmList = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: {
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      }
    });

    const allDetails = pmList.flatMap(pm => pm.detail || []);

    // 1. Group PESERTA_DIDIK by sekolah
    const sekolahMap = new Map();

    for (const d of allDetails) {
      if (d.kategori?.jenisSasaran === "PESERTA_DIDIK" && (d.sekolah || d.sekolahId)) {
        const sId = d.sekolahId || d.sekolah?.id || "LAINNYA";
        const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
        const sNpsn = d.sekolah?.npsn || "-";
        const sAlamat = d.sekolah?.alamat || "-";

        if (!sekolahMap.has(sId)) {
          sekolahMap.set(sId, {
            id: sId,
            nama: sNama,
            npsn: sNpsn,
            alamat: sAlamat,
            kecil: 0,
            besar46: 0,
            besarSmk: 0,
            lk13: 0,
            p13: 0,
            lk46: 0,
            p46: 0,
            lkSmk: 0,
            pSmk: 0,
            lkPic: 0,
            pPic: 0,
            jmlPic: 0,
            jumlahPm: 0
          });
        }

        const sekObj = sekolahMap.get(sId);
        const kKode = d.kategori?.kode;
        const l = d.lakiLaki || 0;
        const p = d.perempuan || 0;
        const tot = l + p;

        if (KATEGORI_PORSI_KECIL.includes(kKode)) {
          sekObj.lk13 += l;
          sekObj.p13 += p;
          sekObj.kecil += tot;
        } else if (KATEGORI_PORSI_BESAR_SD46.includes(kKode)) {
          sekObj.lk46 += l;
          sekObj.p46 += p;
          sekObj.besar46 += tot;
        } else if (KATEGORI_PORSI_BESAR_SMK.includes(kKode)) {
          sekObj.lkSmk += l;
          sekObj.pSmk += p;
          sekObj.besarSmk += tot;
        } else if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
          sekObj.lkPic += l;
          sekObj.pPic += p;
          sekObj.jmlPic += tot;
        }
      }
    }

    const sekolahList = Array.from(sekolahMap.values()).map(s => {
      s.jumlahPm = s.kecil + s.besar46 + s.besarSmk + s.jmlPic;
      return s;
    });

    const totalSekolah = sekolahList.reduce((acc, s) => ({
      kecil: acc.kecil + s.kecil,
      besar46: acc.besar46 + s.besar46,
      besarSmk: acc.besarSmk + s.besarSmk,
      lk13: acc.lk13 + s.lk13,
      p13: acc.p13 + s.p13,
      lk46: acc.lk46 + s.lk46,
      p46: acc.p46 + s.p46,
      lkSmk: acc.lkSmk + s.lkSmk,
      pSmk: acc.pSmk + s.pSmk,
      lkPic: acc.lkPic + s.lkPic,
      pPic: acc.pPic + s.pPic,
      jmlPic: acc.jmlPic + s.jmlPic,
      jumlahPm: acc.jumlahPm + s.jumlahPm
    }), {
      kecil: 0,
      besar46: 0,
      besarSmk: 0,
      lk13: 0,
      p13: 0,
      lk46: 0,
      p46: 0,
      lkSmk: 0,
      pSmk: 0,
      lkPic: 0,
      pPic: 0,
      jmlPic: 0,
      jumlahPm: 0
    });

    // 2. Group NON_PESERTA_DIDIK by posyandu
    const posyanduMap = new Map();

    for (const d of allDetails) {
      if (d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK" && (d.posyandu || d.posyanduId)) {
        const pId = d.posyanduId || d.posyandu?.id || "LAINNYA";
        const pNama = d.posyandu?.nama || "Lainnya / Tanpa Posyandu";
        const pAlamat = d.posyandu?.alamat || "-";

        if (!posyanduMap.has(pId)) {
          posyanduMap.set(pId, {
            id: pId,
            nama: pNama,
            alamat: pAlamat,
            balita: 0,
            bumil: 0,
            busui: 0,
            lkBalita: 0,
            pBalita: 0,
            lkBumil: 0,
            pBumil: 0,
            lkBusui: 0,
            pBusui: 0,
            lkKader: 0,
            pKader: 0,
            picKader: 0,
            jumlah: 0
          });
        }

        const posObj = posyanduMap.get(pId);
        const kKode = d.kategori?.kode;
        const l = d.lakiLaki || 0;
        const p = d.perempuan || 0;
        const tot = l + p;

        if (kKode === "BALITA") {
          posObj.lkBalita += l;
          posObj.pBalita += p;
          posObj.balita += tot;
        } else if (kKode === "BUMIL") {
          posObj.lkBumil += l;
          posObj.pBumil += p;
          posObj.bumil += tot;
        } else if (kKode === "BUSUI") {
          posObj.lkBusui += l;
          posObj.pBusui += p;
          posObj.busui += tot;
        } else if (kKode === "KADER_POSYANDU") {
          posObj.lkKader += l;
          posObj.pKader += p;
          posObj.picKader += tot;
        }
        // NOTE: Field BALITA/BUMIL/BUSUI/KADER_POSYANDU sudah eksplisit
        // karena setiap bucket punya field lk/p sendiri (tidak bisa di-generalize
        // dengan KODE_TO_ROW_FIELD yang hanya kenal field tunggal).
      }
    }

    const posyanduList = Array.from(posyanduMap.values()).map(p => {
      // Rumus per-baris (setiap posyandu individual):
      // jumlah = L_BALITA + P_BALITA + L_BUMIL + P_BUMIL + L_BUSUI + P_BUSUI + L_KADER + P_KADER
      p.jumlah = (p.lkBalita || 0) + (p.pBalita || 0) + 
                 (p.lkBumil || 0) + (p.pBumil || 0) + 
                 (p.lkBusui || 0) + (p.pBusui || 0) + 
                 (p.lkKader || 0) + (p.pKader || 0);
      return p;
    });

    const totalPosyanduSum = posyanduList.reduce((acc, p) => ({
      balita: acc.balita + p.balita,
      bumil: acc.bumil + p.bumil,
      busui: acc.busui + p.busui,
      lkBalita: acc.lkBalita + p.lkBalita,
      pBalita: acc.pBalita + p.pBalita,
      lkKader: acc.lkKader + (p.lkKader || 0),
      pKader: acc.pKader + (p.pKader || 0),
      picKader: acc.picKader + p.picKader,
    }), {
      balita: 0,
      bumil: 0,
      busui: 0,
      lkBalita: 0,
      pBalita: 0,
      lkKader: 0,
      pKader: 0,
      picKader: 0,
    });

    const totalPosyandu = {
      ...totalPosyanduSum,
      // Rumus baris TOTAL (grand total Section B):
      // jumlah = totalBalita + totalBumil + totalBusui + totalKader (SINGLE — tanpa sub-gender)
      jumlah: totalPosyanduSum.balita + totalPosyanduSum.bumil + totalPosyanduSum.busui + totalPosyanduSum.picKader
    };

    res.json({
      success: true,
      data: {
        periode: formattedPeriode,
        pendidikan: {
          sekolah: sekolahList,
          total: totalSekolah
        },
        posyandu: {
          posyandu: posyanduList,
          total: totalPosyandu
        }
      }
    });

  } catch (error) {
    console.error("Error get laporan periode aslap:", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan periode aslap" });
  }
});

// GET /api/aslap/laporan/periode/pdf - PDF Laporan Per Periode
router.get(["/laporan/periode/pdf", "/laporan/per-periode/pdf", "/api/aslap/laporan/periode/pdf", "/api/aslap/laporan/per-periode/pdf"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanPeriodeSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getLaporanPeriodeAslapData(periodeId);
    const lembaga = await getLembaga(periodeId);
    const html = renderAslapPerPeriodeHtml({
      ...data,
      lembaga,
      namaAslap: req.user?.nama || req.user?.username || ""
    });

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Per-Periode-${periodeId}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/periode/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Per Periode";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// LAPORAN BULANAN ASLAP
router.get(["/laporan/bulanan", "/laporan/per-bulan", "/api/aslap/laporan/bulanan", "/api/aslap/laporan/per-bulan"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanBulananSchema, "query"), async (req, res) => {
  try {
    const bulan = typeof req.query.bulan === "number" ? req.query.bulan : parseInt(req.query.bulan);
    const tahun = typeof req.query.tahun === "number" ? req.query.tahun : parseInt(req.query.tahun);

    // awalBulan & akhirBulan
    const awalBulan = new Date(Date.UTC(tahun, bulan - 1, 1, 0, 0, 0, 0));
    const akhirBulan = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59, 999));

    // Cari periode yang overlap: tanggalMulai <= akhirBulan AND tanggalSelesai >= awalBulan
    const overlappingPeriods = await prisma.periode.findMany({
      where: {
        tanggalMulai: { lte: akhirBulan },
        tanggalSelesai: { gte: awalBulan }
      },
      select: { id: true }
    });

    const periodIds = overlappingPeriods.map(p => p.id);

    const emptyTotal = {
      paudTk: 0,
      sd1_3: 0,
      sd4_6: 0,
      smp: 0,
      sma: 0,
      ats9: 0,
      ats9_18: 0,
      pendidik: 0,
      tendik: 0,
      bumil: 0,
      busui: 0,
      balita: 0,
      kader: 0,
      total: 0,
      jmlPic: 0
    };

    if (periodIds.length === 0) {
      return res.json({
        success: true,
        data: {
          bulan,
          tahun,
          hari: [],
          total: emptyTotal
        }
      });
    }

    const pmList = await prisma.inputPenerimaManfaat.findMany({
      where: {
        periodeId: { in: periodIds }
      },
      include: {
        periode: true,
        detail: {
          include: {
            kategori: true
          }
        }
      }
    });

    const daysName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const mapTanggal = new Map();

    for (const pm of pmList) {
      if (!pm.createdAt) continue;
      const d = new Date(pm.createdAt);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;

      // Ensure data is within requested month & year
      if (yr !== tahun || mo !== bulan) continue;

      const dayStr = String(d.getDate()).padStart(2, "0");
      const monthStr = String(mo).padStart(2, "0");
      const tglStr = `${yr}-${monthStr}-${dayStr}`;

      if (!mapTanggal.has(tglStr)) {
        const dayIdx = new Date(yr, mo - 1, d.getDate()).getDay();
        mapTanggal.set(tglStr, {
          tanggal: tglStr,
          hari: daysName[dayIdx],
          periodeId: pm.periodeId || "-",
          paudTk: 0,
          sd1_3: 0,
          sd4_6: 0,
          smp: 0,
          sma: 0,
          ats9: 0,
          ats9_18: 0,
          pendidik: 0,
          tendik: 0,
          bumil: 0,
          busui: 0,
          balita: 0,
          kader: 0,
          total: 0,
          jmlPic: 0
        });
      }

      const row = mapTanggal.get(tglStr);

      for (const det of pm.detail || []) {
        const kKode = det.kategori?.kode;
        const count = (det.lakiLaki || 0) + (det.perempuan || 0);

        const rowField = KODE_TO_ROW_FIELD[kKode];
        if (rowField) row[rowField] += count;

        // Accumulate jmlPic (PENDIDIK + TENAGA_KEPENDIDIKAN)
        if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
          row.jmlPic += count;
        }

        row.total += count;
      }
    }

    const hariArr = Array.from(mapTanggal.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const grandTotal = hariArr.reduce((acc, row) => {
      acc.paudTk += row.paudTk;
      acc.sd1_3 += row.sd1_3;
      acc.sd4_6 += row.sd4_6;
      acc.smp += row.smp;
      acc.sma += row.sma;
      acc.ats9 += row.ats9;
      acc.ats9_18 += row.ats9_18;
      acc.pendidik += row.pendidik;
      acc.tendik += row.tendik;
      acc.bumil += row.bumil;
      acc.busui += row.busui;
      acc.balita += row.balita;
      acc.kader += row.kader;
      acc.total += row.total;
      acc.jmlPic += row.jmlPic;
      return acc;
    }, { ...emptyTotal });

    res.json({
      success: true,
      data: {
        bulan,
        tahun,
        hari: hariArr,
        total: grandTotal
      }
    });

  } catch (error) {
    console.error("Error get laporan bulanan aslap:", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan bulanan aslap" });
  }
});

// GET /api/aslap/laporan/bulanan/pdf - PDF Laporan Bulanan
router.get(["/laporan/bulanan/pdf", "/laporan/per-bulan/pdf", "/api/aslap/laporan/bulanan/pdf", "/api/aslap/laporan/per-bulan/pdf"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanBulananSchema, "query"), async (req, res) => {
  let browser;
  try {
    const bulan = typeof req.query.bulan === "number" ? req.query.bulan : parseInt(req.query.bulan);
    const tahun = typeof req.query.tahun === "number" ? req.query.tahun : parseInt(req.query.tahun);

    const data = await getLaporanBulananAslapData(bulan, tahun);

    const overlappingPeriods = await prisma.periode.findMany({
      where: {
        tanggalMulai: { lte: new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59, 999)) },
        tanggalSelesai: { gte: new Date(Date.UTC(tahun, bulan - 1, 1, 0, 0, 0, 0)) }
      },
      select: { id: true }
    });
    const lembaga = await getLembaga(overlappingPeriods[0]?.id);

    const html = renderAslapPerBulanHtml({
      ...data,
      lembaga,
      namaAslap: req.user?.nama || req.user?.username || ""
    });

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Bulanan-${bulan}-${tahun}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/bulanan/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Bulanan";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});


// GET /api/aslap/laporan/aggregate?periodeId=X
router.get(["/laporan/aggregate", "/api/aslap/laporan/aggregate"], requireAuth, validate(schemas.laporanPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    // Get all detail records for the periode with kategori relation
    const details = await prisma.inputPenerimaManfaatDetail.findMany({
      where: {
        inputPenerimaManfaat: { periodeId }
      },
      include: {
        kategori: true,
        sekolah: { select: { id: true, nama: true } },
        posyandu: { select: { id: true, nama: true } }
      }
    });

    // Group by (sekolahId OR posyanduId) + kategoriKode
    const groups = {};
    for (const d of details) {
      const groupKey = d.sekolahId || d.posyanduId || "UNKNOWN";
      const katKode = d.kategori.kode;
      const compositeKey = `${groupKey}::${katKode}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          sekolahId: d.sekolahId || null,
          posyanduId: d.posyanduId || null,
          nama: d.sekolah?.nama || d.posyandu?.nama || "Unknown",
          kategoriKode: katKode,
          kategoriNama: d.kategori.nama,
          totalL: 0,
          totalP: 0,
          total: 0
        };
      }
      groups[compositeKey].totalL += d.lakiLaki;
      groups[compositeKey].totalP += d.perempuan;
      groups[compositeKey].total += d.lakiLaki + d.perempuan;
    }

    const formatted = Object.values(groups);

    // Pisah Section A (PESERTA_DIDIK) & Section B (NON_PESERTA_DIDIK)
    const sectionA = formatted.filter(item => KATEGORI_PESERTA_DIDIK.includes(item.kategoriKode));
    const sectionB = formatted.filter(item => KATEGORI_NON_PESERTA_DIDIK.includes(item.kategoriKode));

    // Sort
    sectionA.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
    sectionB.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

    const grandTotal = sectionA.reduce((s, i) => s + i.total, 0) + sectionB.reduce((s, i) => s + i.total, 0);

    res.json({
      sectionA,
      sectionB,
      total: grandTotal
    });
  } catch (error) {
    console.error("Aggregate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ==========================================
// PO APPROVAL — Aslap validates physical receipt
// ==========================================

// PUT /api/aslap/po/:id/approve - Aslap konfirmasi penerimaan fisik
router.put("/po/:id/approve", requireAuth, requireRole("ASLAP"), validate(schemas.poApproveSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const poRows = await tx.$queryRaw`
        SELECT id, status FROM "TransaksiPembelian" WHERE id = ${id} FOR UPDATE
      `;
      if (poRows.length === 0) {
        throw new Error("[404] PO tidak ditemukan");
      }
      const po = poRows[0];

      if (po.status !== "DIREALISASI") {
        throw new Error("[409] Realisasi belanja dari Mitra belum diinput");
      }

      if (items && Array.isArray(items) && items.length > 0) {
        const existingItems = await tx.transaksiPembelianItem.findMany({
          where: { transaksiId: id },
          include: { bahanPokok: true }
        });

        const itemMap = new Map(existingItems.map((item) => [item.id, item]));

        for (const inputItem of items) {
          const poItem = itemMap.get(inputItem.itemId);
          if (!poItem) {
            throw new Error(`[400] Item dengan ID ${inputItem.itemId} tidak ditemukan pada PO ini`);
          }

          const qtyDiterima = Number(inputItem.qtyDiterima);
          if (isNaN(qtyDiterima) || qtyDiterima < 0) {
            throw new Error(`[400] Qty Diterima untuk item ${poItem.bahanPokok?.nama || inputItem.itemId} harus berupa angka non-negatif`);
          }

          const maxQty = poItem.qtyRealisasi !== null && poItem.qtyRealisasi !== undefined
            ? Number(poItem.qtyRealisasi)
            : Number(poItem.qty);

          if (qtyDiterima > maxQty) {
            throw new Error(`[400] Qty Diterima (${qtyDiterima}) untuk item ${poItem.bahanPokok?.nama || inputItem.itemId} tidak boleh melebihi realisasi/kuantitas (${maxQty})`);
          }

          await tx.transaksiPembelianItem.update({
            where: { id: poItem.id },
            data: { qtyDiterima }
          });
        }
      }

      return await tx.transaksiPembelian.update({
        where: { id },
        data: {
          status: "DITERIMA",
          diterimaOlehId: req.user.sub,
          diterimaAt: new Date()
        },
        include: {
          items: { include: { bahanPokok: true } },
          supplier: true,
          diterimaOleh: { select: { id: true, nama: true, role: true } }
        }
      });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message && error.message.startsWith("[404]")) {
      return res.status(404).json({ error: error.message.replace("[404] ", "") });
    }
    if (error.message && error.message.startsWith("[400]")) {
      return res.status(400).json({ error: error.message.replace("[400] ", "") });
    }
    if (error.message && error.message.startsWith("[409]")) {
      return res.status(409).json({ error: error.message.replace("[409] ", "") });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat menyetujui PO" });
  }
});

module.exports = router;

