const express = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanLbbpSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderLbbpHtml } = require("../../templates/dokumen/lbbp");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getLbbpData } = require("./_helpers");

const router = express.Router();

// GET /api/laporan/lbbp — JSON data
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLbbpSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getLbbpData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error("[lbbp]", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat LBBP" });
  }
});

// GET /api/laporan/lbbp/pdf — render LBBP sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLbbpSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getLbbpData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const html = renderLbbpHtml(data);

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
      "Content-Disposition": `inline; filename="LBBP-${safeLabel}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[lbbp/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF LBBP" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
