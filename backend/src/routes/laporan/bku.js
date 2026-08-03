const express = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanBkuSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { exportBkuXlsx } = require("../../lib/exportExcel");
const { renderBkuHtml } = require("../../templates/dokumen/bku");
const { renderCatatanHtml } = require("../../templates/dokumen/catatan");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getBkuData } = require("./_helpers");

const router = express.Router();
const catatanRouter = express.Router();

// GET /api/laporan/bku - Buku Kas Umum
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BKU" });
  }
});

// GET /api/laporan/bku/pdf - Render BKU sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    const html = renderBkuHtml(data);

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
      "Content-Disposition": `inline; filename="BKU-${data.ringkasan.periodeLabel.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[bku/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BKU" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bku/export-excel - Export BKU ke Excel (.xlsx)
router.get("/export-excel", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }
    const buffer = await exportBkuXlsx(data);
    const filename = `BKU-${(data.ringkasan.periodeLabel || periodeId).replace(/[/\s]/g, '-')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    console.error("[bku/export-excel]", error);
    res.status(500).json({ error: "Gagal membuat Excel BKU" });
  }
});

// GET /api/laporan/catatan/pdf - Render Catatan Pengeluaran Bulanan sebagai PDF
catatanRouter.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    const html = renderCatatanHtml(data);

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
      "Content-Disposition": `inline; filename="Catatan-${data.ringkasan.periodeLabel.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[catatan/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Catatan" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
module.exports.catatanRouter = catatanRouter;
