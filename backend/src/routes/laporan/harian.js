const express = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanHarianSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderLaporanHarianHtml } = require("../../templates/dokumen/laporanHarian");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getLaporanHarianData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/harian - Laporan Harian (ringkasan satu hari)
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanHarianSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;

    const data = await getLaporanHarianData(periodeId, tanggal);
    res.json({ success: true, data });
  } catch (error) {
    logger.error(error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses laporan harian";
    res.status(500).json({ error: message });
  }
});

// GET /api/laporan/harian/pdf - PDF Laporan Harian
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanHarianSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggal } = req.query;

    const data = await getLaporanHarianData(periodeId, tanggal);
    const html = renderLaporanHarianHtml(data);

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Harian-${tanggal}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[harian/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Harian";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
