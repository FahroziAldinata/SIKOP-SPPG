const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanRekapSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderSptjHtml } = require("../../templates/dokumen/sptj");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/sptj - Surat Pernyataan Tanggung Jawab
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    res.json({
      success: true,
      data: {
        namaPejabat: lembaga.namaKepalaSPPG,
        jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
        jumlahPenerimaan,
        jumlahPengeluaran,
        sisaDana: jumlahPenerimaan - jumlahPengeluaran,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        tahunAnggaran: lembaga.tahunAnggaran,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat SPTJ" });
  }
});

// GET /api/laporan/sptj/pdf - Render SPTJ sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    const data = {
      namaPejabat: lembaga.namaKepalaSPPG,
      jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
      jumlahPenerimaan,
      jumlahPengeluaran,
      sisaDana: jumlahPenerimaan - jumlahPengeluaran,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      tahunAnggaran: lembaga.tahunAnggaran,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
    };

    const html = renderSptjHtml(data);

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="SPTJ-${periodeId}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[sptj/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF SPTJ" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
