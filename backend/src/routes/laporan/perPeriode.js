const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanRekapSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderPerPeriodeHtml } = require("../../templates/dokumen/perPeriode");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getPerPeriodeData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/per-periode - Laporan Per Periode (Pendidikan & Posyandu)
router.get("/", requireAuth, requirePermission("laporan-resmi", "READ"), validate(laporanRekapSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const details = await prisma.anggaranBahanMakananDetail.findMany({
      where: { anggaranHarian: { periodeId } },
      include: { kategori: true }
    });

    let rabPendidikan = 0;
    let rabPosyandu = 0;

    for (const det of details) {
      const subtotal = Number(det.jumlahPaket) * Number(det.hargaSatuan);
      if (det.kategori.jenisSasaran === "PESERTA_DIDIK") {
        rabPendidikan += subtotal;
      } else {
        rabPosyandu += subtotal;
      }
    }

    const bahanAgg = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
      _sum: { aktual: true }
    });
    const totalAktualBahan = Number(bahanAgg._sum.aktual || 0);

    const totalRabBahan = rabPendidikan + rabPosyandu;
    const rasioPendidikan = totalRabBahan > 0 ? rabPendidikan / totalRabBahan : 0;
    const aktualPendidikan = totalAktualBahan * rasioPendidikan;
    const aktualPosyandu = totalAktualBahan * (1 - rasioPendidikan);

    const operasional = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "OPERASIONAL" },
      _sum: { rab: true, aktual: true }
    });
    const sewa = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
      _sum: { rab: true, aktual: true }
    });

    res.json({
      success: true,
      data: {
        bahanMakanan: {
          pendidikan: {
            rab: rabPendidikan,
            aktual: aktualPendidikan,
            selisih: rabPendidikan - aktualPendidikan,
            metodeAlokasi: "PROPORSIONAL_RAB"
          },
          posyandu: {
            rab: rabPosyandu,
            aktual: aktualPosyandu,
            selisih: rabPosyandu - aktualPosyandu,
            metodeAlokasi: "PROPORSIONAL_RAB"
          }
        },
        operasional: {
          rab: Number(operasional._sum.rab || 0),
          aktual: Number(operasional._sum.aktual || 0),
          selisih: Number(operasional._sum.rab || 0) - Number(operasional._sum.aktual || 0)
        },
        insentifFasilitas: {
          rab: Number(sewa._sum.rab || 0),
          aktual: Number(sewa._sum.aktual || 0),
          selisih: Number(sewa._sum.rab || 0) - Number(sewa._sum.aktual || 0)
        }
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per periode" });
  }
});

// GET /api/laporan/per-periode/pdf — PDF Per Periode
router.get("/pdf", requireAuth, requirePermission("laporan-resmi", "EXPORT"), validate(laporanRekapSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getPerPeriodeData(periodeId);
    const html = renderPerPeriodeHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Per-Periode.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[per-periode/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Per Periode" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
