/**
 * Helper untuk mengumpulkan data Pemeriksaan Bahan Makanan dari PO.
 *
 * Format nomor dokumen: No.{counter}/{dd}/{mm}/{yyyy}/VI
 * Contoh: No.001/26/07/2026/VI
 *
 * Counter = urutan PO DIREALISASI pada hari yang sama (1-indexed).
 */
const prisma = require('./prisma');

/**
 * Ambil + transformasi data pemeriksaan bahan untuk poId tertentu.
 * Melempar Error jika PO tidak ditemukan atau status tidak valid.
 *
 * @param {string} poId - UUID TransaksiPembelian
 * @param {number} [nomorUrut] - override urutan; jika tidak diberikan, dihitung otomatis
 * @returns {Promise<object>} data siap pakai di endpoint JSON maupun PDF
 */
async function getPemeriksaanBahanData(poId, nomorUrut) {
  // 1. Ambil PO dengan relasi yang diperlukan
  const po = await prisma.transaksiPembelian.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      rabHarian: {
        include: {
          periode: true,
          items: true, // RabHarianItem — berisi qtySiswa, qtyB3 per bahanPokokId
        },
      },
      items: {
        include: {
          bahanPokok: true,
        },
        orderBy: { id: 'asc' },
      },
      diterimaOleh: {
        select: { id: true, nama: true, role: true },
      },
      createdBy: {
        select: { id: true, nama: true, role: true },
      },
    },
  });

  if (!po) {
    throw new Error('[NOT_FOUND] PO tidak ditemukan');
  }

  // 2. Ambil setup lembaga dari periode terkait
  const periodeId = po.rabHarian?.periodeId;
  const lembaga = periodeId
    ? await prisma.setupLembaga.findFirst({ where: { periodeId } })
    : null;

  // 3. Buat map RabHarianItem per bahanPokokId untuk qtySiswa/qtyB3
  const rabItemsMap = new Map();
  if (po.rabHarian?.items) {
    for (const ri of po.rabHarian.items) {
      if (!rabItemsMap.has(ri.bahanPokokId)) {
        rabItemsMap.set(ri.bahanPokokId, ri);
      }
    }
  }

  // 4. Hitung nomor urut jika tidak diberikan
  // Counter = berapa PO dengan status DIREALISASI pada tanggal yang sama (termasuk ini)
  const tanggalPO = po.tanggal;
  let counter = nomorUrut;
  if (!counter) {
    const sameDayCount = await prisma.transaksiPembelian.count({
      where: {
        tanggal: tanggalPO,
        status: 'DIREALISASI',
        createdAt: { lte: po.createdAt },
      },
    });
    counter = sameDayCount > 0 ? sameDayCount : 1;
  }

  // 5. Format nomor dokumen: No.001/dd/mm/yyyy/VI
  const tgl = new Date(tanggalPO);
  const dd = String(tgl.getUTCDate()).padStart(2, '0');
  const mm = String(tgl.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = tgl.getUTCFullYear();
  const counterStr = String(counter).padStart(3, '0');
  const nomorDokumen = `No.${counterStr}/${dd}/${mm}/${yyyy}/VI`;

  // 6. Transformasi item bahan makanan dengan split SISWA/B3 dari RabHarianItem
  const bahanMakanan = po.items.map((item) => {
    const rabItem = rabItemsMap.get(item.bahanPokokId);
    const qtySiswa = Number(rabItem?.qtySiswa ?? 0);
    const qtyB3 = Number(rabItem?.qtyB3 ?? 0);
    const kategori = rabItem ? (qtyB3 > 0 ? 'B3' : 'SISWA') : 'SISWA';
    return {
      id: item.id,
      bahanPokokId: item.bahanPokokId,
      nama: item.bahanPokok?.nama || '-',
      satuan: item.bahanPokok?.satuan || '-',
      qtySiswa,
      qtyB3,
      qty: Number(item.qtyRealisasi ?? item.qty),
      hargaSatuan: Number(item.hargaSatuanRealisasi ?? item.hargaSatuan),
      total: Number(item.subtotalRealisasi ?? item.subtotal),
      kategori,
    };
  });

  const totalNilai = bahanMakanan.reduce((sum, b) => sum + b.total, 0);

  return {
    poId: po.id,
    nomorDokumen,
    tanggalPemeriksaan: po.tanggal.toISOString().split('T')[0],
    statusPO: po.status,
    supplier: {
      id: po.supplier?.id,
      nama: po.supplier?.nama || '-',
      alamat: po.supplier?.alamat || null,
      kontak: po.supplier?.kontak || null,
    },
    bahanMakanan,
    totalNilai,
    pemeriksa: {
      nama: po.diterimaOleh?.nama || '',
      jabatan: 'Petugas ASLAP',
    },
    namaKepalaSPPG: lembaga?.namaKepalaSPPG || '',
    namaLembaga: lembaga?.namaLembaga || '',
    alamat: lembaga?.alamat || '',
    tempatPelaporan: lembaga?.tempatPelaporan || '',
  };
}

module.exports = { getPemeriksaanBahanData };
