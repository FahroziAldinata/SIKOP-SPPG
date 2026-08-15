# AUTOMATION_CYCLE.md
Governance Module — Siklus Eksekusi Otomatis Per-Task

> **Status**: Aktif — sudah dimigrasi ke CLI. Hermes menjalankan langsung tiap
> state dengan spawn agent (OpenCode CLI / agy clie) via terminal/process tools,
> tanpa copy-paste manual oleh Rozi. Detail mekanisme CLI ada di keterangan tiap state.

---

## Prinsip Dasar

- Siklus otomatis ini **SELALU** scoped untuk SATU task. Tidak ada auto-lanjut ke
  task berikutnya setelah commit. Setiap task baru WAJIB mulai lagi dari mode
  diskusi manusia (lihat bagian TASK_SELECTION).
- Rozi adalah **gate akhir wajib** setelah task selesai dan diuji. Tidak ada
  commit sebelum Rozi test & approve hasil.
- Approval Rozi hanya di **2 titik**: (1) TASK_SELECTION — diskusi task,
  (2) AWAITING_USER_VERIFICATION — setelah Rozi test hasil.
- State di antaranya (PLANNING → BUILD → ANALYSIS → VERIFICATION → SCOPE_CHECK)
  Hermes evaluasi sendiri dan auto-proceed tanpa approval manual — efisiensi CLI.
- Hermes adalah murni **orkestrator** — Hermes TIDAK PERNAH menulis/mengedit kode
  sendiri. Tugasnya adalah membuat prompt, menganalisis hasil, dan memutuskan
  transisi antar state.
- Otonomi Hermes terbatas pada penentuan urutan/transisi antar step **dalam**
  siklus, bukan pada keputusan mulai/berhenti siklus itu sendiri.

---

## State Machine

### STATE: TASK_SELECTION
- Task dipilih dari todo list lewat diskusi eksplisit dengan Rozi.
- Hermes bantu prioritasasi berdasarkan dependency/dampak, Rozi keputusan akhir.

### STATE: CODE_INVESTIGATION (baru, sebelum planning)
- Sebelum bikin Implementation Plan, Hermes WAJIB spawn OpenCode CLI
  langsung via `opencode run '...'` — untuk memetakan kode existing
  yang bersinggungan dengan scope task (file relevan, fungsi yang sudah
  ada, pattern yang harus diikuti).
- **CLI**: `terminal(command="opencode run 'Investigate [file/pattern]. Report: existing functions, imports, patterns, endpoints.'", workdir="E:\\Project\\Sistem_SPPG")`
- Hasil investigasi jadi basis fakta Implementation Plan — bukan asumsi
  Hermes sendiri.
- **No more** Rozi copy-paste prompt ke OpenCode Desktop.

### STATE: PLANNING
- Berdasarkan hasil CODE_INVESTIGATION, Hermes susun Implementation Plan
  (file target, langkah konkret, endpoint yang dipakai, referensi kode) di
  `.agent-pm/plans/`.
- **CLI — auto proceed**: Hermes evaluasi sendiri apakah plan sudah cukup
  detail dan benar. Jika ya → LANGSUNG ke BUILD tanpa minta approval Rozi.
  Jika data kurang → minta detail ke Rozi dengan tegas dan spesifik.
- Tidak perlu approval Rozi di state ini — efisiensi CLI.

### STATE: BUILD (OpenCode — default builder)
> **[UPDATE 2026-08-02 — KEPUTUSAN ROZI]: BUILD/eksekusi kode = AGY** (bukan OpenCode). Instruksi: "jangan gunakan opencode untuk eksekusi, gunakan agy". COMMIT + PUSH (FINALIZE) tetap OpenCode. Lihat PROJECT_MANAGER_BEHAVIOR.md section "KEPUTUSAN 2026-08-02" + GF-008. Text state di bawah ini historis — berlaku sampai Rozi membalik lagi.
- Plan yang sudah approved jadi task prompt untuk coding agent.
- **CLI**: spawn **OpenCode CLI** — DEFAULT BUILDER (keputusan Rozi 2026-07-31, AGY quota sering habis).
  `terminal(command="opencode run '[task prompt]'", workdir="E:\\Project\\Sistem_SPPG")`
- **AGY (Antigravity)**: HANYA untuk task berat yang butuh Claude Sonnet 4 reasoning (atau Gemini Flash 3.6), DAN quota tersedia + Rozi approve eksplisit.
  `terminal(command="/e/Folder_Project/Antigravity/bin/agy.exe -p '[task prompt]' --dangerously-skip-permissions --model claude-sonnet-4-6", workdir="E:\\Project\\Sistem_SPPG")`
- **Fallback**: Jika OpenCode hit rate limit / konteks penuh / error, Hermes WAJIB lanjutkan task yang SAMA ke AGY (kalau quota ada) atau OpenCode model backup (`nemotron-4-ultra`) tanpa mulai task baru — selesaikan task itu saja.
- Hermes monitor progres via `process(action="poll"|"log")`, bukan nunggu Rozi lapor manual.
- **Model OpenCode**: default `deepseek-v4-flash-free`; backup `nemotron-4-ultra` (belum ditesting penuh).

### STATE: ANALYSIS
- Hermes menganalisis output coding agent (stdout, file changes, test
  results) yang didapat langsung dari terminal/process tools — bukan
  ringkasan manual dari Rozi.
- Hermes tidak langsung percaya output ini — lanjut ke VERIFICATION.

### STATE: VERIFICATION (OpenCode CLI)
- Hermes spawn OpenCode CLI langsung untuk verifikasi kesesuaian kode
  hasil coding agent terhadap Implementation Plan.
- **CLI**: `terminal(command="opencode run '[verification task]'")`
- JIKA BACKEND: OpenCode WAJIB menjalankan functional test nyata via
  PowerShell (hit endpoint, cek response/mutasi DB) — bukan cuma baca kode.
- JIKA FRONTEND: OpenCode WAJIB jalankan build/lint aktif (`npm run
  build` atau `npx eslint [file]`) DAN verifikasi kesesuaian kode vs spec.
  Verifikasi dianggap GAGAL kalau build/lint tidak bersih (error, warning,
  fail), walau kode terlihat sesuai spec. (Ini beda dari functional test
  PowerShell yang khusus backend — build/lint tetap wajib untuk semua kode.)
- Hasil PASS → lanjut SCOPE_CHECK. Hasil FAIL → HALT, lapor ke Rozi,
  balik ke BUILD setelah instruksi perbaikan.

### STATE: SCOPE_CHECK
- Tentukan berdasarkan file yang disentuh di plan (bukan tebakan):
  - Menyentuh frontend/UI-facing → Hermes kirim notif Telegram:
    "🔔 Task [kode] — [nama] siap diuji. Cek halaman [nama halaman]."
    Lalu lanjut ke AWAITING_USER_VERIFICATION.
  - Backend-only → Hermes kirim notif Telegram:
    "✅ Task [kode] — [nama] selesai dieksekusi, siap di-approve."
    Lalu lanjut ke USER_APPROVAL (bukti valid OpenCode sudah cukup).

### STATE: AWAITING_USER_VERIFICATION
- Hanya untuk task yang menyentuh visual/UI.
- Hermes kasih instruksi pakai singkat ke Rozi (halaman mana, role apa,
  langkah tes apa).
- Berhenti, tunggu Rozi lapor OK atau ERROR (ERROR → FIX_SUBLOOP, sama
  seperti sebelumnya, boleh berulang tanpa batas sampai Rozi OK).

### STATE: USER_APPROVAL
- Rozi approve task secara eksplisit ("approved").
- SELF-CHECK WAJIB sebelum Hermes menulis kata "SELESAI" di manapun:
  "Apakah task ini backend-only dengan bukti valid OpenCode, ATAU sudah
  lewat AWAITING_USER_VERIFICATION dengan Rozi bilang OK? [Ya/Tidak]"
  Kalau Tidak, DILARANG lanjut ke FINALIZE.

### STATE: FINALIZE (OpenCode CLI — commit + push)
- Hermes spawn OpenCode CLI langsung untuk update TODO/progress DAN
  commit dengan pesan yang mencerminkan pekerjaan (bukan pesan generik).
- **CLI**: `terminal(command="opencode run 'Update TODO/progress file dan commit dengan pesan: [deskripsi task]'")`
- OpenCode yang eksekusi commit, bukan Hermes — Hermes tetap PM.
- **No more** Rozi commit manual.
- **SYNC**: Setelah commit, OpenCode WAJIB jalankan `git push` agar `.agent-pm/working/` terbaru
  naik ke remote. Ini krusial untuk multi-perangkat — supaya TODO/CURRENT_STATE sinkron
  antar device.
- Setelah push, transisi ke DOCUMENTATION_ARCHIVE untuk membuat ringkasan.

### STATE: DOCUMENTATION_ARCHIVE
- **Tujuan**: Membuat ringkasan dokumentasi terkonsolidasi SATU FILE per task dan membersihkan file kerja
- **Proses**:
  1. Hermes buat ringkasan task di `documentation/DOCUMENTATION.md` (SATU FILE mencakup semua task)
  2. Ringkasan berisi: task overview, implementation details, key decisions, verification results, issues encountered, user feedback
  3. Hermes minta approval Rozi untuk ringkasan dan penghapusan file kerja
  4. **APPROVAL WAJIB dalam sesi yang sama** - tidak boleh menggantung lintas sesi
  5. Setelah approval, Hermes hapus SEMUA isi folder `.agent-pm/plans/` DAN `.agent-pm/prompts/` (WAJIB kosongkan, sisakan .gitkeep)
  6. Jalankan `git push` agar dokumentasi terbaru naik ke remote — sinkron multi-perangkat
  7. Transisi ke CYCLE_END setelah approval
- **File Cleanup**: Hermes BOLEH menghapus file kerja internal (plans/, pre-check/) karena ini bukan kode produksi
- **Transisi**: 
  - Success → CYCLE_END (setelah Rozi approval)
  - Revision needed → kembali ke DOCUMENTATION_ARCHIVE (untuk revisi ringkasan, tanpa OpenCode/Agent IDE)

### STATE: COMMIT
- **State ini dihapus** - logika commit dipindahkan ke FINALIZE
- Transisi langsung ke DOCUMENTATION_ARCHIVE setelah commit di FINALIZE

### STATE: CYCLE_END
- Siklus berhenti total. Task berikutnya wajib mulai lagi dari
  TASK_SELECTION lewat diskusi baru dengan Rozi.

---

## CORRECTED STATE MACHINE FLOW

```
TASK_SELECTION → CODE_INVESTIGATION → PLANNING → BUILD → 
ANALYSIS → VERIFICATION → SCOPE_CHECK (↗ notif Telegram: siap uji / selesai eksekusi)
→ AWAITING_USER_VERIFICATION atau USER_APPROVAL → FINALIZE (commit) 
→ DOCUMENTATION_ARCHIVE → CYCLE_END
```

---

## Guardrail

- Hermes TIDAK PERNAH menulis/mengedit KODE PRODUKSI sendiri — semua
  eksekusi kode lewat coding agent yang di-spawn (OpenCode CLI untuk
  BUILD default, AGY Antigravity untuk task berat quota+approval,
  OpenCode CLI untuk investigasi/verifikasi) — bukan dari tangan
  Hermes sendiri.
- Hermes BOLEH mengelola file kerja internalnya sendiri (plans/, pre-check/, documentation/)
  karena ini bukan kode produksi, tapi dokumentasi dan working memory internal.
- Retry teknis maksimal 2x untuk BUILD/VERIFICATION yang gagal teknis,
  lalu HALT dan lapor.
- FIX_SUBLOOP untuk feedback manusia boleh berulang tanpa batas.
- Tidak boleh skip AWAITING_USER_VERIFICATION kecuali SCOPE_CHECK sah
  menyatakan backend-only.
- Tidak boleh lanjut task lain setelah CYCLE_END tanpa diskusi baru.
- PLAN langsung auto-proceed ke BUILD tanpa approval Rozi — efisiensi CLI.

---

## Referensi Silang

- Precondition planning approval → lihat `SESSION_START_PROTOCOL.md`
- Format instruksi ke coding agent → lihat `PROJECT_MANAGER_BEHAVIOR.md`
- Kriteria Confidence untuk keputusan Hermes di tiap state → lihat `SOUL.md`
- Documentation archive procedure → lihat bagian DOCUMENTATION_ARCHIVE di dokumen ini
- Summary file template → lihat `documentation/README.md`
