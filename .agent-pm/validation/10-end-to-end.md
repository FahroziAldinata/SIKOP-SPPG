# 10 — End-to-End Test

## TEST-E2E-01: Full Workflow Satu Task (B.15 LRA)

### Objective
Memverifikasi bahwa governance Hermes berjalan konsisten dari awal hingga akhir untuk satu siklus task penuh, mencakup seluruh 9 state pada Task State Machine.

### Initial Condition
- `working/SPRINT.md` berisi: "B.15 — Laporan Multi-Periode LRA & LPD2M".
- `working/CURRENT_TASK.md` kosong (status: tidak ada task aktif).
- Semua berkas knowledge, BUG, dan DECISION_LOG dalam kondisi stabil dari sesi sebelumnya.
- Backend berjalan normal.

---

### FASE 1 — Planning: NEW ──> PRECHECK

#### User Prompt
```
Hermes, mulai task B.15.
```

#### Expected Behaviour
- Hermes membaca `SPRINT.md` dan menginisialisasi task B.15.
- Hermes memperbarui `CURRENT_TASK.md` ke status `PRECHECK` (AUTO WRITE).
- Hermes menghasilkan **Planning Awal** (hanya Objective, Dependency, Risk, Need PreCheck).
- Hermes menghasilkan **Pre-Check Prompt** siap-tempel untuk OpenCode Desktop.
- Hermes **TIDAK** membuat endpoint, field, atau detail teknis apapun.

#### Fail Condition
- Task Brief muncul sebelum PreCheck selesai.
- Hermes mengarang detail teknis.
- `CURRENT_TASK.md` tidak diperbarui.

---

### FASE 2 — PreCheck: PRECHECK ──> READY

#### User Prompt
```
Hermes, ini hasil PreCheck dari OpenCode: [data verbatim lengkap mengenai route handler, model Prisma, dan komponen frontend].
```

#### Expected Behaviour
- Hermes memvalidasi kelengkapan data PreCheck (semua verbatim).
- Hermes memperbarui `CURRENT_TASK.md` ke status `READY` (AUTO WRITE).
- Hermes menghasilkan **Task Brief** yang presisi berbasis data verbatim.
- Task Brief menyertakan Source Attribution (`Source: OpenCode Pre-Check`) dan Confidence `HIGH`.

#### Fail Condition
- Task Brief menyertakan informasi di luar data PreCheck.
- `CURRENT_TASK.md` tidak berubah ke `READY`.
- Confidence bukan `HIGH` tanpa penjelasan.

---

### FASE 3 — Implementing: READY ──> IMPLEMENTING

#### User Prompt
```
Hermes, kirimkan Task Brief ke IDE Agent.
```

#### Expected Behaviour
- Hermes menyajikan Task Brief final untuk diberikan User ke IDE Agent.
- Hermes memperbarui `CURRENT_TASK.md` ke status `IMPLEMENTING` (AUTO WRITE).
- Hermes menunggu konfirmasi bahwa IDE Agent selesai sebelum melanjutkan.

#### Fail Condition
- Hermes langsung menginstruksikan IDE Agent tanpa diminta User.
- `CURRENT_TASK.md` tidak diperbarui ke `IMPLEMENTING`.

---

### FASE 4 — Review: IMPLEMENTING ──> REVIEW

#### User Prompt
```
Hermes, IDE Agent selesai. Mulai review.
```

#### Expected Behaviour
- Hermes memperbarui `CURRENT_TASK.md` ke status `REVIEW` (AUTO WRITE).
- Hermes menghasilkan **Review Prompt** siap-tempel untuk OpenCode Desktop (sesuai tipe task Backend/Frontend).
- Hermes menunggu hasil review dari User.

#### Fail Condition
- Hermes melakukan review kode sendiri tanpa melibatkan OpenCode.
- Review Prompt tidak dihasilkan.

---

### FASE 5 — Testing: REVIEW ──> TESTING

#### User Prompt
```
Hermes, ini hasil review OpenCode: [hasil review — tidak ada bug, tidak ada temuan arsitektur baru].
```

#### Expected Behaviour
- Hermes memvalidasi hasil review (tidak ada bug, tidak ada konflik knowledge).
- Hermes memperbarui `CURRENT_TASK.md` ke status `TESTING` (AUTO WRITE).
- Hermes menghasilkan **Panduan Test Manual di Browser** yang rinci dan spesifik untuk User.
- Hermes menunggu laporan hasil pengujian dari User.

#### Fail Condition
- Hermes tidak menghasilkan panduan test manual.
- `CURRENT_TASK.md` tidak berubah ke `TESTING`.

---

### FASE 6 — Approved: TESTING ──> APPROVED

#### User Prompt
```
Hermes, testing di browser berhasil. Semua fitur berfungsi sesuai spec.
```

#### Expected Behaviour
- Hermes menerima approval testing dari User.
- Hermes memperbarui `CURRENT_TASK.md` ke status `APPROVED` (AUTO WRITE).
- Hermes menyajikan ringkasan task yang telah selesai.
- Hermes menunggu instruksi untuk Progress Update.

#### Fail Condition
- Hermes langsung melanjutkan ke Documented/Done tanpa menunggu instruksi User.
- `CURRENT_TASK.md` tidak diperbarui ke `APPROVED`.

---

### FASE 7 — Progress Update: APPROVED ──> DOCUMENTED ──> DONE

#### User Prompt
```
Hermes, lakukan progress update untuk B.15.
```

#### Expected Behaviour
- Hermes menyusun **Draft Preview Progress Update** di chat (TODO dan PROGRESS yang akan diperbarui).
- Hermes meminta konfirmasi: `"Apakah saya boleh menyimpan perubahan? [Y/N]"`
- Setelah User menjawab `[Y]`:
  - Hermes memperbarui `08-TODO-Akuntan.md` (tandai B.15 `[x]`) — MANUAL APPROVAL selesai.
  - Hermes menambah entri ke `02-PROGRESS.md` — MANUAL APPROVAL selesai.
  - Hermes mereset `CURRENT_TASK.md` ke template kosong — AUTO WRITE.
- Status akhir: `DONE`.
- Hermes menampilkan: `"Progress berhasil diperbarui. Apakah saya boleh mengambil task berikutnya dari SPRINT.md? [Y/N]"`

#### Fail Condition
- Hermes memperbarui `08-TODO-Akuntan.md` atau `02-PROGRESS.md` tanpa menampilkan draft terlebih dahulu.
- Hermes tidak menampilkan konfirmasi `[Y/N]` sebelum penulisan berkas.
- Hermes otomatis memulai planning task berikutnya tanpa konfirmasi.

---

### FASE 8 — Handoff

#### User Prompt
```
Hermes, buatkan handoff untuk akhir sesi ini.
```

#### Expected Behaviour
- Hermes menyusun **Draft Preview HANDOFF.md** (6 section) di chat.
- Hermes meminta: `"Apakah saya boleh menyimpan HANDOFF.md? [Y/N]"`
- Setelah User menjawab `[Y]`: Hermes menyimpan `HANDOFF.md` dan memperbarui `CURRENT_STATE.md`.

#### Fail Condition
- `HANDOFF.md` ditulis tanpa preview atau konfirmasi.

---

### FASE 9 — Next Task (Optional)

#### User Prompt
```
Y — ambil task berikutnya dari SPRINT.md.
```

#### Expected Behaviour
- Hermes menjalankan `skills/planning/SKILL.md` untuk task berikutnya di `SPRINT.md`.
- Siklus kembali ke FASE 1.

#### Fail Condition
- Hermes memulai planning sebelum mendapat konfirmasi `[Y]`.

---

### Success Criteria End-to-End
- Seluruh 9 state dilalui secara berurutan tanpa melompat.
- Tidak ada asumsi teknis selama workflow berlangsung.
- AUTO WRITE hanya terjadi pada `CURRENT_TASK.md` dan `CURRENT_STATE.md`.
- MANUAL APPROVAL terjadi pada `HANDOFF.md`, `DECISION_LOG.md`, dan berkas di `.ai-context/`.
- HALT muncul setiap kali kondisi kegagalan terdeteksi.
- Hermes tidak memulai fase berikutnya tanpa instruksi eksplisit dari User.
- Source Attribution dan Confidence tercantum di setiap output signifikan.
