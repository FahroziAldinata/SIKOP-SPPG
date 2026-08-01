# 04. Database & Data Model

## Database Engine & Setup
- **Engine**: PostgreSQL via Supabase (Free Tier) / Local Dev (Port 5432)
- **ORM**: Prisma v6.19.3
- **Koneksi**:
  - *Runtime*: Connection pooling via Supabase PgBouncer (Port 6543, `?pgbouncer=true`)
  - *Migration*: Direct connection (Port 5432)
- **Total Model**: 38+ model
- **Total Enum**: 24 enum

## Daftar Enum Schema Complete
1. `Role`: `ASLAP`, `MITRA`, `AHLI_GIZI`, `AKUNTAN`, `KEPALA_SPPG`, `ADMIN`
2. `StatusPeriode`: `DRAFT`, `AKTIF`, `SELESAI`
3. `StatusApproval`: `DRAFT`, `DIAJUKAN`, `DISETUJUI`, `DITOLAK`
4. `AksiAudit`: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `KOREKSI`
5. `TipeAkun`: `KAS`, `DANA`, `BIAYA`, `PAJAK`
6. `JenisTransaksi`: `MASUK`, `KELUAR`
7. `KategoriDana`: `BAHAN_MAKANAN`, `OPERASIONAL`, `INSENTIF_FASILITAS`
8. `JenisPorsi`: `KECIL`, `BESAR`
9. `JenisSasaran`: `PESERTA_DIDIK`, `NON_PESERTA_DIDIK`
10. `JenisPenerimaKeluar`: `SISWA`, `B3`
11. `JalurMenu`: `SISWA`, `TIGA_B`
12. `HariMenu`: `SENIN`, `SELASA`, `RABU`, `KAMIS`, `JUMAT`, `SABTU`
13. `KomponenMenu`: `KARBOHIDRAT`, `LAUK_HEWANI`, `LAUK_NABATI`, `SAYUR`, `BUAH`
14. `TipePenyimpanan`: `HABIS_HARI_ITU`, `STOK_GUDANG`
15. `JenisMutasiStok`: `MASUK`, `KELUAR`
16. `JenisDokumenResmi`: `LPA`, `SPTJ`, `BAPSD`
17. `StatusLaporanBug`: `BARU`, `DIPROSES`, `SELESAI`
18. `StatusPO`: `DIAJUKAN`, `DIREALISASI`, `DITERIMA`
19. `JenjangSekolah`: `TK`, `SD`, `SMP`, `SMA_SMK`

## Daftar Tabel (Model) & Field Utama

### User & Auth
- **`User`**: `id`, `nama`, `username` (unique), `passwordHash`, `role` (Role), `aktif` (boolean)

### Periode & Setup
- **`Periode`**: `id`, `tanggalMulai`, `tanggalSelesai`, `status` (StatusPeriode), `anggaranAlokasi` (Decimal 14,2), `totalDanaDiterima` (Decimal 14,2 opsional)
- **`SetupLembaga`**: `id`, `periodeId` (unique), `namaLembaga`, `alamat`, `namaKepalaSPPG`, `namaAkuntanSPPG`, `namaYayasan`, `ketuaYayasan`, `nomorRekeningVA`, `tahunAnggaran`, `awalPeriodeBerikutnya`, `tanggalPelaporan`, `tempatPelaporan`

### Taksonomi & Master Penerima
- **`BatasHargaPorsi`**: `id`, `jenisPorsi` (JenisPorsi, unique), `batasMaksimal` (Decimal 12,2) — *KECIL=8000, BESAR=10000*
- **`KategoriPenerima`**: `id`, `kode` (unique), `nama`, `jenisSasaran` (JenisSasaran), `jenisPorsi` (JenisPorsi opsional), `urutan` (Int)
- **`KelompokUmurMenu`**: `id`, `jalur` (JalurMenu), `kode` (unique), `nama`, `rentangUsia`
- **`Sekolah`**: `id`, `nama`, `npsn`, `alamat`, `jenjang` (JenjangSekolah), `aktif` (boolean)
- **`Posyandu`**: `id`, `nama`, `alamat`, `aktif` (boolean)

### Penerima Manfaat (Aslap)
- **`InputPenerimaManfaat`**: `id`, `periodeId`, `hariAktif` (HariMenu[]), `createdById`
- **`InputPenerimaManfaatDetail`**: `id`, `inputPenerimaManfaatId`, `kategoriId`, `sekolahId` (opsional), `posyanduId` (opsional), `lakiLaki` (Int), `perempuan` (Int)
- **`SekolahKelasDetail`**: `id`, `periodeId`, `sekolahId`, `namaKelas`, `jumlah` (Int) — *@@unique([periodeId, sekolahId, namaKelas])*

### Bahan Pokok & Harga
- **`BahanPokok`**: `id`, `nama` (unique), `satuan`, `tipePenyimpanan` (TipePenyimpanan), `konversiPerKg` (Decimal opsional), `satuanHitungan` (opsional), `aktif` (boolean)
- **`HargaBahanPeriode`**: `id`, `periodeId`, `bahanPokokId`, `harga` (Decimal 12,2), `isFallback` (boolean), `createdById` — *@@unique([periodeId, bahanPokokId])*

### Menu Harian (Ahli Gizi)
- **`MasterMenuMingguan`**: `id`, `periodeId`, `jalur` (JalurMenu), `hari` (HariMenu), `menuKarbohidrat`, `menuLaukHewani`, `menuLaukNabati`, `menuSayur`, `menuBuah`, `createdById` — *@@unique([periodeId, jalur, hari])*
- **`MenuHarian`**: `id`, `periodeId`, `tanggal`, `status` (StatusApproval) — *@@unique([periodeId, tanggal])*
- **`MenuHarianBlok`**: `id`, `menuHarianId`, `kelompokUmurMenuId`, `createdById` — *@@unique([menuHarianId, kelompokUmurMenuId])*
- **`MenuItem`**: `id`, `blokId`, `namaMenu`, `komponen` (KomponenMenu opsional)
- **`MenuItemBahan`**: `id`, `menuItemId`, `bahanPokokId`, `beratBersihGr`, `beratURT`, `energiKkal`, `proteinGr`, `lemakGr`, `karbohidratGr`, `seratGr`, `bddPersen`, `beratKotorGr`, `hargaSatuan`, `beratSatuanGr`, `totalHargaBahan`, `jumlahHitungan`
- **`MenuTargetGizi`**: `id`, `blokId` (unique), `targetEnergi`, `targetProtein`, `targetLemak`, `targetKarbohidrat`, `targetSerat`
- **`MenuOrganoleptik`**: `id`, `blokId` (unique), `rasa`, `aroma`, `tekstur`, `suhuSaji`, `catatan`, `ujiPadaTanggal`, `jumlahOmpreng`, `tanggalMusnah`
- **`AlergiCatatan`**: `id`, `blokId`, `jenisAlergi`, `jumlahSiswa`, `bahanPengganti`

### Kendaraan & Pengiriman
- **`Kendaraan`**: `id`, `namaKendaraan`, `platNomor`, `aktif`
- **`PengirimanHarian`**: `id`, `menuHarianId`, `kendaraanId`, `catatan`

### Purchase Order (PO) 2-Tahap
- **`Supplier`**: `id`, `nama`, `kontak`, `aktif`
- **`TransaksiPembelian`**: `id`, `rabHarianId`, `supplierId`, `tanggal`, `catatan`, `status` (StatusPO), `createdById`, `diterimaOlehId`, `diterimaAt`
- **`TransaksiPembelianItem`**: `id`, `transaksiId`, `bahanPokokId`, `qty`, `hargaSatuan`, `subtotal`, `qtyRealisasi`, `hargaSatuanRealisasi`, `subtotalRealisasi`, `qtyDiterima`, `updatedById`

### RAB & Anggaran (Akuntan)
- **`RabHarian`**: `id`, `periodeId`, `tanggal`, `status` (StatusApproval), `menuHarianId`, `totalKebutuhan`, `totalPagu`, `selisih`, `verifiedAt`, `verifiedById`, `createdById` — *@@unique([periodeId, tanggal])*
- **`RabHarianItem`**: `id`, `rabHarianId`, `bahanPokokId`, `qtySiswa`, `qtyB3`, `qtyTotal`, `satuan`, `hargaSatuan`, `hargaOverride`, `subtotal` — *@@unique([rabHarianId, bahanPokokId])*
- **`AnggaranHarian`**: `id`, `periodeId`, `tanggal`, `kategoriDana` (KategoriDana), `jumlahPaket`, `hargaSatuan`, `rab`, `aktual`, `selisih`, `keterangan` — *@@unique([periodeId, tanggal, kategoriDana])*
- **`AnggaranBahanMakananDetail`**: `id`, `anggaranHarianId`, `kategoriId`, `jumlahPaket`, `hargaSatuan`, `subtotal` — *@@unique([anggaranHarianId, kategoriId])*

### General Ledger & Akuntansi
- **`Akun`**: `id`, `kode` (unique), `nama`, `tipe` (TipeAkun), `kategoriDana` (KategoriDana opsional), `aktif`
- **`SaldoAwalPeriode`**: `id`, `periodeId`, `akunId`, `saldoAwal` — *@@unique([periodeId, akunId])*
- **`JurnalTransaksi`**: `id`, `periodeId`, `tanggal`, `nomorBukti`, `uraian`, `jenis` (JenisTransaksi), `nominal`, `akunDanaBiayaId`, `akunKasId`, `tagPengeluaran`, `transaksiPembelianId`, `createdById` — *@@unique([periodeId, nomorBukti])*

### Stok & Inventory
- **`SaldoAwalBarang`**: `id`, `periodeId`, `bahanPokokId`, `saldoAwalQty`, `hargaBeliAwal` — *@@unique([periodeId, bahanPokokId])*
- **`MutasiStok`**: `id`, `bahanPokokId`, `tanggal`, `jenis` (JenisMutasiStok), `qty`, `keterangan`, `supplierId`, `hargaBeli`, `kelompokPenerima` (JenisPenerimaKeluar), `createdById`
- **`ValidasiStok`**: `id`, `bahanPokokId`, `tanggal`, `qtyDibeli`, `qtyTerpakai`, `selisih`, `catatan`, `validatedById`

### Dokumen & Upah
- **`DokumenResmi`**: `id`, `periodeId`, `jenisDokumen` (JenisDokumenResmi), `nomorDokumen`, `createdById` — *@@unique([periodeId, jenisDokumen])*
- **`DaftarNominatifUpah`**: `id`, `periodeId`, `jenisPekerjaan`, `namaRelawan`, `danaKesehatan`, `tk`, `pj`, `tarifHarian`
- **`DaftarNominatifUpahHarian`**: `id`, `daftarNominatifId`, `tanggal`, `nominal` — *@@unique([daftarNominatifId, tanggal])*

### System & Support
- **`Approval`**: `id`, `menuHarianId`, `rabHarianId`, `status` (StatusApproval), `catatan`, `approvedById`
- **`AuditLog`**: `id`, `entityType`, `entityId`, `aksi` (AksiAudit), `dataLama` (Json), `dataBaru` (Json), `userId`
- **`Notifikasi`**: `id`, `userId`, `judul`, `pesan`, `entityType`, `entityId`, `dibaca` (boolean)
- **`LaporanBug`**: `id`, `pelaporId`, `rolePelapor` (Role), `judul`, `deskripsi`, `status` (StatusLaporanBug)
- **`HariLibur`**: `id`, `tanggal` (unique), `keterangan`
- **`JenisPekerjaan`**: `id`, `nama` (unique), `tarifHarian`, `aktif`

## Relasi & Constraint Kunci
- **Implicit Many-to-Many**: `KelompokUmurMenu` ↔ `KategoriPenerima` dan `PengirimanHarian` ↔ `KategoriPenerima`.
- **Scalar Array**: `InputPenerimaManfaat.hariAktif` menggunakan `HariMenu[]`.
- **Double Foreign Key ke Tabel Sama**:
  - `JurnalTransaksi` → `akunDanaBiayaId` dan `akunKasId` (ke model `Akun`).
  - `TransaksiPembelian` → `createdById` (Akuntan) dan `diterimaOlehId` (Aslap) (ke model `User`).
- **Compound Unique Constraints**:
  - `JurnalTransaksi`: `@@unique([periodeId, nomorBukti])`
  - `MenuHarian` & `RabHarian`: `@@unique([periodeId, tanggal])`
  - `AnggaranHarian`: `@@unique([periodeId, tanggal, kategoriDana])`
  - `SekolahKelasDetail`: `@@unique([periodeId, sekolahId, namaKelas])`
