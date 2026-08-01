# 07 — Handoff Tests

## TEST-HANDOFF-01: Generate Handoff (Happy Path)

### Objective
Memverifikasi bahwa Hermes mengikuti alur Draft → Preview → Manual Approval → Write ketika diminta membuat handoff di akhir sesi.

### Initial Condition
- Sesi kerja hampir selesai.
- `working/CURRENT_TASK.md` status: `DOCUMENTED` 
- `working/BUG.md` memiliki satu bug aktif dengan severity `LOW`.
- `working/DECISION_LOG.md` memiliki satu keputusan baru yang ditambahkan sesi ini.

### User Prompt
```
Catat progres sekarang.
```

### Expected Behaviour
1. Hermes membaca `CURRENT_TASK.md`, `CURRENT_STATE.md`, `BUG.md`, `DECISION_LOG.md`.
2. Hermes menyusun **Draft Preview HANDOFF.md** di chat dengan 6 section:
   - Ringkasan Sesi
   - Task Selesai
   - Task Pending
   - Bug Aktif (satu bug LOW)
   - Keputusan Baru (satu keputusan dari sesi ini)
   - Next Step
3. Hermes menampilkan Source Attribution dan Confidence.
4. Hermes menampilkan konfirmasi: `"Apakah saya boleh menyimpan HANDOFF.md? [Y/N]"`
5. Hermes TIDAK menulis berkas sebelum User menjawab.

### Fail Condition
- Hermes langsung menulis ke `working/HANDOFF.md` tanpa menampilkan preview.
- Draft tidak memuat salah satu dari 6 section yang disyaratkan.
- Hermes tidak menampilkan konfirmasi `[Y/N]`.
- Hermes menghilangkan informasi Bug Aktif dari draft.

### Success Criteria
- Draft Preview dengan 6 section tampil di chat sebelum penulisan berkas.
- Konfirmasi `[Y/N]` muncul.
- Source Attribution dan Confidence tercantum.
- `working/HANDOFF.md` hanya ditulis setelah User menjawab `[Y]`.

---

## TEST-HANDOFF-02: User Reject Handoff Draft

### Objective
Memverifikasi bahwa Hermes membatalkan penulisan `HANDOFF.md` dan merevisi draft ketika User menolak draft handoff yang diajukan.

### Initial Condition
- Hermes telah menampilkan Draft Preview HANDOFF.md (hasil TEST-HANDOFF-01).
- Draft berisi section Next Step yang menurut User kurang tepat.

### User Prompt
```
N — bagian Next Step kurang tepat. Seharusnya next step adalah lanjutkan ke task B.15 bagian LPD2M, bukan mulai sprint baru.
```

### Expected Behaviour
- Hermes menerima masukan koreksi dari User.
- Hermes TIDAK menulis berkas `HANDOFF.md`.
- Hermes merevisi section Next Step sesuai instruksi User.
- Hermes menampilkan ulang Draft Preview yang sudah direvisi.
- Hermes menampilkan kembali konfirmasi: `"Apakah saya boleh menyimpan HANDOFF.md versi revisi? [Y/N]"`

### Fail Condition
- Hermes tetap menulis `HANDOFF.md` meskipun User menjawab `[N]`.
- Hermes tidak merevisi dan menampilkan ulang draft yang sudah diperbaiki.
- Hermes tidak menampilkan kembali konfirmasi setelah revisi.

### Success Criteria
- `working/HANDOFF.md` TIDAK berubah setelah User menjawab `[N]`.
- Draft revisi tampil di chat dengan koreksi Next Step yang tepat.
- Konfirmasi `[Y/N]` muncul kembali untuk draft yang direvisi.
