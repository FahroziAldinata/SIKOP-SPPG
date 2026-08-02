const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanKebutuhanBelanjaSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderKebutuhanBelanjaHtml } = require("../../templates/dokumen/kebutuhanBelanja");
const { normalizeDateUTC, HARI_MAP, getTotalPorsiBlok } = require("../../lib/accountingHelper");
const { getKebutuhanBelanjaData } = require("./_helpers");

const router = express.Router();
const bahanRouter = express.Router();

// GET /api/laporan/kebutuhan-belanja-bahan - Kebutuhan Belanja Bahan
bahanRouter.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanKebutuhanBelanjaSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggalMulai, tanggalSelesai } = req.query;

    const start = normalizeDateUTC(tanggalMulai);
    const end = normalizeDateUTC(tanggalSelesai);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // 1. Fetch all MenuHarian DISETUJUI in date range
    const menus = await prisma.menuHarian.findMany({
      where: {
        periodeId,
        tanggal: { gte: start, lte: end },
        status: "DISETUJUI"
      },
      include: {
        blok: {
          include: {
            kelompokUmurMenu: {
              include: { kategoriPenerima: true }
            },
            menuItem: {
              include: {
                bahan: {
                  include: { bahanPokok: true }
                }
              }
            }
          }
        }
      }
    });

    // 2. Fetch all InputPenerimaManfaat once to avoid N+1 query
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    const akumulasiBahan = {};

    for (const menu of menus) {
      const day = new Date(menu.tanggal).getUTCDay();
      const dayOfWeek = HARI_MAP[day];
      if (!dayOfWeek) continue; // Skip Sunday/Invalid days

      // Filter active inputs for this day of week in memory
      const inputsForDay = activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek));

      const porsiPerKategori = {};
      for (const input of inputsForDay) {
        for (const det of input.detail) {
          porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
        }
      }

      for (const blok of menu.blok) {
        const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);

        for (const item of blok.menuItem) {
          for (const b of item.bahan) {
            const bid = b.bahanPokokId;
            if (!akumulasiBahan[bid]) {
              akumulasiBahan[bid] = {
                id: bid,
                nama: b.bahanPokok.nama,
                satuan: b.bahanPokok.satuan,
                totalBeratKotorGr: 0,
                totalBeratBersihGr: 0,
                totalEstimasiBiaya: 0
              };
            }
            akumulasiBahan[bid].totalBeratKotorGr += Number(b.beratKotorGr) * totalPorsiBlok;
            akumulasiBahan[bid].totalBeratBersihGr += Number(b.beratBersihGr) * totalPorsiBlok;
            akumulasiBahan[bid].totalEstimasiBiaya += Number(b.totalHargaBahan) * totalPorsiBlok;
          }
        }
      }
    }

    res.json({ success: true, data: Object.values(akumulasiBahan) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses kebutuhan belanja bahan" });
  }
});

// GET /api/laporan/kebutuhan-belanja/pdf — PDF Kebutuhan Belanja
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanKebutuhanBelanjaSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggalMulai, tanggalSelesai } = req.query;
    const data = await getKebutuhanBelanjaData(periodeId, tanggalMulai, tanggalSelesai);
    const html = renderKebutuhanBelanjaHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Kebutuhan-Belanja.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[kebutuhan-belanja/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Kebutuhan Belanja" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
module.exports.bahanRouter = bahanRouter;
