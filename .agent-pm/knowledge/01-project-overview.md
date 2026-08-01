# 01. Project Overview

## Nama Project
**Sistem Keuangan & Operasional SPPG MBG**  
(Satuan Pelayanan Pemenuhan Gizi — Makan Bergizi Gratis)

## Tujuan Utama
Sistem web multi-role untuk mencatat keuangan, merencanakan menu, memvalidasi stok, dan menghasilkan laporan resmi di satu unit SPPG dalam program **Makan Bergizi Gratis (MBG)** di bawah **Badan Gizi Nasional (BGN)**.

## Masalah Bisnis yang Diselesaikan
Sebelum sistem ini ada, seluruh operasional SPPG dikelola via spreadsheet Excel yang terpisah-pisah (sheet laporan harian, laporan per periode, BKU, BP, LPA, SPTJ, BAPSD, daftar nominatif upah, dll). Sistem ini menggantikan:
- Input manual multi-sheet Excel yang rawan error
- Rekonsiliasi anggaran manual antara menu × porsi × harga bahan
- Pembuatan dokumen resmi BGN (LPA/SPTJ/BAPSD/BKU) secara manual
- Tidak ada sistem approval formal untuk menu dan RAB

## Target Pengguna / Role User
Terdapat 5 role aktif + 1 role admin:
1. **ASLAP (Asisten Lapangan)**: Input jumlah penerima manfaat per periode (trigger pembuka setiap periode baru), approval PO fisik (1-tombol konfirmasi penerimaan barang).
2. **MITRA (Mitra Penyedia)**: Update harga bahan pokok per periode, realisasi PO pembelian (checklist beli/tahan + input qty & harga realisasi), kelola kendaraan operasional.
3. **AHLI_GIZI (Ahli Gizi)**: Susun menu harian (qty bahan per porsi kecil/besar, gizi manual, organoleptik, alergi), target AKG, retensi sampel 3 hari.
4. **AKUNTAN (Akuntan)**: Kelola anggaran (double-entry ledger), hitung biaya, verifikasi RAB Harian dari menu DISETUJUI, inisiasi PO 2-tahap, Saldo Awal Barang, Mutasi & Validasi Stok, Daftar Nominatif Upah, generate laporan periodik & dokumen resmi PDF (BKU, BP, LPA, SPTJ, BAPSD).
5. **KEPALA_SPPG (Kepala SPPG)**: Approval/rejection Menu Harian & RAB Harian per hari operasional (dengan alasan penolakan), monitoring dashboard workflow stepper 6-tahap.
6. **ADMIN (Administrator)**: Manajemen user (CRUD, aktif/nonaktif), monitoring & update status Laporan Bug.

## Status Progress Sistem
- **Status Komponen Utama**: 100% Selesai (Feature Completion 100% untuk Auth & User, Periode & Setup, Aslap, Mitra, Ahli Gizi, Akuntan, Kepala SPPG, Admin, Shared UI & PDF).
- **Utang Teknis / Pending Backlog (Terdokumentasi)**:
  1. *Form Inspeksi Bahan BGN (Aslap - B.7)*: Pencetakan form inspeksi fisik bahan baku BGN saat barang diterima.
  2. *Laporan Multi-Periode LRA & LPD2M (Akuntan - B.15)*: Penambahan varian Laporan Realisasi Anggaran multi-periode komparatif.
  3. ~~Validasi Silang Jumlah Penerima Manfaat~~: ✅ **Selesai 2026-07-26** — Validasi agregat `InputPenerimaManfaatDetail` vs `SekolahKelasDetail` diubah menjadi hard constraint bidirectional (VALIDASI_SILANG / VALIDASI_SILANG_BALIK) di 4 endpoint, diuji dengan 3 test case.
  4. *Excel Historical Migration Inconsistency*: Ketidaksesuaian nilai pada sheet Excel historis lama (Periode 7-11).
  5. *Standardization of Custom Validation*: Validasi backend masih manual `if (!field) res.status(400)`, refactoring ke Zod tertunda.
