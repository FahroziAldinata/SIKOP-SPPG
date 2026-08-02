const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanBpSchema, laporanRekapSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderBpHtml } = require("../../templates/dokumen/bp");
const { getBpData, BP_CONFIGS } = require("./_helpers");

const router = express.Router();

// GET /api/laporan/bp - Buku Pembantu per Akun
router.get("/", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBpSchema, "query"), async (req, res) => {
  try {
    const { periodeId, akunId } = req.query;

    const akun = await prisma.akun.findUnique({ where: { id: akunId } });
    if (!akun) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    const saldoAwal = await prisma.saldoAwalPeriode.findUnique({
      where: { periodeId_akunId: { periodeId, akunId } },
    });
    let saldo = Number(saldoAwal?.saldoAwal || 0);

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: {
        periodeId,
        OR: [{ akunKasId: akunId }, { akunDanaBiayaId: akunId }],
      },
      orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
    });

    const data = jurnal.map((row) => {
      const isKasSide = row.akunKasId === akunId;
      const masukKeAkunIni = isKasSide ? row.jenis === "MASUK" : row.jenis === "KELUAR";
      const debet = masukKeAkunIni ? Number(row.nominal) : 0;
      const kredit = masukKeAkunIni ? 0 : Number(row.nominal);
      saldo = saldo + debet - kredit;
      return {
        id: row.id,
        tanggal: row.tanggal.toISOString().split("T")[0],
        noBukti: row.nomorBukti,
        uraian: row.uraian,
        debet,
        kredit,
        saldoBerjalan: saldo,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat Buku Pembantu" });
  }
});

// Daftarkan 4 data route + 4 PDF route secara dinamis
for (const cfg of BP_CONFIGS) {
  // Data route: GET /api/laporan/bp/:path
  router.get(`/${cfg.path}`, requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
    try {
      const { periodeId } = req.query;

      const result = await getBpData(periodeId, cfg.filterAkun, cfg.namaAkunLabel, cfg.jenisPembantu, cfg.showKeterangan);
      if (!result) return res.status(404).json({ error: "Setup lembaga atau akun tidak ditemukan" });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error(`[bp/${cfg.path}]`, error);
      res.status(500).json({ error: `Gagal mengambil data BP ${cfg.jenisPembantu}` });
    }
  });

  // PDF route: GET /api/laporan/bp/:path/pdf
  router.get(`/${cfg.path}/pdf`, requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
    let browser;
    try {
      const { periodeId } = req.query;

      const result = await getBpData(periodeId, cfg.filterAkun, cfg.namaAkunLabel, cfg.jenisPembantu, cfg.showKeterangan);
      if (!result) return res.status(404).json({ error: "Setup lembaga atau akun tidak ditemukan" });

      const html = renderBpHtml(result, cfg.showKeterangan);

      browser = await launchPuppeteer();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
      });

      const safeName = cfg.jenisPembantu.replace(/\s+/g, "-");
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="BP-${safeName}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      console.error(`[bp/${cfg.path}/pdf]`, error);
      res.status(500).json({ error: `Gagal membuat PDF BP ${cfg.jenisPembantu}` });
    } finally {
      if (browser) await browser.close();
    }
  });
}

module.exports = router;
