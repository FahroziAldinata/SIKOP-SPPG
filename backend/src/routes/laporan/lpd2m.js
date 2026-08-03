const express = require("express");
const fs = require("fs");
const path = require("path");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanMultiPeriodeSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderLpd2mHtml } = require("../../templates/dokumen/lpd2m");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { getLpd2mData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/lpd2m - Laporan Perkembangan Dana Dua Mingguan
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const data = await getLpd2mData(periodeIds);
    res.json({ success: true, data });
  } catch (error) {
    logger.error("[lpd2m]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses LPD2M";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

// GET /api/laporan/lpd2m/pdf - LPD2M sebagai PDF
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeIds } = req.query;
    const lpd2mData = await getLpd2mData(periodeIds);

    // Ambil identitas lembaga dari periode pertama
    const firstPeriodeId = lpd2mData.periodeData[0]?.periodeId;
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

    // Embed Bukti LPD2M jika ada
    const ids = periodeIds.split(',').filter(Boolean);
    const buktiList = await prisma.dokumenBuktiLpd2m.findMany({
      where: { periodeId: { in: ids } },
      orderBy: { createdAt: 'asc' }
    });

    const buktiFormatted = buktiList.map(b => {
      let base64Data = null;
      const absolutePath = path.isAbsolute(b.filePath)
        ? b.filePath
        : path.join(__dirname, '../../../', b.filePath);

      if (fs.existsSync(absolutePath)) {
        try {
          const fileBuffer = fs.readFileSync(absolutePath);
          base64Data = `data:${b.mimeType};base64,${fileBuffer.toString('base64')}`;
        } catch (err) {
          logger.error("[lpd2m/pdf] Gagal membaca file bukti:", absolutePath, err);
        }
      }
      return {
        id: b.id,
        namaBukti: b.namaBukti,
        jenis: b.jenis,
        mimeType: b.mimeType,
        createdAt: b.createdAt,
        base64Data
      };
    }).filter(b => b.base64Data !== null);

    const html = renderLpd2mHtml({ ...lpd2mData, lembaga, buktiList: buktiFormatted });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    // Setelah page.pdf() BERHASIL → hapus semua file bukti periode tsb dari storage + hapus record DB (auto-hapus)
    if (buktiList.length > 0) {
      for (const b of buktiList) {
        const absolutePath = path.isAbsolute(b.filePath)
          ? b.filePath
          : path.join(__dirname, '../../../', b.filePath);
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (unlinkErr) {
            logger.error("[lpd2m/pdf] Gagal hapus file bukti:", absolutePath, unlinkErr);
          }
        }
      }
      await prisma.dokumenBuktiLpd2m.deleteMany({
        where: { periodeId: { in: ids } }
      });
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="LPD2M-Multi-Periode.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[lpd2m/pdf]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF LPD2M";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
