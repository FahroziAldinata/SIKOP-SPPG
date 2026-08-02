const express = require("express");
const prisma = require("../../lib/prisma");
const { validate } = require("../../middleware/validate");
const schemas = require("../../validators/aslap");
const { launchPuppeteer } = require("../../lib/launchPuppeteer");
const { renderAslapHarianHtml } = require("../../templates/dokumen/aslapHarian");
const { KATEGORI_PIC_SEKOLAH, KATEGORI_PIC_KADER } = require("../../constants/kategori");
const { getLembaga, authMiddleware } = require("./_helpers");

const router = express.Router();

async function getLaporanHarianAslapData(periodeId) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    include: { setupLembaga: true }
  });

  if (!periode) {
    throw new Error("[VALIDASI] Periode tidak ditemukan");
  }

  const formattedPeriode = {
    ...periode,
    tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
    tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
  };

  const grupHariList = await prisma.grupHari.findMany({
    where: { periodeId },
    include: {
      penerimaManfaat: {
        include: {
          detail: {
            include: {
              kategori: true,
              sekolah: true,
              posyandu: true
            }
          }
        }
      }
    },
    orderBy: { label: "asc" }
  });

  // Section B: NON_PESERTA_DIDIK — 1 blok untuk seluruh periode (group by periodeId)
  const allPmPeriode = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: {
      detail: {
        include: {
          kategori: true,
          sekolah: true,
          posyandu: true
        }
      }
    }
  });

  const allNonPesertaDetails = allPmPeriode.flatMap(pm => pm.detail || []).filter(d => d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK");
  const posyanduMapGlobal = new Map();
  let grandTotalBGlobal = 0;

  for (const d of allNonPesertaDetails) {
    const pId = d.posyanduId || "LAINNYA";
    const pNama = d.posyandu?.nama || "Lainnya / Non-Posyandu";

    if (!posyanduMapGlobal.has(pId)) {
      posyanduMapGlobal.set(pId, {
        id: pId,
        nama: pNama,
        kategoriMap: new Map(),
        total: 0,
        picKader: 0
      });
    }

    const posObj = posyanduMapGlobal.get(pId);
    const kKode = d.kategori?.kode || "UNKNOWN";
    const kNama = d.kategori?.nama || "Lainnya";

    if (!posObj.kategoriMap.has(kKode)) {
      posObj.kategoriMap.set(kKode, {
        kode: kKode,
        nama: kNama,
        urutan: d.kategori?.urutan ?? 999,
        l: 0,
        p: 0,
        total: 0
      });
    }

    const katObj = posObj.kategoriMap.get(kKode);
    const l = d.lakiLaki || 0;
    const p = d.perempuan || 0;
    const tot = l + p;

    katObj.l += l;
    katObj.p += p;
    katObj.total += tot;

    // Accumulate PIC kader (KADER_POSYANDU)
    if (KATEGORI_PIC_KADER.includes(kKode)) {
      posObj.picKader += tot;
    }

    posObj.total += tot;
    grandTotalBGlobal += tot;
  }

  const posyanduListGlobal = Array.from(posyanduMapGlobal.values()).map(p => {
    const kategoriArr = Array.from(p.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
    return {
      id: p.id,
      nama: p.nama,
      kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
      total: p.total,
      picKader: p.picKader
    };
  });

  const sesiBGlobal = {
    posyandu: posyanduListGlobal,
    grandTotal: grandTotalBGlobal
  };

  const grupHariResult = grupHariList.map(gh => {
    const allDetails = gh.penerimaManfaat.flatMap(pm => pm.detail || []);

    // Section A: PESERTA_DIDIK
    const detailsA = allDetails.filter(d => d.kategori?.jenisSasaran === "PESERTA_DIDIK");
    const sekolahMap = new Map();
    let grandTotalA = 0;

    for (const d of detailsA) {
      const sId = d.sekolahId || "LAINNYA";
      const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
      const sJenjang = d.sekolah?.jenjang || "-";

      if (!sekolahMap.has(sId)) {
        sekolahMap.set(sId, {
          id: sId,
          nama: sNama,
          jenjang: sJenjang,
          kategoriMap: new Map(),
          total: 0,
          lkPic: 0,
          pPic: 0
        });
      }

      const sekObj = sekolahMap.get(sId);
      const kKode = d.kategori?.kode || "UNKNOWN";
      const kNama = d.kategori?.nama || "Lainnya";

      if (!sekObj.kategoriMap.has(kKode)) {
        sekObj.kategoriMap.set(kKode, {
          kode: kKode,
          nama: kNama,
          urutan: d.kategori?.urutan ?? 999,
          l: 0,
          p: 0,
          total: 0
        });
      }

      const katObj = sekObj.kategoriMap.get(kKode);
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      katObj.l += l;
      katObj.p += p;
      katObj.total += tot;

      // Accumulate PIC counts (PENDIDIK + TENAGA_KEPENDIDIKAN)
      if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
        sekObj.lkPic += l;
        sekObj.pPic += p;
      }

      sekObj.total += tot;
      grandTotalA += tot;
    }

    const sekolahList = Array.from(sekolahMap.values()).map(s => {
      const kategoriArr = Array.from(s.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
      return {
        id: s.id,
        nama: s.nama,
        jenjang: s.jenjang,
        kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
        total: s.total,
        lkPic: s.lkPic,
        pPic: s.pPic,
        jmlPic: s.lkPic + s.pPic
      };
    });

    return {
      id: gh.id,
      label: gh.label,
      hariAktif: gh.hariAktif,
      sesiA: {
        sekolah: sekolahList,
        grandTotal: grandTotalA
      },
      sesiB: sesiBGlobal
    };
  });

  return {
    periode: formattedPeriode,
    grupHari: grupHariResult,
    sesiB: sesiBGlobal
  };
}

// LAPORAN HARIAN ASLAP (PENERIMA MANFAAT PER GRUP HARI)
router.get(["/laporan/harian", "/api/aslap/laporan/harian"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanHarianSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const periode = await prisma.periode.findUnique({
      where: { id: periodeId },
      include: { setupLembaga: true }
    });

    if (!periode) {
      return res.status(404).json({ error: "Periode tidak ditemukan" });
    }

    const formattedPeriode = {
      ...periode,
      tanggalMulai: periode.tanggalMulai ? periode.tanggalMulai.toISOString().split("T")[0] : null,
      tanggalSelesai: periode.tanggalSelesai ? periode.tanggalSelesai.toISOString().split("T")[0] : null
    };

    const grupHariList = await prisma.grupHari.findMany({
      where: { periodeId },
      include: {
        penerimaManfaat: {
          include: {
            detail: {
              include: {
                kategori: true,
                sekolah: true,
                posyandu: true
              }
            }
          }
        }
      },
      orderBy: { label: "asc" }
    });

    // Section B: NON_PESERTA_DIDIK — 1 blok untuk seluruh periode (group by periodeId)
    const allPmPeriode = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: {
        detail: {
          include: {
            kategori: true,
            sekolah: true,
            posyandu: true
          }
        }
      }
    });

    const allNonPesertaDetails = allPmPeriode.flatMap(pm => pm.detail || []).filter(d => d.kategori?.jenisSasaran === "NON_PESERTA_DIDIK");
    const posyanduMapGlobal = new Map();
    let grandTotalBGlobal = 0;

    for (const d of allNonPesertaDetails) {
      const pId = d.posyanduId || "LAINNYA";
      const pNama = d.posyandu?.nama || "Lainnya / Non-Posyandu";

      if (!posyanduMapGlobal.has(pId)) {
        posyanduMapGlobal.set(pId, {
          id: pId,
          nama: pNama,
          kategoriMap: new Map(),
          total: 0,
          picKader: 0
        });
      }

      const posObj = posyanduMapGlobal.get(pId);
      const kKode = d.kategori?.kode || "UNKNOWN";
      const kNama = d.kategori?.nama || "Lainnya";

      if (!posObj.kategoriMap.has(kKode)) {
        posObj.kategoriMap.set(kKode, {
          kode: kKode,
          nama: kNama,
          urutan: d.kategori?.urutan ?? 999,
          l: 0,
          p: 0,
          total: 0
        });
      }

      const katObj = posObj.kategoriMap.get(kKode);
      const l = d.lakiLaki || 0;
      const p = d.perempuan || 0;
      const tot = l + p;

      katObj.l += l;
      katObj.p += p;
      katObj.total += tot;

      // Accumulate PIC kader (KADER_POSYANDU)
      if (KATEGORI_PIC_KADER.includes(kKode)) {
        posObj.picKader += tot;
      }

      posObj.total += tot;
      grandTotalBGlobal += tot;
    }

    const posyanduListGlobal = Array.from(posyanduMapGlobal.values()).map(p => {
      const kategoriArr = Array.from(p.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
      return {
        id: p.id,
        nama: p.nama,
        kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
        total: p.total,
        picKader: p.picKader
      };
    });

    const sesiBGlobal = {
      posyandu: posyanduListGlobal,
      grandTotal: grandTotalBGlobal
    };

    const grupHariResult = grupHariList.map(gh => {
      const allDetails = gh.penerimaManfaat.flatMap(pm => pm.detail || []);

      // Section A: PESERTA_DIDIK
      const detailsA = allDetails.filter(d => d.kategori?.jenisSasaran === "PESERTA_DIDIK");
      const sekolahMap = new Map();
      let grandTotalA = 0;

      for (const d of detailsA) {
        const sId = d.sekolahId || "LAINNYA";
        const sNama = d.sekolah?.nama || "Lainnya / Tanpa Sekolah";
        const sJenjang = d.sekolah?.jenjang || "-";

        if (!sekolahMap.has(sId)) {
          sekolahMap.set(sId, {
            id: sId,
            nama: sNama,
            jenjang: sJenjang,
            kategoriMap: new Map(),
            total: 0,
            lkPic: 0,
            pPic: 0
          });
        }

        const sekObj = sekolahMap.get(sId);
        const kKode = d.kategori?.kode || "UNKNOWN";
        const kNama = d.kategori?.nama || "Lainnya";

        if (!sekObj.kategoriMap.has(kKode)) {
          sekObj.kategoriMap.set(kKode, {
            kode: kKode,
            nama: kNama,
            urutan: d.kategori?.urutan ?? 999,
            l: 0,
            p: 0,
            total: 0
          });
        }

        const katObj = sekObj.kategoriMap.get(kKode);
        const l = d.lakiLaki || 0;
        const p = d.perempuan || 0;
        const tot = l + p;

        katObj.l += l;
        katObj.p += p;
        katObj.total += tot;

        // Accumulate PIC counts (PENDIDIK + TENAGA_KEPENDIDIKAN)
        if (KATEGORI_PIC_SEKOLAH.includes(kKode)) {
          sekObj.lkPic += l;
          sekObj.pPic += p;
        }

        sekObj.total += tot;
        grandTotalA += tot;
      }

      const sekolahList = Array.from(sekolahMap.values()).map(s => {
        const kategoriArr = Array.from(s.kategoriMap.values()).sort((a, b) => a.urutan - b.urutan);
        return {
          id: s.id,
          nama: s.nama,
          jenjang: s.jenjang,
          kategori: kategoriArr.map(({ kode, nama, l, p, total }) => ({ kode, nama, l, p, total })),
          total: s.total,
          lkPic: s.lkPic,
          pPic: s.pPic,
          jmlPic: s.lkPic + s.pPic
        };
      });

      return {
        id: gh.id,
        label: gh.label,
        hariAktif: gh.hariAktif,
        sesiA: {
          sekolah: sekolahList,
          grandTotal: grandTotalA
        },
        sesiB: sesiBGlobal
      };
    });

    res.json({
      success: true,
      data: {
        periode: formattedPeriode,
        grupHari: grupHariResult,
        sesiB: sesiBGlobal
      }
    });
  } catch (error) {
    console.error("Error get laporan harian aslap:", error);
    res.status(500).json({ error: "Terjadi kesalahan server saat mengambil laporan harian aslap" });
  }
});

// GET /api/aslap/laporan/harian/pdf - PDF Laporan Harian
router.get(["/laporan/harian/pdf", "/api/aslap/laporan/harian/pdf"], authMiddleware(["ASLAP", "KEPALA_SPPG", "AHLI_GIZI", "AKUNTAN"]), validate(schemas.laporanHarianSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getLaporanHarianAslapData(periodeId);
    const lembaga = await getLembaga(periodeId);
    const html = renderAslapHarianHtml({
      ...data,
      lembaga,
      namaAslap: req.user?.nama || req.user?.username || ""
    });

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Harian-${periodeId}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[laporan/harian/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Harian";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
