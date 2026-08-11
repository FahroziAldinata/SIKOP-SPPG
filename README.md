# SIKOP SPPG

SIKOP SPPG adalah sistem manajemen operasional Satuan Pelayanan Pemenuhan Gizi (SPPG) yang mendukung pelaksanaan program **Makan Bergizi Gratis (MBG)**. Sistem mencakup pengelolaan data penerima manfaat, perencanaan menu dan gizi, pembelian serta pembayaran bahan, akuntansi keuangan, pelaporan, dan approval alur kerja antar peran.

## Fitur / Modul

### Akuntan
Modul pengelolaan keuangan & akuntansi operasional SPPG: RAB P12 (harian, rekap, PDF), RAB harian dengan anggaran harian + verifikasi + rincian item, jurnal transaksi (CRUD, prefill, bulk-generate), pembuatan dokumen resmi LPA/SPTJ/BAPSD (generate + CRUD), daftar nominatif upah, stok barang (saldo awal, mutasi, validasi), dan master data (akun, supplier, periode, jenis pekerjaan, hari libur, bahan pokok, PO, kebutuhan hitungan).

### Laporan
Modul pelaporan lengkap dalam format PDF dan Excel: LPA, SPTJ, BAPSD, BKU, LRA, LPD2M, BTT, BKK, LBBP, neraca saldo, ringkasan anggaran, laporan per-periode/per-bulan/harian, stock barang, kebutuhan belanja, bentuk pengeluaran, catatan, serta bukti LPD2M dan pemeriksaan bahan.

### Aslap (Asisten Lapangan)
Pengelolaan data lapangan: sekolah/posyandu/kategori/periode, penerima manfaat (CRUD), grup hari, persetujuan PO, dan laporan harian/bulanan/per-periode/per-kelas/aggregate beserta PDF.

### Gizi
Perencanaan gizi: master menu, menu harian dengan blok, target gizi, organoleptik, batas harga porsi, pengiriman, kendaraan, alergi, serta laporan rekap-menu/pemenuhan-gizi/organoleptik dalam PDF.

### Mitra (Supplier)
Pengelolaan harga bahan per periode, pembuatan PO + realisasi + PDF, dan laporan realisasi PO.

### Auth & RBAC
Login JWT, profil, dan kontrol akses berbasis peran: Admin, Akuntan, Aslap, Gizi, Kepala, dan Mitra.

#### Manajemen Grant RBAC
Sistem membedakan asal-usul permission grant (`RolePermission`) menggunakan kolom `source` (`SEED` vs `MANUAL`):
- **Grant SEED**: Berasal dari definisi bawaan di `src/lib/rbacSeeder.js`. Saat `seedRbacPermissions` dijalankan, grant `SEED` yang tidak ada lagi di definisi kode akan di-prune (dihapus dari database).
- **Grant MANUAL**: Dibuat atau diperbarui via UI/API Admin (`POST` & `PUT` `/api/admin/permissions`). Grant `MANUAL` terlindungi dan **tidak akan dihapus** oleh pruning seeder di resource apa pun.
- **Pengembangan**: Untuk menambahkan grant permanen baru pada resource existing, tambahkan definisi ke `rbacSeeder.js`. Penambahan resource custom atau grant manual via UI akan otomatis bernilai `MANUAL` dan aman dari overwrite.

### Dashboard & Kepala
Dashboard dengan ringkasan 6 tahap alur kerja + notifikasi, serta modul approval untuk Kepala.

### Admin
Manajemen pengguna (users), laporan bug, dan pengaturan umum sistem.

## Tech Stack

- **Backend**: Express.js, Prisma ORM, PostgreSQL, Zod
- **Frontend**: React.js, Vite, Tailwind CSS, HeroUI
- **PDF**: puppeteer-core + @sparticuz/chromium
- **Excel**: ExcelJS

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd Sistem_SPPG

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Siapkan environment (lihat docs/SETUP.md untuk daftar variabel)
cp backend/.env.example backend/.env && isi value sesuai kebutuhan

# 4. Migrasi & seed database
npx prisma migrate deploy
npx prisma db seed

# Catatan: seed menolak jalan saat NODE_ENV=production tanpa ALLOW_PROD_SEED=true
# atau --force (guard keamanan — seed memakai password default). Lihat docs/DEPLOYMENT.md.

# 5. Jalankan
npm run dev            # backend (port default 3000)
cd ../frontend
npm run dev            # frontend (port default 5173)
```

Panduan lengkap: [docs/SETUP.md](docs/SETUP.md)

## Dokumentasi

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — struktur folder & alur data
- [docs/SETUP.md](docs/SETUP.md) — setup instalasi & environment
- [CHANGELOG.md](CHANGELOG.md) — riwayat perubahan versi

## Lisensi

Proprietary — seluruh hak cipta dilindungi. Lihat [LICENSE](LICENSE).
