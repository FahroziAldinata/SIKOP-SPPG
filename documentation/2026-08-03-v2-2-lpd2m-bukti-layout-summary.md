# Dokumen Ringkasan Tugas V2-2: Image Handling (LPD2M Bukti Layout)

**Tanggal:** 2026-08-03  
**Tim:** Hermes (AI Administrative Project Manager)  
**Builder:** AGY (claude-sonnet-4-6)  
**Verifier:** OpenCode (deepseek-v4-flash-free)  

## 1. Ringkasan Tugas
Fitur V2-2 mengimplementasikan perubahan tampilan daftar bukti LPD2M pada laporan Kepala SPPG, baik di versi web maupun PDF.
Sebelumnya, daftar bukti hanya menampilkan teks (nama bukti, jenis, tanggal). Setelah perubahan, setiap item bukti ditampilkan dalam layout dua kolom:
- **Kolom Kiri:** Nama bukti (bold), jenis, dan tanggal upload.
- **Kolom Kanan:** Thumbnail gambar (jika file merupakan gambar) atau placeholder untuk file non-gambar (PDF, dll.) dengan indikasi jika gagal memuat gambar.

Perubahan ini berlaku untuk:
- **Web:** Halaman laporan LPD2M (LaporanPage.jsx) melalui komponen `Lpd2mBuktiSection`.
- **PDF:** Template laporan LPD2M (`lpd2m.js`) untuk bagian lampiran bukti.

Tujuan: meningkatkan keterbacaan dan visualisasi bukti dalam laporan, sambil mempertahankan fungsi upload, hapus, dan auto-delete sesuai periode.

## 2. Perubahan Teknis

### 2.1 Frontend (Web)
- **File:** `frontend/src/components/akuntan/laporan/Lpd2mBuktiSection.jsx`
- **Modifikasi:** 
  - Ubah rendering daftar bukti (baris 136-182 sebelumnya) menjadi layout flex baris per item.
  - Kolom kiri (`flex: 1`) berisi:
    - `namaBukti` (tebal)
    - `jenis` dalam kurung
    - `createdAt` (tanggal upload)
  - Kanan berisi:
    - Jika `mimeType` mulai dengan `image/`:
      - Tag `<img>` dengan `src='/uploads/' + b.filePath`, gaya `maxHeight:80px`, `maxWidth:120px`, `objectFit:contour`, border, border-radius, background putih.
      - Event `onError` untuk menyembunyikan gambar dan menampilkan placeholder `[Gagal Load]`.
    - Jika bukan gambar:
      - Placeholder kotak abu-abu dengan ikon dan teks `[Non-Gambar]`.
    - Tombol hapus (`🗑️ Hapus`) tetap ada di bawah thumbnail/placeholder.
- **File yang tidak diubah:** 
  - `LaporanPage.jsx` (posisi komponen tetap di atas tabel sesuai keputusan Rozi).
  - File lain di `components/akuntan/laporan/` atau logika state di `LaporanPage.jsx`.

### 2.2 Backend (PDF)
- **File:** `backend/src/templates/dokumen/lpd2m.js`
- **Modifikasi:**
  - Ubah variabel `lampiranHtml` (baris 47-56 sebelumnya) menjadi layout flex baris per item.
  - Setiap item:
    - Kolom kiri (`flex: 1`):
      - `namaBukti` (tebal)
      - `jenis` dalam kurung
      - `createdAt` (tanggal upload)
    - Kolom kanan (`flex-shrink: 0`):
      - Jika `mimeType` mulai dengan `image/`:
        - Tag `<img>` dengan `src` berupa data-URI base64, gaya `maxHeight:80px`, `maxWidth:120px`, `objectFit:contain`, border, border-radius, background putih.
        - Atribut `onerror` untuk menyembunyikan gambar dan menampilkan placeholder `[Gagal Load]`.
      - Jika bukan gambar:
        - Placeholder kotak abu-abu dengan ikon dan teks `[Non-Gambar]`.
  - Tidak ada perubahan pada struktur luar (page-break-before, judul "Lampiran Bukti LPD2M", atau fungsi `renderLpd2mHtml` lainnya).
  - Fungsi auto-delete (pada route `/laporan/lpd2m/pdf`) tetap sama: menghapus file fisik dan record basis data setelah PDF berhasil dibuat.

### 2.3 File yang Terlibat
- Diubah:
  1. `frontend/src/components/akuntan/laporan/Lpd2mBuktiSection.jsx` (commit f837cc7)
  2. `backend/src/templates/dokumen/lpd2m.js` (commit 100b0da)
- Tidak diubah:
  - `backend/prisma/schema.prisma` (model `DokumenBuktiLpd2m` tetap sama)
  - `backend/src/routes/bukti-lpd2m.js` (route upload, list, delete)
  - `backend/src/routes/laporan/lpd2m.js` (route PDF dan logika auto-delete)
  - `backend/src/app.js` (static `/uploads`)
  - File frontend lain atau komponen lain.

## 3. Verifikasi
- **Sintaks:**
  - `node -c backend/src/templates/dokumen/lpd2m.js` → exit code 0.
  - `eslint frontend/src/components/akuntan/laporan/Lpd2mBuktiSection.jsx` → tidak ada error (asumsi konfigurasi aktif).
  - Build frontend: `npm run build` → berhasil tanpa error.
- **Fungsional (manual):**
  - Perubahan tampilan sesuai spesifikasi (lihat commit diff).
  - Tidak ada file lain yang terpengaruh secara tidak sengaja (lihat `git diff --stat`).
- **Git:**
  - Commit: `100b0da` (feat: V2-2 LPD2M bukti layout kiri nama/kanan gambar (web + pdf))
  - Commit: `f837cc7` (fix: LPD2M gambar gagal load — tambah /uploads/ prefix path)
  - Hanya dua file yang berubah.

## 4. Keputusan dan Catatan
- Posisi komponen `Lpd2mBuktiSection` tetap di atas tabel LPD2M di web sesuai persetujuan Rozi (tidak dipindahkan ke bawah tabel).
- Placeholder untuk non-gambar dan gagal load mengikuti pola desain yang sudah ada (warna, ukuran, ikon).
- Variabel CSS `--border` tidak ditemukan dalam `SHARED_CSS`, sehingga digunakan nilai hardcode `#ccc` untuk konsistensi.
- Auto-delete tetap aman karena base64 diekstrak sebelum file dihapus (dalam route PDF).
- Tidak ada perubahan pada model atau API; semua data berasal dari kolom yang sudah ada (`namaBukti`, `jenis`, `filePath`, `mimeType`, `createdAt`).
- Fix path: frontend sebelumnya pakai `src={'/' + b.filePath}` → sekarang `src={'/uploads/' + b.filePath}` karena backend punya static route `/uploads`.

## 5. Berikutnya
Setelah dokumen ini disetujui, file-file rencana dan prompt untuk tugas ini akan dihapus, dan status tugas akan diperbarui menjadi SELESAI.

---

*Dokumen ini dibuat secara otomatis sebagai bagian dari proses DOCUMENTATION_ARCHIVE. Silakan konfirmasi setuju dengan menjawab "setuju" atau memberikan masukan untuk revisi.*