const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderGiziRekapMenuHtml } = require("../../templates/dokumen/giziRekapMenu");
const { HARI_MAP } = require("../../lib/accountingHelper");

const router = express.Router();

async function getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
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

  const KOMPONEN_ORDER = ['KARBOHIDRAT', 'LAUK_HEWANI', 'LAUK_NABATI', 'SAYUR', 'BUAH'];

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

      const rows = [];
      (blok.menuItem || []).forEach(item => {
        (item.bahan || []).forEach(b => {
          rows.push({
            komponen: item.komponen,
            namaMenu: item.namaMenu,
            bahan: b.bahanPokok?.nama || '',
            beratBersihGr: Number(b.beratBersihGr || 0),
            beratURT: b.beratURT || ''
          });
        });
      });

      rows.sort((a, b) => {
        const idxA = a.komponen ? KOMPONEN_ORDER.indexOf(a.komponen) : -1;
        const idxB = b.komponen ? KOMPONEN_ORDER.indexOf(b.komponen) : -1;
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        return orderA - orderB;
      });

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        rows
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

// GET /api/gizi/laporan/rekap-menu - Laporan Rekap Menu
router.get("/laporan/rekap-menu", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanRekapMenuQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan rekap menu" });
  }
});

// GET /api/gizi/laporan/rekap-menu/pdf - Download PDF Laporan Rekap Menu
router.get("/laporan/rekap-menu/pdf", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanRekapMenuQuerySchema, "query"), async (req, res) => {
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

    const reportData = await getRekapMenuData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

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

    const html = renderGiziRekapMenuHtml({
      lembaga,
      namaGizi,
      tanggalMulai: pdfMulai,
      tanggalSelesai: pdfSelesai,
      data: reportData
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Laporan-Rekap-Menu-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/rekap-menu/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Rekap Menu" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
