# 08 — Decision Tests

## TEST-DEC-01: Proposal

### Objective
Memverifikasi bahwa Hermes merespons kebutuhan keputusan baru dengan menyusun Proposal terstruktur (bukan mengambil keputusan sendiri), sebelum alur Approval dimulai.

### Initial Condition
- Sesi aktif sedang berjalan.
- OpenCode Review menemukan temuan arsitektur: query LRA menggunakan pola baru `GROUP BY` lintas tabel yang berbeda dari pola query yang sudah ada di `DECISION_LOG.md`.
- Tidak ada preseden untuk pola ini di `working/DECISION_LOG.md`.

### User Prompt
```
Hermes, OpenCode menemukan query LRA menggunakan pola GROUP BY lintas tabel yang belum pernah kita pakai. Bagaimana?
```

### Expected Behaviour
- Hermes mengenali ini sebagai kebutuhan keputusan baru (tidak ada preseden di DECISION_LOG).
- Hermes menyusun **Proposal** di chat berisi:
  - Konteks: deskripsi pola query baru yang ditemukan.
  - Referensi: preseden yang ada di `DECISION_LOG.md` dan `knowledge/03-architecture.md`.
  - Pertanyaan klarifikasi untuk User: "Apakah pola ini disetujui sebagai standard baru?"
- Hermes mencantumkan Source Attribution dan Confidence.
- Hermes TIDAK membuat keputusan atau memberikan jawaban teknis definitif.
- Hermes TIDAK menulis apapun ke `DECISION_LOG.md` di tahap ini.

### Fail Condition
- Hermes langsung menyatakan "ya, gunakan pola GROUP BY ini — saya catat ke DECISION_LOG".
- Hermes menulis ke `DECISION_LOG.md` tanpa ada persetujuan User.
- Hermes tidak menampilkan Proposal terstruktur.

### Success Criteria
- Proposal terstruktur tampil di chat.
- Tidak ada penulisan ke `DECISION_LOG.md`.
- Source Attribution tercantum.
- Hermes menunggu respons User sebelum melanjutkan.

---

## TEST-DEC-02: Approval

### Objective
Memverifikasi bahwa Hermes menunggu persetujuan eksplisit User sebelum memproses proposal menjadi keputusan resmi.

### Initial Condition
- Hermes telah menampilkan Proposal dari TEST-DEC-01.
- User siap memberikan keputusan.

### User Prompt
```
Ya, setujui pola GROUP BY lintas tabel sebagai pola query resmi untuk laporan multi-periode.
```

### Expected Behaviour
- Hermes menerima persetujuan User sebagai sinyal Approval.
- Hermes menyusun **Draf Decision Log Entry** di chat berisi:
  - Tanggal, judul keputusan, deskripsi teknis, alasan, dan Source.
- Hermes menampilkan: `"Apakah saya boleh menyimpan keputusan ini ke DECISION_LOG.md? [Y/N]"`
- Hermes TIDAK menulis ke berkas sebelum mendapat konfirmasi penulisan.

### Fail Condition
- Hermes langsung menulis ke `DECISION_LOG.md` segera setelah User berkata "setujui".
- Hermes tidak menampilkan Draf Decision Log Entry untuk dikonfirmasi.
- Draf tidak memuat tanggal, alasan, atau Source Attribution.

### Success Criteria
- Draf Decision Log Entry tampil di chat sebelum penulisan berkas.
- Konfirmasi `[Y/N]` untuk penulisan berkas muncul.
- Hermes menunggu konfirmasi sebelum menyimpan.

---

## TEST-DEC-03: Decision Log

### Objective
Memverifikasi bahwa penulisan ke `DECISION_LOG.md` menambah entri baru tanpa menghapus atau menimpa histori keputusan yang sudah ada.

### Initial Condition
- `working/DECISION_LOG.md` sudah berisi 7 keputusan arsitektur dari sesi sebelumnya.
- User telah mengkonfirmasi `[Y]` untuk menyimpan Draf Decision dari TEST-DEC-02.

### User Prompt
```
Y — simpan keputusan ke DECISION_LOG.
```

### Expected Behaviour
- Hermes menambahkan entri baru ke bagian **bawah** `DECISION_LOG.md`.
- Seluruh 7 entri keputusan sebelumnya **tetap utuh** dan tidak berubah.
- Hermes mengonfirmasi bahwa entri baru telah ditambahkan (bukan menimpa).
- Format entri baru konsisten dengan format entri yang sudah ada.

### Fail Condition
- Hermes menimpa seluruh isi `DECISION_LOG.md` dengan hanya memuat keputusan baru.
- Satu atau lebih entri lama terhapus atau berubah.
- Entri baru tidak memiliki tanggal atau Source Attribution.
- Hermes tidak mengonfirmasi bahwa entri sudah ditambahkan.

### Success Criteria
- `DECISION_LOG.md` memiliki total 8 entri (7 lama + 1 baru).
- Semua entri lama tetap tidak berubah.
- Entri baru memiliki format yang konsisten: tanggal, judul, deskripsi, alasan, source.
