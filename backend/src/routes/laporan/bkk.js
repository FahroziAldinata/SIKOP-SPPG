const express = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanBkkSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderBkkHtml } = require("../../templates/dokumen/bkk");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getBkkData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/bkk — JSON data
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkkSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getBkkData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (error) {
    logger.error("[bkk]", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BKK" });
  }
});

// GET /api/laporan/bkk/pdf — render BKK sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkkSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getBkkData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const html = renderBkkHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    const safeLabel = (data.periodeLabel || periodeId).replace(/[\s/]/g, "-");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BKK-${safeLabel}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[bkk/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BKK" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
