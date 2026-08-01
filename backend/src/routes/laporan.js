const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  laporanBkuSchema,
  laporanArusKasSchema,
  laporanNeracaSchema,
  laporanStokSchema,
  laporanAnggaranSchema,
  laporanRekapSchema,
  laporanParamsSchema,
  laporanBpSchema,
  laporanLpaSchema,
  laporanBapsdSchema,
  laporanKebutuhanBelanjaSchema,
  laporanHarianSchema,
  laporanMultiPeriodeSchema,
  laporanBttSchema,
  laporanLbbpSchema,
  laporanBkkSchema
} = require("../validators/laporan");
const { launchPuppeteer } = require("../lib/launchPuppeteer");
const { exportBkuXlsx, exportLraXlsx, exportStockXlsx } = require("../lib/exportExcel");
const { renderLpaHtml } = require("../templates/dokumen/lpa");
const { renderSptjHtml } = require("../templates/dokumen/sptj");
const { renderBapsdHtml } = require("../templates/dokumen/bapsd");
const { renderBkuHtml } = require("../templates/dokumen/bku");
const { renderCatatanHtml } = require("../templates/dokumen/catatan");
const { renderBpHtml } = require("../templates/dokumen/bp");
const { renderLaporanHarianHtml } = require("../templates/dokumen/laporanHarian");
const { renderLraHtml } = require("../templates/dokumen/lra");
const { renderLpd2mHtml } = require("../templates/dokumen/lpd2m");
const { renderNeracaSaldoHtml } = require("../templates/dokumen/neracaSaldo");
const { renderStockBarangHtml } = require("../templates/dokumen/stockBarang");
const { renderKebutuhanBelanjaHtml } = require("../templates/dokumen/kebutuhanBelanja");
const { renderPerPeriodeHtml } = require("../templates/dokumen/perPeriode");
const { renderPerBulanHtml } = require("../templates/dokumen/perBulan");
const { renderBttHtml, formatTerbilang } = require("../templates/dokumen/btt");
const { renderLbbpHtml } = require("../templates/dokumen/lbbp");
const { renderBkkHtml } = require("../templates/dokumen/bkk");
const { normalizeDateUTC, HARI_MAP, getTotalPorsiBlok } = require("../lib/accountingHelper");

const router = express.Router();

// Jabatan Kepala SPPG — satu sumber kebenaran, dipakai di /lpa dan /lpa/pdf
const JABATAN_KEPALA_SPPG = "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan";



async function getRealisasiPeriode(periodeId, kategoriDana) {
  const agg = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana },
    _sum: { rab: true, aktual: true },
  });
  return {
    diajukan: Number(agg._sum.rab || 0),
    terealisasi: Number(agg._sum.aktual || 0),
    sisa: Number(agg._sum.rab || 0) - Number(agg._sum.aktual || 0)
  };
}



async function getBkuData(periodeId) {
  const [lembaga, periode, saldoAwalKasList, jurnal] = await Promise.all([
    prisma.setupLembaga.findFirst({ where: { periodeId } }),
    prisma.periode.findUnique({ where: { id: periodeId } }),
    prisma.saldoAwalPeriode.findMany({
      where: { periodeId, akun: { tipe: "KAS" } },
      include: { akun: true },
    }),
    prisma.jurnalTransaksi.findMany({
      where: { periodeId },
      orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
      include: { akunKas: true, akunDanaBiaya: true },
    }),
  ]);

  if (!lembaga || !periode) {
    return null;
  }

  let sisaDanaLalu = 0;
  let saldoBank = 0;
  let saldoTunai = 0;

  saldoAwalKasList.forEach((sa) => {
    const val = Number(sa.saldoAwal || 0);
    sisaDanaLalu += val;
    const namaAkun = (sa.akun?.nama || '').toLowerCase();
    const kodeAkun = sa.akun?.kode || '';
    if (namaAkun.includes('bank') || kodeAkun === '1101') {
      saldoBank += val;
    } else {
      saldoTunai += val;
    }
  });

  let danaDiterimaSaatIni = 0;
  let biayaBahanBaku = 0;
  let biayaOperasional = 0;
  let biayaInsentifFasilitas = 0;
  let biayaLainnya = 0;

  let saldo = sisaDanaLalu;

  const transaksi = jurnal.map((row) => {
    const debet = row.jenis === "MASUK" ? Number(row.nominal) : 0;
    const kredit = row.jenis === "KELUAR" ? Number(row.nominal) : 0;
    saldo = saldo + debet - kredit;

    if (row.jenis === "MASUK") {
      danaDiterimaSaatIni += debet;
    } else if (row.jenis === "KELUAR") {
      const kat = row.akunDanaBiaya?.kategoriDana;
      if (kat === "BAHAN_MAKANAN") {
        biayaBahanBaku += kredit;
      } else if (kat === "OPERASIONAL") {
        biayaOperasional += kredit;
      } else if (kat === "INSENTIF_FASILITAS") {
        biayaInsentifFasilitas += kredit;
      } else {
        biayaLainnya += kredit;
      }
    }

    const namaKas = (row.akunKas?.nama || '').toLowerCase();
    const kodeKas = row.akunKas?.kode || '';
    const delta = debet - kredit;
    if (namaKas.includes('bank') || kodeKas === '1101') {
      saldoBank += delta;
    } else {
      saldoTunai += delta;
    }

    return {
      id: row.id,
      bulan: row.tanggal.getUTCMonth() + 1,
      tanggal: row.tanggal.toISOString().split("T")[0],
      noBukti: row.nomorBukti,
      kodeAkun: row.akunDanaBiaya?.kode || row.akunKas?.kode || "—",
      uraian: row.uraian,
      debet,
      kredit,
      saldoBerjalan: saldo,
      jumlah: kredit,
      sumberKas: row.akunKas?.nama || ""
    };
  });

  const totalPengeluaran = biayaBahanBaku + biayaOperasional + biayaInsentifFasilitas + biayaLainnya;
  const sisaDanaSaatIni = (sisaDanaLalu + danaDiterimaSaatIni) - totalPengeluaran;

  return {
    ringkasan: {
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
      namaKepalaSPPG: lembaga.namaKepalaSPPG,
      namaAkuntanSPPG: lembaga.namaAkuntanSPPG,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      sisaDanaLalu,
      danaDiterimaSaatIni,
      danaTersedia: sisaDanaLalu + danaDiterimaSaatIni,
      biayaBahanBaku,
      biayaOperasional,
      biayaInsentifFasilitas,
      biayaLainnya,
      totalPengeluaran,
      sisaDanaSaatIni,
      saldoBank,
      saldoTunai,
      totalKas: saldoBank + saldoTunai
    },
    transaksi
  };
}

// GET /api/laporan/bku - Buku Kas Umum
router.get("/bku", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BKU" });
  }
});

// GET /api/laporan/bku/pdf - Render BKU sebagai PDF
router.get("/bku/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    const html = renderBkuHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BKU-${data.ringkasan.periodeLabel.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[bku/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BKU" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bku/export-excel - Export BKU ke Excel (.xlsx)
router.get("/bku/export-excel", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }
    const buffer = await exportBkuXlsx(data);
    const filename = `BKU-${(data.ringkasan.periodeLabel || periodeId).replace(/[\/\s]/g, '-')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    console.error("[bku/export-excel]", error);
    res.status(500).json({ error: "Gagal membuat Excel BKU" });
  }
});

// GET /api/laporan/catatan/pdf - Render Catatan Pengeluaran Bulanan sebagai PDF
router.get("/catatan/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBkuSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getBkuData(periodeId);
    if (!data) {
      return res.status(404).json({ error: "Setup lembaga atau periode tidak ditemukan" });
    }

    const html = renderCatatanHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Catatan-${data.ringkasan.periodeLabel.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[catatan/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Catatan" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bp - Buku Pembantu per Akun
router.get("/bp", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBpSchema, "query"), async (req, res) => {
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

// =============================================================================
// BUKU PEMBANTU (BP) — helper + 4 data routes + 4 PDF routes
// =============================================================================

/**
 * Helper: ambil data buku pembantu untuk sekumpulan akun yang cocok dengan filterAkun.
 * @param {string} periodeId
 * @param {object} filterAkun - Prisma where-clause untuk model Akun
 * @param {string} namaAkunLabel - label hardcode untuk namaAkun di response
 * @param {string} jenisPembantu - label jenis, mis. "Kas", "Bahan Baku"
 * @param {boolean} showKeterangan - apakah sumberKas diisi (true untuk non-kas)
 */
async function getBpData(periodeId, filterAkun, namaAkunLabel, jenisPembantu, showKeterangan) {
  const [lembaga, akunList] = await Promise.all([
    prisma.setupLembaga.findFirst({ where: { periodeId } }),
    prisma.akun.findMany({ where: { ...filterAkun, aktif: true } }),
  ]);

  if (!lembaga || !akunList.length) return null;

  const akunIds = akunList.map((a) => a.id);

  // Saldo awal = SUM semua SaldoAwalPeriode akun yang match
  const saldoAwalAgg = await prisma.saldoAwalPeriode.aggregate({
    where: { periodeId, akunId: { in: akunIds } },
    _sum: { saldoAwal: true },
  });
  const saldoAwalVal = Number(saldoAwalAgg._sum.saldoAwal || 0);

  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: {
      periodeId,
      OR: [{ akunKasId: { in: akunIds } }, { akunDanaBiayaId: { in: akunIds } }],
    },
    orderBy: [{ tanggal: "asc" }, { nomorBukti: "asc" }],
    include: { akunKas: true, akunDanaBiaya: true },
  });

  let saldo = saldoAwalVal;

  const data = jurnal.map((row) => {
    // Tentukan akun mana yang match
    const kasMatch = akunIds.includes(row.akunKasId);
    const dbMatch = akunIds.includes(row.akunDanaBiayaId);

    // Akun yang match dan tipenya
    const matchedAkun = kasMatch ? row.akunKas : row.akunDanaBiaya;
    const tipe = matchedAkun?.tipe;

    // Arah debet/kredit:
    // KAS atau DANA: MASUK→debet, KELUAR→kredit
    // BIAYA: KELUAR→debet, MASUK→kredit (dibalik)
    let debet = 0;
    let kredit = 0;
    if (tipe === "BIAYA") {
      debet = row.jenis === "KELUAR" ? Number(row.nominal) : 0;
      kredit = row.jenis === "MASUK" ? Number(row.nominal) : 0;
    } else {
      debet = row.jenis === "MASUK" ? Number(row.nominal) : 0;
      kredit = row.jenis === "KELUAR" ? Number(row.nominal) : 0;
    }

    saldo = saldo + debet - kredit;

    // sumberKas = nama akun lawan (akun yang TIDAK match)
    let sumberKas = "";
    if (showKeterangan) {
      sumberKas = kasMatch ? (row.akunDanaBiaya?.nama || "") : (row.akunKas?.nama || "");
    }

    return {
      tanggal: row.tanggal.toISOString().split("T")[0],
      noBukti: row.nomorBukti,
      uraian: row.uraian,
      debet,
      kredit,
      saldoBerjalan: saldo,
      sumberKas,
    };
  });

  return {
    saldoAwal: saldoAwalVal,
    saldoAkhir: saldo,
    namaAkun: namaAkunLabel,
    jenisPembantu,
    identitas: { namaLembaga: lembaga.namaLembaga, alamat: lembaga.alamat },
    data,
  };
}

// Definisi 4 BP endpoint
const BP_CONFIGS = [
  {
    path: "kas",
    filterAkun: { tipe: "KAS" },
    namaAkunLabel: "Petty Cash/Cash in Hand",
    jenisPembantu: "Kas",
    showKeterangan: false,
  },
  {
    path: "bahan-baku",
    filterAkun: { kategoriDana: "BAHAN_MAKANAN" },
    namaAkunLabel: "Dana & Biaya Bahan Baku",
    jenisPembantu: "Bahan Baku",
    showKeterangan: true,
  },
  {
    path: "operasional",
    filterAkun: { kategoriDana: "OPERASIONAL" },
    namaAkunLabel: "Dana & Biaya Operasional",
    jenisPembantu: "Operasional",
    showKeterangan: true,
  },
  {
    path: "fasilitas",
    filterAkun: { kategoriDana: "INSENTIF_FASILITAS" },
    namaAkunLabel: "Dana & Biaya Insentif Fasilitas",
    jenisPembantu: "Insentif Fasilitas",
    showKeterangan: true,
  },
];

// Daftarkan 4 data route + 4 PDF route secara dinamis
for (const cfg of BP_CONFIGS) {
  // Data route: GET /api/laporan/bp/:path
  router.get(`/bp/${cfg.path}`, requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
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
  router.get(`/bp/${cfg.path}/pdf`, requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
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

async function getNeracaSaldoData(periodeId) {
  const akunList = await prisma.akun.findMany({ where: { aktif: true }, orderBy: { kode: "asc" } });

  const result = await Promise.all(
    akunList.map(async (akun) => {
      const saldoAwalRow = await prisma.saldoAwalPeriode.findUnique({
        where: { periodeId_akunId: { periodeId, akunId: akun.id } },
      });
      const saldoAwal = Number(saldoAwalRow?.saldoAwal || 0);

      const jurnal = await prisma.jurnalTransaksi.findMany({
        where: {
          periodeId,
          OR: [{ akunKasId: akun.id }, { akunDanaBiayaId: akun.id }],
        },
      });

      let totalDebet = 0;
      let totalKredit = 0;

      for (const row of jurnal) {
        const nominal = Number(row.nominal);
        // BIAYA: KELUAR→debet, MASUK→kredit; semua tipe lain (KAS/DANA/PAJAK): MASUK→debet, KELUAR→kredit
        let debet = 0;
        let kredit = 0;
        if (akun.tipe === "BIAYA") {
          debet = row.jenis === "KELUAR" ? nominal : 0;
          kredit = row.jenis === "MASUK" ? nominal : 0;
        } else {
          debet = row.jenis === "MASUK" ? nominal : 0;
          kredit = row.jenis === "KELUAR" ? nominal : 0;
        }
        totalDebet += debet;
        totalKredit += kredit;
      }

      return {
        kode: akun.kode,
        nama: akun.nama,
        tipe: akun.tipe,
        saldoAwal,
        totalDebet,
        totalKredit,
        saldoAkhir: saldoAwal + totalDebet - totalKredit,
      };
    })
  );

  // Verifikasi: totalDana - totalBiaya harus == saldo akun KAS (1101+1102)
  const kasAkhir = result
    .filter((a) => a.tipe === "KAS")
    .reduce((s, a) => s + a.saldoAkhir, 0);
  const totalDana = result
    .filter((a) => a.tipe === "DANA")
    .reduce((s, a) => s + a.saldoAkhir, 0);
  const totalBiaya = result
    .filter((a) => a.tipe === "BIAYA")
    .reduce((s, a) => s + a.saldoAkhir, 0);

  const selisih = totalDana - totalBiaya - kasAkhir;
  const danaBiayaCocok = Math.abs(selisih) < 0.01;

  return {
    akun: result,
    verifikasi: {
      danaBiayaCocok,
      pesan: danaBiayaCocok
        ? "✅ Oke, Cocok"
        : `❌ Selisih Rp${selisih.toLocaleString("id-ID")} (Dana–Biaya ≠ Saldo Kas)`,
    },
  };
}

// GET /api/laporan/neraca-saldo
router.get("/neraca-saldo", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanNeracaSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const data = await getNeracaSaldoData(periodeId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[neraca-saldo]", error);
    res.status(500).json({ error: "Gagal mengambil data Neraca Saldo" });
  }
});

// GET /api/laporan/neraca-saldo/pdf
router.get("/neraca-saldo/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanNeracaSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const data = await getNeracaSaldoData(periodeId);
    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });

    const html = renderNeracaSaldoHtml({
      akun: data.akun,
      verifikasi: data.verifikasi,
      identitas: {
        namaLembaga: lembaga?.namaLembaga || '',
        alamat: lembaga?.alamat || '',
        namaAkuntan: lembaga?.namaAkuntanSPPG || '',
        namaKepala: lembaga?.namaKepalaSPPG || '',
      },
    });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Neraca-Saldo.pdf"',
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[neraca-saldo/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Neraca Saldo" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/lpa - Laporan Penggunaan Anggaran
router.get("/lpa", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLpaSchema, "query"), async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat LPA" });
  }
});

// GET /api/laporan/lpa/pdf - Render LPA sebagai PDF (inline, buka di tab baru)
router.get("/lpa/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanLpaSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen, isLr } = req.query;
    const isLrBool = isLr === 'true';
    if (!isLrBool && !nomorDokumen) {
      return res.status(400).json({ error: "nomorDokumen wajib disertakan" });
    }

    // === Ambil data (logika identik dengan GET /lpa) ===
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
    await page.setContent(html, { waitUntil: "networkidle0" });
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
    console.error("[lpa/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF LPA" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/sptj - Surat Pernyataan Tanggung Jawab
router.get("/sptj", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    res.json({
      success: true,
      data: {
        namaPejabat: lembaga.namaKepalaSPPG,
        jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
        jumlahPenerimaan,
        jumlahPengeluaran,
        sisaDana: jumlahPenerimaan - jumlahPengeluaran,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        tahunAnggaran: lembaga.tahunAnggaran,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat SPTJ" });
  }
});

// GET /api/laporan/sptj/pdf - Render SPTJ sebagai PDF
router.get("/sptj/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const agg = await prisma.anggaranHarian.aggregate({
      where: { periodeId },
      _sum: { rab: true, aktual: true },
    });

    const jumlahPenerimaan = Number(agg._sum.rab || 0);
    const jumlahPengeluaran = Number(agg._sum.aktual || 0);

    const data = {
      namaPejabat: lembaga.namaKepalaSPPG,
      jabatan: "Kepala SPPG " + lembaga.namaLembaga.replace(/^SPPG\s*/i, ""),
      jumlahPenerimaan,
      jumlahPengeluaran,
      sisaDana: jumlahPenerimaan - jumlahPengeluaran,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      tahunAnggaran: lembaga.tahunAnggaran,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
    };

    const html = renderSptjHtml(data);

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="SPTJ-${periodeId}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[sptj/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF SPTJ" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/bapsd - Berita Acara Pengalihan Sisa Dana
router.get("/bapsd", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBapsdSchema, "query"), async (req, res) => {
  try {
    const { periodeId, nomorDokumen } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincianSisa = [
      { label: "Dana Bahan Baku", sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Dana Operasional", sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Dana Insentif Fasilitas", sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];
    const sisaDana = rincianSisa.reduce((acc, r) => acc + r.sisa, 0);

    res.json({
      success: true,
      data: {
        nomorDokumen,
        periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
        sisaDana,
        rincianSisa,
        tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
        namaYayasan: lembaga.namaYayasan,
        ketuaYayasan: lembaga.ketuaYayasan,
        namaAkuntan: lembaga.namaAkuntanSPPG,
        namaPejabat: lembaga.namaKepalaSPPG,
        tempatPelaporan: lembaga.tempatPelaporan,
        tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
        namaLembaga: lembaga.namaLembaga,
        alamat: lembaga.alamat,
        nomorRekeningVA: lembaga.nomorRekeningVA,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat membuat BAPSD" });
  }
});

// GET /api/laporan/bapsd/pdf - Render BAPSD sebagai PDF
router.get("/bapsd/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBapsdSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, nomorDokumen } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
    if (!lembaga) return res.status(404).json({ error: "Setup lembaga tidak ditemukan" });

    const rincianAgg = await Promise.all([
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "BAHAN_MAKANAN" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "OPERASIONAL" }, _sum: { rab: true, aktual: true } }),
      prisma.anggaranHarian.aggregate({ where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" }, _sum: { rab: true, aktual: true } }),
    ]);

    const rincianSisa = [
      { label: "Dana Bahan Baku", sisa: Number(rincianAgg[0]._sum.rab || 0) - Number(rincianAgg[0]._sum.aktual || 0) },
      { label: "Dana Operasional", sisa: Number(rincianAgg[1]._sum.rab || 0) - Number(rincianAgg[1]._sum.aktual || 0) },
      { label: "Dana Insentif Fasilitas", sisa: Number(rincianAgg[2]._sum.rab || 0) - Number(rincianAgg[2]._sum.aktual || 0) },
    ];
    const sisaDana = rincianSisa.reduce((acc, r) => acc + r.sisa, 0);

    const data = {
      nomorDokumen,
      periodeLabel: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
      sisaDana,
      rincianSisa,
      tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? lembaga.awalPeriodeBerikutnya.toISOString().split("T")[0] : null,
      namaYayasan: lembaga.namaYayasan,
      ketuaYayasan: lembaga.ketuaYayasan,
      namaAkuntan: lembaga.namaAkuntanSPPG,
      namaPejabat: lembaga.namaKepalaSPPG,
      tempatPelaporan: lembaga.tempatPelaporan,
      tanggalPelaporan: lembaga.tanggalPelaporan ? lembaga.tanggalPelaporan.toISOString().split("T")[0] : null,
      namaLembaga: lembaga.namaLembaga,
      alamat: lembaga.alamat,
      nomorRekeningVA: lembaga.nomorRekeningVA,
    };

    const html = renderBapsdHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BAPSD-${nomorDokumen.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[bapsd/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BAPSD" });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/kebutuhan-belanja-bahan - Kebutuhan Belanja Bahan
router.get("/kebutuhan-belanja-bahan", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanKebutuhanBelanjaSchema, "query"), async (req, res) => {
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

// GET /api/laporan/per-periode - Laporan Per Periode (Pendidikan & Posyandu)
router.get("/per-periode", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const details = await prisma.anggaranBahanMakananDetail.findMany({
      where: { anggaranHarian: { periodeId } },
      include: { kategori: true }
    });

    let rabPendidikan = 0;
    let rabPosyandu = 0;

    for (const det of details) {
      const subtotal = Number(det.jumlahPaket) * Number(det.hargaSatuan);
      if (det.kategori.jenisSasaran === "PESERTA_DIDIK") {
        rabPendidikan += subtotal;
      } else {
        rabPosyandu += subtotal;
      }
    }

    const bahanAgg = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
      _sum: { aktual: true }
    });
    const totalAktualBahan = Number(bahanAgg._sum.aktual || 0);

    const totalRabBahan = rabPendidikan + rabPosyandu;
    const rasioPendidikan = totalRabBahan > 0 ? rabPendidikan / totalRabBahan : 0;
    const aktualPendidikan = totalAktualBahan * rasioPendidikan;
    const aktualPosyandu = totalAktualBahan * (1 - rasioPendidikan);

    const operasional = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "OPERASIONAL" },
      _sum: { rab: true, aktual: true }
    });
    const sewa = await prisma.anggaranHarian.aggregate({
      where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
      _sum: { rab: true, aktual: true }
    });

    res.json({
      success: true,
      data: {
        bahanMakanan: {
          pendidikan: {
            rab: rabPendidikan,
            aktual: aktualPendidikan,
            selisih: rabPendidikan - aktualPendidikan,
            metodeAlokasi: "PROPORSIONAL_RAB"
          },
          posyandu: {
            rab: rabPosyandu,
            aktual: aktualPosyandu,
            selisih: rabPosyandu - aktualPosyandu,
            metodeAlokasi: "PROPORSIONAL_RAB"
          }
        },
        operasional: {
          rab: Number(operasional._sum.rab || 0),
          aktual: Number(operasional._sum.aktual || 0),
          selisih: Number(operasional._sum.rab || 0) - Number(operasional._sum.aktual || 0)
        },
        insentifFasilitas: {
          rab: Number(sewa._sum.rab || 0),
          aktual: Number(sewa._sum.aktual || 0),
          selisih: Number(sewa._sum.rab || 0) - Number(sewa._sum.aktual || 0)
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per periode" });
  }
});

// GET /api/laporan/per-bulan - Laporan Per Bulan
router.get("/per-bulan", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const jurnal = await prisma.jurnalTransaksi.findMany({
      where: { periodeId },
      orderBy: { tanggal: "asc" }
    });

    const dataBulanan = {};
    for (const row of jurnal) {
      const month = row.tanggal.getUTCMonth() + 1;
      const year = row.tanggal.getUTCFullYear();
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!dataBulanan[key]) {
        dataBulanan[key] = { key, year, month, totalMasuk: 0, totalKeluar: 0 };
      }
      if (row.jenis === "MASUK") {
        dataBulanan[key].totalMasuk += Number(row.nominal);
      } else {
        dataBulanan[key].totalKeluar += Number(row.nominal);
      }
    }

    res.json({
      success: true,
      data: Object.values(dataBulanan).sort((a, b) => a.key.localeCompare(b.key))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses laporan per bulan" });
  }
});

// GET /api/laporan/stock-barang - Laporan Stock Barang (Persediaan)
router.get("/stock-barang", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanStokSchema, "query"), async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses stock barang" });
  }
});
// GET /api/laporan/stock-barang/export-excel - Export Stock Barang ke Excel (.xlsx)
router.get("/stock-barang/export-excel", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanStokSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;
    if (!tanggal) {
      return res.status(400).json({ error: "tanggal wajib disertakan" });
    }

    const { normalizeDateUTC } = require("../lib/accountingHelper");
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
    console.error("[stock-barang/export-excel]", error);
    res.status(500).json({ error: "Gagal membuat Excel Stock Barang" });
  }
});

// GET /api/laporan/ringkasan-anggaran?periodeId=X
router.get("/ringkasan-anggaran", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  try {
    const { periodeId } = req.query;

    const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const KATEGORI = [
      { key: "BAHAN_MAKANAN",      label: "BAHAN MAKANAN" },
      { key: "OPERASIONAL",        label: "OPERASIONAL" },
      { key: "INSENTIF_FASILITAS", label: "INSENTIF FASILITAS (SEWA)" }
    ];

    const [aggBahan, aggOps, aggInsentif] = await Promise.all(
      KATEGORI.map(k =>
        prisma.anggaranHarian.aggregate({
          where: { periodeId, kategoriDana: k.key },
          _sum: { rab: true, aktual: true, selisih: true },
          _count: { id: true }
        })
      )
    );

    const aggs = [aggBahan, aggOps, aggInsentif];
    const data = KATEGORI.map((k, i) => ({
      kategoriDana:      k.key,
      label:             k.label,
      totalRAB:          parseFloat(aggs[i]._sum.rab     || 0),
      totalAktual:       parseFloat(aggs[i]._sum.aktual  || 0),
      totalSelisih:      parseFloat(aggs[i]._sum.selisih || 0),
      jumlahTransaksi:   aggs[i]._count.id
    }));

    const totalRAB     = data.reduce((s, d) => s + d.totalRAB,     0);
    const totalAktual  = data.reduce((s, d) => s + d.totalAktual,  0);
    const totalSelisih = data.reduce((s, d) => s + d.totalSelisih, 0);

    res.json({
      success: true,
      data,
      total: {
        totalRAB,
        totalAktual,
        totalSelisih,
        surplusUtang: totalSelisih
      },
      periode: {
        id:    periode.id,
        label: `${new Date(periode.tanggalMulai).getFullYear()}/${periode.tanggalMulai} - ${periode.tanggalSelesai}`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Terjadi kesalahan server saat memproses ringkasan anggaran" });
  }
});

async function getLaporanHarianData(periodeId, tanggal) {
  const targetDate = normalizeDateUTC(tanggal);
  if (isNaN(targetDate.getTime())) {
    throw new Error("[VALIDASI] Format tanggal tidak valid");
  }

  // 1. Menu Description
  const menu = await prisma.menuHarian.findFirst({
    where: { periodeId, tanggal: targetDate, status: "DISETUJUI" },
    include: {
      blok: {
        include: {
          menuItem: { select: { namaMenu: true } }
        }
      }
    }
  });
  const menuNames = menu
    ? [...new Set(menu.blok.flatMap(b => b.menuItem.map(i => i.namaMenu)))]
    : [];
  const menuDescription = menuNames.join(", ");

  // 2. Penerima Manfaat untuk hari itu
  const day = targetDate.getUTCDay();
  const dayOfWeek = HARI_MAP[day];
  let penerimaManfaat = [];
  let totalPenerima = 0;
  if (dayOfWeek) {
    const activeInputs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId },
      include: { detail: { include: { kategori: true } }, grupHari: true }
    });
    const inputsForDay = activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek));
    for (const input of inputsForDay) {
      for (const det of input.detail) {
        const existing = penerimaManfaat.find(p => p.kategoriId === det.kategoriId);
        if (existing) {
          existing.lakiLaki += det.lakiLaki;
          existing.perempuan += det.perempuan;
        } else {
          penerimaManfaat.push({
            kategoriId: det.kategoriId,
            kategori: det.kategori.nama,
            lakiLaki: det.lakiLaki,
            perempuan: det.perempuan
          });
        }
        totalPenerima += det.lakiLaki + det.perempuan;
      }
    }
  }

  // 3. Belanja (TransaksiPembelian) untuk tanggal tsb
  const poList = await prisma.transaksiPembelian.findMany({
    where: {
      rabHarian: { periodeId },
      tanggal: targetDate
    },
    include: {
      supplier: true,
      items: { include: { bahanPokok: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const belanja = poList.map(po => ({
    poId: po.id,
    supplier: po.supplier.nama,
    status: po.status,
    items: po.items.map(item => ({
      bahanPokokId: item.bahanPokokId,
      bahan: item.bahanPokok.nama,
      qty: Number(item.qty),
      satuan: item.bahanPokok.satuan,
      hargaSatuan: Number(item.hargaSatuan),
      subtotal: Number(item.subtotal)
    })),
    totalBelanja: Number(po.items.reduce((s, i) => s + Number(i.subtotal), 0))
  }));
  const totalBelanja = belanja.reduce((s, b) => s + b.totalBelanja, 0);

  // 4. Biaya (JurnalTransaksi) untuk tanggal tsb
  const biayaList = await prisma.jurnalTransaksi.findMany({
    where: { periodeId, tanggal: targetDate },
    include: {
      akunDanaBiaya: { select: { id: true, nama: true, kode: true } },
      akunKas: { select: { id: true, nama: true, kode: true } }
    },
    orderBy: { nomorBukti: "asc" }
  });

  const biaya = biayaList.map(j => ({
    nomorBukti: j.nomorBukti,
    uraian: j.uraian,
    jenis: j.jenis,
    nominal: Number(j.nominal),
    akunDanaBiaya: j.akunDanaBiaya.nama,
    akunKas: j.akunKas.nama,
    tagPengeluaran: j.tagPengeluaran
  }));
  const totalBiayaKeluar = biaya
    .filter(b => b.jenis === "KELUAR")
    .reduce((s, b) => s + b.nominal, 0);

  // 5. Identitas Lembaga & TTD
  const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  const mitraUser = await prisma.user.findFirst({
    where: { role: "MITRA", aktif: true },
    select: { nama: true }
  });

  return {
    tanggal,
    menuDescription,
    penerimaManfaat: penerimaManfaat.map(p => ({ ...p, total: p.lakiLaki + p.perempuan })),
    totalPenerima,
    belanja,
    totalBelanja,
    biaya,
    totalBiayaKeluar,
    identitas: {
      namaLembaga: lembaga?.namaLembaga || '',
      alamat: lembaga?.alamat || '',
      namaMitra: mitraUser?.nama || '',
      namaAkuntan: lembaga?.namaAkuntanSPPG || '',
      namaKepalaSPPG: lembaga?.namaKepalaSPPG || ''
    }
  };
}

// GET /api/laporan/harian - Laporan Harian (ringkasan satu hari)
router.get("/harian", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanHarianSchema, "query"), async (req, res) => {
  try {
    const { periodeId, tanggal } = req.query;

    const data = await getLaporanHarianData(periodeId, tanggal);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses laporan harian";
    res.status(500).json({ error: message });
  }
});

// GET /api/laporan/harian/pdf - PDF Laporan Harian
router.get("/harian/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanHarianSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggal } = req.query;

    const data = await getLaporanHarianData(periodeId, tanggal);
    const html = renderLaporanHarianHtml(data);

    browser = await launchPuppeteer();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    const safeName = `Laporan-Harian-${tanggal}`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[harian/pdf]", error);
    const message = error.message && error.message.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF Laporan Harian";
    res.status(500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// =============================================================================
// LRA — Laporan Realisasi Anggaran (Multi-Periode Komparatif)
// =============================================================================

async function getLraData(periodeIds) {
  const ids = periodeIds.split(',').filter(Boolean);
  if (ids.length < 1) {
    throw new Error("[VALIDASI] Minimal 1 periode diperlukan untuk LRA");
  }

  const [periodes, anggaranAgg, danaMasukAgg, biayaAgg, akunList] = await Promise.all([
    prisma.periode.findMany({
      where: { id: { in: ids } },
      orderBy: { tanggalMulai: 'asc' },
      select: { id: true, tanggalMulai: true, tanggalSelesai: true, anggaranAlokasi: true, status: true }
    }),
    prisma.anggaranHarian.groupBy({
      by: ['periodeId', 'kategoriDana'],
      where: { periodeId: { in: ids } },
      _sum: { rab: true, aktual: true }
    }),
    prisma.jurnalTransaksi.groupBy({
      by: ['akunDanaBiayaId'],
      where: { periodeId: { in: ids }, jenis: 'MASUK', akunDanaBiaya: { tipe: 'DANA' } },
      _sum: { nominal: true }
    }),
    prisma.jurnalTransaksi.groupBy({
      by: ['akunDanaBiayaId'],
      where: { periodeId: { in: ids }, jenis: 'KELUAR', akunDanaBiaya: { tipe: 'BIAYA' } },
      _sum: { nominal: true }
    }),
    prisma.akun.findMany({ where: { aktif: true } })
  ]);

  // Map: periodeId -> { kategoriDana: { rab, aktual } }
  const anggaranMap = {};
  for (const row of anggaranAgg) {
    if (!anggaranMap[row.periodeId]) anggaranMap[row.periodeId] = {};
    anggaranMap[row.periodeId][row.kategoriDana] = {
      rab: Number(row._sum.rab || 0),
      aktual: Number(row._sum.aktual || 0)
    };
  }

  // Calculate totals across selected period(s)
  let totalRabBahan = 0, totalAktualBahan = 0;
  let totalRabOperasional = 0, totalAktualOperasional = 0;
  let totalRabFasilitas = 0, totalAktualFasilitas = 0;

  for (const p of periodes) {
    totalRabBahan += anggaranMap[p.id]?.['BAHAN_MAKANAN']?.rab || 0;
    totalAktualBahan += anggaranMap[p.id]?.['BAHAN_MAKANAN']?.aktual || 0;

    totalRabOperasional += anggaranMap[p.id]?.['OPERASIONAL']?.rab || 0;
    totalAktualOperasional += anggaranMap[p.id]?.['OPERASIONAL']?.aktual || 0;

    totalRabFasilitas += anggaranMap[p.id]?.['INSENTIF_FASILITAS']?.rab || 0;
    totalAktualFasilitas += anggaranMap[p.id]?.['INSENTIF_FASILITAS']?.aktual || 0;
  }

  // Calculate live Jurnal amounts per category if available
  const akunMap = new Map(akunList.map(a => [a.id, a]));

  let danaMasukBahan = 0, danaMasukOperasional = 0, danaMasukFasilitas = 0;
  for (const dm of danaMasukAgg) {
    const ak = akunMap.get(dm.akunDanaBiayaId);
    const nominal = Number(dm._sum.nominal || 0);
    if (ak?.kategoriDana === 'BAHAN_MAKANAN') danaMasukBahan += nominal;
    else if (ak?.kategoriDana === 'OPERASIONAL') danaMasukOperasional += nominal;
    else if (ak?.kategoriDana === 'INSENTIF_FASILITAS') danaMasukFasilitas += nominal;
  }

  let biayaLainnyaRealisasi = 0;
  for (const b of biayaAgg) {
    const ak = akunMap.get(b.akunDanaBiayaId);
    const nominal = Number(b._sum.nominal || 0);
    if (ak && !ak.kategoriDana && ak.tipe === 'BIAYA') {
      biayaLainnyaRealisasi += nominal;
    }
  }

  // Pendapatan Realisasi: raw danaMasuk from Jurnal MASUK (no fallback to Pagu/RAB)
  const realisasiDanaBahan = danaMasukBahan;
  const realisasiDanaOperasional = danaMasukOperasional;
  const realisasiDanaFasilitas = danaMasukFasilitas;

  const totalDanaMasuk = danaMasukBahan + danaMasukOperasional + danaMasukFasilitas;
  const totalRabAll = totalRabBahan + totalRabOperasional + totalRabFasilitas;
  const pendingTransfer = totalDanaMasuk === 0 || totalDanaMasuk < totalRabAll;

  const pendapatan = [
    {
      kode: '4.1.01',
      kelompokAkun: 'Pendapatan Bantuan Operasional MBG - Bahan Makanan',
      pagu: totalRabBahan,
      realisasi: realisasiDanaBahan,
      sisa: totalRabBahan - realisasiDanaBahan,
      persen: totalRabBahan > 0 ? Math.round((realisasiDanaBahan / totalRabBahan) * 10000) / 100 : 0
    },
    {
      kode: '4.1.02',
      kelompokAkun: 'Pendapatan Bantuan Operasional MBG - Operasional',
      pagu: totalRabOperasional,
      realisasi: realisasiDanaOperasional,
      sisa: totalRabOperasional - realisasiDanaOperasional,
      persen: totalRabOperasional > 0 ? Math.round((realisasiDanaOperasional / totalRabOperasional) * 10000) / 100 : 0
    },
    {
      kode: '4.1.03',
      kelompokAkun: 'Pendapatan Bantuan Operasional MBG - Insentif & Fasilitas',
      pagu: totalRabFasilitas,
      realisasi: realisasiDanaFasilitas,
      sisa: totalRabFasilitas - realisasiDanaFasilitas,
      persen: totalRabFasilitas > 0 ? Math.round((realisasiDanaFasilitas / totalRabFasilitas) * 10000) / 100 : 0
    }
  ];

  const belanja = [
    {
      kode: '5.1.01',
      kelompokAkun: 'Belanja Bahan Pokok / Makanan',
      pagu: totalRabBahan,
      realisasi: totalAktualBahan,
      sisa: totalRabBahan - totalAktualBahan,
      persen: totalRabBahan > 0 ? Math.round((totalAktualBahan / totalRabBahan) * 10000) / 100 : 0
    },
    {
      kode: '5.1.02',
      kelompokAkun: 'Belanja Operasional',
      pagu: totalRabOperasional,
      realisasi: totalAktualOperasional,
      sisa: totalRabOperasional - totalAktualOperasional,
      persen: totalRabOperasional > 0 ? Math.round((totalAktualOperasional / totalRabOperasional) * 10000) / 100 : 0
    },
    {
      kode: '5.1.03',
      kelompokAkun: 'Belanja Insentif & Fasilitas',
      pagu: totalRabFasilitas,
      realisasi: totalAktualFasilitas,
      sisa: totalRabFasilitas - totalAktualFasilitas,
      persen: totalRabFasilitas > 0 ? Math.round((totalAktualFasilitas / totalRabFasilitas) * 10000) / 100 : 0
    }
  ];

  if (biayaLainnyaRealisasi > 0) {
    belanja.push({
      kode: '5.1.04',
      kelompokAkun: 'Belanja Lainnya',
      pagu: 0,
      realisasi: biayaLainnyaRealisasi,
      sisa: -biayaLainnyaRealisasi,
      persen: 0
    });
  }

  // Section Totals & SILPA
  const totPendapatanPagu = pendapatan.reduce((s, x) => s + x.pagu, 0);
  const totPendapatanRealisasi = pendapatan.reduce((s, x) => s + x.realisasi, 0);
  const totPendapatanSisa = totPendapatanPagu - totPendapatanRealisasi;
  const totPendapatanPersen = totPendapatanPagu > 0 ? Math.round((totPendapatanRealisasi / totPendapatanPagu) * 10000) / 100 : 0;

  const totBelanjaPagu = belanja.reduce((s, x) => s + x.pagu, 0);
  const totBelanjaRealisasi = belanja.reduce((s, x) => s + x.realisasi, 0);
  const totBelanjaSisa = totBelanjaPagu - totBelanjaRealisasi;
  const totBelanjaPersen = totBelanjaPagu > 0 ? Math.round((totBelanjaRealisasi / totBelanjaPagu) * 10000) / 100 : 0;

  const silpaPagu = totPendapatanPagu - totBelanjaPagu;
  const silpaRealisasi = totPendapatanRealisasi - totBelanjaRealisasi;
  const silpaSisa = silpaPagu - silpaRealisasi;
  const silpaPersen = totPendapatanPagu > 0 ? Math.round((silpaRealisasi / totPendapatanPagu) * 10000) / 100 : 0;

  const ringkasan = {
    totalPendapatan: { pagu: totPendapatanPagu, realisasi: totPendapatanRealisasi, sisa: totPendapatanSisa, persen: totPendapatanPersen },
    totalBelanja: { pagu: totBelanjaPagu, realisasi: totBelanjaRealisasi, sisa: totBelanjaSisa, persen: totBelanjaPersen },
    silpa: { pagu: silpaPagu, realisasi: silpaRealisasi, sisa: silpaSisa, persen: silpaPersen },
    pendingTransfer
  };

  // Backward compatibility multi-periode matrix summary
  const KATEGORI_LIST = ['BAHAN_MAKANAN', 'OPERASIONAL', 'INSENTIF_FASILITAS'];
  const kategoriSummary = KATEGORI_LIST.map(kat => {
    const entry = { kategori: kat };
    let totalRAB = 0, totalAktual = 0;
    for (const p of periodes) {
      const data = anggaranMap[p.id]?.[kat] || { rab: 0, aktual: 0 };
      entry[`rab_${p.id}`] = data.rab;
      entry[`aktual_${p.id}`] = data.aktual;
      entry[`persen_${p.id}`] = data.rab > 0 ? Math.round((data.aktual / data.rab) * 10000) / 100 : 0;
      totalRAB += data.rab;
      totalAktual += data.aktual;
    }
    entry.totalRAB = totalRAB;
    entry.totalAktual = totalAktual;
    entry.totalPersen = totalRAB > 0 ? Math.round((totalAktual / totalRAB) * 10000) / 100 : 0;
    return entry;
  });

  const totalEntry = { kategori: 'TOTAL', isTotal: true };
  let grandRAB = 0, grandAktual = 0;
  for (const p of periodes) {
    let pRAB = 0, pAktual = 0;
    for (const kat of KATEGORI_LIST) {
      pRAB += anggaranMap[p.id]?.[kat]?.rab || 0;
      pAktual += anggaranMap[p.id]?.[kat]?.aktual || 0;
    }
    totalEntry[`rab_${p.id}`] = pRAB;
    totalEntry[`aktual_${p.id}`] = pAktual;
    totalEntry[`persen_${p.id}`] = pRAB > 0 ? Math.round((pAktual / pRAB) * 10000) / 100 : 0;
    grandRAB += pRAB;
    grandAktual += pAktual;
  }
  totalEntry.totalRAB = grandRAB;
  totalEntry.totalAktual = grandAktual;
  totalEntry.totalPersen = grandRAB > 0 ? Math.round((grandAktual / grandRAB) * 10000) / 100 : 0;
  kategoriSummary.push(totalEntry);

  return {
    periodeList: periodes.map(p => ({
      id: p.id,
      label: `${p.tanggalMulai.toISOString().split('T')[0]} - ${p.tanggalSelesai.toISOString().split('T')[0]}`,
      anggaranAlokasi: Number(p.anggaranAlokasi),
      status: p.status
    })),
    pendapatan,
    belanja,
    ringkasan,
    kategoriSummary,
    pendingTransfer
  };
}

// GET /api/laporan/lra - Laporan Realisasi Anggaran (multi-periode komparatif)
router.get("/lra", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const data = await getLraData(periodeIds);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[lra]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

// GET /api/laporan/lra/pdf - LRA sebagai PDF
router.get("/lra/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeIds } = req.query;
    const lraData = await getLraData(periodeIds);

    // Ambil identitas lembaga dari periode pertama
    const firstPeriodeId = lraData.periodeList[0]?.id;
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

    const html = renderLraHtml({ ...lraData, lembaga });

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="LRA-SAP-BGN.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[lra/pdf]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// GET /api/laporan/lra/export-excel - Export LRA ke Excel (.xlsx)
router.get("/lra/export-excel", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const lraData = await getLraData(periodeIds);

    const firstPeriodeId = lraData.periodeList[0]?.id;
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

    const buffer = await exportLraXlsx(lraData, lembaga);
    res.setHeader('Content-Disposition', 'attachment; filename="LRA-SAP-BGN.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    console.error("[lra/export-excel]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat Excel LRA";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

// =============================================================================
// LPD2M — Laporan Perkembangan Dana Dua Mingguan (Multi-Periode)
// =============================================================================

async function getLpd2mData(periodeIds) {
  const ids = periodeIds.split(',').filter(Boolean);
  if (ids.length < 1) {
    throw new Error("[VALIDASI] Minimal 1 periode diperlukan");
  }

  const periodes = await prisma.periode.findMany({
    where: { id: { in: ids } },
    orderBy: { tanggalMulai: 'asc' },
    select: { id: true, tanggalMulai: true, tanggalSelesai: true, anggaranAlokasi: true, totalDanaDiterima: true }
  });

  const periodeData = await Promise.all(periodes.map(async (p) => {
    const [saldoAwalAgg, danaMasukAgg, pengeluaranAgg, anggaranAgg] = await Promise.all([
      prisma.saldoAwalPeriode.aggregate({
        where: { periodeId: p.id, akun: { tipe: "KAS" } },
        _sum: { saldoAwal: true }
      }),
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId: p.id, jenis: "MASUK", akunDanaBiaya: { tipe: "DANA" } },
        _sum: { nominal: true }
      }),
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId: p.id, jenis: "KELUAR" },
        _sum: { nominal: true }
      }),
      prisma.anggaranHarian.aggregate({
        where: { periodeId: p.id },
        _sum: { rab: true, aktual: true }
      })
    ]);

    const saldoAwal = Number(saldoAwalAgg._sum.saldoAwal || 0);
    const penerimaan = Number(danaMasukAgg._sum.nominal || 0);
    const pengeluaran = Number(pengeluaranAgg._sum.nominal || 0);
    const totalRAB = Number(anggaranAgg._sum.rab || 0);
    const totalRealisasi = Number(anggaranAgg._sum.aktual || 0);
    const saldoAkhir = saldoAwal + penerimaan - pengeluaran;
    const pendingTransfer = penerimaan === 0 || penerimaan < totalRAB;

    return {
      periodeId: p.id,
      periodeLabel: `${p.tanggalMulai.toISOString().split('T')[0]} - ${p.tanggalSelesai.toISOString().split('T')[0]}`,
      anggaranAlokasi: Number(p.anggaranAlokasi),
      totalDanaDiterima: Number(p.totalDanaDiterima || 0),
      saldoAwal,
      penerimaan,
      pengeluaran,
      saldoAkhir,
      totalRAB,
      totalRealisasi,
      persenPenyerapan: totalRAB > 0 ? Math.round((totalRealisasi / totalRAB) * 10000) / 100 : 0,
      pendingTransfer
    };
  }));

  const pendingTransfer = periodeData.some(p => p.pendingTransfer);

  return { periodeData, pendingTransfer };
}

// GET /api/laporan/lpd2m - Laporan Perkembangan Dana Dua Mingguan
router.get("/lpd2m", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
  try {
    const { periodeIds } = req.query;
    const data = await getLpd2mData(periodeIds);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[lpd2m]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Terjadi kesalahan server saat memproses LPD2M";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  }
});

// GET /api/laporan/lpd2m/pdf - LPD2M sebagai PDF
router.get("/lpd2m/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanMultiPeriodeSchema, "query"), async (req, res) => {
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
    const fs = require('fs');
    const path = require('path');
    const buktiList = await prisma.dokumenBuktiLpd2m.findMany({
      where: { periodeId: { in: ids } },
      orderBy: { createdAt: 'asc' }
    });

    const buktiFormatted = buktiList.map(b => {
      let base64Data = null;
      const absolutePath = path.isAbsolute(b.filePath)
        ? b.filePath
        : path.join(__dirname, '../../', b.filePath);

      if (fs.existsSync(absolutePath)) {
        try {
          const fileBuffer = fs.readFileSync(absolutePath);
          base64Data = `data:${b.mimeType};base64,${fileBuffer.toString('base64')}`;
        } catch (err) {
          console.error("[lpd2m/pdf] Gagal membaca file bukti:", absolutePath, err);
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
    await page.setContent(html, { waitUntil: "networkidle0" });
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
          : path.join(__dirname, '../../', b.filePath);
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (unlinkErr) {
            console.error("[lpd2m/pdf] Gagal hapus file bukti:", absolutePath, unlinkErr);
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
    console.error("[lpd2m/pdf]", error);
    const message = error.message?.startsWith("[VALIDASI]")
      ? error.message.replace("[VALIDASI] ", "")
      : "Gagal membuat PDF LPD2M";
    res.status(error.message?.startsWith("[VALIDASI]") ? 400 : 500).json({ error: message });
  } finally {
    if (browser) await browser.close();
  }
});

// =============================================================================
// STOCK BARANG — helper function (reuse logic dari endpoint /stock-barang)
// =============================================================================
async function getStockBarangData(periodeId, tanggal) {
  const targetTanggal = normalizeDateUTC(tanggal);
  if (isNaN(targetTanggal.getTime())) throw new Error("[VALIDASI] Format tanggal tidak valid");
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
  for (const s of saldoAwalList) saldoAwalMap[s.bahanPokokId] = { qty: Number(s.saldoAwalQty), harga: Number(s.hargaBeliAwal) };
  const mutasiMap = {};
  for (const m of mutasiList) {
    const bid = m.bahanPokokId;
    if (!mutasiMap[bid]) mutasiMap[bid] = { masuk: 0, keluar: 0 };
    if (m.jenis === "MASUK") mutasiMap[bid].masuk = Number(m._sum.qty || 0);
    else mutasiMap[bid].keluar = Number(m._sum.qty || 0);
  }
  const latestHargaMap = {};
  for (const m of latestMasukPrices) latestHargaMap[m.bahanPokokId] = Number(m.hargaBeli);
  const items = bahanList.map((bahan) => {
    const sa = saldoAwalMap[bahan.id] || { qty: 0, harga: 0 };
    const mut = mutasiMap[bahan.id] || { masuk: 0, keluar: 0 };
    const saldoAkhirQty = sa.qty + mut.masuk - mut.keluar;
    const hargaBeliTerakhir = latestHargaMap[bahan.id] !== undefined ? latestHargaMap[bahan.id] : sa.harga;
    return {
      bahanPokokId: bahan.id, nama: bahan.nama, satuan: bahan.satuan,
      saldoAwalQty: sa.qty, totalMasukQty: mut.masuk, totalKeluarQty: mut.keluar,
      saldoAkhirQty, hargaBeliTerakhir,
      nilaiStock: saldoAkhirQty * hargaBeliTerakhir
    };
  });
  const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  return {
    identitas: {
      namaLembaga: lembaga?.namaLembaga || '', alamat: lembaga?.alamat || '',
      namaAkuntan: lembaga?.namaAkuntanSPPG || '', namaKepalaSPPG: lembaga?.namaKepalaSPPG || '',
      tempatPelaporan: lembaga?.tempatPelaporan || '',
    },
    periodeInfo: `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}`,
    tanggal, items,
  };
}

// =============================================================================
// KEBUTUHAN BELANJA — helper function (reuse aggregasi endpoint /kebutuhan-belanja-bahan)
// =============================================================================
async function getKebutuhanBelanjaData(periodeId, tanggalMulai, tanggalSelesai) {
  const start = normalizeDateUTC(tanggalMulai);
  const end = normalizeDateUTC(tanggalSelesai);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("[VALIDASI] Format tanggal tidak valid");
  const menus = await prisma.menuHarian.findMany({
    where: { periodeId, tanggal: { gte: start, lte: end }, status: "DISETUJUI" },
    include: {
      blok: {
        include: {
          kelompokUmurMenu: { include: { kategoriPenerima: true } },
          menuItem: { include: { bahan: { include: { bahanPokok: true } } } }
        }
      }
    }
  });
  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId }, include: { detail: true, grupHari: true }
  });
  const akumulasiBahan = {};
  for (const menu of menus) {
    const day = new Date(menu.tanggal).getUTCDay();
    const dayOfWeek = HARI_MAP[day];
    if (!dayOfWeek) continue;
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
            akumulasiBahan[bid] = { id: bid, nama: b.bahanPokok.nama, satuan: b.bahanPokok.satuan, totalBeratKotorGr: 0, totalBeratBersihGr: 0, totalEstimasiBiaya: 0 };
          }
          akumulasiBahan[bid].totalBeratKotorGr += Number(b.beratKotorGr) * totalPorsiBlok;
          akumulasiBahan[bid].totalBeratBersihGr += Number(b.beratBersihGr) * totalPorsiBlok;
          akumulasiBahan[bid].totalEstimasiBiaya += Number(b.totalHargaBahan) * totalPorsiBlok;
        }
      }
    }
  }
  const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  const rawItems = Object.values(akumulasiBahan);
  const items = rawItems.map((it) => ({
    nama: it.nama, satuan: it.satuan,
    qty: Math.round(it.totalBeratBersihGr * 1000) / 1000,
    hargaSatuan: it.totalEstimasiBiaya > 0 && it.totalBeratBersihGr > 0
      ? Math.round((it.totalEstimasiBiaya / it.totalBeratBersihGr) * 100) / 100
      : 0,
    jumlah: Math.round(it.totalEstimasiBiaya * 100) / 100,
  }));
  return {
    identitas: {
      namaLembaga: lembaga?.namaLembaga || '', alamat: lembaga?.alamat || '',
      namaAkuntan: lembaga?.namaAkuntanSPPG || '', namaKepalaSPPG: lembaga?.namaKepalaSPPG || '',
    },
    periodeInfo: `${start.toISOString().split("T")[0]} s.d ${end.toISOString().split("T")[0]}`,
    tanggalMulai, tanggalSelesai,
    items,
    totalKeseluruhan: Math.round(rawItems.reduce((s, it) => s + it.totalEstimasiBiaya, 0) * 100) / 100,
  };
}

// =============================================================================
// PER PERIODE — helper function (reuse logic endpoint /per-periode)
// =============================================================================
async function getPerPeriodeData(periodeId) {
  const details = await prisma.anggaranBahanMakananDetail.findMany({
    where: { anggaranHarian: { periodeId } },
    include: { kategori: true }
  });
  let rabPendidikan = 0, rabPosyandu = 0;
  for (const det of details) {
    const subtotal = Number(det.jumlahPaket) * Number(det.hargaSatuan);
    if (det.kategori.jenisSasaran === "PESERTA_DIDIK") rabPendidikan += subtotal;
    else rabPosyandu += subtotal;
  }
  const bahanAgg = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana: "BAHAN_MAKANAN" },
    _sum: { aktual: true }
  });
  const totalAktualBahan = Number(bahanAgg._sum.aktual || 0);
  const totalRabBahan = rabPendidikan + rabPosyandu;
  const rasioPendidikan = totalRabBahan > 0 ? rabPendidikan / totalRabBahan : 0;
  const aktualPendidikan = totalAktualBahan * rasioPendidikan;
  const aktualPosyandu = totalAktualBahan * (1 - rasioPendidikan);
  const operasional = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana: "OPERASIONAL" },
    _sum: { rab: true, aktual: true }
  });
  const sewa = await prisma.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana: "INSENTIF_FASILITAS" },
    _sum: { rab: true, aktual: true }
  });
  const categories = [
    { kategori: "Bahan Makanan — Pendidikan", rab: rabPendidikan, aktual: Math.round(aktualPendidikan * 100) / 100, sisa: Math.round((rabPendidikan - aktualPendidikan) * 100) / 100 },
    { kategori: "Bahan Makanan — Posyandu", rab: rabPosyandu, aktual: Math.round(aktualPosyandu * 100) / 100, sisa: Math.round((rabPosyandu - aktualPosyandu) * 100) / 100 },
    { kategori: "Operasional", rab: Number(operasional._sum.rab || 0), aktual: Number(operasional._sum.aktual || 0), sisa: Number(operasional._sum.rab || 0) - Number(operasional._sum.aktual || 0) },
    { kategori: "Insentif Fasilitas (Sewa)", rab: Number(sewa._sum.rab || 0), aktual: Number(sewa._sum.aktual || 0), sisa: Number(sewa._sum.rab || 0) - Number(sewa._sum.aktual || 0) },
  ];
  const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
  const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  return {
    identitas: {
      namaLembaga: lembaga?.namaLembaga || '', alamat: lembaga?.alamat || '',
      namaAkuntan: lembaga?.namaAkuntanSPPG || '', namaKepalaSPPG: lembaga?.namaKepalaSPPG || '',
    },
    periodeInfo: periode ? `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}` : '',
    categories,
  };
}

// =============================================================================
// PER BULAN — helper function (reuse logic endpoint /per-bulan)
// =============================================================================
async function getPerBulanData(periodeId) {
  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: { periodeId }, orderBy: { tanggal: "asc" }
  });
  const dataBulanan = {};
  for (const row of jurnal) {
    const month = row.tanggal.getUTCMonth() + 1;
    const year = row.tanggal.getUTCFullYear();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!dataBulanan[key]) {
      dataBulanan[key] = { key, year, month, totalMasuk: 0, totalKeluar: 0 };
    }
    if (row.jenis === "MASUK") dataBulanan[key].totalMasuk += Number(row.nominal);
    else dataBulanan[key].totalKeluar += Number(row.nominal);
  }
  const BULAN_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const months = Object.values(dataBulanan).sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({
    bulan: `${BULAN_NAMES[d.month]} ${d.year}`,
    penerimaan: d.totalMasuk,
    pengeluaran: d.totalKeluar,
    saldo: d.totalMasuk - d.totalKeluar,
  }));
  const periode = await prisma.periode.findUnique({ where: { id: periodeId } });
  const lembaga = await prisma.setupLembaga.findFirst({ where: { periodeId } });
  return {
    identitas: {
      namaLembaga: lembaga?.namaLembaga || '', alamat: lembaga?.alamat || '',
      namaAkuntan: lembaga?.namaAkuntanSPPG || '', namaKepalaSPPG: lembaga?.namaKepalaSPPG || '',
    },
    periodeInfo: periode ? `${periode.tanggalMulai.toISOString().split("T")[0]} - ${periode.tanggalSelesai.toISOString().split("T")[0]}` : '',
    months,
  };
}

// =============================================================================
// GET /api/laporan/stock-barang/pdf — PDF Stock Barang
// =============================================================================
router.get("/stock-barang/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanStokSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, tanggal } = req.query;
    if (!tanggal) return res.status(400).json({ error: "tanggal wajib disertakan" });
    const data = await getStockBarangData(periodeId, tanggal);
    const html = renderStockBarangHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Stock-Barang.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[stock-barang/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Stock Barang" });
  } finally {
    if (browser) await browser.close();
  }
});

// =============================================================================
// GET /api/laporan/kebutuhan-belanja/pdf — PDF Kebutuhan Belanja
// =============================================================================
router.get("/kebutuhan-belanja/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanKebutuhanBelanjaSchema, "query"), async (req, res) => {
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

// =============================================================================
// GET /api/laporan/per-periode/pdf — PDF Per Periode
// =============================================================================
router.get("/per-periode/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanRekapSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getPerPeriodeData(periodeId);
    const html = renderPerPeriodeHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Per-Periode.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[per-periode/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Per Periode" });
  } finally {
    if (browser) await browser.close();
  }
});

// =============================================================================
// GET /api/laporan/per-bulan/pdf — PDF Per Bulan
// =============================================================================
router.get("/per-bulan/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanAnggaranSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getPerBulanData(periodeId);
    const html = renderPerBulanHtml(data);
    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" } });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Per-Bulan.pdf"`, "Content-Length": pdfBuffer.length });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[per-bulan/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF Laporan Per Bulan" });
  } finally {
    if (browser) await browser.close();
  }
});

// =============================================================================
// GET /api/laporan/btt — Data BTT (JSON)
// =============================================================================
router.get("/btt", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBttSchema, "query"), async (req, res) => {
  try {
    const { periodeId, kategori } = req.query;

    const kategoriDana = kategori === "sewa" ? "INSENTIF_FASILITAS" : "OPERASIONAL";

    const [agg, periode, lembaga, mitraUser] = await Promise.all([
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } },
        _sum: { nominal: true }
      }),
      prisma.periode.findUnique({ where: { id: periodeId } }),
      prisma.setupLembaga.findFirst({ where: { periodeId } }),
      prisma.user.findFirst({ where: { role: "MITRA", aktif: true }, select: { nama: true } })
    ]);

    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const nominal = Number(agg._sum.nominal || 0);
    const terbilang = formatTerbilang(nominal);

    const existingCount = await prisma.jurnalTransaksi.count({
      where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } }
    });
    const nomorUrut = existingCount + 1;
    const kategoriLabel = kategori === "sewa" ? "Sewa" : "Operasional";
    const nomorDokumen = `BTT/${kategoriLabel}/${nomorUrut}`;

    res.json({
      success: true,
      data: {
        nomorDokumen,
        nominal,
        terbilang,
        keperluan: kategori === "sewa" ? "Uang Sewa Fasilitas" : "Kebutuhan Operasional SPPG",
        identitas: {
          namaLembaga: lembaga?.namaLembaga || '',
          alamat: lembaga?.alamat || '',
          idSppg: lembaga?.namaLembaga || '',
        },
        mitraNama: mitraUser?.nama || '',
        stafPengawasNama: lembaga?.namaAkuntanSPPG || '',
        kepalaNama: lembaga?.namaKepalaSPPG || '',
        tempat: lembaga?.tempatPelaporan || 'Sumedang',
        tanggal: new Date().toISOString().split("T")[0],
        kategori,
      }
    });
  } catch (error) {
    console.error("[btt]", error);
    res.status(500).json({ error: "Gagal mengambil data BTT" });
  }
});

// =============================================================================
// GET /api/laporan/btt/pdf — PDF BTT
// =============================================================================
router.get("/btt/pdf", requireAuth, requireRole("AKUNTAN", "KEPALA_SPPG"), validate(laporanBttSchema, "query"), async (req, res) => {
  let browser;
  try {
    const { periodeId, kategori } = req.query;

    const kategoriDana = kategori === "sewa" ? "INSENTIF_FASILITAS" : "OPERASIONAL";

    const [agg, periode, lembaga, mitraUser] = await Promise.all([
      prisma.jurnalTransaksi.aggregate({
        where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } },
        _sum: { nominal: true }
      }),
      prisma.periode.findUnique({ where: { id: periodeId } }),
      prisma.setupLembaga.findFirst({ where: { periodeId } }),
      prisma.user.findFirst({ where: { role: "MITRA", aktif: true }, select: { nama: true } })
    ]);

    if (!periode) return res.status(404).json({ error: "Periode tidak ditemukan" });

    const nominal = Number(agg._sum.nominal || 0);

    const existingCount = await prisma.jurnalTransaksi.count({
      where: { periodeId, jenis: "MASUK", akunDanaBiaya: { kategoriDana } }
    });
    const nomorUrut = existingCount + 1;
    const kategoriLabel = kategori === "sewa" ? "Sewa" : "Operasional";
    const nomorDokumen = `BTT/${kategoriLabel}/${nomorUrut}`;

    const data = {
      nomorDokumen,
      nominal,
      terbilang: formatTerbilang(nominal),
      keperluan: kategori === "sewa" ? "Uang Sewa Fasilitas" : "Kebutuhan Operasional SPPG",
      identitas: {
        namaLembaga: lembaga?.namaLembaga || '',
        alamat: lembaga?.alamat || '',
        idSppg: lembaga?.namaLembaga || '',
      },
      mitraNama: mitraUser?.nama || '',
      stafPengawasNama: lembaga?.namaAkuntanSPPG || '',
      kepalaNama: lembaga?.namaKepalaSPPG || '',
      tempat: lembaga?.tempatPelaporan || 'Sumedang',
      tanggal: new Date().toISOString().split("T")[0],
      kategori,
    };

    const html = renderBttHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "1mm", left: "10mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BTT-${nomorDokumen.replace(/\//g, '-')}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("[btt/pdf]", error);
    res.status(500).json({ error: "Gagal membuat PDF BTT" });
  } finally {
    if (browser) await browser.close();
  }
});


// =============================================================================
// LBBP — Laporan Buku Belanja Bahan Pokok
// =============================================================================

/**
 * Helper: ambil data LBBP untuk suatu periodeId.
 * Mengambil TransaksiPembelian (status DIREALISASI / DITERIMA) beserta items,
 * supplier, dan bahan pokok yang terkait dengan RabHarian di periode tersebut.
 * Disusun secara kronologis per tanggal, dengan subtotal per tanggal.
 */
async function getLbbpData(periodeId) {
  const [lembaga, periode, transaksiList] = await Promise.all([
    prisma.setupLembaga.findFirst({ where: { periodeId } }),
    prisma.periode.findUnique({ where: { id: periodeId } }),
    prisma.transaksiPembelian.findMany({
      where: {
        rabHarian: { periodeId },
        status: { in: ['DIREALISASI', 'DITERIMA'] },
      },
      orderBy: [{ tanggal: 'asc' }, { createdAt: 'asc' }],
      include: {
        supplier: { select: { nama: true } },
        items: {
          include: {
            bahanPokok: { select: { nama: true, satuan: true } },
          },
        },
      },
    }),
  ]);

  if (!periode) return null;

  const periodeLabel =
    `${periode.tanggalMulai.toISOString().split('T')[0]} - ${periode.tanggalSelesai.toISOString().split('T')[0]}`;

  // Flatten to per-item rows, group by tanggal
  const byTanggal = {};
  let grandTotal = 0;

  for (const tx of transaksiList) {
    const tglKey = tx.tanggal.toISOString().split('T')[0];
    if (!byTanggal[tglKey]) byTanggal[tglKey] = [];

    for (const item of tx.items) {
      // Gunakan nilai realisasi jika ada, fallback ke nilai PO
      const qty         = Number(item.qtyRealisasi         ?? item.qty         ?? 0);
      const hargaSatuan = Number(item.hargaSatuanRealisasi ?? item.hargaSatuan ?? 0);
      const subtotal    = Number(item.subtotalRealisasi    ?? item.subtotal    ?? 0);

      grandTotal += subtotal;

      byTanggal[tglKey].push({
        noPO:        tx.id.slice(-8).toUpperCase(),
        supplier:    tx.supplier?.nama || '—',
        namaBahan:   item.bahanPokok?.nama || '—',
        satuan:      item.bahanPokok?.satuan || '—',
        qty,
        hargaSatuan,
        subtotal,
        status:      tx.status, // 'DIREALISASI' | 'DITERIMA'
      });
    }
  }

  // Sort tanggal keys ascending, build grupTanggal
  const grupTanggal = Object.keys(byTanggal)
    .sort()
    .map(tgl => ({
      tanggal: tgl,
      rows: byTanggal[tgl],
    }));

  return {
    lembaga: lembaga
      ? {
          namaLembaga:    lembaga.namaLembaga,
          alamat:         lembaga.alamat,
          namaKepalaSPPG: lembaga.namaKepalaSPPG,
          namaAkuntanSPPG:lembaga.namaAkuntanSPPG,
          tempatPelaporan:lembaga.tempatPelaporan,
          tanggalPelaporan:lembaga.tanggalPelaporan,
        }
      : {},
    periodeLabel,
    grupTanggal,
    grandTotal,
  };
}

// GET /api/laporan/lbbp — JSON data
router.get('/lbbp', requireAuth, requireRole('AKUNTAN', 'KEPALA_SPPG'), validate(laporanLbbpSchema, 'query'), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getLbbpData(periodeId);
    if (!data) {
      return res.status(404).json({ error: 'Periode tidak ditemukan' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('[lbbp]', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat membuat LBBP' });
  }
});

// GET /api/laporan/lbbp/pdf — render LBBP sebagai PDF
router.get('/lbbp/pdf', requireAuth, requireRole('AKUNTAN', 'KEPALA_SPPG'), validate(laporanLbbpSchema, 'query'), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getLbbpData(periodeId);
    if (!data) {
      return res.status(404).json({ error: 'Periode tidak ditemukan' });
    }

    const html = renderLbbpHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    const safeLabel = (data.periodeLabel || periodeId).replace(/[\s/]/g, '-');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="LBBP-${safeLabel}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error('[lbbp/pdf]', error);
    res.status(500).json({ error: 'Gagal membuat PDF LBBP' });
  } finally {
    if (browser) await browser.close();
  }
});


// =============================================================================
// BKK — Buku Kas Kecil
// =============================================================================

/**
 * Helper: ambil data BKK untuk suatu periodeId.
 * Mengambil JurnalTransaksi periode tsb yang melibatkan akun Kas Tunai/Petty Cash
 * (kode 1101 / tipe KAS yang bukan bank). Transaksi KELUAR = pengeluaran kas kecil;
 * transaksi MASUK pada akun kas tunai = pengisian kas kecil dari bank.
 */
async function getBkkData(periodeId) {
  const [lembaga, periode, akunKasTunai, saldoAwalList] = await Promise.all([
    prisma.setupLembaga.findFirst({ where: { periodeId } }),
    prisma.periode.findUnique({ where: { id: periodeId } }),
    // Cari akun Kas Tunai/Petty Cash (1101) — tipe KAS, bukan bank
    prisma.akun.findFirst({
      where: {
        tipe: 'KAS',
        OR: [
          { kode: '1101' },
          { nama: { contains: 'Petty', mode: 'insensitive' } },
          { nama: { contains: 'Tunai', mode: 'insensitive' } },
          { nama: { contains: 'Cash in Hand', mode: 'insensitive' } },
        ]
      }
    }),
    prisma.saldoAwalPeriode.findMany({
      where: { periodeId, akun: { tipe: 'KAS' } },
      include: { akun: true },
    }),
  ]);

  if (!periode) return null;

  // Tentukan akunKasTunaiId — fallback ke akun KAS pertama yang bukan bank
  let kasTunaiId = akunKasTunai?.id || null;
  if (!kasTunaiId) {
    const allKas = await prisma.akun.findMany({ where: { tipe: 'KAS', aktif: true } });
    const tunai = allKas.find(a =>
      !a.nama.toLowerCase().includes('bank') &&
      !a.kode.startsWith('1102')
    );
    kasTunaiId = tunai?.id || null;
  }

  const periodeLabel =
    `${periode.tanggalMulai.toISOString().split('T')[0]} - ${periode.tanggalSelesai.toISOString().split('T')[0]}`;

  // Saldo awal kas tunai dari SaldoAwalPeriode
  let saldoAwal = 0;
  if (kasTunaiId) {
    const sa = saldoAwalList.find(s => s.akunId === kasTunaiId);
    if (sa) saldoAwal = Number(sa.saldoAwal || 0);
  }
  // Fallback: cari berdasarkan nama
  if (saldoAwal === 0) {
    const sa = saldoAwalList.find(s => {
      const n = (s.akun?.nama || '').toLowerCase();
      const k = s.akun?.kode || '';
      return k === '1101' || n.includes('petty') || n.includes('tunai') || n.includes('cash in hand');
    });
    if (sa) saldoAwal = Number(sa.saldoAwal || 0);
  }

  // Ambil jurnal yang melibatkan akun kas tunai (sebagai akunKas)
  const jurnalWhere = { periodeId };
  if (kasTunaiId) {
    jurnalWhere.akunKasId = kasTunaiId;
  } else {
    // Fallback: ambil semua jurnal, filter nanti
    delete jurnalWhere.akunKasId;
  }

  const jurnal = await prisma.jurnalTransaksi.findMany({
    where: jurnalWhere,
    orderBy: [{ tanggal: 'asc' }, { nomorBukti: 'asc' }],
    include: { akunKas: true, akunDanaBiaya: true },
  });

  // Filter jika tidak punya kasTunaiId (fallback)
  const jurnalFiltered = kasTunaiId ? jurnal : jurnal.filter(j => {
    const n = (j.akunKas?.nama || '').toLowerCase();
    const k = j.akunKas?.kode || '';
    return k === '1101' || n.includes('petty') || n.includes('tunai') || n.includes('cash in hand');
  });

  // Tentukan jenis pengeluaran dari tagPengeluaran atau uraian
  function inferJenisPengeluaran(row) {
    const tag = (row.tagPengeluaran || '').toLowerCase();
    const uraian = (row.uraian || '').toLowerCase();
    const combined = tag + ' ' + uraian;
    if (combined.includes('transport') || combined.includes('perjalanan') || combined.includes('bbm') || combined.includes('bensin')) return 'Transport';
    if (combined.includes('atk') || combined.includes('alat tulis') || combined.includes('kertas') || combined.includes('tinta')) return 'ATK';
    if (combined.includes('konsumsi') || combined.includes('snack') || combined.includes('makan') || combined.includes('minum') || combined.includes('makanan')) return 'Konsumsi';
    if (combined.includes('pemeliharaan') || combined.includes('perawatan') || combined.includes('perbaikan') || combined.includes('servis')) return 'Pemeliharaan';
    return 'Lainnya';
  }

  // Build rows dengan saldo berjalan
  let saldo = saldoAwal;
  let totalPenerimaan = 0;
  let totalPengeluaran = 0;

  const rows = jurnalFiltered.map(row => {
    const penerimaan = row.jenis === 'MASUK' ? Number(row.nominal) : 0;
    const pengeluaran = row.jenis === 'KELUAR' ? Number(row.nominal) : 0;
    saldo = saldo + penerimaan - pengeluaran;
    totalPenerimaan += penerimaan;
    totalPengeluaran += pengeluaran;

    return {
      tanggal:          row.tanggal.toISOString().split('T')[0],
      noBukti:          String(row.nomorBukti).padStart(3, '0'),
      uraian:           row.uraian,
      jenisPengeluaran: row.jenis === 'MASUK' ? 'Pengisian Kas' : inferJenisPengeluaran(row),
      penerimaan,
      pengeluaran,
      saldo,
    };
  });

  return {
    lembaga: lembaga
      ? {
          namaLembaga:     lembaga.namaLembaga,
          alamat:          lembaga.alamat,
          namaKepalaSPPG:  lembaga.namaKepalaSPPG,
          namaAkuntanSPPG: lembaga.namaAkuntanSPPG,
          tempatPelaporan: lembaga.tempatPelaporan,
          tanggalPelaporan:lembaga.tanggalPelaporan,
        }
      : {},
    periodeLabel,
    rows,
    saldoAwal,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: saldo,
  };
}

// GET /api/laporan/bkk — JSON data
router.get('/bkk', requireAuth, requireRole('AKUNTAN', 'KEPALA_SPPG'), validate(laporanBkkSchema, 'query'), async (req, res) => {
  try {
    const { periodeId } = req.query;
    const data = await getBkkData(periodeId);
    if (!data) {
      return res.status(404).json({ error: 'Periode tidak ditemukan' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('[bkk]', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat membuat BKK' });
  }
});

// GET /api/laporan/bkk/pdf — render BKK sebagai PDF
router.get('/bkk/pdf', requireAuth, requireRole('AKUNTAN', 'KEPALA_SPPG'), validate(laporanBkkSchema, 'query'), async (req, res) => {
  let browser;
  try {
    const { periodeId } = req.query;
    const data = await getBkkData(periodeId);
    if (!data) {
      return res.status(404).json({ error: 'Periode tidak ditemukan' });
    }

    const html = renderBkkHtml(data);

    browser = await launchPuppeteer();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    const safeLabel = (data.periodeLabel || periodeId).replace(/[\s/]/g, '-');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="BKK-${safeLabel}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error('[bkk/pdf]', error);
    res.status(500).json({ error: 'Gagal membuat PDF BKK' });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;

