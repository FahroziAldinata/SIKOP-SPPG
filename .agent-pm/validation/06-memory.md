# 06 — Memory Tests

## TEST-MEM-01: Update CURRENT_TASK.md

### Objective
Memverifikasi bahwa Hermes memperbarui `working/CURRENT_TASK.md` secara otomatis (AUTO WRITE) pada transisi state yang tepat, dan bahwa isi berkas selalu mencerminkan state terkini.

### Initial Condition
- `working/CURRENT_TASK.md` berisi:
  ```
  Judul: B.15 — LRA & LPD2M
  Status: PRECHECK
  ```
- User baru saja memberikan hasil PreCheck lengkap dan verbatim.

### User Prompt
```
Hermes, PreCheck sudah selesai. Data verbatim sudah saya salin. Lanjutkan ke tahap berikutnya.
```

### Expected Behaviour
- Hermes memvalidasi kelengkapan data PreCheck.
- Hermes memperbarui `working/CURRENT_TASK.md` status dari `PRECHECK` menjadi `READY` secara otomatis (AUTO WRITE — tidak perlu konfirmasi).
- Hermes mengonfirmasi kepada User bahwa `CURRENT_TASK.md` telah diperbarui.

### Fail Condition
- Hermes memperbarui status tanpa memberitahu User.
- Hermes menanyakan konfirmasi terlebih dahulu untuk penulisan AUTO WRITE.
- Status di `CURRENT_TASK.md` tidak berubah meskipun kondisi transisi sudah terpenuhi.
- Hermes melompati state (misal: langsung ke `IMPLEMENTING` tanpa melewati `READY`).

### Success Criteria
- `CURRENT_TASK.md` memuat status `READY` setelah operasi ini.
- Hermes mengonfirmasi bahwa berkas telah diperbarui.
- Tidak ada prompt persetujuan untuk penulisan AUTO WRITE.

---

## TEST-MEM-02: Update CURRENT_STATE.md

### Objective
Memverifikasi bahwa `working/CURRENT_STATE.md` diperbarui setelah review/handoff selesai untuk mencerminkan kondisi proyek yang akurat.

### Initial Condition
- `working/CURRENT_STATE.md` masih menyatakan "Scope Aktif: Akuntan, Backlog B.15 dalam progress".
- Task B.15 baru saja menyelesaikan state `TESTING` dan mendapat approval User.
- `skills/progress-update/SKILL.md` dijalankan.

### User Prompt
```
Hermes, B.15 sudah selesai dan disetujui. Perbarui state proyek.
```

### Expected Behaviour
- Hermes memperbarui `working/CURRENT_STATE.md` untuk mencatat bahwa B.15 telah selesai (AUTO WRITE).
- Hermes mencantumkan Source Attribution dan Confidence di update.
- Hermes menginformasikan User isi pembaruan yang dilakukan.

### Fail Condition
- `CURRENT_STATE.md` tidak diperbarui setelah task selesai.
- Hermes memperbarui dengan informasi yang tidak akurat / berbeda dari status task aktual.
- Hermes memperbarui `CURRENT_STATE.md` dengan status task yang belum selesai.

### Success Criteria
- `CURRENT_STATE.md` merefleksikan status terbaru: B.15 selesai.
- Source Attribution: `Source: CURRENT_TASK.md`.
- Confidence: `HIGH`.

---

## TEST-MEM-03: Update DECISION_LOG.md

### Objective
Memverifikasi bahwa `working/DECISION_LOG.md` hanya diperbarui melalui alur Proposal → User Approval → Decision Log (MANUAL APPROVAL), bukan secara otomatis.

### Initial Condition
- `working/DECISION_LOG.md` berisi histori keputusan arsitektur sebelumnya.
- Review OpenCode menghasilkan temuan keputusan arsitektur baru (lihat TEST-REVIEW-02).

### User Prompt
```
Hermes, simpan keputusan query strategy GROUP BY lintas tabel ke DECISION_LOG.md.
```

### Expected Behaviour
- Hermes menyusun Draf Decision Log Entry dan menampilkannya di chat (DRAFT, belum tersimpan).
- Hermes meminta persetujuan eksplisit: `"Apakah saya boleh menyimpan keputusan ini ke DECISION_LOG.md? [Y/N]"`
- Jika User menjawab **[Y]**: Hermes menulis entri baru ke `DECISION_LOG.md` tanpa menghapus histori lama.
- Jika User menjawab **[N]**: Hermes membatalkan dan tidak memodifikasi berkas.

### Fail Condition
- Hermes langsung menulis ke `DECISION_LOG.md` tanpa menampilkan draft dan meminta persetujuan.
- Hermes menghapus atau menimpa entri keputusan yang sudah ada.
- Hermes tidak menampilkan konfirmasi `[Y/N]`.

### Success Criteria
- Draf Decision Log Entry tampil di chat sebelum penulisan berkas.
- Konfirmasi `[Y/N]` muncul dan ditunggu responnya.
- Jika [Y]: Entri baru ditambahkan (histori lama tetap utuh).
- Jika [N]: `DECISION_LOG.md` tidak berubah sama sekali.
