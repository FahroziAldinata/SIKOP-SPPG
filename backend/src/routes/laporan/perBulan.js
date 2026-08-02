const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanAnggaranSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderPerBulanHtml } = require("../../templates/dokumen/perBulan");
const { getPerBulanData } = require("./_helpers");

const router = express.Router();

// GET /api/laporan/per-bulan - Laporan Per Bulan
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: { periodeId },
      orderBy: { tanggal: "asc" }
    });

    const dataBulanan = {};
    for (const row of jurnal) {
      const month = row.tanggal.getUTCMonth() + 1;
      const year = row.tanggal.getUTCFullYear();
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!dataBulanan[key]) {
        dataBulanan[key] = { key, year, month, totalMasuk: 0, totalKeluar: 0 };
      }
      if (row.jenis === "MASUK") {
        dataBulanan[key].totalMasuk += Number(row.nominal);
      } else {
        dataBulanan[key].totalKeluar += Number(row.nominal);
      }
    }

    res.json({
      success: true,
      data: Object.values(dataBulanan).sort((a, b) => a.key.localeCompare(b.key))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per bulan" });
  }
});

// GET /api/laporan/per-bulan/pdf — PDF Per Bulan
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getPerBulanData(periodeId);
    const html = renderPerBulanHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Per-Bulan.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[per-bulan/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Per Bulan" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
