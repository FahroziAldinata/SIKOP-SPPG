const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanNeracaSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderNeracaSaldoHtml } = require("../../templates/dokumen/neracaSaldo");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getNeracaSaldoData } = require("./_helpers");

const router = express.Router();

// GET /api/laporan/neraca-saldo
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanNeracaSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const data = await getNeracaSaldoData(periodeId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[neraca-saldo]", error);
    res.status(500).json({ error: "Gagal mengambil data Neraca Saldo" });
  }
});

// GET /api/laporan/neraca-saldo/pdf
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanNeracaSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getNeracaSaldoData(periodeId);
    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });

    const html = renderNeracaSaldoHtml({
      akun: data.akun,
      verifikasi: data.verifikasi,
      identitas: {
        namaLembaga: lembaga?.namaLembaga || '',
        alamat: lembaga?.alamat || '',
        namaAkuntan: lembaga?.namaAkuntanSPPG || '',
        namaKepala: lembaga?.namaKepalaSPPG || '',
      },
    });

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
      "Content-Disposition": 'inline; filename="Neraca-Saldo.pdf"',
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[neraca-saldo/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Neraca Saldo" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
