const {
  normalizeDateUTC,
  HARI_MAP,
  getPorsiPerJenisPorsi,
  getTotalPorsiBlok
} = require("../../lib/accountingHelper");

// ---- Snapshot field penting utk AuditLog.dataLama/dataBaru (A-6) ----

function jurnalSnapshot(j) {
  return {
    id: j.id,
    periodeId: j.periodeId,
    tanggal: j.tanggal,
    nomorBukti: j.nomorBukti,
    uraian: j.uraian,
    jenis: j.jenis,
    nominal: j.nominal,
    akunDanaBiayaId: j.akunDanaBiayaId,
    akunKasId: j.akunKasId,
    tagPengeluaran: j.tagPengeluaran ?? null,
    transaksiPembelianId: j.transaksiPembelianId ?? null
  };
}

function saldoAwalBarangSnapshot(s) {
  return {
    id: s.id,
    periodeId: s.periodeId,
    bahanPokokId: s.bahanPokokId,
    saldoAwalQty: s.saldoAwalQty,
    hargaBeliAwal: s.hargaBeliAwal
  };
}

function rabHeaderSnapshot(r) {
  return {
    id: r.id,
    periodeId: r.periodeId,
    tanggal: r.tanggal,
    status: r.status,
    totalKebutuhan: r.totalKebutuhan,
    totalPagu: r.totalPagu,
    selisih: r.selisih
  };
}

function rabItemsSnapshot(items) {
  return (items || []).map(i => ({
    id: i.id,
    bahanPokokId: i.bahanPokokId,
    hargaSatuan: i.hargaSatuan,
    hargaOverride: i.hargaOverride,
    subtotal: i.subtotal
  }));
}

function dokumenResmiSnapshot(d) {
  return {
    id: d.id,
    periodeId: d.periodeId,
    jenisDokumen: d.jenisDokumen,
    nomorDokumen: d.nomorDokumen ?? null
  };
}


// Helper: hitung porsi + pagu untuk 1 tanggal (reusable)
// batasHargaList opsional — kalau tidak dipass, di-fetch dari DB sendiri
async function hitungPaguHarian(prisma, periodeId, tanggal, batasHargaList) {
  const porsi = await getPorsiPerJenisPorsi(prisma, periodeId, tanggal);

  const batasList = batasHargaList || await prisma.batasHargaPorsi.findMany();
  const batasKecil = batasList.find(b => b.jenisPorsi === "KECIL");
  const batasBesar = batasList.find(b => b.jenisPorsi === "BESAR");

  if (!batasKecil || !batasBesar) {
    throw new Error("[BATAS_TIDAK_ADA] Data BatasHargaPorsi (KECIL/BESAR) belum tersedia di database");
  }

  const maxKecil = Number(batasKecil.batasMaksimal);
  const maxBesar = Number(batasBesar.batasMaksimal);
  const paguKecil = porsi.KECIL * maxKecil;
  const paguBesar = porsi.BESAR * maxBesar;

  return {
    porsi: { KECIL: porsi.KECIL, BESAR: porsi.BESAR },
    pagu: { KECIL: paguKecil, BESAR: paguBesar, total: paguKecil + paguBesar }
  };
}



async function hitungSubtotalBahanHarian(prisma, periodeId, tanggal, priceMap, activeInputs) {
  const items = await getRabItemCalculations(prisma, periodeId, tanggal, priceMap, activeInputs);
  let total = 0;
  for (const b of Object.values(items)) {
    total += Math.round(b.qtyTotal * b.hargaSatuan * 100) / 100;
  }
  return Math.round(total * 100) / 100;
}

// Helper: hitung detail bahan per RAB (split SISWA/B3) — reusable utk preview & create
async function getRabItemCalculations(prisma, periodeId, tanggal, priceMap, activeInputs) {
  const targetDate = normalizeDateUTC(tanggal);
  const day = targetDate.getUTCDay();
  const dayOfWeek = HARI_MAP[day];

  const menu = await prisma.menuHarian.findFirst({
    where: { periodeId, tanggal: targetDate },
    include: {
      blok: {
        include: {
          kelompokUmurMenu: { include: { kategoriPenerima: true } },
          menuItem: { include: { bahan: { include: { bahanPokok: true } } } }
        }
      }
    }
  });

  if (!menu) return {};

  const inputsForDay = dayOfWeek
    ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
    : [];

  const porsiPerKategori = {};
  for (const input of inputsForDay) {
    for (const det of input.detail) {
      porsiPerKategori[det.kategoriId] = (porsiPerKategori[det.kategoriId] || 0) + (det.lakiLaki + det.perempuan);
    }
  }

  const akumulasi = {};
  for (const blok of menu.blok) {
    const totalPorsiBlok = getTotalPorsiBlok(blok, porsiPerKategori);
    for (const item of blok.menuItem) {
      for (const b of item.bahan) {
        const bid = b.bahanPokokId;
        if (!akumulasi[bid]) {
          akumulasi[bid] = {
            bahanPokokId: bid,
            nama: b.bahanPokok.nama,
            satuan: b.bahanPokok.satuan,
            qtySiswa: 0,
            qtyB3: 0,
            qtyTotal: 0,
            hargaSatuan: priceMap[bid] || 0
          };
        }
        const qtyNeed = (Number(b.beratKotorGr) * totalPorsiBlok) / 1000;
        if (blok.kelompokUmurMenu.jalur === "SISWA") {
          akumulasi[bid].qtySiswa += qtyNeed;
        } else {
          akumulasi[bid].qtyB3 += qtyNeed;
        }
        akumulasi[bid].qtyTotal += qtyNeed;
      }
    }
  }

  // Round quantities to 3 decimal places
  for (const b of Object.values(akumulasi)) {
    b.qtySiswa = Math.round(b.qtySiswa * 1000) / 1000;
    b.qtyB3 = Math.round(b.qtyB3 * 1000) / 1000;
    b.qtyTotal = Math.round(b.qtyTotal * 1000) / 1000;
  }

  return akumulasi;
}

// Helper function to get realisasi per category dana
async function getRealisasiPeriode(tx, periodeId, kategoriDana) {
  const aggAnggaran = await tx.anggaranHarian.aggregate({
    where: { periodeId, kategoriDana },
    _sum: { rab: true }
  });

  const aggJurnal = await tx.jurnalTransaksi.aggregate({
    where: {
      periodeId,
      jenis: "KELUAR",
      akunDanaBiaya: {
        tipe: "BIAYA",
        kategoriDana
      }
    },
    _sum: { nominal: true }
  });

  const diajukan = aggAnggaran._sum.rab ? parseFloat(aggAnggaran._sum.rab) : 0;
  const terealisasi = aggJurnal._sum.nominal ? parseFloat(aggJurnal._sum.nominal) : 0;
  const sisa = Math.round((diajukan - terealisasi) * 100) / 100;

  return {
    diajukan: Math.round(diajukan * 100) / 100,
    terealisasi: Math.round(terealisasi * 100) / 100,
    sisa
  };
}

// Generate LPA
async function generateLPA(tx, periodeId, nomorDokumen) {
  const periode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!periode) {
    throw new Error("[NOT_FOUND] Periode tidak ditemukan");
  }

  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const LABEL_KATEGORI = {
    BAHAN_MAKANAN: "Bahan Baku",
    OPERASIONAL: "Operasional",
    INSENTIF_FASILITAS: "Sewa"
  };

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"];
  const rincian = await Promise.all(
    kategoris.map(async (k) => {
      const real = await getRealisasiPeriode(tx, periodeId, k);
      return {
        label: LABEL_KATEGORI[k],
        ...real
      };
    })
  );

  const total = rincian.reduce(
    (acc, r) => ({
      diajukan: Math.round((acc.diajukan + r.diajukan) * 100) / 100,
      terealisasi: Math.round((acc.terealisasi + r.terealisasi) * 100) / 100,
      sisa: Math.round((acc.sisa + r.sisa) * 100) / 100
    }),
    { diajukan: 0, terealisasi: 0, sisa: 0 }
  );

  return {
    nomorDokumen: nomorDokumen || null,
    periodeLabel: `${new Date(periode.tanggalMulai).toLocaleDateString("id-ID")} - ${new Date(periode.tanggalSelesai).toLocaleDateString("id-ID")}`,
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan",
    namaLembaga: lembaga.namaLembaga,
    rincian,
    total,
    nomorRekeningVA: lembaga.nomorRekeningVA,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG,
    alamat: lembaga.alamat
  };
}

// Generate SPTJ
async function generateSPTJ(tx, periodeId) {
  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"];
  const semua = await Promise.all(kategoris.map((k) => getRealisasiPeriode(tx, periodeId, k)));

  const jumlahPenerimaan = semua.reduce((s, r) => s + r.diajukan, 0);
  const jumlahPengeluaran = semua.reduce((s, r) => s + r.terealisasi, 0);

  return {
    namaPejabat: lembaga.namaKepalaSPPG,
    jabatan: "Kepala SPPG " + (lembaga.namaLembaga || "").replace(/^SPPG\s*/i, ""),
    jumlahPenerimaan: Math.round(jumlahPenerimaan * 100) / 100,
    jumlahPengeluaran: Math.round(jumlahPengeluaran * 100) / 100,
    sisaDana: Math.round((jumlahPenerimaan - jumlahPengeluaran) * 100) / 100,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null
  };
}

// Generate BAPSD
async function generateBAPSD(tx, periodeId, nomorDokumen) {
  const periode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!periode) {
    throw new Error("[NOT_FOUND] Periode tidak ditemukan");
  }

  const lembaga = await tx.setupLembaga.findUnique({ where: { periodeId } });
  if (!lembaga) {
    throw new Error("[VALIDASI] Pengaturan/setup lembaga untuk periode ini belum diisi");
  }

  const kategoris = ["BAHAN_MAKANAN", "OPERASIONAL", "INSENTIF_FASILITAS"];
  const LABEL_KATEGORI = {
    BAHAN_MAKANAN: "Dana Bahan Baku",
    OPERASIONAL: "Dana Operasional",
    INSENTIF_FASILITAS: "Dana Insentif Fasilitas"
  };

  const rincianSisa = await Promise.all(
    kategoris.map(async (k) => {
      const real = await getRealisasiPeriode(tx, periodeId, k);
      return {
        label: LABEL_KATEGORI[k],
        sisa: real.sisa
      };
    })
  );

  const sptj = await generateSPTJ(tx, periodeId);

  return {
    nomorDokumen: nomorDokumen || null,
    periodeLabel: `${new Date(periode.tanggalMulai).toLocaleDateString("id-ID")} - ${new Date(periode.tanggalSelesai).toLocaleDateString("id-ID")}`,
    sisaDana: sptj.sisaDana,
    rincianSisa,
    tanggalMulaiBerikutnya: lembaga.awalPeriodeBerikutnya ? new Date(lembaga.awalPeriodeBerikutnya).toLocaleDateString("id-ID") : null,
    namaYayasan: lembaga.namaYayasan,
    ketuaYayasan: lembaga.ketuaYayasan,
    namaAkuntan: lembaga.namaAkuntanSPPG,
    namaPejabat: lembaga.namaKepalaSPPG,
    tempatPelaporan: lembaga.tempatPelaporan,
    tanggalPelaporan: lembaga.tanggalPelaporan ? new Date(lembaga.tanggalPelaporan).toLocaleDateString("id-ID") : null,
    nomorRekeningVA: lembaga.nomorRekeningVA,
    namaLembaga: lembaga.namaLembaga,
    alamat: lembaga.alamat
  };
}

module.exports = {
  jurnalSnapshot,
  saldoAwalBarangSnapshot,
  rabHeaderSnapshot,
  rabItemsSnapshot,
  dokumenResmiSnapshot,
  hitungPaguHarian,
  hitungSubtotalBahanHarian,
  getRabItemCalculations,
  getRealisasiPeriode,
  generateLPA,
  generateSPTJ,
  generateBAPSD
};
