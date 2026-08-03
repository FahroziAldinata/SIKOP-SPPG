const HARI_MAP = {
  0: "MINGGU",
  1: "SENIN",
  2: "SELASA",
  3: "RABU",
  4: "KAMIS",
  5: "JUMAT",
  6: "SABTU"
};

/**
 * KONTRAK: Field tanggal dari client WAJIB dikirim sebagai date-only string "YYYY-MM-DD"
 * (tanpa ISO datetime dengan offset) agar tidak ada mismatch offset timezone.
 * Mengembalikan Date object pada midnight UTC.
 */
function normalizeDateUTC(input) {
  if (!input) return input;
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Hitung porsi kecil & porsi besar per tanggal untuk periode tertentu
 */
async function getPorsiPerJenisPorsi(prisma, periodeId, tanggal) {
  const targetDate = normalizeDateUTC(tanggal);
  const day = targetDate.getUTCDay();
  const dayOfWeek = HARI_MAP[day];

  let porsiKecil = 0;
  let porsiBesar = 0;

  if (!dayOfWeek) {
    return { KECIL: 0, BESAR: 0 };
  }

  const activeInputs = await prisma.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: {
      detail: {
        include: { kategori: true }
      },
      grupHari: true
    }
  });

  const inputsForDay = activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek));

  for (const input of inputsForDay) {
    for (const det of input.detail) {
      const jenisPorsi = det.kategori?.jenisPorsi;
      if (!jenisPorsi) continue;

      const totalSiswa = (det.lakiLaki || 0) + (det.perempuan || 0);
      if (jenisPorsi === "KECIL") {
        porsiKecil += totalSiswa;
      } else if (jenisPorsi === "BESAR") {
        porsiBesar += totalSiswa;
      }
    }
  }

  return { KECIL: porsiKecil, BESAR: porsiBesar };
}

/**
 * Helper to recalculate aktual and selisih of AnggaranHarian
 */
async function recalcAktualAnggaran(tx, periodeId, tanggal, kategoriDana) {
  const targetDate = normalizeDateUTC(tanggal);

  const result = await tx.jurnalTransaksi.aggregate({
    _sum: {
      nominal: true
    },
    where: {
      periodeId,
      tanggal: targetDate,
      jenis: "KELUAR",
      akunDanaBiaya: {
        kategoriDana,
        tipe: "BIAYA"
      }
    }
  });

  const sumNominal = result._sum.nominal ? parseFloat(result._sum.nominal) : 0;
  const roundedSum = Math.round(sumNominal * 100) / 100;

  const anggaran = await tx.anggaranHarian.findUnique({
    where: {
      periodeId_tanggal_kategoriDana: {
        periodeId,
        tanggal: targetDate,
        kategoriDana
      }
    }
  });

  if (anggaran) {
    const computedRab = parseFloat(anggaran.rab);
    const newSelisih = Math.round((computedRab - roundedSum) * 100) / 100;

    await tx.anggaranHarian.update({
      where: { id: anggaran.id },
      data: {
        aktual: roundedSum,
        selisih: newSelisih
      }
    });
  }
}

/**
 * Helper: hitung total porsi blok dari kelompok umur menu
 */
function getTotalPorsiBlok(blok, porsiPerKategori) {
  let total = 0;
  for (const kat of blok.kelompokUmurMenu.kategoriPenerima) {
    total += (porsiPerKategori[kat.id] || 0);
  }
  return total;
}

module.exports = {
  HARI_MAP,
  normalizeDateUTC,
  getPorsiPerJenisPorsi,
  recalcAktualAnggaran,
  getTotalPorsiBlok
};
