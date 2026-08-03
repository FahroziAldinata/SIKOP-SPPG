const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanLpaSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderLpaHtml } = require("../../templates/dokumen/lpa");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { JABATAN_KEPALA_SPPG } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/lpa - Laporan Penggunaan Anggaran
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLpaSchema, "query"), async (req, res) => {
  try {
    const { periodeId, nomorDokumen, isLr } = req.query;
    const isLrBool = isLr === 'true';
    if (!isLrBool && !nomorDokumen) {
      return res.status(400).json({ error: "nomorDokumen wajib disertakan pada query parameter" });
    }

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincian = await Promise.all([
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
        _sum: { rab: true, aktual: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "OPERASIONAL" },
        _sum: { rab: true, aktual: true },
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
        _sum: { rab: true, aktual: true },
      })
    ]);

    const mappedRincian = [
      {
        label: "Bahan Baku",
        kategoriDana: "BAHAN_MAKANAN",
        diajukan: Number(rincian[0]._sum.rab || 0),
        terealisasi: Number(rincian[0]._sum.aktual || 0),
        sisa: Number(rincian[0]._sum.rab || 0) - Number(rincian[0]._sum.aktual || 0)
      },
      {
        label: "Operasional",
        kategoriDana: "OPERASIONAL",
        diajukan: Number(rincian[1]._sum.rab || 0),
        terealisasi: Number(rincian[1]._sum.aktual || 0),
        sisa: Number(rincian[1]._sum.rab || 0) - Number(rincian[1]._sum.aktual || 0)
      },
      {
        label: "Sewa",
        kategoriDana: "INSENTIF_FASILITAS",
        diajukan: Number(rincian[2]._sum.rab || 0),
        terealisasi: Number(rincian[2]._sum.aktual || 0),
        sisa: Number(rincian[2]._sum.rab || 0) - Number(rincian[2]._sum.aktual || 0)
      }
    ];

    const total = mappedRincian.reduce(
      (acc, r) => ({
        diajukan: acc.diajukan + r.diajukan,
        terealisasi: acc.terealisasi + r.terealisasi,
        sisa: acc.sisa + r.sisa,
      }),
      { diajukan: 0, terealisasi: 0, sisa: 0 }
    );

    res.json({
      success: true,
      data: {
        isLr: isLrBool,
        nomorDokumen: isLrBool ? null : nomorDokumen,
        periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
        namaPejabat: lembaga.namaKepalaSPPG,
        jabatan: JABATAN_KEPALA_SPPG,
        namaLembaga: lembaga.namaLembaga,
        rincian: mappedRincian,
        total,
        nomorRekeningVA: lembaga.nomorRekeningVA,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        namaYayasan: lembaga.namaYayasan,
        ketuaYayasan: lembaga.ketuaYayasan,
        namaAkuntan: lembaga.namaAkuntanSPPG,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat LPA" });
  }
});

// GET /api/laporan/lpa/pdf - Render LPA sebagai PDF (inline, buka di tab baru)
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLpaSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen, isLr } = req.query;
    const isLrBool = isLr === 'true';
    if (!isLrBool && !nomorDokumen) {
      return res.status(400).json({ error: "nomorDokumen wajib disertakan" });
    }

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincian = [
      { label: "Bahan Baku", diajukan: Number(rincianAgg[0]._sum.rab || 0), terealisasi: Number(rincianAgg[0]._sum.aktual || 0), sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Operasional", diajukan: Number(rincianAgg[1]._sum.rab || 0), terealisasi: Number(rincianAgg[1]._sum.aktual || 0), sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Sewa", diajukan: Number(rincianAgg[2]._sum.rab || 0), terealisasi: Number(rincianAgg[2]._sum.aktual || 0), sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];

    const total = rincian.reduce(
      (acc, r) => ({ diajukan: acc.diajukan + r.diajukan, terealisasi: acc.terealisasi + r.terealisasi, sisa: acc.sisa + r.sisa }),
      { diajukan: 0, terealisasi: 0, sisa: 0 }
    );

    const data = {
      isLr: isLrBool,
      nomorDokumen: isLrBool ? null : nomorDokumen,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      namaPejabat: lembaga.namaKepalaSPPG,
      jabatan: JABATAN_KEPALA_SPPG,
      namaLembaga: lembaga.namaLembaga,
      rincian,
      total,
      nomorRekeningVA: lembaga.nomorRekeningVA,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      namaYayasan: lembaga.namaYayasan,
      ketuaYayasan: lembaga.ketuaYayasan,
      namaAkuntan: lembaga.namaAkuntanSPPG,
      alamat: lembaga.alamat,
    };

    const html = renderLpaHtml(data);

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
      "Content-Disposition": `inline; filename="${isLrBool ? 'LR-Resume' : `LPA-${nomorDokumen.replace(/\//g, '-')}`}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[lpa/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF LPA" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
