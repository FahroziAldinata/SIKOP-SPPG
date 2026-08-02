const express = require("express");
const prisma = require("../../lib/prisma");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderAslapPerKelasHtml } = require("../../templates/dokumen/aslapPerKelas");
const { getLembaga, authMiddleware } = require("./_helpers");

const router = express.Router();

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

module.exports = router;
