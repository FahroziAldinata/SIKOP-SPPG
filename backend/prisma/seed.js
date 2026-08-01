const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------------
  // 1. KATEGORI PENERIMA — 13 kategori resmi BGN
  // jenisPorsi & mapping dikonfirmasi BGN+akuntan di 03-DECISIONS.md v5.4
  // ---------------------------------------------------------------------
  const kategoriData = [
    { kode: "PAUD_TK", nama: "PAUD/TK/RA/TKLB", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 1 },
    { kode: "SD_1_3", nama: "SD/MI/SDLB Kelas 1-3", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 2 },
    { kode: "SD_4_6", nama: "SD/MI/SDLB Kelas 4-6", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 3 },
    { kode: "SMP_1_3", nama: "SMP/MTs/SMPLB/Pesantren", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 4 },
    { kode: "SMA_SMK_4_6", nama: "SMA/MA/SMK/SMALB/Pesantren", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 5 },
    { kode: "ATS_KURANG_9TH", nama: "Anak Tidak Sekolah <9 th", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 6 },
    { kode: "ATS_9_18TH", nama: "Anak Tidak Sekolah 9-18 th", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 7 },
    { kode: "PENDIDIK", nama: "Pendidik", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 8 },
    { kode: "TENAGA_KEPENDIDIKAN", nama: "Tenaga Kependidikan", jenisSasaran: "PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 9 },
    { kode: "BUMIL", nama: "Ibu Hamil", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 10 },
    { kode: "BUSUI", nama: "Ibu Menyusui", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 11 },
    { kode: "BALITA", nama: "Balita (Non PAUD)", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "KECIL", urutan: 12 },
    { kode: "KADER_POSYANDU", nama: "Kader Posyandu", jenisSasaran: "NON_PESERTA_DIDIK", jenisPorsi: "BESAR", urutan: 13 },
  ];

  const kategoriMap = {};
  for (const k of kategoriData) {
    const row = await prisma.kategoriPenerima.upsert({
      where: { kode: k.kode },
      update: {},
      create: k,
    });
    kategoriMap[k.kode] = row.id;
  }

  // ---------------------------------------------------------------------
  // 2. KELOMPOK UMUR MENU — many-to-many ke KategoriPenerima (v5.3)
  // SD dibedakan per level; SMP+SMA gabung 1 menu; Pendidik+TenagaKependidikan
  // gabung 1 menu ("PIC_SEKOLAH")
  // ---------------------------------------------------------------------
  const kelompokUmurData = [
    { kode: "TK_PAUD", jalur: "SISWA", nama: "TK/PAUD (4-6 th)", rentangUsia: "4-6 th", kategori: ["PAUD_TK"] },
    { kode: "SD_1_3", jalur: "SISWA", nama: "SD Kelas 1-3 (7-9 th)", rentangUsia: "7-9 th", kategori: ["SD_1_3"] },
    { kode: "SD_4_6", jalur: "SISWA", nama: "SD Kelas 4-6 (10-12 th)", rentangUsia: "10-12 th", kategori: ["SD_4_6"] },
    { kode: "SMP_SMA", jalur: "SISWA", nama: "SMP & SMA/SMK (13-18 th)", rentangUsia: "13-18 th", kategori: ["SMP_1_3", "SMA_SMK_4_6"] },
    { kode: "PIC_SEKOLAH", jalur: "SISWA", nama: "PIC Sekolah (Pendidik & Tenaga Kependidikan)", rentangUsia: null, kategori: ["PENDIDIK", "TENAGA_KEPENDIDIKAN"] },
    { kode: "BALITA_6_11BLN", jalur: "TIGA_B", nama: "Balita (6-11 bulan)", rentangUsia: "6-11 bln", kategori: ["BALITA"] },
    { kode: "BALITA_1_3TH", jalur: "TIGA_B", nama: "Balita (1-3 tahun)", rentangUsia: "1-3 th", kategori: ["BALITA"] },
    { kode: "BUMIL", jalur: "TIGA_B", nama: "Ibu Hamil", rentangUsia: null, kategori: ["BUMIL"] },
    { kode: "BUSUI", jalur: "TIGA_B", nama: "Ibu Menyusui", rentangUsia: null, kategori: ["BUSUI"] },
  ];

  for (const ku of kelompokUmurData) {
    await prisma.kelompokUmurMenu.upsert({
      where: { kode: ku.kode },
      update: {},
      create: {
        kode: ku.kode,
        jalur: ku.jalur,
        nama: ku.nama,
        rentangUsia: ku.rentangUsia,
        kategoriPenerima: { connect: ku.kategori.map((k) => ({ id: kategoriMap[k] })) },
      },
    });
  }

  // ---------------------------------------------------------------------
  // 3. BATAS HARGA PORSI
  // ---------------------------------------------------------------------
  await prisma.batasHargaPorsi.upsert({
    where: { jenisPorsi: "KECIL" },
    update: {},
    create: { jenisPorsi: "KECIL", batasMaksimal: 8000 },
  });
  await prisma.batasHargaPorsi.upsert({
    where: { jenisPorsi: "BESAR" },
    update: {},
    create: { jenisPorsi: "BESAR", batasMaksimal: 10000 },
  });

  // ---------------------------------------------------------------------
  // 4. CHART OF ACCOUNTS — final per 03-DECISIONS.md v5.5
  // Header (1000/1100/2000) SENGAJA TIDAK di-seed — bukan akun transaksi,
  // cuma judul section di Excel asli.
  // ---------------------------------------------------------------------
  const akunData = [
    { kode: "1101", nama: "Petty Cash/Cash in Hand", tipe: "KAS", kategoriDana: null },
    { kode: "1102", nama: "Kas di Bank", tipe: "KAS", kategoriDana: null },
    { kode: "2110", nama: "Dana Bahan Baku", tipe: "DANA", kategoriDana: "BAHAN_MAKANAN" },
    { kode: "2120", nama: "Dana & Biaya Operasional", tipe: "BIAYA", kategoriDana: "OPERASIONAL" },
    { kode: "2121", nama: "Biaya Insentif Fasilitas", tipe: "BIAYA", kategoriDana: "INSENTIF_FASILITAS" },
    { kode: "2122", nama: "Biaya Lainnya", tipe: "BIAYA", kategoriDana: null },
    { kode: "2130", nama: "Dana Insentif Fasilitas", tipe: "DANA", kategoriDana: "INSENTIF_FASILITAS" },
    { kode: "2140", nama: "Pungutan/Setoran PPN", tipe: "PAJAK", kategoriDana: null },
    { kode: "2150", nama: "Pungutan/Setoran PPh 21", tipe: "PAJAK", kategoriDana: null },
    { kode: "2160", nama: "Pungutan/Setoran PPh 22", tipe: "PAJAK", kategoriDana: null },
    { kode: "2170", nama: "Pungutan/Setoran PPh 23", tipe: "PAJAK", kategoriDana: null },
    { kode: "2180", nama: "Pungutan/Setoran PPh pasal 4 ayat (2)", tipe: "PAJAK", kategoriDana: null },
    { kode: "2190", nama: "Biaya Bahan Baku", tipe: "BIAYA", kategoriDana: "BAHAN_MAKANAN" },
  ];

  for (const a of akunData) {
    await prisma.akun.upsert({
      where: { kode: a.kode },
      update: { nama: a.nama, tipe: a.tipe, kategoriDana: a.kategoriDana },
      create: a,
    });
  }

  // ---------------------------------------------------------------------
  // 5. KENDARAAN — 3 mobil (ganti nama/plat sesuai data asli SPPG)
  // ---------------------------------------------------------------------
  const kendaraanNama = ["Mobil 1", "Mobil 2", "Mobil 3"];
  for (const nama of kendaraanNama) {
    const existing = await prisma.kendaraan.findFirst({ where: { namaKendaraan: nama } });
    if (!existing) {
      await prisma.kendaraan.create({ data: { namaKendaraan: nama } });
    }
  }

  // ---------------------------------------------------------------------
  // 5b. BAHAN POKOK — bahan umum menu MBG (permanen, bukan test-only)
  // ---------------------------------------------------------------------
  const bahanPokokData = [
    { nama: "Beras", satuan: "kg" },
    { nama: "Minyak Goreng", satuan: "liter" },
    { nama: "Telur Ayam", satuan: "kg" },
    { nama: "Daging Ayam", satuan: "kg" },
    { nama: "Tempe", satuan: "kg" },
    { nama: "Tahu", satuan: "kg" },
    { nama: "Bawang Merah", satuan: "kg" },
    { nama: "Bawang Putih", satuan: "kg" },
    { nama: "Gula Pasir", satuan: "kg" },
    { nama: "Garam", satuan: "kg" },
  ];

  for (const b of bahanPokokData) {
    await prisma.bahanPokok.upsert({
      where: { nama: b.nama },
      update: {},
      create: { ...b, aktif: true },
    });
  }

  // ---------------------------------------------------------------------
  // 6. USER — 1 akun per role. GANTI PASSWORD INI SEBELUM DIPAKAI DI PROD.
  // ---------------------------------------------------------------------
  const userData = [
    { username: "admin", nama: "Admin", role: "ADMIN" },
    { username: "aslap", nama: "Aslap", role: "ASLAP" },
    { username: "mitra", nama: "Mitra", role: "MITRA" },
    { username: "ahligizi", nama: "Ahli Gizi", role: "AHLI_GIZI" },
    { username: "akuntan", nama: "Akuntan", role: "AKUNTAN" },
    { username: "kepalasppg", nama: "Kepala SPPG", role: "KEPALA_SPPG" },
  ];

  const defaultPasswordHash = await bcrypt.hash("ganti-password-ini", 10);
  for (const u of userData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash: defaultPasswordHash },
    });
  }

  console.log("Seed selesai (hanya referensi + user).");
}

async function seedTransaksi() {
  console.log("Memulai seed data transaksional (seedTransaksi)...");

  // 1. Ambil data referensi dari DB
  const userAslap = await prisma.user.findUnique({ where: { username: "aslap" } });
  const userMitra = await prisma.user.findUnique({ where: { username: "mitra" } });
  const userAhliGizi = await prisma.user.findUnique({ where: { username: "ahligizi" } });
  const userAkuntan = await prisma.user.findUnique({ where: { username: "akuntan" } });
  const userKepalaSPPG = await prisma.user.findUnique({ where: { username: "kepalasppg" } });

  const akun1101 = await prisma.akun.findUnique({ where: { kode: "1101" } });
  const akun1102 = await prisma.akun.findUnique({ where: { kode: "1102" } });
  const akun2110 = await prisma.akun.findUnique({ where: { kode: "2110" } });
  const akun2120 = await prisma.akun.findUnique({ where: { kode: "2120" } });
  const akun2130 = await prisma.akun.findUnique({ where: { kode: "2130" } });
  const akun2190 = await prisma.akun.findUnique({ where: { kode: "2190" } });

  const kats = await prisma.kategoriPenerima.findMany({ orderBy: { urutan: "asc" } });
  const katMap = {};
  kats.forEach((k) => (katMap[k.kode] = k));

  const kelompokUmurList = await prisma.kelompokUmurMenu.findMany();
  const kuTargetKodes = ["TK_PAUD", "SD_1_3", "SD_4_6", "SMP_SMA"];
  const kelompokUmurSelected = kelompokUmurList.filter((ku) => kuTargetKodes.includes(ku.kode));

  const bahanPokokList = await prisma.bahanPokok.findMany({ where: { aktif: true } });
  const bahanMap = {};
  bahanPokokList.forEach((b) => (bahanMap[b.nama] = b));

  // LEVEL 1-2: Master baru
  let sekolah = await prisma.sekolah.findFirst({ where: { nama: "SD Negeri Contoh" } });
  if (!sekolah) {
    sekolah = await prisma.sekolah.create({
      data: {
        nama: "SD Negeri Contoh",
        alamat: "Jl. Raya No.1",
        jenjang: "SD",
        aktif: true,
      },
    });
  }

  let posyandu = await prisma.posyandu.findFirst({ where: { nama: "Posyandu Melati" } });
  if (!posyandu) {
    posyandu = await prisma.posyandu.create({
      data: {
        nama: "Posyandu Melati",
        alamat: "Jl. Raya No.1",
        aktif: true,
      },
    });
  }

  let supplier1 = await prisma.supplier.findFirst({ where: { nama: "UD Sembako" } });
  if (!supplier1) {
    supplier1 = await prisma.supplier.create({
      data: {
        nama: "UD Sembako",
        alamat: "Kp. Pusdik",
        kontak: "081234567890",
        aktif: true,
      },
    });
  }

  let supplier2 = await prisma.supplier.findFirst({ where: { nama: "Toko Bahan Pokok" } });
  if (!supplier2) {
    supplier2 = await prisma.supplier.create({
      data: {
        nama: "Toko Bahan Pokok",
        alamat: "Kp. Pasar",
        kontak: "081987654321",
        aktif: true,
      },
    });
  }

  const meks = [
    { nama: "Tukang Masak", tarifHarian: 100000 },
    { nama: "Pengantar", tarifHarian: 90000 },
    { nama: "Petugas Dapur", tarifHarian: 80000 },
  ];
  for (const j of meks) {
    await prisma.jenisPekerjaan.upsert({
      where: { nama: j.nama },
      update: { tarifHarian: j.tarifHarian },
      create: { nama: j.nama, tarifHarian: j.tarifHarian, aktif: true },
    });
  }

  const kendaraanList = await prisma.kendaraan.findMany({ where: { aktif: true } });

  // PERIODE:
  // Periode 13: 6 Juli – 19 Juli 2026
  // Periode 14: 20 Juli – 2 Agustus 2026
  const baseDate = new Date("2026-07-06T00:00:00.000Z");

  function addDays(d, days) {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  }

  const periodesData = [
    {
      nomor: 13,
      mulai: addDays(baseDate, 0), // 2026-07-06
      selesai: addDays(baseDate, 13), // 2026-07-19
      berikutnya: addDays(baseDate, 14), // 2026-07-20
    },
    {
      nomor: 14,
      mulai: addDays(baseDate, 14), // 2026-07-20
      selesai: addDays(baseDate, 27), // 2026-08-02
      berikutnya: addDays(baseDate, 28), // 2026-08-03
    },
  ];

  const periodes = [];

  for (const pData of periodesData) {
    let p = await prisma.periode.findFirst({
      where: { tanggalMulai: pData.mulai, tanggalSelesai: pData.selesai },
    });
    if (!p) {
      p = await prisma.periode.create({
        data: {
          tanggalMulai: pData.mulai,
          tanggalSelesai: pData.selesai,
          status: "AKTIF",
          anggaranAlokasi: 500000000,
          totalDanaDiterima: 500000000,
        },
      });
    } else {
      p = await prisma.periode.update({
        where: { id: p.id },
        data: { status: "AKTIF" },
      });
    }
    periodes.push({ ...pData, record: p });

    // LEVEL 3: SetupLembaga
    await prisma.setupLembaga.upsert({
      where: { periodeId: p.id },
      update: {
        namaLembaga: "SPPG Sumedang Ujungjaya Palabuan",
        alamat: "Sumedang",
        namaKepalaSPPG: "Kepala SPPG",
        namaAkuntanSPPG: "Akuntan",
        tempatPelaporan: "Sumedang",
      },
      create: {
        periodeId: p.id,
        namaLembaga: "SPPG Sumedang Ujungjaya Palabuan",
        alamat: "Sumedang",
        namaKepalaSPPG: "Kepala SPPG",
        namaAkuntanSPPG: "Akuntan",
        namaYayasan: "Yayasan SPPG Sumedang",
        ketuaYayasan: "H. Ahmad Sumedang",
        nomorRekeningVA: "1234567890",
        tahunAnggaran: 2026,
        awalPeriodeBerikutnya: pData.berikutnya,
        tanggalPelaporan: pData.selesai,
        tempatPelaporan: "Sumedang",
      },
    });

    // LEVEL 4: Saldo Awal
    const saldoAkuns = [
      { akunId: akun1101.id, saldoAwal: 5000000 },
      { akunId: akun1102.id, saldoAwal: 50000000 },
      { akunId: akun2110.id, saldoAwal: 135306000 },
      { akunId: akun2120.id, saldoAwal: 274694000 },
      { akunId: akun2130.id, saldoAwal: 90000000 },
    ];
    for (const sa of saldoAkuns) {
      await prisma.saldoAwalPeriode.upsert({
        where: { periodeId_akunId: { periodeId: p.id, akunId: sa.akunId } },
        update: { saldoAwal: sa.saldoAwal },
        create: { periodeId: p.id, akunId: sa.akunId, saldoAwal: sa.saldoAwal },
      });
    }

    // SaldoAwalBarang: 5 bahan
    const saldoBarangs = [
      { nama: "Beras", qty: 100, harga: 14000 },
      { nama: "Minyak Goreng", qty: 50, harga: 18000 },
      { nama: "Telur Ayam", qty: 30, harga: 28000 },
      { nama: "Daging Ayam", qty: 40, harga: 38000 },
      { nama: "Tempe", qty: 25, harga: 12000 },
    ];
    for (const sb of saldoBarangs) {
      if (bahanMap[sb.nama]) {
        await prisma.saldoAwalBarang.upsert({
          where: {
            periodeId_bahanPokokId: {
              periodeId: p.id,
              bahanPokokId: bahanMap[sb.nama].id,
            },
          },
          update: { saldoAwalQty: sb.qty, hargaBeliAwal: sb.harga },
          create: {
            periodeId: p.id,
            bahanPokokId: bahanMap[sb.nama].id,
            saldoAwalQty: sb.qty,
            hargaBeliAwal: sb.harga,
          },
        });
      }
    }

    // HargaBahanPeriode: 10 bahan
    const hargaBahanMap = {
      Beras: 14000,
      "Minyak Goreng": 18000,
      "Telur Ayam": 28000,
      "Daging Ayam": 38000,
      Tempe: 12000,
      Tahu: 10000,
      "Bawang Merah": 35000,
      "Bawang Putih": 40000,
      "Gula Pasir": 16000,
      Garam: 5000,
    };
    for (const [bNama, hrg] of Object.entries(hargaBahanMap)) {
      if (bahanMap[bNama]) {
        await prisma.hargaBahanPeriode.upsert({
          where: {
            periodeId_bahanPokokId: {
              periodeId: p.id,
              bahanPokokId: bahanMap[bNama].id,
            },
          },
          update: { harga: hrg },
          create: {
            periodeId: p.id,
            bahanPokokId: bahanMap[bNama].id,
            harga: hrg,
            createdById: userMitra.id,
          },
        });
      }
    }

    // HargaPaketKategoriPeriode: 13 kategori
    for (const k of kats) {
      const hrg = k.jenisPorsi === "KECIL" ? 8000 : 10000;
      await prisma.hargaPaketKategoriPeriode.upsert({
        where: {
          periodeId_kategoriId: { periodeId: p.id, kategoriId: k.id },
        },
        update: { hargaSatuan: hrg },
        create: {
          periodeId: p.id,
          kategoriId: k.id,
          hargaSatuan: hrg,
          createdById: userMitra.id,
        },
      });
    }

    // LEVEL 5: GrupHari & Penerima Manfaat (2 grup per periode: SENIN-JUMAT & SABTU)
    const grupHari1 = await prisma.grupHari.upsert({
      where: { periodeId_label: { periodeId: p.id, label: "SENIN-JUMAT" } },
      update: { hariAktif: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"] },
      create: {
        periodeId: p.id,
        label: "SENIN-JUMAT",
        hariAktif: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"],
      },
    });

    const grupHari2 = await prisma.grupHari.upsert({
      where: { periodeId_label: { periodeId: p.id, label: "SABTU" } },
      update: { hariAktif: ["SABTU"] },
      create: {
        periodeId: p.id,
        label: "SABTU",
        hariAktif: ["SABTU"],
      },
    });

    const existingPMs = await prisma.inputPenerimaManfaat.findMany({
      where: { periodeId: p.id },
    });
    let inputPM1, inputPM2;
    if (existingPMs.length >= 2) {
      inputPM1 = await prisma.inputPenerimaManfaat.update({
        where: { id: existingPMs[0].id },
        data: { grupHariId: grupHari1.id },
      });
      inputPM2 = await prisma.inputPenerimaManfaat.update({
        where: { id: existingPMs[1].id },
        data: { grupHariId: grupHari2.id },
      });
    } else {
      inputPM1 = await prisma.inputPenerimaManfaat.create({
        data: {
          periodeId: p.id,
          grupHariId: grupHari1.id,
          createdById: userAslap.id,
        },
      });

      inputPM2 = await prisma.inputPenerimaManfaat.create({
        data: {
          periodeId: p.id,
          grupHariId: grupHari2.id,
          createdById: userAslap.id,
        },
      });
    }

    const kategoriQtyConfig = {
      PAUD_TK: { l: 15, p: 15 },
      SD_1_3: { l: 60, p: 60 },
      SD_4_6: { l: 50, p: 50 },
      SMP_1_3: { l: 40, p: 40 },
      SMA_SMK_4_6: { l: 40, p: 40 },
      ATS_KURANG_9TH: { l: 5, p: 5 },
      ATS_9_18TH: { l: 5, p: 5 },
      PENDIDIK: { l: 10, p: 10 },
      TENAGA_KEPENDIDIKAN: { l: 5, p: 5 },
      BUMIL: { l: 0, p: 15 },
      BUSUI: { l: 0, p: 15 },
      BALITA: { l: 10, p: 10 },
      KADER_POSYANDU: { l: 0, p: 10 },
    };

    for (const pmInput of [inputPM1, inputPM2]) {
      const existingDetails = await prisma.inputPenerimaManfaatDetail.findMany({
        where: { inputPenerimaManfaatId: pmInput.id },
      });
      if (existingDetails.length === 0) {
        for (const k of kats) {
          const cfg = kategoriQtyConfig[k.kode] || { l: 10, p: 10 };
          const isSiswa = k.jenisSasaran === "PESERTA_DIDIK";
          await prisma.inputPenerimaManfaatDetail.create({
            data: {
              inputPenerimaManfaatId: pmInput.id,
              kategoriId: k.id,
              sekolahId: isSiswa ? sekolah.id : null,
              posyanduId: isSiswa ? null : posyandu.id,
              lakiLaki: cfg.l,
              perempuan: cfg.p,
            },
          });
        }
      }
    }
  }

  // Seed SekolahKelasDetail
  console.log("  Seeding SekolahKelasDetail...");
  const sdContoh = await prisma.sekolah.findFirst({ where: { nama: "SD Negeri Contoh" } });
  const periode13 = await prisma.periode.findFirst({ where: { tanggalMulai: addDays(baseDate, 0) } });
  const periode14 = await prisma.periode.findFirst({ where: { tanggalMulai: addDays(baseDate, 14) } });

  const kelasData = [
    { namaKelas: "1", jumlah: 28 },
    { namaKelas: "2", jumlah: 25 },
    { namaKelas: "3", jumlah: 30 },
    { namaKelas: "4", jumlah: 27 },
    { namaKelas: "5", jumlah: 24 },
    { namaKelas: "6", jumlah: 26 },
    { namaKelas: "PIC", jumlah: 10 },
  ];

  for (const periode of [periode13, periode14]) {
    if (!periode || !sdContoh) continue;
    for (const k of kelasData) {
      await prisma.sekolahKelasDetail.upsert({
        where: {
          periodeId_sekolahId_namaKelas: {
            periodeId: periode.id,
            sekolahId: sdContoh.id,
            namaKelas: k.namaKelas,
          },
        },
        update: { jumlah: k.jumlah },
        create: {
          periodeId: periode.id,
          sekolahId: sdContoh.id,
          namaKelas: k.namaKelas,
          jumlah: k.jumlah,
        },
      });
    }
  }
  console.log("  SekolahKelasDetail selesai.");

  // LEVEL 6-14: Menu, RAB, PO, Jurnal, Stok, Upah, Dokumen
  console.log("Membuat Menu Harian, RAB, PO, Jurnal, Stok, Upah & Dokumen...");

  const menuVariations = [
    { karbo: "Nasi Putih", laukH: "Ayam Goreng Lengkuas", laukN: "Tempe Bacem", sayur: "Tumis Buncis Wortel", buah: "Pisang Ambon" },
    { karbo: "Nasi Uduk", laukH: "Telur Balado", laukN: "Tahu Goreng Tepung", sayur: "Sayur Sop Bening", buah: "Jeruk Manis" },
    { karbo: "Nasi Kuning", laukH: "Ayam Suwir Serundeng", laukN: "Orek Tempe Manis", sayur: "Tumis Kangkung", buah: "Semangka Potong" },
    { karbo: "Nasi Merah", laukH: "Ikan Kembung Bakar", laukN: "Tahu Bacem", sayur: "Sayur Asem", buah: "Melon Potong" },
    { karbo: "Mie Goreng", laukH: "Telur Dadar Sayur", laukN: "Perkedel Tahu", sayur: "Capcay Sayur", buah: "Pepaya Potong" },
    { karbo: "Nasi Liwet", laukH: "Ayam Bakar Kecap", laukN: "Tumis Tahu Cabai Hijau", sayur: "Sayur Bayam Jagung", buah: "Apel Merah" },
    { karbo: "Nasi Gurih", laukH: "Ikan Lele Goreng", laukN: "Tempe Goreng Tepung", sayur: "Tumis Sawi Hijau", buah: "Salak" },
    { karbo: "Ubi Kukus", laukH: "Daging Ayam Semur", laukN: "Tahu Segitiga Goreng", sayur: "Sayur Lodeh", buah: "Pisang Ambon" },
    { karbo: "Bihun Goreng", laukH: "Telur Rebus Sambal", laukN: "Perkedel Jagung Tahu", sayur: "Tumis Labu Siam", buah: "Jeruk Manis" },
    { karbo: "Nasi Hainan", laukH: "Ayam Kukus Jahe", laukN: "Tumis Tempe Buncis", sayur: "Sop Kimlo", buah: "Semangka Potong" },
    { karbo: "Singkong Rebus", laukH: "Ikan Patin Sop", laukN: "Tahu Isi Sayur", sayur: "Tumis Bayam", buah: "Melon Potong" },
    { karbo: "Kentang Rebus", laukH: "Telur Ceplok Kecap", laukN: "Tempe Mendoan", sayur: "Sayur Bening Oyong", buah: "Pepaya Potong" },
    { karbo: "Nasi Tutug Oncom", laukH: "Ayam Ungkep Goreng", laukN: "Tahu Goreng Kuning", sayur: "Lalapan & Sayur Asem", buah: "Apel Merah" },
    { karbo: "Nasi Daun Jeruk", laukH: "Ikan Nila Goreng", laukN: "Tempe Bacem Gurih", sayur: "Tumis Kacang Panjang", buah: "Salak" },
  ];

  let nomorBuktiJurnalPerPeriode = { 13: 1, 14: 1 };

  for (const pObj of periodes) {
    const p = pObj.record;
    const pNomor = pObj.nomor;
    const pMulai = pObj.mulai;

    // Upah Header: 3 jenis pekerjaan × 2 periode
    const jobs = await prisma.jenisPekerjaan.findMany();
    const upahHeaderList = [];
    const relawanNames = ["Budi Santoso", "Siti Aminah", "Ahmad Hidayat"];

    for (let jIdx = 0; jIdx < jobs.length; jIdx++) {
      const job = jobs[jIdx];
      const relawanName = relawanNames[jIdx % relawanNames.length];

      let upahHeader = await prisma.daftarNominatifUpah.findFirst({
        where: { periodeId: p.id, jenisPekerjaan: job.nama, namaRelawan: relawanName },
      });
      if (!upahHeader) {
        upahHeader = await prisma.daftarNominatifUpah.create({
          data: {
            periodeId: p.id,
            jenisPekerjaan: job.nama,
            namaRelawan: relawanName,
            tarifHarian: job.tarifHarian,
            danaKesehatan: 50000,
            tk: 25000,
            pj: 25000,
          },
        });
      }
      upahHeaderList.push(upahHeader);
    }

    // Generate 14 hari per periode
    for (let dayIdx = 0; dayIdx < 14; dayIdx++) {
      const currentDate = addDays(pMulai, dayIdx);
      const varMenu = menuVariations[((pNomor - 13) * 14 + dayIdx) % menuVariations.length];

      // 1. MenuHarian (LEVEL 6-8)
      let menuHarian = await prisma.menuHarian.findUnique({
        where: { periodeId_tanggal: { periodeId: p.id, tanggal: currentDate } },
      });

      if (!menuHarian) {
        menuHarian = await prisma.menuHarian.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            status: "DISETUJUI",
          },
        });

        // LEVEL 8: Approval Menu
        await prisma.approval.create({
          data: {
            menuHarianId: menuHarian.id,
            status: "DISETUJUI",
            approvedById: userKepalaSPPG.id,
            catatan: "Menu Harian Disetujui Kepala SPPG",
          },
        });

        // PengirimanHarian (4 per hari = 112 total)
        for (let kIdx = 0; kIdx < 4; kIdx++) {
          const kend = kendaraanList[kIdx % kendaraanList.length];
          const katForShipment = kats[kIdx % kats.length];
          await prisma.pengirimanHarian.create({
            data: {
              menuHarianId: menuHarian.id,
              kendaraanId: kend.id,
              catatan: `Pengiriman Armada ${kend.namaKendaraan} - Rute ${kIdx + 1}`,
              kategoriPenerima: { connect: [{ id: katForShipment.id }] },
            },
          });
        }

        // 4 Kelompok Umur Menu per MenuHarian
        for (const ku of kelompokUmurSelected) {
          const blok = await prisma.menuHarianBlok.create({
            data: {
              menuHarianId: menuHarian.id,
              kelompokUmurMenuId: ku.id,
              createdById: userAhliGizi.id,
            },
          });

          // MenuTargetGizi
          await prisma.menuTargetGizi.create({
            data: {
              blokId: blok.id,
              targetEnergi: ku.kode.includes("TK") ? 450 : ku.kode.includes("SD_1") ? 550 : 650,
              targetProtein: ku.kode.includes("TK") ? 15 : ku.kode.includes("SD_1") ? 20 : 25,
              targetLemak: 18,
              targetKarbohidrat: 75,
              targetSerat: 6,
            },
          });

          // 5 MenuItem per blok
          const itemConfigs = [
            { nama: varMenu.karbo, komp: "KARBOHIDRAT", b1: "Beras", b2: "Minyak Goreng" },
            { nama: varMenu.laukH, komp: "LAUK_HEWANI", b1: "Daging Ayam", b2: "Minyak Goreng" },
            { nama: varMenu.laukN, komp: "LAUK_NABATI", b1: "Tempe", b2: "Gula Pasir" },
            { nama: varMenu.sayur, komp: "SAYUR", b1: "Bawang Merah", b2: "Bawang Putih" },
            { nama: varMenu.buah, komp: "BUAH", b1: "Gula Pasir", b2: "Garam" },
          ];

          for (const ic of itemConfigs) {
            const menuItem = await prisma.menuItem.create({
              data: {
                blokId: blok.id,
                namaMenu: ic.nama,
                komponen: ic.komp,
              },
            });

            // 2 MenuItemBahan per item
            const b1Obj = bahanMap[ic.b1] || bahanMap["Beras"];
            const b2Obj = bahanMap[ic.b2] || bahanMap["Minyak Goreng"];

            await prisma.menuItemBahan.create({
              data: {
                menuItemId: menuItem.id,
                bahanPokokId: b1Obj.id,
                beratBersihGr: 60,
                beratURT: "1 PORSI",
                energiKkal: 150,
                proteinGr: 8,
                lemakGr: 4,
                karbohidratGr: 25,
                seratGr: 2,
                bddPersen: 100,
                beratKotorGr: 60,
                hargaSatuan: 15000,
                beratSatuanGr: 1000,
                totalHargaBahan: 900,
              },
            });

            await prisma.menuItemBahan.create({
              data: {
                menuItemId: menuItem.id,
                bahanPokokId: b2Obj.id,
                beratBersihGr: 10,
                beratURT: "1 sdm",
                energiKkal: 90,
                proteinGr: 0,
                lemakGr: 10,
                karbohidratGr: 0,
                seratGr: 0,
                bddPersen: 100,
                beratKotorGr: 10,
                hargaSatuan: 18000,
                beratSatuanGr: 1000,
                totalHargaBahan: 180,
              },
            });
          }
        }
      }

      // 2. RAB Harian (LEVEL 9-10)
      const selectedBahanForRAB = [
        bahanMap["Beras"],
        bahanMap["Minyak Goreng"],
        bahanMap["Daging Ayam"],
        bahanMap["Tempe"],
        bahanMap["Bawang Merah"],
      ];

      let totalRabNominal = 0;
      const rabItemDatas = [];

      for (const bhn of selectedBahanForRAB) {
        if (!bhn) continue;
        const qtyS = 15.5;
        const qtyB = 4.5;
        const qtyTot = 20.0;
        const hrg = bhn.nama === "Daging Ayam" ? 38000 : bhn.nama === "Beras" ? 14000 : 18000;
        const sub = qtyTot * hrg;
        totalRabNominal += sub;

        rabItemDatas.push({
          bahanPokokId: bhn.id,
          qtySiswa: qtyS,
          qtyB3: qtyB,
          qtyTotal: qtyTot,
          satuan: bhn.satuan,
          hargaSatuan: hrg,
          subtotal: sub,
        });
      }

      let rabHarian = await prisma.rabHarian.findUnique({
        where: { periodeId_tanggal: { periodeId: p.id, tanggal: currentDate } },
      });

      if (!rabHarian) {
        rabHarian = await prisma.rabHarian.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            menuHarianId: menuHarian.id,
            status: "DISETUJUI",
            totalKebutuhan: totalRabNominal,
            totalPagu: totalRabNominal + 100000,
            selisih: 100000,
            verifiedAt: currentDate,
            verifiedById: userAkuntan.id,
            createdById: userAkuntan.id,
          },
        });

        // LEVEL 10: Approval RAB
        await prisma.approval.create({
          data: {
            rabHarianId: rabHarian.id,
            status: "DISETUJUI",
            approvedById: userKepalaSPPG.id,
            catatan: "RAB Harian Disetujui Kepala SPPG",
          },
        });

        for (const rItem of rabItemDatas) {
          await prisma.rabHarianItem.create({
            data: {
              rabHarianId: rabHarian.id,
              ...rItem,
            },
          });
        }
      }

      // AnggaranHarian (3 kategori dana)
      const existingAnggaran = await prisma.anggaranHarian.findMany({
        where: { periodeId: p.id, tanggal: currentDate },
      });

      if (existingAnggaran.length === 0) {
        const angBahan = await prisma.anggaranHarian.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            kategoriDana: "BAHAN_MAKANAN",
            jumlahPaket: 380,
            hargaSatuan: 8500,
            rab: totalRabNominal,
            aktual: totalRabNominal,
            selisih: 0,
            keterangan: "Alokasi Bahan Makanan Harian",
          },
        });

        for (const k of kats) {
          const hrg = k.jenisPorsi === "KECIL" ? 8000 : 10000;
          const porsiCount = k.kode.includes("SD_1_3") ? 120 : k.kode.includes("SD_4_6") ? 100 : 20;
          await prisma.anggaranBahanMakananDetail.create({
            data: {
              anggaranHarianId: angBahan.id,
              kategoriId: k.id,
              jumlahPaket: porsiCount,
              hargaSatuan: hrg,
              subtotal: porsiCount * hrg,
            },
          });
        }

        await prisma.anggaranHarian.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            kategoriDana: "OPERASIONAL",
            jumlahPaket: 1,
            hargaSatuan: 500000,
            rab: 500000,
            aktual: 500000,
            selisih: 0,
            keterangan: "Biaya Operasional Harian",
          },
        });

        await prisma.anggaranHarian.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            kategoriDana: "INSENTIF_FASILITAS",
            jumlahPaket: 1,
            hargaSatuan: 900000,
            rab: 900000,
            aktual: 900000,
            selisih: 0,
            keterangan: "Biaya Insentif & Fasilitas Harian",
          },
        });
      }

      // 3. TransaksiPembelian PO (LEVEL 11-12)
      const selectedSupplier = dayIdx % 2 === 0 ? supplier1 : supplier2;
      let po = await prisma.transaksiPembelian.findFirst({
        where: { rabHarianId: rabHarian.id },
      });

      if (!po) {
        po = await prisma.transaksiPembelian.create({
          data: {
            rabHarianId: rabHarian.id,
            supplierId: selectedSupplier.id,
            tanggal: currentDate,
            catatan: `PO Pembelian Bahan Harian #${dayIdx + 1}`,
            status: "DIREALISASI",
            createdById: userAkuntan.id,
            diterimaOlehId: userAslap.id,
            diterimaAt: currentDate,
          },
        });

        for (const rItem of rabItemDatas) {
          await prisma.transaksiPembelianItem.create({
            data: {
              transaksiId: po.id,
              bahanPokokId: rItem.bahanPokokId,
              qty: rItem.qtyTotal,
              hargaSatuan: rItem.hargaSatuan,
              subtotal: rItem.subtotal,
              qtyRealisasi: rItem.qtyTotal,
              hargaSatuanRealisasi: rItem.hargaSatuan,
              subtotalRealisasi: rItem.subtotal,
              qtyDiterima: rItem.qtyTotal,
              updatedById: userMitra.id,
            },
          });
        }
      }

      // 4. JurnalTransaksi & Stok (LEVEL 13)
      const existingJurnal = await prisma.jurnalTransaksi.findMany({
        where: { transaksiPembelianId: po.id },
      });

      if (existingJurnal.length === 0) {
        const nBukti1 = nomorBuktiJurnalPerPeriode[pNomor]++;
        await prisma.jurnalTransaksi.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            nomorBukti: nBukti1,
            uraian: `Pencatatan Biaya Bahan Baku PO #${po.id.slice(-6)}`,
            jenis: "MASUK",
            nominal: totalRabNominal,
            akunDanaBiayaId: akun2190.id,
            akunKasId: akun1102.id,
            tagPengeluaran: "BAHAN_MAKANAN",
            transaksiPembelianId: po.id,
            createdById: userAkuntan.id,
          },
        });

        const nBukti2 = nomorBuktiJurnalPerPeriode[pNomor]++;
        await prisma.jurnalTransaksi.create({
          data: {
            periodeId: p.id,
            tanggal: currentDate,
            nomorBukti: nBukti2,
            uraian: `Pembayaran Kas PO #${po.id.slice(-6)}`,
            jenis: "KELUAR",
            nominal: totalRabNominal,
            akunDanaBiayaId: akun2190.id,
            akunKasId: akun1102.id,
            tagPengeluaran: "BAHAN_MAKANAN",
            transaksiPembelianId: po.id,
            createdById: userAkuntan.id,
          },
        });
      }

      // MutasiStok
      const existingMutasi = await prisma.mutasiStok.findMany({
        where: { tanggal: currentDate },
      });

      if (existingMutasi.length === 0 && bahanMap["Beras"]) {
        const bUtama = bahanMap["Beras"];
        await prisma.mutasiStok.create({
          data: {
            bahanPokokId: bUtama.id,
            tanggal: currentDate,
            jenis: "MASUK",
            qty: 20.0,
            keterangan: "Penerimaan Barang dari PO",
            supplierId: selectedSupplier.id,
            hargaBeli: 14000,
            createdById: userAslap.id,
          },
        });

        await prisma.mutasiStok.create({
          data: {
            bahanPokokId: bUtama.id,
            tanggal: currentDate,
            jenis: "KELUAR",
            qty: 20.0,
            keterangan: "Pengeluaran Bahan ke Dapur Produksi",
            kelompokPenerima: "SISWA",
            createdById: userAslap.id,
          },
        });
      }

      // 5. Upah Harian (LEVEL 14)
      for (const upahH of upahHeaderList) {
        await prisma.daftarNominatifUpahHarian.upsert({
          where: {
            daftarNominatifId_tanggal: {
              daftarNominatifId: upahH.id,
              tanggal: currentDate,
            },
          },
          update: { nominal: upahH.tarifHarian || 100000 },
          create: {
            daftarNominatifId: upahH.id,
            tanggal: currentDate,
            nominal: upahH.tarifHarian || 100000,
          },
        });
      }
    }

    // DokumenResmi (LEVEL 14)
    const docs = [
      { jenis: "LPA", nomor: `LPA/SPPG/${pNomor}/2026` },
      { jenis: "SPTJ", nomor: `SPTJ/SPPG/${pNomor}/2026` },
      { jenis: "BAPSD", nomor: `BAPSD/SPPG/${pNomor}/2026` },
    ];
    for (const d of docs) {
      await prisma.dokumenResmi.upsert({
        where: {
          periodeId_jenisDokumen: {
            periodeId: p.id,
            jenisDokumen: d.jenis,
          },
        },
        update: { nomorDokumen: d.nomor },
        create: {
          periodeId: p.id,
          jenisDokumen: d.jenis,
          nomorDokumen: d.nomor,
          createdById: userAkuntan.id,
        },
      });
    }
  }

  // --- MasterTargetGizi ---
  const kList = await prisma.kelompokUmurMenu.findMany();
  const fk = (kode) => kList.find(k => k.kode === kode);

  const masterTargets = [
    { kelompokUmurMenuId: fk('TK_PAUD').id, energiKkal: 350, proteinGr: 6, lemakGr: 12, karbohidratGr: 55, seratGr: 3 },
    { kelompokUmurMenuId: fk('SD_1_3').id, energiKkal: 413, proteinGr: 10, lemakGr: 13, karbohidratGr: 62, seratGr: 5 },
    { kelompokUmurMenuId: fk('SD_4_6').id, energiKkal: 683, proteinGr: 18, lemakGr: 22, karbohidratGr: 101, seratGr: 8 },
    { kelompokUmurMenuId: fk('SMP_SMA').id, energiKkal: 831, proteinGr: 24, lemakGr: 26, karbohidratGr: 122, seratGr: 10 },
    { kelompokUmurMenuId: fk('PIC_SEKOLAH').id, energiKkal: 600, proteinGr: 20, lemakGr: 18, karbohidratGr: 70, seratGr: 8 },
    { kelompokUmurMenuId: fk('BALITA_6_11BLN').id, energiKkal: 338, proteinGr: 5, lemakGr: 11, karbohidratGr: 53, seratGr: 3 },
    { kelompokUmurMenuId: fk('BALITA_1_3TH').id, energiKkal: 473, proteinGr: 7, lemakGr: 15, karbohidratGr: 75, seratGr: 5 },
    { kelompokUmurMenuId: fk('BUMIL').id, energiKkal: 879, proteinGr: 25, lemakGr: 23, karbohidratGr: 138, seratGr: 8 },
    { kelompokUmurMenuId: fk('BUSUI').id, energiKkal: 912, proteinGr: 30, lemakGr: 23, karbohidratGr: 143, seratGr: 8 },
  ];

  for (const mt of masterTargets) {
    if (!mt.kelompokUmurMenuId) continue;
    await prisma.masterTargetGizi.upsert({
      where: { kelompokUmurMenuId: mt.kelompokUmurMenuId },
      update: mt,
      create: mt,
    });
  }

  console.log('MasterTargetGizi seeded:', masterTargets.length);

  console.log("Seed data transaksional (seedTransaksi) BERHASIL!");
}


async function migrateFromExcel() {
  await main();
  const filePath = "G:\\My Drive\\Excel SPPG\\LAPORAN ASLAP BARU.xlsx";
  console.log("Reading Excel file from " + filePath);
  const wb = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(wb.Sheets["LAPORAN PER PERIODE"], { header: 1, defval: null });

  // Master Sekolah — 8 sekolah dari Excel
  const sekolahMaster = [
    { nama: "TK AMANAH", npsn: "20259690", alamat: "PALABUAN", jenjang: "TK" },
    { nama: "SDN WANAJAYA", npsn: "20208340", alamat: "PALABUAN", jenjang: "SD" },
    { nama: "SDN SUKARASA II", npsn: "20208754", alamat: "PALABUAN", jenjang: "SD" },
    { nama: "SDN CIMANUK", npsn: "70708797", alamat: "KEBONCAU", jenjang: "SD" },
    { nama: "SDN MARGAMULYA", npsn: "20208821", alamat: "KUDANGWANGI", jenjang: "SD" },
    { nama: "SDN UJUNGJAYA III", npsn: "20208337", alamat: "PALASARI", jenjang: "SD" },
    { nama: "SDN PALASARI", npsn: "20208724", alamat: "PALASARI", jenjang: "SD" },
    { nama: "SMK PELITA AL IKHSAN", npsn: "20268778", alamat: "UJUNGJAYA", jenjang: "SMA_SMK" }
  ];

  // Master Posyandu — 9 dari Excel
  const posyanduMaster = [
    "CEMPAKA 1", "CEMPAKA 2", "CEMPAKA 3",
    "TERATAI 1", "TERATAI 2", "TERATAI 3",
    "MAWAR 1", "MAWAR 2", "MAWAR 3"
  ];

  try {
    // Upsert Sekolah
    const sekolahMap = {};
    for (const s of sekolahMaster) {
      let existing = await prisma.sekolah.findFirst({
        where: { nama: { equals: s.nama, mode: "insensitive" } }
      });
      if (!existing) {
        existing = await prisma.sekolah.create({
          data: { nama: s.nama, npsn: s.npsn, alamat: s.alamat, jenjang: s.jenjang, aktif: true }
        });
      } else {
        existing = await prisma.sekolah.update({
          where: { id: existing.id },
          data: { npsn: s.npsn, alamat: s.alamat, jenjang: s.jenjang }
        });
      }
      sekolahMap[s.nama] = existing;
    }

    // Upsert Posyandu
    const posyanduMap = {};
    for (const nama of posyanduMaster) {
      let existing = await prisma.posyandu.findFirst({
        where: { nama: { equals: nama, mode: "insensitive" } }
      });
      if (!existing) {
        existing = await prisma.posyandu.create({
          data: { nama, alamat: "UJUNGJAYA", aktif: true }
        });
      }
      posyanduMap[nama] = existing;
    }

    // Fetch KategoriPenerima
    const kats = await prisma.kategoriPenerima.findMany();
    const katMap = {};
    kats.forEach((k) => (katMap[k.kode] = k));

    // Fetch User ASLAP
    let userAslap = await prisma.user.findUnique({ where: { username: "aslap" } });
    if (!userAslap) {
      userAslap = await prisma.user.findFirst({ where: { role: "ASLAP" } });
    }

    const periodConfigs = [
      { n: 7, eduStartRow: 6, posStartRow: 21, mulai: new Date("2026-04-13"), selesai: new Date("2026-04-26") },
      { n: 8, eduStartRow: 37, posStartRow: 52, mulai: new Date("2026-04-27"), selesai: new Date("2026-05-10") },
      { n: 9, eduStartRow: 68, posStartRow: 83, mulai: new Date("2026-05-11"), selesai: new Date("2026-05-24") },
      { n: 10, eduStartRow: 99, posStartRow: 114, mulai: new Date("2026-05-25"), selesai: new Date("2026-06-07") },
      { n: 11, eduStartRow: 133, posStartRow: 147, mulai: new Date("2026-06-08"), selesai: new Date("2026-06-21") },
    ];

    const periodeIds = [];

    for (const pCfg of periodConfigs) {
      const pId = `periode-migrasi-${pCfg.n}`;
      periodeIds.push(pId);

      let periode = await prisma.periode.findUnique({ where: { id: pId } });
      if (!periode) {
        periode = await prisma.periode.create({
          data: {
            id: pId,
            tanggalMulai: pCfg.mulai,
            tanggalSelesai: pCfg.selesai,
            status: "AKTIF",
            anggaranAlokasi: 500000000,
            totalDanaDiterima: 500000000,
          },
        });
      }

      // GrupHari
      const ghSeninJumat = await prisma.grupHari.upsert({
        where: { periodeId_label: { periodeId: pId, label: "SENIN-JUMAT" } },
        update: { hariAktif: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"] },
        create: {
          periodeId: pId,
          label: "SENIN-JUMAT",
          hariAktif: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"],
        },
      });

      const ghSabtu = await prisma.grupHari.upsert({
        where: { periodeId_label: { periodeId: pId, label: "SABTU" } },
        update: { hariAktif: ["SABTU"] },
        create: {
          periodeId: pId,
          label: "SABTU",
          hariAktif: ["SABTU"],
        },
      });

      for (const gh of [ghSeninJumat, ghSabtu]) {
        let pmInput = await prisma.inputPenerimaManfaat.findFirst({
          where: { periodeId: pId, grupHariId: gh.id },
        });

        if (!pmInput) {
          pmInput = await prisma.inputPenerimaManfaat.create({
            data: {
              periodeId: pId,
              grupHariId: gh.id,
              createdById: userAslap.id,
            },
          });
        }

        await prisma.inputPenerimaManfaatDetail.deleteMany({
          where: { inputPenerimaManfaatId: pmInput.id },
        });

        // Pendidikan
        for (let i = 0; i < 8; i++) {
          const row = data[pCfg.eduStartRow - 1 + i];
          if (!row) continue;
          const namaSekolahRaw = String(row[2]).trim();
          const sekolah = sekolahMaster.find((s) => s.nama === namaSekolahRaw)
            ? sekolahMap[namaSekolahRaw]
            : Object.values(sekolahMap).find((s) => s.nama.toUpperCase() === namaSekolahRaw.toUpperCase());

          if (!sekolah) continue;

          let lk_1_3 = Number(row[8]) || 0;
          let p_1_3 = Number(row[9]) || 0;
          let lk_4_6 = Number(row[10]) || 0;
          let p_4_6 = Number(row[11]) || 0;
          let lk_smk = Number(row[12]) || 0;
          let p_smk = Number(row[13]) || 0;
          let lk_pic = Number(row[14]) || 0;
          let p_pic = Number(row[15]) || 0;

          // Koreksi mismatch Excel P7 Ujungjaya III KECIL 1-3: 68 -> 69 (40L + 29P)
          if (pCfg.n === 7 && sekolah.nama.toUpperCase().includes("UJUNGJAYA III")) {
            p_1_3 = 29;
          }

          if (sekolah.jenjang === "TK") {
            if ((lk_1_3 > 0 || p_1_3 > 0) && katMap["PAUD_TK"]) {
              await prisma.inputPenerimaManfaatDetail.create({
                data: {
                  inputPenerimaManfaatId: pmInput.id,
                  kategoriId: katMap["PAUD_TK"].id,
                  sekolahId: sekolah.id,
                  lakiLaki: lk_1_3,
                  perempuan: p_1_3,
                },
              });
            }
          } else if (sekolah.jenjang === "SD") {
            if ((lk_1_3 > 0 || p_1_3 > 0) && katMap["SD_1_3"]) {
              await prisma.inputPenerimaManfaatDetail.create({
                data: {
                  inputPenerimaManfaatId: pmInput.id,
                  kategoriId: katMap["SD_1_3"].id,
                  sekolahId: sekolah.id,
                  lakiLaki: lk_1_3,
                  perempuan: p_1_3,
                },
              });
            }
            if ((lk_4_6 > 0 || p_4_6 > 0) && katMap["SD_4_6"]) {
              await prisma.inputPenerimaManfaatDetail.create({
                data: {
                  inputPenerimaManfaatId: pmInput.id,
                  kategoriId: katMap["SD_4_6"].id,
                  sekolahId: sekolah.id,
                  lakiLaki: lk_4_6,
                  perempuan: p_4_6,
                },
              });
            }
          } else if (sekolah.jenjang === "SMP") {
            const lk_smp = lk_4_6 || lk_1_3 || lk_smk;
            const p_smp = p_4_6 || p_1_3 || p_smk;
            if ((lk_smp > 0 || p_smp > 0) && katMap["SMP_1_3"]) {
              await prisma.inputPenerimaManfaatDetail.create({
                data: {
                  inputPenerimaManfaatId: pmInput.id,
                  kategoriId: katMap["SMP_1_3"].id,
                  sekolahId: sekolah.id,
                  lakiLaki: lk_smp,
                  perempuan: p_smp,
                },
              });
            }
          } else if (sekolah.jenjang === "SMA_SMK" || sekolah.jenjang === "SMA" || sekolah.jenjang === "SMK") {
            if ((lk_smk > 0 || p_smk > 0) && katMap["SMA_SMK_4_6"]) {
              await prisma.inputPenerimaManfaatDetail.create({
                data: {
                  inputPenerimaManfaatId: pmInput.id,
                  kategoriId: katMap["SMA_SMK_4_6"].id,
                  sekolahId: sekolah.id,
                  lakiLaki: lk_smk,
                  perempuan: p_smk,
                },
              });
            }
          }

          if ((lk_pic > 0 || p_pic > 0) && katMap["PENDIDIK"]) {
            await prisma.inputPenerimaManfaatDetail.create({
              data: {
                inputPenerimaManfaatId: pmInput.id,
                kategoriId: katMap["PENDIDIK"].id,
                sekolahId: sekolah.id,
                lakiLaki: lk_pic,
                perempuan: p_pic,
              },
            });
          }
        }

        // Posyandu
        for (let i = 0; i < 9; i++) {
          const row = data[pCfg.posStartRow - 1 + i];
          if (!row) continue;
          const namaPosyanduRaw = String(row[2]).trim();
          const posyandu = posyanduMap[namaPosyanduRaw]
            || Object.values(posyanduMap).find((p) => p.nama.toUpperCase() === namaPosyanduRaw.toUpperCase());

          if (!posyandu) continue;

          const bumil = Number(row[4]) || 0;
          const busui = Number(row[5]) || 0;
          const lkBalita = Number(row[6]) || 0;
          const pBalita = Number(row[7]) || 0;
          const kader = Number(row[8]) || 0;

          if ((lkBalita > 0 || pBalita > 0) && katMap["BALITA"]) {
            await prisma.inputPenerimaManfaatDetail.create({
              data: {
                inputPenerimaManfaatId: pmInput.id,
                kategoriId: katMap["BALITA"].id,
                posyanduId: posyandu.id,
                lakiLaki: lkBalita,
                perempuan: pBalita,
              },
            });
          }
          if (bumil > 0 && katMap["BUMIL"]) {
            await prisma.inputPenerimaManfaatDetail.create({
              data: {
                inputPenerimaManfaatId: pmInput.id,
                kategoriId: katMap["BUMIL"].id,
                posyanduId: posyandu.id,
                lakiLaki: 0,
                perempuan: bumil,
              },
            });
          }
          if (busui > 0 && katMap["BUSUI"]) {
            await prisma.inputPenerimaManfaatDetail.create({
              data: {
                inputPenerimaManfaatId: pmInput.id,
                kategoriId: katMap["BUSUI"].id,
                posyanduId: posyandu.id,
                lakiLaki: 0,
                perempuan: busui,
              },
            });
          }
          if (kader > 0 && katMap["KADER_POSYANDU"]) {
            await prisma.inputPenerimaManfaatDetail.create({
              data: {
                inputPenerimaManfaatId: pmInput.id,
                kategoriId: katMap["KADER_POSYANDU"].id,
                posyanduId: posyandu.id,
                lakiLaki: 0,
                perempuan: kader,
              },
            });
          }
        }
      }
    }

    // SekolahKelasDetail dari sheet JUMLAH PERKELAS
    const kelasSheet = wb.Sheets["JUMLAH PERKELAS"];
    if (kelasSheet) {
      const kelasData = XLSX.utils.sheet_to_json(kelasSheet, { header: 1, defval: null });
      function findMatchingSchool(rawName) {
        if (!rawName) return null;
        const cleaned = String(rawName).trim().toUpperCase();
        if (cleaned.includes("AMANAH")) return "TK AMANAH";
        if (cleaned.includes("WANAJAYA")) return "SDN WANAJAYA";
        if (cleaned.includes("SUKARASA")) return "SDN SUKARASA II";
        if (cleaned.includes("CIMANUK")) return "SDN CIMANUK";
        if (cleaned.includes("MARGAMULYA")) return "SDN MARGAMULYA";
        if (cleaned.includes("UJUNGJAYA")) return "SDN UJUNGJAYA III";
        if (cleaned.includes("PALASARI")) return "SDN PALASARI";
        if (cleaned.includes("PELITA")) return "SMK PELITA AL IKHSAN";
        return null;
      }

      const blocks = [
        { startRow: 1, colOffset: 0 },
        { startRow: 1, colOffset: 4 },
        { startRow: 1, colOffset: 8 },
        { startRow: 1, colOffset: 12 },
        { startRow: 12, colOffset: 0 },
        { startRow: 12, colOffset: 4 },
        { startRow: 12, colOffset: 8 },
        { startRow: 12, colOffset: 12 },
      ];

      const extractedKelas = [];
      blocks.forEach((b) => {
        const rawSchool = kelasData[b.startRow - 1] ? kelasData[b.startRow - 1][b.colOffset] : null;
        const schoolName = findMatchingSchool(rawSchool);
        if (!schoolName) return;
        for (let r = b.startRow + 1; r < b.startRow + 9; r++) {
          const row = kelasData[r];
          if (!row) continue;
          const kelas = row[b.colOffset + 1] !== null ? String(row[b.colOffset + 1]).trim() : null;
          const jml = row[b.colOffset + 2] !== null && row[b.colOffset + 2] !== "" ? Number(row[b.colOffset + 2]) : null;
          if (kelas && jml !== null && !isNaN(jml) && jml > 0) {
            extractedKelas.push({ schoolName, kelas, jumlah: jml });
          }
        }
      });

      for (const item of extractedKelas) {
        const sekolahObj = sekolahMap[item.schoolName];
        if (!sekolahObj) continue;

        for (const pId of periodeIds) {
          await prisma.sekolahKelasDetail.upsert({
            where: {
              periodeId_sekolahId_namaKelas: {
                periodeId: pId,
                sekolahId: sekolahObj.id,
                namaKelas: item.kelas,
              },
            },
            update: { jumlah: item.jumlah },
            create: {
              periodeId: pId,
              sekolahId: sekolahObj.id,
              namaKelas: item.kelas,
              jumlah: item.jumlah,
            },
          });
        }
      }
    }

    console.log("Migration completed successfully!");
  } catch (e) {
    console.error("Migration error:", e);
    throw e;
  }
}

if (process.argv.includes("--migrate")) {
  migrateFromExcel()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  main()
    .then(() => seedTransaksi())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


