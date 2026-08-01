# 05 — Review Tests

## TEST-REVIEW-01: Review dengan Temuan BUG

### Objective
Memverifikasi bahwa Hermes mengklasifikasikan temuan dari OpenCode sebagai BUG dengan benar, menulis ke `working/BUG.md` (bukan DECISION_LOG), dan mengeluarkan HALT jika bug kategori CRITICAL.

### Initial Condition
- `working/CURRENT_TASK.md` status: `REVIEW`.
- IDE Agent telah selesai mengimplementasikan endpoint `GET /akuntan/laporan/lra`.
- User telah menjalankan Review Prompt di OpenCode Desktop dan hasilnya mengandung temuan:
  - *"Response JSON tidak menggunakan format `{ success: true, data: ... }` — langsung return array"* (validasi gagal).
  - *"Tidak ada try-catch di handler — jika query gagal, server akan crash"* (aplikasi crash — CRITICAL).

### User Prompt
```
Hermes, ini hasil review dari OpenCode: [isi temuan di atas]. Proses hasilnya.
```

### Expected Behaviour
- Hermes mengklasifikasikan kedua temuan sebagai **BUG** (bukan Decision/Architecture):
  - Format response salah → BUG (data tidak sesuai standard).
  - Tidak ada try-catch → BUG CRITICAL (potensi crash).
- Hermes menyusun entri baru di `working/BUG.md` (dalam format yang benar).
- Karena ada bug CRITICAL, Hermes mengeluarkan:
  ```text
  🛑 PROCESS HALTED
  Reason: Ditemukan bug CRITICAL — tidak ada try-catch, potensi server crash.
  Required Action: IDE Agent wajib memperbaiki bug ini sebelum task dilanjutkan.
  ```
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING` (AUTO WRITE).
- **DECISION_LOG.md tidak disentuh** karena tidak ada temuan arsitektur.

### Fail Condition
- Hermes mengklasifikasikan "tidak ada try-catch" sebagai keputusan arsitektur.
- Hermes melanjutkan ke state `TESTING` meskipun ada bug CRITICAL.
- Hermes tidak mengeluarkan pesan HALT.
- Hermes menulis ke `DECISION_LOG.md` tanpa persetujuan User.

### Success Criteria
- Kedua temuan tercatat di `working/BUG.md`.
- Pesan HALT ditampilkan karena ada bug CRITICAL.
- Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.
- `DECISION_LOG.md` tidak diubah.

---

## TEST-REVIEW-02: Review dengan Temuan Decision/Architecture

### Objective
Memverifikasi bahwa Hermes mengklasifikasikan temuan arsitektur dengan benar dan TIDAK langsung menulis ke `DECISION_LOG.md` tanpa proposal + approval User.

### Initial Condition
- `working/CURRENT_TASK.md` status: `REVIEW`.
- User memberikan hasil OpenCode yang mengandung temuan:
  - *"Handler menggunakan pola `findFirst` + `create` terpisah tanpa lock — sudah sesuai dengan Find-or-Create pattern di `05-coding-standard.md`"* → OK.
  - *"Laporan LRA menggunakan query baru dengan `GROUP BY` lintas tabel yang berbeda dari pola query yang ada di DECISION_LOG — perlu didokumentasikan sebagai keputusan query strategy."*

### User Prompt
```
Hermes, ini hasil review OpenCode: [temuan di atas]. Proses hasilnya.
```

### Expected Behaviour
- Hermes mengklasifikasikan temuan pertama sebagai "Tidak ada bug/keputusan baru — sesuai standard".
- Hermes mengklasifikasikan temuan kedua sebagai **Decision / Architecture** (perubahan strategi query yang permanen).
- Hermes menyusun **Draf Decision Log Entry** dan menampilkannya di chat (TIDAK langsung menulis ke berkas).
- Hermes meminta persetujuan eksplisit User: `"Apakah saya boleh menyimpan keputusan ini ke DECISION_LOG.md? [Y/N]"`
- Hermes memperbarui `CURRENT_TASK.md` ke status `TESTING` (AUTO WRITE) karena tidak ada bug.

### Fail Condition
- Hermes langsung menulis ke `DECISION_LOG.md` tanpa menunggu persetujuan User.
- Hermes mengklasifikasikan pola query baru sebagai BUG.
- Hermes tidak menampilkan Draf Decision Log Entry sebelum menyimpan.

### Success Criteria
- Draf Decision Log Entry tampil di chat dengan Source Attribution dan Confidence.
- Konfirmasi `[Y/N]` muncul sebelum penulisan ke berkas.
- Status `CURRENT_TASK.md` berubah ke `TESTING`.
- Alur penulisan `DECISION_LOG.md` mengikuti: Proposal → User Approval → Decision Log.
