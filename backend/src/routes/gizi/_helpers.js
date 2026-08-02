const { HARI_MAP } = require("../../lib/accountingHelper");

async function getPenerimaBlok(tx, periodeId, tanggal, kategoriPenerimaList) {
  if (!kategoriPenerimaList || kategoriPenerimaList.length === 0) return 0;
  const katIds = new Set(kategoriPenerimaList.map(k => k.id));

  const targetDate = new Date(tanggal);
  const day = targetDate.getUTCDay();
  const dayOfWeek = HARI_MAP[day];

  const activeInputs = await tx.inputPenerimaManfaat.findMany({
    where: { periodeId },
    include: { detail: true, grupHari: true }
  });

  const inputsForDay = dayOfWeek
    ? activeInputs.filter(inp => (inp.grupHari?.hariAktif || inp.hariAktif || []).includes(dayOfWeek))
    : [];

  let total = 0;
  for (const input of inputsForDay) {
    for (const det of input.detail) {
      if (katIds.has(det.kategoriId)) {
        total += (det.lakiLaki || 0) + (det.perempuan || 0);
      }
    }
  }
  return total;
}

async function getHargaBahan(tx, periodeId, bahanPokokId) {
  const langsung = await tx.hargaBahanPeriode.findUnique({
    where: {
      periodeId_bahanPokokId: { periodeId, bahanPokokId }
    }
  });
  if (langsung) return { harga: Number(langsung.harga), isFallback: false };

  // fallback: cari harga terakhir dari periode manapun sebelumnya (order by periode.tanggalMulai desc)
  const targetPeriode = await tx.periode.findUnique({ where: { id: periodeId } });
  if (!targetPeriode) {
    return { harga: 0, isFallback: true };
  }

  const fallback = await tx.hargaBahanPeriode.findFirst({
    where: {
      bahanPokokId,
      periode: {
        tanggalMulai: { lt: targetPeriode.tanggalMulai }
      }
    },
    orderBy: {
      periode: {
        tanggalMulai: "desc"
      }
    }
  });
  if (fallback) return { harga: Number(fallback.harga), isFallback: true };

  return { harga: 0, isFallback: true }; // belum pernah ada harga sama sekali
}

module.exports = {
  getPenerimaBlok,
  getHargaBahan
};
