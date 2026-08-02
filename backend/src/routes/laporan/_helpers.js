const prisma = require("../../lib/prisma");
const { normalizeDateUTC, HARI_MAP, getTotalPorsiBlok } = require("../../lib/accountingHelper");

// Jabatan Kepala SPPG — satu sumber kebenaran, dipakai di /lpa dan /lpa/pdf
const JABATAN_KEPALA_SPPG = "Kepala Satuan Pelayanan Pemenuhan Gizi/Ketua Yayasan";

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

module.exports = {
  JABATAN_KEPALA_SPPG,
  getBkuData,
  getBpData,
  BP_CONFIGS,
  getNeracaSaldoData,
  getLaporanHarianData,
  getLraData,
  getLpd2mData,
  getStockBarangData,
  getKebutuhanBelanjaData,
  getPerPeriodeData,
  getPerBulanData,
  getLbbpData,
  getBkkData,
};
