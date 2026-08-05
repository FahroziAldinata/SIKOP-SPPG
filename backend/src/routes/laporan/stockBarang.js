const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { laporanStokSchema } = require("../../validators/laporan");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { exportStockXlsx } = require("../../lib/exportExcel");
const { renderStockBarangHtml } = require("../../templates/dokumen/stockBarang");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { normalizeDateUTC } = require("../../lib/accountingHelper");
const { getStockBarangData } = require("./_helpers");
const { logger } = require("../../lib/logger");

const router = express.Router();

// GET /api/laporan/stock-barang - Laporan Stock Barang (Persediaan)
router.get("/", requireAuth, requirePermission("laporan-resmi", "READ"), validate(laporanStokSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib disertakan" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    // Fetch periode first
    const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });

    // 1. Fetch active ingredients, initial balance, mutasi, and latest prices (optimized Distinct)
    const [bahanList, saldoAwalList, mutasiList, latestMasukPrices] = await Promise.all([
      prisma.bahanPokok.findMany({ where: { aktif: true } }),
      prisma.saldoAwalBarang.findMany({ where: { periodeId } }),
      prisma.mutasiStok.groupBy({
        by: ["bahanPokokId", "jenis"],
        where: {
          tanggal: { gte: periode.tanggalMulai, lte: targetTanggal }
        },
        _sum: { qty: true }
      }),
      prisma.mutasiStok.findMany({
        where: {
          jenis: "MASUK",
          tanggal: { lte: targetTanggal }
        },
        orderBy: [
          { bahanPokokId: "asc" },
          { tanggal: "desc" },
          { createdAt: "desc" }
        ],
        distinct: ["bahanPokokId"],
        select: {
          bahanPokokId: true,
          hargaBeli: true
        }
      })
    ]);

    const saldoAwalMap = {};
    for (const s of saldoAwalList) {
      saldoAwalMap[s.bahanPokokId] = {
        qty: Number(s.saldoAwalQty),
        harga: Number(s.hargaBeliAwal)
      };
    }

    const mutasiMap = {};
    for (const m of mutasiList) {
      const bid = m.bahanPokokId;
      if (!mutasiMap[bid]) mutasiMap[bid] = { masuk: 0, keluar: 0 };
      if (m.jenis === "MASUK") {
        mutasiMap[bid].masuk = Number(m._sum.qty || 0);
      } else {
        mutasiMap[bid].keluar = Number(m._sum.qty || 0);
      }
    }

    const latestHargaMap = {};
    for (const m of latestMasukPrices) {
      latestHargaMap[m.bahanPokokId] = Number(m.hargaBeli);
    }

    const data = bahanList.map((bahan) => {
      const sa = saldoAwalMap[bahan.id] || { qty: 0, harga: 0 };
      const mut = mutasiMap[bahan.id] || { masuk: 0, keluar: 0 };
      const saldoAkhirQty = sa.qty + mut.masuk - mut.keluar;

      const hargaBeliTerakhir = latestHargaMap[bahan.id] !== undefined
        ? latestHargaMap[bahan.id]
        : sa.harga;

      return {
        bahanPokokId: bahan.id,
        nama: bahan.nama,
        satuan: bahan.satuan,
        saldoAwalQty: sa.qty,
        totalMasukQty: mut.masuk,
        totalKeluarQty: mut.keluar,
        saldoAkhirQty,
        hargaBeliTerakhir,
        nilaiStock: saldoAkhirQty * hargaBeliTerakhir
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses stock barang" });
  }
});

// GET /api/laporan/stock-barang/export-excel - Export Stock Barang ke Excel (.xlsx)
router.get("/export-excel", requireAuth, requirePermission("laporan-resmi", "EXPORT"), validate(laporanStokSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib disertakan" });
    }

    const targetTanggal = normalizeDateUTC(tanggal);
    if (isNaN(targetTanggal.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });

    const [bahanList, saldoAwalList, mutasiList, latestMasukPrices] = await Promise.all([
      prisma.bahanPokok.findMany({ where: { aktif: true } }),
      prisma.saldoAwalBarang.findMany({ where: { periodeId } }),
      prisma.mutasiStok.groupBy({
        by: ["bahanPokokId", "jenis"],
        where: { tanggal: { gte: periode.tanggalMulai, lte: targetTanggal } },
        _sum: { qty: true }
      }),
      prisma.mutasiStok.findMany({
        where: { jenis: "MASUK", tanggal: { lte: targetTanggal } },
        orderBy: [{ bahanPokokId: "asc" }, { tanggal: "desc" }, { createdAt: "desc" }],
        distinct: ["bahanPokokId"],
        select: { bahanPokokId: true, hargaBeli: true }
      })
    ]);

    const saldoAwalMap = {};
    for (const s of saldoAwalList) {
      saldoAwalMap[s.bahanPokokId] = { qty: Number(s.saldoAwalQty), harga: Number(s.hargaBeliAwal) };
    }
    const mutasiMap = {};
    for (const m of mutasiList) {
      const bid = m.bahanPokokId;
      if (!mutasiMap[bid]) mutasiMap[bid] = { masuk: 0, keluar: 0 };
      if (m.jenis === "MASUK") mutasiMap[bid].masuk = Number(m._sum.qty || 0);
      else mutasiMap[bid].keluar = Number(m._sum.qty || 0);
    }
    const latestHargaMap = {};
    for (const m of latestMasukPrices) {
      latestHargaMap[m.bahanPokokId] = Number(m.hargaBeli);
    }

    const data = bahanList.map((bahan) => {
      const sa = saldoAwalMap[bahan.id] || { qty: 0, harga: 0 };
      const mut = mutasiMap[bahan.id] || { masuk: 0, keluar: 0 };
      const saldoAkhirQty = sa.qty + mut.masuk - mut.keluar;
      const hargaBeliTerakhir = latestHargaMap[bahan.id] !== undefined ? latestHargaMap[bahan.id] : sa.harga;
      return {
        nama: bahan.nama,
        satuan: bahan.satuan,
        saldoAwalQty: sa.qty,
        totalMasukQty: mut.masuk,
        totalKeluarQty: mut.keluar,
        saldoAkhirQty,
        hargaBeliTerakhir,
        nilaiStock: saldoAkhirQty * hargaBeliTerakhir
      };
    });

    const buffer = await exportStockXlsx(data, { tanggal });
    const filename = `Stock-Barang-${tanggal}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }
    logger.error("[stock-barang/export-excel]", error);
    res.status(500).json({ error: "Gagal membuat Excel Stock Barang" });
  }
});

// GET /api/laporan/stock-barang/pdf — PDF Stock Barang
router.get("/pdf", requireAuth, requirePermission("laporan-resmi", "EXPORT"), validate(laporanStokSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggal } = req.query;
    if (!tanggal) return res.status(400).json({ error: "tanggal wajib disertakan" });
    const data = await getStockBarangData(periodeId, tanggal);
    const html = renderStockBarangHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Stock-Barang.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[stock-barang/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Stock Barang" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
