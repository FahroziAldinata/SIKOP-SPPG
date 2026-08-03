const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { normalizeDateUTC } = require("../../lib/accountingHelper");
const { renderRabP12Html } = require("../../templates/dokumen/rabP12");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const {
  hitungPaguHarian,
  hitungSubtotalBahanHarian,
  getRabItemCalculations
} = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/akuntan/rab-p12/harian - Pagu & Porsi Harian Per Jenis Porsi
router.get("/harian", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }

    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const start = normalizeDateUTC(period.tanggalMulai);
    const end = normalizeDateUTC(period.tanggalSelesai);
    if (targetDate < start || targetDate > end) {
      return res.status(400).json({ error: "Tanggal transaksi harus berada di dalam batas rentang periode" });
    }

    const result = await hitungPaguHarian(prisma, periodeId, tanggal);
    const dateStr = typeof tanggal === "string" ? tanggal.split("T")[0] : targetDate.toISOString().split("T")[0];

    res.json({
      success: true,
      data: {
        tanggal: dateStr,
        porsi: result.porsi,
        pagu: result.pagu
      }
    });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[BATAS_TIDAK_ADA]")) {
      return res.status(500).json({ error: "Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil pagu & porsi RAB harian" });
  }
});

// GET /api/akuntan/rab-p12/rekap?periodeId=X - Rekap pagu + kebutuhan bahan + pemakaian anggaran per hari
router.get("/rekap", requireAuth, requireRole("AKUNTAN"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }

    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    // Pre-fetch shared data sekali untuk semua tanggal
    const batasHargaList = await prisma.batasHargaPorsi.findMany();
    const batasKecil = batasHargaList.find(b => b.jenisPorsi === "KECIL");
    const batasBesar = batasHargaList.find(b => b.jenisPorsi === "BESAR");
    if (!batasKecil || !batasBesar) {
      return res.status(500).json({ error: "Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database" });
    }

    const priceList = await prisma.hargaBahanPeriode.findMany({ where: { periodeId } });
    const priceMap = {};
    priceList.forEach(p => { priceMap[p.bahanPokokId] = Number(p.harga); });

    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    // Loop tiap tanggal dalam range periode
    const rekap = [];
    const start = normalizeDateUTC(period.tanggalMulai);
    const end = normalizeDateUTC(period.tanggalSelesai);

    let cur = new Date(start);
    while (cur <= end) {
      const tglStr = cur.toISOString().split("T")[0];

      // 1. Pagu + porsi
      const { porsi, pagu } = await hitungPaguHarian(prisma, periodeId, tglStr, batasHargaList);

      // 2. Subtotal kebutuhan bahan
      const jumlahKebutuhanBahan = await hitungSubtotalBahanHarian(prisma, periodeId, tglStr, priceMap, activeInputs);

      // 3. Pemakaian anggaran dari AnggaranHarian (BAHAN_MAKANAN)
      const anggaran = await prisma.anggaranHarian.findUnique({
        where: {
          periodeId_tanggal_kategoriDana: {
            periodeId,
            tanggal: normalizeDateUTC(tglStr),
            kategoriDana: "BAHAN_MAKANAN"
          }
        }
      });
      const pemakaianAnggaran = anggaran ? Number(anggaran.aktual) : 0;

      const sisa = pagu.total - pemakaianAnggaran;

      rekap.push({
        tanggal: tglStr,
        porsi,
        maksimalAnggaran: pagu.total,
        jumlahKebutuhanBahan,
        pemakaianAnggaran,
        sisa
      });

      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    }

    res.json({
      success: true,
      data: { periodeId, rekap }
    });
  } catch (error) {
    logger.error(error);
    if (error.message && error.message.startsWith("[BATAS_TIDAK_ADA]")) {
      return res.status(500).json({ error: "Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil rekap RAB harian" });
  }
});

// GET /api/akuntan/rab-p12/pdf?periodeId=X&tanggal=YYYY-MM-DD - PDF RAB P12
router.get("/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggal } = req.query;

    if (!periodeId) {
      return res.status(400).json({ error: "periodeId wajib diisi" });
    }
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib diisi" });
    }

    const period = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!period) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const targetDate = normalizeDateUTC(tanggal);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // 1. Pagu & porsi
    const { pagu } = await hitungPaguHarian(prisma, periodeId, tanggal);

    // 2. Items calculation & existing RAB items lookup
    const priceList = await prisma.hargaBahanPeriode.findMany({ where: { periodeId } });
    const priceMap = {};
    priceList.forEach(p => { priceMap[p.bahanPokokId] = Number(p.harga); });

    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: true, grupHari: true }
    });

    const itemMap = await getRabItemCalculations(prisma, periodeId, tanggal, priceMap, activeInputs);
    let items = Object.values(itemMap).map(b => ({
      nama: b.nama,
      qtySiswa: b.qtySiswa,
      qtyB3: b.qtyB3,
      qtyTotal: b.qtyTotal,
      satuan: b.satuan,
      hargaSatuan: b.hargaSatuan,
      subtotal: Math.round(b.qtyTotal * b.hargaSatuan * 100) / 100
    }));

    const existingRab = await prisma.rabHarian.findUnique({
      where: { periodeId_tanggal: { periodeId, tanggal: targetDate } },
      include: { items: { include: { bahanPokok: true } } }
    });
    if (existingRab && existingRab.items && existingRab.items.length > 0) {
      items = existingRab.items.map(i => ({
        nama: i.bahanPokok.nama,
        qtySiswa: Number(i.qtySiswa),
        qtyB3: Number(i.qtyB3),
        qtyTotal: Number(i.qtyTotal),
        satuan: i.satuan,
        hargaSatuan: Number(i.hargaSatuan),
        subtotal: Number(i.subtotal)
      }));
    }

    // 3. Rekap calculation
    const jumlahKebutuhanBahan = items.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0);
    const anggaran = await prisma.anggaranHarian.findUnique({
      where: {
        periodeId_tanggal_kategoriDana: {
          periodeId,
          tanggal: targetDate,
          kategoriDana: "BAHAN_MAKANAN"
        }
      }
    });
    const pemakaianAnggaran = anggaran ? Number(anggaran.aktual) : 0;
    const sisa = pagu.total - pemakaianAnggaran;

    const setupLembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    const identitas = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaAkuntan: setupLembaga?.namaAkuntanSPPG || "",
      namaKepala: setupLembaga?.namaKepalaSPPG || ""
    };

    const startStr = period.tanggalMulai ? new Date(period.tanggalMulai).toISOString().split("T")[0] : "";
    const endStr = period.tanggalSelesai ? new Date(period.tanggalSelesai).toISOString().split("T")[0] : "";
    const periodeInfo = `${startStr} s/d ${endStr}`;

    const dateStr = typeof tanggal === "string" ? tanggal.split("T")[0] : targetDate.toISOString().split("T")[0];

    const dataRender = {
      tanggal: dateStr,
      periodeInfo,
      pagu,
      items,
      rekap: {
        maksimalAnggaran: pagu.total,
        jumlahKebutuhanBahan,
        pemakaianAnggaran,
        sisa
      },
      identitas
    };

    const html = renderRabP12Html(dataRender);

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
      "Content-Disposition": `inline; filename="RAB-P12-${dateStr}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[rab-p12/pdf]", error);
    if (error.message && error.message.startsWith("[BATAS_TIDAK_ADA]")) {
      return res.status(500).json({ error: "Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database" });
    }
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat PDF RAB P12" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
