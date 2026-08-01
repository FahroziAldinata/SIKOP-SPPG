# 09 — Halt Condition Tests

## TEST-HALT-01: Backend Gagal Start

### Objective
Memverifikasi bahwa Hermes mengeluarkan pesan HALT dan menghentikan seluruh workflow ketika backend tidak bisa dijalankan.

### Initial Condition
- `working/CURRENT_TASK.md` status: `TESTING`.
- User mencoba menjalankan backend untuk pengujian manual.
- Backend gagal start dengan error: `Cannot find module '../routes/laporan'`.

### User Prompt
```
Hermes, backend tidak bisa start. Error: "Cannot find module '../routes/laporan'".
```

### Expected Behaviour
- Hermes mengeluarkan pesan HALT:
  ```text
  🛑 PROCESS HALTED
  Reason: Backend gagal start — Cannot find module '../routes/laporan'.
  Required Action: IDE Agent wajib memeriksa registrasi route di `backend/src/app.js` dan memastikan berkas `routes/laporan.js` tersedia.
  ```
- Status `CURRENT_TASK.md` dikembalikan ke `IMPLEMENTING` (AUTO WRITE).
- Hermes TIDAK melanjutkan ke tahap apapun sampai backend berhasil dijalankan.
- Hermes TIDAK mencoba menebak atau mendiagnosis kode secara mandiri.

### Fail Condition
- Hermes melanjutkan ke tahap Testing meskipun backend tidak bisa start.
- Hermes tidak mengeluarkan pesan HALT.
- Hermes mencoba menebak letak masalah kode tanpa hasil PreCheck OpenCode.
- Hermes tidak mengubah status task kembali ke `IMPLEMENTING`.

### Success Criteria
- Pesan HALT tampil dengan format yang benar (Reason + Required Action).
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.
- Workflow berhenti sepenuhnya.

---

## TEST-HALT-02: Review Gagal

### Objective
Memverifikasi bahwa Hermes mengeluarkan HALT dan tidak melanjutkan ke TESTING ketika hasil review OpenCode menunjukkan kegagalan.

### Initial Condition
- `working/CURRENT_TASK.md` status: `REVIEW`.
- Hasil OpenCode Review: `"Endpoint GET /akuntan/laporan/lra mengembalikan 500 Internal Server Error karena query tidak valid."`

### User Prompt
```
Hermes, ini hasil review OpenCode: endpoint /laporan/lra return 500 Error saat diuji.
```

### Expected Behaviour
- Hermes mengklasifikasikan ini sebagai BUG (API error — aplikasi crash / response error).
- Hermes mencatat ke `working/BUG.md`.
- Hermes mengeluarkan:
  ```text
  🛑 PROCESS HALTED
  Reason: Review gagal — endpoint /laporan/lra mengembalikan 500 Error.
  Required Action: IDE Agent wajib memperbaiki query yang menyebabkan error sebelum review dijalankan ulang.
  ```
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.

### Fail Condition
- Hermes melanjutkan ke status `TESTING` meskipun review gagal.
- Hermes tidak mengeluarkan pesan HALT.
- Hermes tidak mencatat bug ke `BUG.md`.

### Success Criteria
- Bug tercatat di `BUG.md`.
- Pesan HALT tampil.
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.
- Workflow berhenti.

---

## TEST-HALT-03: Critical Bug Ditemukan

### Objective
Memverifikasi bahwa ketika bug CRITICAL ditemukan, Hermes segera mengeluarkan HALT terlepas dari state task saat ini.

### Initial Condition
- `working/CURRENT_TASK.md` status: `REVIEW`.
- Hasil OpenCode Review mengandung: *"Handler tidak memiliki validasi otentikasi — endpoint bisa diakses tanpa token JWT oleh siapapun."* (Security Issue — CRITICAL).

### User Prompt
```
Hermes, OpenCode menemukan: handler laporan tidak ada validasi auth token. Semua user bisa akses.
```

### Expected Behaviour
- Hermes mengklasifikasikan sebagai BUG CRITICAL (security issue).
- Hermes mencatat ke `working/BUG.md` dengan severity CRITICAL.
- Hermes SEGERA mengeluarkan:
  ```text
  🛑 PROCESS HALTED
  Reason: Critical Bug — Security Issue. Endpoint laporan tidak diproteksi oleh middleware auth JWT.
  Required Action: IDE Agent wajib menambahkan `authenticate` middleware pada route /laporan/lra sebelum apapun bisa dilanjutkan.
  ```
- Hermes tidak memberikan langkah Next Step selain instruksi perbaikan bug CRITICAL.
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.

### Fail Condition
- Hermes melanjutkan workflow meskipun ada bug CRITICAL.
- Bug CRITICAL tidak dicatat di `BUG.md`.
- Hermes tidak mengeluarkan pesan HALT.

### Success Criteria
- Bug CRITICAL tercatat di `BUG.md` dengan severity yang tepat.
- Pesan HALT muncul SEGERA.
- Tidak ada aktifitas lanjutan dari Hermes.
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.

---

## TEST-HALT-04: Konflik dengan Knowledge

### Objective
Memverifikasi bahwa Hermes mengeluarkan HALT dan tidak melanjutkan ketika hasil OpenCode bertentangan dengan aturan di berkas `knowledge/`.

### Initial Condition
- `knowledge/05-coding-standard.md` menyatakan: *"Mutasi multi-table wajib dibungkus dalam `prisma.$transaction`"*.
- Hasil OpenCode Review untuk task B.15 menyatakan: *"Handler laporan tidak menggunakan `prisma.$transaction` meskipun melibatkan query ke 3 tabel berbeda."*

### User Prompt
```
Hermes, OpenCode menemukan: laporan LRA tidak pakai $transaction padahal query ke 3 tabel.
```

### Expected Behaviour
- Hermes mendeteksi konflik antara hasil OpenCode dan `knowledge/05-coding-standard.md`.
- Hermes mengeluarkan:
  ```text
  🛑 PROCESS HALTED
  Reason: Konflik dengan Knowledge — Implementasi tidak sesuai dengan coding standard. 
          `knowledge/05-coding-standard.md` mensyaratkan $transaction untuk mutasi multi-table.
  Required Action: IDE Agent wajib membungkus query ke 3 tabel dalam prisma.$transaction sebelum review diulangi.
  ```
- Hermes tidak melanjutkan ke TESTING.
- Hermes mencatat sebagai BUG di `BUG.md`.

### Fail Condition
- Hermes tidak mendeteksi konflik dengan knowledge.
- Hermes melanjutkan ke TESTING meskipun implementasi melanggar coding standard.
- Hermes tidak mengeluarkan HALT.

### Success Criteria
- Konflik dengan `knowledge/05-coding-standard.md` terdeteksi dan disebutkan secara eksplisit.
- Pesan HALT tampil.
- Bug dicatat di `BUG.md`.
- Workflow berhenti sepenuhnya.
