const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderGiziPemenuhanHtml } = require("../../templates/dokumen/giziPemenuhan");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { HARI_MAP } = require("../../lib/accountingHelper");
const { logger } = require("../../lib/logger");

const router = express.Router();

async function getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
  const whereClause = {};

  if (tanggalList && tanggalList.length > 0) {
    whereClause.tanggal = {
      in: tanggalList.map(d => new Date(d))
    };
  } else {
    whereClause.tanggal = {
      gte: new Date(tanggalMulai),
      lte: new Date(tanggalSelesai)
    };
  }

  whereClause.status = 'DISETUJUI';

  const menuHarianList = await prisma.menuHarian.findMany({
    where: whereClause,
    include: {
      blok: {
        include: {
          kelompokUmurMenu: {
            include: {
              kategoriPenerima: { select: { id: true, kode: true, nama: true, jenisPorsi: true } }
            }
          },
          targetGizi: true,
          menuItem: {
            include: {
              bahan: {
                include: {
                  bahanPokok: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { tanggal: "asc" }
  });

  if (!menuHarianList || menuHarianList.length === 0) {
    return [];
  }

  const periodeIds = Array.from(new Set(menuHarianList.map(m => m.periodeId)));

  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId: { in: periodeIds } },
    include: { detail: true, grupHari: true }
  });

  const reportData = menuHarianList.map(menu => {
    const day = new Date(menu.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    const inputsForDay = dayOfWeek
      ? activeInputs.filter(inp => inp.periodeId === menu.periodeId && (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
      : [];

    const porsiPerKategori = {};
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + ((det.lakiLaki || 0) + (det.perempuan || 0));
      }
    }

    let blocks = menu.blok;
    if (blokKode) {
      blocks = blocks.filter(b => b.kelompokUmurMenu?.kode === blokKode);
    }

    const mappedBloks = blocks.map(blok => {
      let totalPenerima = 0;
      for (const kat of (blok.kelompokUmurMenu?.kategoriPenerima || [])) {
        totalPenerima += (porsiPerKategori[kat.id] || 0);
      }

      const menuItems = (blok.menuItem || []).map(item => ({
        namaMenu: item.namaMenu,
        komponen: item.komponen
      }));

      let realisasiEnergi = 0;
      let realisasiProtein = 0;
      let realisasiLemak = 0;
      let realisasiKarbohidrat = 0;
      let realisasiSerat = 0;
      let totalBiaya = 0;

      (blok.menuItem || []).forEach(item => {
        (item.bahan || []).forEach(b => {
          realisasiEnergi += Number(b.energiKkal || 0);
          realisasiProtein += Number(b.proteinGr || 0);
          realisasiLemak += Number(b.lemakGr || 0);
          realisasiKarbohidrat += Number(b.karbohidratGr || 0);
          realisasiSerat += Number(b.seratGr || 0);
          totalBiaya += Number(b.totalHargaBahan || 0);
        });
      });

      const targetEnergi = Number(blok.targetGizi?.targetEnergi || 0);
      const targetProtein = Number(blok.targetGizi?.targetProtein || 0);
      const targetLemak = Number(blok.targetGizi?.targetLemak || 0);
      const targetKarbohidrat = Number(blok.targetGizi?.targetKarbohidrat || 0);
      const targetSerat = Number(blok.targetGizi?.targetSerat || 0);

      const calcPersen = (realisasi, target) => {
        if (!target || target <= 0) return 0;
        return Number(((realisasi / target) * 100).toFixed(2));
      };

      const gizi = [
        { key: 'energi', label: 'Energi', satuan: 'kkal', target: targetEnergi, realisasi: realisasiEnergi, persen: calcPersen(realisasiEnergi, targetEnergi) },
        { key: 'protein', label: 'Protein', satuan: 'g', target: targetProtein, realisasi: realisasiProtein, persen: calcPersen(realisasiProtein, targetProtein) },
        { key: 'lemak', label: 'Lemak', satuan: 'g', target: targetLemak, realisasi: realisasiLemak, persen: calcPersen(realisasiLemak, targetLemak) },
        { key: 'karbohidrat', label: 'Karbohidrat', satuan: 'g', target: targetKarbohidrat, realisasi: realisasiKarbohidrat, persen: calcPersen(realisasiKarbohidrat, targetKarbohidrat) },
        { key: 'serat', label: 'Serat', satuan: 'g', target: targetSerat, realisasi: realisasiSerat, persen: calcPersen(realisasiSerat, targetSerat) }
      ];

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        menu: menuItems,
        gizi,
        totalBiaya
      };
    });

    const formattedTanggal = menu.tanggal instanceof Date
      ? menu.tanggal.toISOString().split("T")[0]
      : String(menu.tanggal).split("T")[0];

    return {
      tanggal: formattedTanggal,
      status: menu.status,
      blok: mappedBloks
    };
  });

  return reportData;
}

// GET /api/gizi/laporan/pemenuhan-gizi - Laporan Pemenuhan Gizi Harian
router.get("/laporan/pemenuhan-gizi", requireAuth, requirePermission("gizi-laporan", "READ"), validate(schemas.laporanPemenuhanGiziQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan pemenuhan gizi" });
  }
});

// GET /api/gizi/laporan/pemenuhan-gizi/pdf - Download PDF Laporan Pemenuhan Gizi
router.get("/laporan/pemenuhan-gizi/pdf", requireAuth, requirePermission("gizi-laporan", "EXPORT"), validate(schemas.laporanPemenuhanGiziQuerySchema, "query"), async (req, res) => {
  let browser;
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const reportData = await getPemenuhanGiziData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

    const pdfMulai = tanggalMulai || (tanggalList.length > 0 ? tanggalList[0] : "");
    const pdfSelesai = tanggalSelesai || (tanggalList.length > 0 ? tanggalList[tanggalList.length - 1] : "");

    const tMulai = new Date(pdfMulai);
    const tSelesai = new Date(pdfSelesai);
    const targetPeriode = await prisma.periode.findFirst({
      where: {
        tanggalMulai: { lte: tSelesai },
        tanggalSelesai: { gte: tMulai }
      },
      orderBy: { tanggalMulai: "desc" },
      include: { setupLembaga: true }
    });

    let setupLembaga = targetPeriode?.setupLembaga;
    if (!setupLembaga) {
      setupLembaga = await prisma.setupLembaga.findFirst({ orderBy: { createdAt: "desc" } });
    }

    const lembaga = {
      namaLembaga: setupLembaga?.namaLembaga || "",
      alamat: setupLembaga?.alamat || "",
      namaKepalaSPPG: setupLembaga?.namaKepalaSPPG || ""
    };

    const namaGizi = req.user?.nama || req.user?.username || "";

    const html = renderGiziPemenuhanHtml({
      lembaga,
      namaGizi,
      tanggalMulai: pdfMulai,
      tanggalSelesai: pdfSelesai,
      data: reportData
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(await injectTtdImages(html), { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Pemenuhan-Gizi-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    logger.error("[laporan/pemenuhan-gizi/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Pemenuhan Gizi" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
