const express = require("express");
const prisma = require("../../lib/prisma");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderAslapPerPeriodeHtml } = require("../../templates/dokumen/aslapPerPeriode");
const {
  KATEGORI_PORSI_KECIL,
  KATEGORI_PORSI_BESAR_SD46,
  KATEGORI_PORSI_BESAR_SMK,
  KATEGORI_PIC_SEKOLAH
} = require("../../constants/kategori");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getLembaga, authMiddleware } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

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
    logger.error("Error get laporan periode aslap:", error);
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
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
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
    logger.error("[laporan/periode/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Per Periode";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
