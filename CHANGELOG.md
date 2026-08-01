# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versi mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-02

### Added

#### Akuntan
- RAB P12: harian, rekap, dan ekspor PDF (`/api/akuntan/rab-p12/harian`, `/api/akuntan/rab-p12/rekap`).
- RAB harian dengan anggaran harian, verifikasi, dan rincian item.
- Jurnal transaksi: CRUD, prefill, dan bulk-generate.
- Dokumen resmi LPA/SPTJ/BAPSD: generate + CRUD.
- Daftar nominatif upah.
- Stok barang: saldo awal, mutasi, dan validasi stok.
- Master data: akun, supplier, periode, jenis pekerjaan, hari libur, bahan pokok, PO, dan kebutuhan hitungan.

#### Laporan
- Laporan LPA, SPTJ, BAPSD, BKU, LRA, LPD2M, BTT, BKK, LBBP dengan ekspor PDF dan Excel.
- Neraca saldo, ringkasan anggaran, laporan per-periode/per-bulan/harian.
- Laporan stock barang, kebutuhan belanja, bentuk pengeluaran, catatan.
- Bukti LPD2M dan pemeriksaan bahan.

#### Aslap
- Master sekolah/posyandu/kategori/periode.
- Penerima manfaat: CRUD.
- Grup hari.
- Approve PO.
- Laporan harian/bulanan/per-periode/per-kelas/aggregate dengan ekspor PDF.

#### Gizi
- Master menu dan menu harian dengan blok.
- Target gizi, organoleptik, batas harga porsi.
- Pengiriman harian, kendaraan, dan alergi.
- Laporan rekap-menu, pemenuhan-gizi, dan organoleptik dengan ekspor PDF.

#### Mitra
- Harga bahan per periode.
- PO + realisasi + PDF.
- Laporan realisasi PO.

#### Auth & RBAC
- Login, me/profile, dan kontrol akses berbasis peran (Admin, Akuntan, Aslap, Gizi, Kepala, Mitra).

#### Dashboard & Admin
- Dashboard dengan ringkasan 6 stage dan notifikasi.
- Modul approval Kepala.
- Manajemen pengguna (users).
- Laporan bug dan pengaturan umum.

### Known Issues

- **BUG-001**: `500` error pada `GET /rab-p12/harian` dan `GET /rab-p12/rekap` — suspected pre-existing (sebelum refactor). Detail: lihat `.agent-pm/working/BUG.md`.
