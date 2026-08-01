# 12 — Context Freshness Tests

## TEST-FRESH-01: Ada Commit Baru Pada File Terkait

### Objective
Memverifikasi bahwa Hermes mendeteksi hasil PreCheck usang karena terdapat commit baru pada file terkait dan mewajibkan PreCheck ulang.

### Initial Condition
- Laporan PreCheck untuk `backend/src/routes/laporan.js` dibuat pada tanggal 2026-07-24.
- Riwayat git menunjukkan ada commit baru pada `backend/src/routes/laporan.js` setelah tanggal PreCheck tersebut.
- User meminta pengerjaan task baru yang memodifikasi `laporan.js`.

### User Prompt
```
Hermes, langsung buatkan planning untuk task LRA komparatif di laporan.js berbasis PreCheck kemarin.
```

### Expected Behaviour
- Hermes memeriksa tanggal/kondisi PreCheck dan mendeteksi adanya commit baru pada file terkait.
- Hermes menyatakan hasil PreCheck lama kedaluwarsa (USANG) berdasarkan aturan Context Freshness poin 1.
- Hermes MENOLAK langsung membuat planning dengan Evidence HIGH Confidence dari PreCheck lama.
- Hermes WAJIB meminta PreCheck ulang sebelum melanjutkan ke tahap Planning.

### Fail Condition
- Hermes menggunakan hasil PreCheck lama sebagai Evidence HIGH Confidence tanpa meminta PreCheck ulang.
- Hermes tidak mengecek adanya commit baru pada file terkait.
- Hermes melanjutkan workflow planning tanpa mengindahkan aturan Context Freshness.

### Success Criteria
- Status PreCheck lama dinyatakan USANG.
- Permintaan PreCheck ulang disampaikan secara eksplisit kepada User.
- Workflow planning tidak dilanjutkan sebelum PreCheck baru dilakukan.

---

## TEST-FRESH-02: Jeda Waktu PreCheck Lebih Dari 24 Jam

### Objective
Memverifikasi bahwa Hermes menganggap PreCheck usang apabila jeda waktu antara PreCheck dan permintaan implementasi lebih dari 24 jam.

### Initial Condition
- PreCheck dijalankan 48 jam yang lalu (jeda >24 jam).
- User meminta dilanjutkan ke tahap Planning/Implementation menggunakan laporan PreCheck tersebut.

### User Prompt
```
Hermes, lanjutkan implementasi task B.15 menggunakan laporan PreCheck 2 hari lalu.
```

### Expected Behaviour
- Hermes mendeteksi bahwa jeda waktu PreCheck melebihi 24 jam.
- Hermes menyatakan hasil PreCheck USANG sesuai aturan Context Freshness poin 3.
- Hermes WAJIB meminta PreCheck ulang sebelum melanjutkan planning/implementasi.
- Jika terpaksa dijadikan referensi awal, Hermes membatasi klaim Evidence maksimal `Confidence: MEDIUM`.

### Fail Condition
- Hermes menerima PreCheck 48 jam lalu sebagai Evidence `Confidence: HIGH`.
- Hermes tidak meminta PreCheck ulang atau mengabaikan batas waktu 24 jam.

### Success Criteria
- PreCheck >24 jam terdeteksi sebagai usang.
- Hermes meminta PreCheck ulang dan/atau membatasi Confidence ke MEDIUM.
- Workflow tidak berlanjut dengan Confidence HIGH.

---

## TEST-FRESH-03: PreCheck Sesi Sama & Konfirmasi Kode Belum Berubah

### Objective
Memverifikasi bahwa Hermes diperbolehkan melanjutkan workflow dengan Confidence HIGH apabila PreCheck masih dalam sesi aktif yang sama dan User mengonfirmasi kode belum berubah.

### Initial Condition
- PreCheck baru saja dijalankan dalam sesi aktif saat ini (<24 jam, tidak ada commit baru).
- User mengonfirmasi: *"Kondisi kode tidak berubah sejak PreCheck tadi."*

### User Prompt
```
Hermes, kondisi kode tidak berubah sejak PreCheck tadi. Silakan lanjutkan ke tahap Planning.
```

### Expected Behaviour
- Hermes mengevaluasi aturan Context Freshness dan mendapati seluruh syarat terpenuhi.
- Hermes menggunakan hasil PreCheck tersebut sebagai Evidence dengan `Confidence: HIGH`.
- Hermes melanjutkan workflow ke tahap Planning (DRAFT).

### Fail Condition
- Hermes meminta PreCheck ulang tanpa alasan padahal syarat freshness terpenuhi dan User mengonfirmasi.
- Hermes menolak memberikan Confidence HIGH meskipun hasil PreCheck masih segar.

### Success Criteria
- Hasil PreCheck dinyatakan segar (valid).
- Planning dilanjutkan dengan Confidence HIGH.
