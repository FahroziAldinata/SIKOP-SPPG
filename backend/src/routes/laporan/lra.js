const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanMultiPeriodeSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { exportLraXlsx } = require("../../lib/exportExcel");
const { renderLraHtml } = require("../../templates/dokumen/lra");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getLraData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/lra - Laporan Realisasi Anggaran (multi-periode komparatif)
router.get("/", requireAuth, requirePermission("laporan-resmi", "READ"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const data = await getLraData(periodeIds);
    res.json({ success: true, data });
  } catch (error) {
    logger.error("[lra]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

// GET /api/laporan/lra/pdf - LRA sebagai PDF
router.get("/pdf", requireAuth, requirePermission("laporan-resmi", "EXPORT"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeIds } = req.query;
    const lraData = await getLraData(periodeIds);

    // Ambil identitas lembaga dari periode pertama
    const firstPeriodeId = lraData.periodeList[0]?.id;
    let lembaga = {};
    if (firstPeriodeId) {
      const setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId: firstPeriodeId } });
      if (setupLembaga) {
        lembaga = {
          namaLembaga: setupLembaga.namaLembaga,
          alamat: setupLembaga.alamat,
          namaPejabat: setupLembaga.namaKepalaSPPG,
          namaAkuntan: setupLembaga.namaAkuntanSPPG,
        };
      }
    }

    const html = renderLraHtml({ ...lraData, lembaga });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="LRA-SAP-BGN.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[lra/pdf]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/lra/export-excel - Export LRA ke Excel (.xlsx)
router.get("/export-excel", requireAuth, requirePermission("laporan-resmi", "EXPORT"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const lraData = await getLraData(periodeIds);

    const firstPeriodeId = lraData.periodeList[0]?.id;
    let lembaga = {};
    if (firstPeriodeId) {
      const setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId: firstPeriodeId } });
      if (setupLembaga) {
        lembaga = {
          namaLembaga: setupLembaga.namaLembaga,
          alamat: setupLembaga.alamat,
          namaPejabat: setupLembaga.namaKepalaSPPG,
          namaAkuntan: setupLembaga.namaAkuntanSPPG,
        };
      }
    }

    const buffer = await exportLraXlsx(lraData, lembaga);
    res.setHeader('Content-Disposition', 'attachment; filename="LRA-SAP-BGN.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    logger.error("[lra/export-excel]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat Excel LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

module.exports = router;
