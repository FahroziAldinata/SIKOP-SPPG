const express = require("express");
const prisma = require("../../lib/prisma");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderAslapPerBulanHtml } = require("../../templates/dokumen/aslapPerBulan");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { KODE_TO_ROW_FIELD, KATEGORI_PIC_SEKOLAH } = require("../../constants/kategori");
const { getLembaga, authMiddleware } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

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

// LAPORAN BULANAN ASLAP
router.get(["/laporan/bulanan", "/laporan/per-bulan", "/api/aslap/laporan/bulanan", "/api/aslap/laporan/per-bulan"], authMiddleware("aslap-laporan", "READ"), validate(schemas.laporanBulananSchema, "query"), async (req, res) => {
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
    logger.error("Error get laporan bulanan aslap:", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan bulanan aslap" });
  }
});

// GET /api/aslap/laporan/bulanan/pdf - PDF Laporan Bulanan
router.get(["/laporan/bulanan/pdf", "/laporan/per-bulan/pdf", "/api/aslap/laporan/bulanan/pdf", "/api/aslap/laporan/per-bulan/pdf"], authMiddleware("aslap-laporan", "EXPORT"), validate(schemas.laporanBulananSchema, "query"), async (req, res) => {
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
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
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
    logger.error("[laporan/bulanan/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Bulanan";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
