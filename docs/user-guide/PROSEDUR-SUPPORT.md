# Prosedur Support — SIKOP-SPPG

> Catatan: project ini **bukan** didukung tim support resmi dan merupakan project pembelajaran (learning/design exercise). Tidak ada SLA, jaminan waktu tanggap, maupun layanan bantuan berbayar. Rujuk [docs/DISCLAIMER.md](../DISCLAIMER.md) sebelum meminta bantuan.

## Kontak

- **Developer/Maintainer:** Fahrozi Aldinata (tercantum sebagai pemilik sistem pada `LICENSE`, © 2026). Tidak ada kontak resmi (email/telepon) yang dipublikasikan di repo.
- Pendekatan untuk menghubungi: lihat file `README.md` / `LICENSE` di repo untuk informasi kontak terbaru. Jika belum ada kontak resmi, hubungi pengembang/maintainer project (pendekatan: lihat README / LICENSE di repo).

## Troubleshooting Umum

### 1. Login gagal

- Pastikan user aktif (status akun bukan nonaktif) dan password benar.
- Perhatikan keamanan "Coba": jika akun/IP kena **rate limit** (5x percobaan / 15 menit / IP), respons menjadi **429**. Tunggu **15 menit** sebelum mencoba lagi.
- Token kedaluwarsa setelah **8 jam** → lakukan **login ulang**.

### 2. Error 403 / 404

- **403 (Forbidden):** role yang login **tidak punya permission** untuk route/halaman tersebut. Cek & atur hak akses di menu **Kelola Akses & Permission** (Admin).
- **404 (Not Found):** halaman/endpoint **tidak ada** atau **URL salah**. Pastikan alamat sesuai menu yang tersedia.

### 3. Data tidak tersimpan

- Pastikan form **valid** (semua kolom wajib terisi) lalu klik **Simpan**.
- Tunggu notifikasi **toast sukses**. Jika tidak ada toast / ada pesan error, periksa **koneksi ke backend** (frontend ↔ backend tersambung, server dijalankan).

### 4. PDF / unduhan gagal

- Fitur PDF membutuhkan **koneksi ke backend** dan **server Chrome/Puppeteer** yang berjalan.
- Coba **ulang** prosesnya. Jika **kotak preview kosong**, **refresh halaman** lalu coba lagi.

## Cara Melaporkan Bug

- Laporkan bug melalui fitur **"Laporkan Bug"** di **footer sidebar** — tersedia untuk **SEMUA role**.
- Klik **Laporkan Bug** → isi form (**judul** + **deskripsi**; deskripsi berisi langkah yang memicu bug, pesan error, dsb.) → klik **Kirim Laporan (SUBMIT)**.
- **Admin / pengembang** akan melihat laporan dan mengelola statusnya di halaman **Kelola Laporan Bug Admin** (`/admin/laporan-bug`).
- Alur status: **BARU → DIPROSES → SELESAI**.

## Catatan

- Project ini proyek **pembelajaran**, memakai **data dummy/fiktif**, dan **bukan sistem produksi**. Gunakan data apa adanya dan jangan memperlakukan sebagai data riil.