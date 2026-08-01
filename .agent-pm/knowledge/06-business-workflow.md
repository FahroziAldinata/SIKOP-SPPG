# 06. Business Workflow

## Alur Bisnis SPPG MBG (End-to-End Stepper)

```
Aslap: input penerima manfaat (trigger pembuka setiap periode baru)
        |
        +------ (paralel, tidak saling tunggu) ------+
        |                                            |
        v                                            v
Mitra: update harga bahan                  Aslap: setup periode selesai
        |
        v
Ahli Gizi: susun menu harian
(qty bahan per porsi kecil/besar, gizi manual, organoleptik, alergi)
        |
        v
Akuntan: verifikasi RAB Harian dari menu yang DISETUJUI
(preview bahan otomatis → verifikasi harga → ajukan)
        |
        v
Kepala SPPG: approval Menu Harian & RAB Harian
        |
        +-- DISETUJUI --> periode berjalan
        |
        +-- DITOLAK   --> loop balik ke Ahli Gizi / Akuntan
        |
Akuntan: buat PO pembelian
        |
Mitra: realisasi PO (checklist beli/tahan per item)
        |
Aslap: verifikasi fisik barang → approve PO (DITERIMA)
        |
Akuntan: catat jurnal transaksi (general ledger double-entry)
        |
Akuntan: generate laporan periodik & dokumen resmi PDF
(BKU, BP, LPA, SPTJ, BAPSD, Neraca Saldo, dll)
```

## Alur Workflow Per Role

### 1. Modul ASLAP (Asisten Lapangan)
- **Input Penerima Manfaat**: Input jumlah penerima manfaat per periode, kombinasi hari aktif (SENIN..SABTU), per sekolah/posyandu, dengan pembagian gender Laki-laki/Perempuan. Ini menjadi trigger pembuka awal setiap periode baru.
- **Detail Kelas (SekolahKelasDetail)**: Pencatatan rincian jumlah penerima per kelas sebagai audit-trail.
- **Approval PO Fisik**: Melakukan verifikasi fisik barang yang tiba di lokasi dan memberikan konfirmasi penerimaan barang (approve PO 1-tombol sehingga status PO berubah dari `DIREALISASI` menjadi `DITERIMA`).
- *Catatan Backlog TODO (`08-TODO-Aslap.md`)*: Rencana fitur Form Inspeksi Bahan Baku BGN (fitur B.7) untuk pencetakan dokumen fisik saat penerimaan barang.

### 2. Modul MITRA (Mitra Penyedia)
- **Update Harga Bahan Pokok**: Input dan perbarui harga satuan bahan pokok per periode aktif (`HargaBahanPeriode`).
- **Realisasi PO**: Menerima PO dari Akuntan, memilih item yang dibeli/ditahan (checklist), memasukkan jumlah (`qtyRealisasi`) dan harga aktual (`hargaSatuanRealisasi`). Jika semua item sudah diisi, status PO berubah menjadi `DIREALISASI`.
- **Cetak PO**: Mencetak dokumen Purchase Order (single date maupun multi-tanggal gabungan).
- **Kendaraan Operasional**: Mengelola data armada kendaraan yang digunakan untuk pengiriman harian.

### 3. Modul AHLI GIZI
- **Susun Menu Harian**: Menyusun komposisi menu harian per tanggal dan kelompok umur (MenuHarian → MenuHarianBlok → MenuItem → MenuItemBahan).
- **Kalkulasi & Pricing**: Mengisi rincian gizi (kalori, protein, lemak, karbo, serat), URT, berat kotor/bersih. Harga bahan otomatis di-lookup dari `HargaBahanPeriode` Mitra (dengan warning `isFallback` jika belum diisi).
- **Guardrail & AKG**: Memastikan menu memenuhi Target Gizi (AKG) dan tidak melebihi `BatasHargaPorsi` BGN (badge live hijau/merah).
- **Uji Organoleptik & Retensi**: Menginput hasil uji organoleptik (rasa, aroma, tekstur, suhu saji) dan tanggal pemusnahan retensi sampel chiller (otomatis 3 hari).
- **Catatan Alergi & Pengiriman**: Mencatat alergi per kelompok umur dan memetakan pengiriman harian multi-kategori per kendaraan.

### 4. Modul AKUNTAN
- **Setup Periode**: Membuat dan mengelola lifecycle periode (`DRAFT` → `AKTIF` → `SELESAI`) serta data `SetupLembaga` (autofill dari periode sebelumnya).
- **RAB Harian**: Membuka preview kebutuhan bahan otomatis dari `MenuHarian` yang berstatus `DISETUJUI`, melakukan verifikasi/override harga, lalu mengajukan ke Kepala SPPG.
- **Inisiasi PO 2-Tahap**: Membuat `TransaksiPembelian` (PO) berdasarkan RAB Harian yang `DISETUJUI` untuk dikirimkan ke Mitra.
- **Jurnal Transaksi (Double-Entry Ledger)**: Mencatat pengeluaran/penerimaan kas, terintegrasi otomatis dengan `AnggaranHarian` (`recalcAktualAnggaran`).
- **Kelola Stok**: Mengatur `SaldoAwalBarang`, pencatatan `MutasiStok` (MASUK/KELUAR), dan `ValidasiStok` fisik vs sistem.
- **Daftar Nominatif Upah**: Mengisi grid upah harian relawan/pekerja berdasarkan tarif master.
- **Laporan & Dokumen Resmi PDF**: Generate 9+ Laporan Keuangan (BKU, BP, Neraca Saldo, Laporan Harian, dll) serta Dokumen Resmi PDF (LPA, SPTJ, BAPSD) via Puppeteer.
- *Catatan Backlog TODO (`08-TODO-Akuntan.md`)*: Laporan Multi-Periode LRA & LPD2M (fitur B.15).

### 5. Modul KEPALA SPPG
- **Workflow Stepper**: Monitoring 6-tahap kesiapan operasional harian.
- **Approval / Rejection**: Melakukan review dan memberikan approval atau penolakan (beserta alasan/catatan) atas `MenuHarian` dan `RabHarian`.
- **Riwayat & Executive Chart**: Melihat riwayat keputusan approval dan memantau grafik trend arus kas bulanan.

### 6. Modul ADMIN
- **Manajemen User**: CRUD data pengguna dan pengontrolan status aktif/nonaktif akun.
- **Monitoring Laporan Bug**: Meninjau laporan bug dari pengguna dan mengubah statusnya (`BARU` → `DIPROSES` → `SELESAI`).

## Detail Sub-Workflow dari TODO Files (Status Data)
- **`08-TODO-Akuntan.md`**: Seluruh workflow dasar Akuntan (RAB, Jurnal, PO, Laporan, Dokumen PDF) sudah terangkum di audit. Item spesifik yang masih dalam status backlog/belum diimplementasikan penuh adalah *B.15 (Laporan Multi-Periode LRA & LPD2M)*.
- **`08-TODO-Aslap.md`**: Seluruh workflow dasar Aslap (Penerima Manfaat, Approval PO) sudah terangkum di audit. Item spesifik backlog adalah *B.7 (Form Inspeksi Bahan Baku BGN)*.
- **`08-TODO-Ahligizi.md`**: Workflow dasar Ahli Gizi (Menu Harian, Organoleptik, AKG, Pengiriman) 100% selesai dan sudah terangkum di audit.
