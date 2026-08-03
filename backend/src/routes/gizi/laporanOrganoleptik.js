const express = require("express");
const prisma = require("../../lib/prisma");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/gizi");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderGiziOrganoleptikHtml } = require("../../templates/dokumen/giziOrganoleptik");
const { injectTtdImages } = require("../../templates/dokumen/shared");
const { HARI_MAP } = require("../../lib/accountingHelper");

const router = express.Router();

async function getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList) {
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
          organoleptik: true,
          alergi: true
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

      const organoleptik = blok.organoleptik
        ? {
            rasa: blok.organoleptik.rasa || "",
            aroma: blok.organoleptik.aroma || "",
            tekstur: blok.organoleptik.tekstur || "",
            suhuSaji: blok.organoleptik.suhuSaji || "",
            catatan: blok.organoleptik.catatan || "",
            ujiPadaTanggal: blok.organoleptik.ujiPadaTanggal
              ? (blok.organoleptik.ujiPadaTanggal instanceof Date
                  ? blok.organoleptik.ujiPadaTanggal.toISOString().split("T")[0]
                  : String(blok.organoleptik.ujiPadaTanggal).split("T")[0])
              : "",
            jumlahOmpreng: blok.organoleptik.jumlahOmpreng ?? 1,
            tanggalMusnah: blok.organoleptik.tanggalMusnah
              ? (blok.organoleptik.tanggalMusnah instanceof Date
                  ? blok.organoleptik.tanggalMusnah.toISOString().split("T")[0]
                  : String(blok.organoleptik.tanggalMusnah).split("T")[0])
              : ""
          }
        : null;

      const alergi = (blok.alergi || []).map(a => ({
        jenisAlergi: a.jenisAlergi || "",
        jumlahSiswa: a.jumlahSiswa ?? 0,
        bahanPengganti: a.bahanPengganti || ""
      }));

      return {
        kelompokUmurKode: blok.kelompokUmurMenu?.kode || "",
        kelompokUmurNama: blok.kelompokUmurMenu?.nama || "",
        rentangUsia: blok.kelompokUmurMenu?.rentangUsia || "",
        porsi: totalPenerima,
        organoleptik,
        alergi
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

// GET /api/gizi/laporan/organoleptik - Laporan Uji Organoleptik & Keamanan Pangan JSON
router.get("/laporan/organoleptik", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanOrganoleptikQuerySchema, "query"), async (req, res) => {
  try {
    const { tanggalMulai, tanggalSelesai, blokKode } = req.query;
    const rawTanggal = req.query.tanggal;
    const tanggalList = Array.isArray(rawTanggal)
      ? rawTanggal.flatMap(s => String(s).split(',').map(x => x.trim())).filter(Boolean)
      : (rawTanggal ? String(rawTanggal).split(',').map(s => s.trim()).filter(Boolean) : []);

    if (tanggalList.length === 0 && !(tanggalMulai && tanggalSelesai)) {
      return res.status(400).json({ error: "Isi periode tanggal (mulai-selesai) atau pilih hari tertentu" });
    }

    const data = await getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[laporan/organoleptik]", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan uji organoleptik" });
  }
});

// GET /api/gizi/laporan/organoleptik/pdf - Download PDF Laporan Uji Organoleptik & Keamanan Pangan
router.get("/laporan/organoleptik/pdf", requireAuth, requireRole("AHLI_GIZI", "KEPALA_SPPG"), validate(schemas.laporanOrganoleptikQuerySchema, "query"), async (req, res) => {
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

    const reportData = await getOrganoleptikData(tanggalMulai, tanggalSelesai, blokKode, tanggalList);

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

    const html = renderGiziOrganoleptikHtml({
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
      "Content-Disposition": `inline; filename="Laporan-Uji-Organoleptik-${pdfMulai}-${pdfSelesai}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/organoleptik/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Uji Organoleptik & Keamanan Pangan" });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
