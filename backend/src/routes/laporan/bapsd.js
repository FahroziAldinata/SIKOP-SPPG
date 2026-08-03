const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanBapsdSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderBapsdHtml } = require("../../templates/dokumen/bapsd");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/bapsd - Berita Acara Pengalihan Sisa Dana
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBapsdSchema, "query"), async (req, res) => {
  try {
    const { periodeId, nomorDokumen } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincianSisa = [
      { label: "Dana Bahan Baku", sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Dana Operasional", sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Dana Insentif Fasilitas", sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];
    const sisaDana = rincianSisa.reduce((acc, r) => acc + r.sisa, 0);

    res.json({
      success: true,
      data: {
        nomorDokumen,
        periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
        sisaDana,
        rincianSisa,
        tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
        namaYayasan: lembaga.namaYayasan,
        ketuaYayasan: lembaga.ketuaYayasan,
        namaAkuntan: lembaga.namaAkuntanSPPG,
        namaPejabat: lembaga.namaKepalaSPPG,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
        nomorRekeningVA: lembaga.nomorRekeningVA,
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BAPSD" });
  }
});

// GET /api/laporan/bapsd/pdf - Render BAPSD sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBapsdSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincianSisa = [
      { label: "Dana Bahan Baku", sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Dana Operasional", sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Dana Insentif Fasilitas", sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];
    const sisaDana = rincianSisa.reduce((acc, r) => acc + r.sisa, 0);

    const data = {
      nomorDokumen,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      sisaDana,
      rincianSisa,
      tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
      namaYayasan: lembaga.namaYayasan,
      ketuaYayasan: lembaga.ketuaYayasan,
      namaAkuntan: lembaga.namaAkuntanSPPG,
      namaPejabat: lembaga.namaKepalaSPPG,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
      nomorRekeningVA: lembaga.nomorRekeningVA,
    };

    const html = renderBapsdHtml(data);

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
      "Content-Disposition": `inline; filename="BAPSD-${nomorDokumen.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[bapsd/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BAPSD" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
