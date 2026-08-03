const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanBttSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderBttHtml, formatTerbilang } = require("../../templates/dokumen/btt");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/btt — Data BTT (JSON)
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBttSchema, "query"), async (req, res) => {
  try {
    const { periodeId, kategori } = req.query;

    const kategoriDana = kategori === "sewa" ? "INSENTIF_FASILITAS" : "OPERASIONAL";

    const [agg, periode, lembaga, mitraUser] = await Promise.all([
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } },
        _sum: { nominal: true }
      }),
      prisma.periode.findUnique({ where: { id: periodeId } }),
      prisma.setupLembaga.findFirst({ where: { periodeId } }),
      prisma.user.findFirst({ where: { role: "MITRA", aktif: true }, select: { nama: true } })
    ]);

    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const nominal = Number(agg._sum.nominal || 0);
    const terbilang = formatTerbilang(nominal);

    const existingCount = await prisma.jurnalTransaksi.count({
      where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } }
    });
    const nomorUrut = existingCount + 1;
    const kategoriLabel = kategori === "sewa" ? "Sewa" : "Operasional";
    const nomorDokumen = `BTT/${kategoriLabel}/${nomorUrut}`;

    res.json({
      success: true,
      data: {
        nomorDokumen,
        nominal,
        terbilang,
        keperluan: kategori === "sewa" ? "Uang Sewa Fasilitas" : "Kebutuhan Operasional SPPG",
        identitas: {
          namaLembaga: lembaga?.namaLembaga || '',
          alamat: lembaga?.alamat || '',
          idSppg: lembaga?.namaLembaga || '',
        },
        mitraNama: mitraUser?.nama || '',
        stafPengawasNama: lembaga?.namaAkuntanSPPG || '',
        kepalaNama: lembaga?.namaKepalaSPPG || '',
        tempat: lembaga?.tempatPelaporan || 'Sumedang',
        tanggal: new Date().toISOString().split("T")[0],
        kategori,
      }
    });
  } catch (error) {
    logger.error("[btt]", error);
    res.status(500).json({ error: "Gagal mengambil data BTT" });
  }
});

// GET /api/laporan/btt/pdf — PDF BTT
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBttSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, kategori } = req.query;

    const kategoriDana = kategori === "sewa" ? "INSENTIF_FASILITAS" : "OPERASIONAL";

    const [agg, periode, lembaga, mitraUser] = await Promise.all([
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } },
        _sum: { nominal: true }
      }),
      prisma.periode.findUnique({ where: { id: periodeId } }),
      prisma.setupLembaga.findFirst({ where: { periodeId } }),
      prisma.user.findFirst({ where: { role: "MITRA", aktif: true }, select: { nama: true } })
    ]);

    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const nominal = Number(agg._sum.nominal || 0);

    const existingCount = await prisma.jurnalTransaksi.count({
      where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } }
    });
    const nomorUrut = existingCount + 1;
    const kategoriLabel = kategori === "sewa" ? "Sewa" : "Operasional";
    const nomorDokumen = `BTT/${kategoriLabel}/${nomorUrut}`;

    const data = {
      nomorDokumen,
      nominal,
      terbilang: formatTerbilang(nominal),
      keperluan: kategori === "sewa" ? "Uang Sewa Fasilitas" : "Kebutuhan Operasional SPPG",
      identitas: {
        namaLembaga: lembaga?.namaLembaga || '',
        alamat: lembaga?.alamat || '',
        idSppg: lembaga?.namaLembaga || '',
      },
      mitraNama: mitraUser?.nama || '',
      stafPengawasNama: lembaga?.namaAkuntanSPPG || '',
      kepalaNama: lembaga?.namaKepalaSPPG || '',
      tempat: lembaga?.tempatPelaporan || 'Sumedang',
      tanggal: new Date().toISOString().split("T")[0],
      kategori,
    };

    const html = renderBttHtml(data);

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
      "Content-Disposition": `inline; filename="BTT-${nomorDokumen.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[btt/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BTT" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
