# Governance Findings

> **Ringkas**: 2026-08-02 — detail panjang dipangkas atas keputusan Rozi (efisiensi context). Esensi per temuan + pelajaran aktif dipertahankan.

## Temuan Resolved (GF-001 s.d. GF-008)

| ID | Tanggal | Kategori | Esensi | Status |
|---|---|---|---|---|
| GF-001 | 2026-07-25 | Operational Boundary | Hermes hanya definisikan input/output/workflow — eksekusi tool milik user/agent | RESOLVED |
| GF-002 | 2026-07-25 | Process Violation | Prompt wajib di-save ke audit trail SEBELUM ditampilkan ke chat | RESOLVED |
| GF-003 | 2026-07-26 | Process Violation | Aturan baru → default ke file governance permanen, bukan file task spesifik; tanya balik jika ambigu | RESOLVED |
| GF-004 | 2026-07-26 | Structural Gap | governance/*.md wajib di-load di SESSION_START_PROTOCOL (rules aktif sebelum proses task) | RESOLVED |
| GF-006 | 2026-07-26 | QA Gap | Review frontend WAJIB sertakan build/lint aktual verbatim — gagal jika tidak bersih | RESOLVED |
| GF-007 | 2026-07-26 | Process Violation | Self-check wajib sebelum mark SELESAI: sudah lewat AWAITING_USER_VERIFICATION + Rozi OK eksplisit? | RESOLVED |
| GF-008 | 2026-08-02 | Process Violation | FINALIZE commit via AGY — seharusnya OpenCode ("commit tugas opencode", koreksi Rozi) | RESOLVED |
| GF-009 | 2026-08-03 | QA Gap | Klaim "semua test PASS" wajib verifikasi independen — self-report AI bisa keliru (race condition) | RESOLVED (aturan diadopsi) |
| GF-010 | 2026-08-04 | Source Attribution | Frasa "12 jam + refresh token" (instruksi STEP 3 V3 F1) TIDAK punya sumber di riwayat/sesi/prompt/file state — hanya muncul di pesan Rozi sendiri; "refresh token" bersumber dari backlog V3 FASE 1 (TODO.md:79) tanpa angka durasi | RESOLVED (dokumentasi) |

## Detail GF-010 — Frasa "12 jam + refresh token" tanpa sumber riwayat (2026-08-04)

- **Kategori**: Source Attribution (instruksi ambigu / asal-usul spesifikasi).
- **Deskripsi**: Di laporan audit JWT (STEP 3 V3 F1), Hermes menyebut "Opsi B: expiry 12 jam dengan refresh token" persis dari instruksi Rozi, lalu mencatat bahwa 12 jam > 8 jam berarti memperpanjang (bukan mengurangi) dan meminta klarifikasi. Rozi meminta bukti sumber frasa "12 jam + refresh token" — dicek lengkap, tidak ditemukan.
- **Bukti pencarian (lokasi yang diperiksa, semuanya)**: (1) session_search "refresh token"/"12 jam"/"expiry" — hanya sesi aktif tersedia; match = item backlog V3 FASE 1, tidak ada "12 jam"; (2) search_files .agent-pm (pattern `refresh token|12 jam|expiry|TOKEN_EXPIRY|tokenVersion`) — 1 match: TODO.md:79 "Review mekanisme JWT: expiry, algoritma, dan kebutuhan refresh token"; (3) `git log --all --grep "refresh|12 jam|expiry|jwt"` — hanya `62c76ca ci: tambah JWT_SECRET env di job backend test` (tidak relevan); (4) `.agent-pm/prompts/` — 4 file commit docs (arsip sesi 36, backlog V3, tag), tidak ada prompt JWT; (5) `.agent-pm/plans/` — 5 plan (V2 + step1-rate-limit), tidak ada "12 jam"; (6) backup sesi lama `D:\Tools_Project\hermes_backup_sessions_20260804\state.db` (bytes scan penuh) — `"12 jam"` = **0 match**, `"refresh token"` = 6 match, SEMUA berasal dari pesan Rozi "TASK: Susun Backlog V3" (sesi 20260804_021320_63ac73) + eksekusi update TODO.md section V3 — tanpa angka durasi.
- **Kesimpulan**: Tidak ditemukan sumber "12 jam" di mana pun. Satu-satunya kemunculan = instruksi Rozi sendiri di pesan TASK STEP 3 sesi ini. "refresh token" bersumber dari backlog V3 FASE 1 (TODO.md:79, commit `eec6b1c`) — tanpa nilai durasi. Bukan diklaim "salah kutip" — fakta: frasa datang dari instruksi Rozi, tapi tidak didukung riwayat/prompt/file state mana pun.
- **[UPDATE 2026-08-04 — KEPUTUSAN ROZI]**: Keputusan final — expiry JWT TETAP `8h`. Frasa "12 jam + refresh token" diakui sebagai **usulan agent** (dari opsi rekomendasi Hermes) yang kemudian salah diatribusikan seolah instruksi user. Pelajaran ditambah: (1) angka spesifik dalam instruksi (durasi, limit, cost) yang tidak ada di sumber tertulis → TANYA dulu sebelum dipakai sebagai opsi; (2) hasil klarifikasi sumber WAJIB didokumentasikan + bukti pencarian, bukan asumsi; (3) **laporan WAJIB membedakan eksplisit antara opsi/skenario usulan agent vs instruksi nyata dari user** — label jelas (mis. "usulan Hermes" vs "instruksi Rozi") supaya tidak terjadi salah atribusi lagi.
- **Status**: RESOLVED (dokumentasi 2026-08-04). Keputusan expiry menunggu Rozi.

## Detail GF-009 — Pentingnya verifikasi independen, bukan self-report (2026-08-03)

- **Kategori**: QA Gap (Process / Verification)
- **Deskripsi**: Saat setup testing infra V2 Bagian A (Vitest backend), laporan self-report awal AI mengklaim **62/62 test PASS**. Verifikasi independen (jalankan `npm test` sendiri) menemukan **3 FAIL** — `pemeriksaan-bahan.test.js` `[T7]` (PDF 200→404) & `[T8]` (nomorUrut 200→404) — yang TIDAK terlihat di run AI.
- **Akar masalah (race condition)**: `fileParallelism` default Vitest menjalankan file test SECARA PARALEL, padahal semua integration test memakai database shared yang SAMA (Prisma) dan saling create/delete data → tabrakan antar file. File lulus saat dijalankan sendirian, gagal saat satu suite.
- **Perbaikan**: atur `fileParallelism: false` di `backend/vitest.config.js` (file test SEKUENSIAL) → **62/62 stabil selama 2x run**.
- **Pelajaran aktif**: Setiap klaim "semua PASS"/"selesai/berhasil" dari agent (AGY/OpenCode) WAJIB diverifikasi independen, terutama untuk test/integrasi yang menyentuh SHARED STATE (database, file system, dll.) — race condition bisa muncul hanya pada run berikutnya. Verifikasi = jalankan ulang sendiri + bukti verbatim, bukan terima laporan.
- **Status**: RESOLVED (aturan diadopsi sebagai kebiasaan verifikasi).

## Detail GF-008 — FINALIZE commit via AGY (koreksi Rozi 2026-08-02)

- **Kategori**: Process Violation
- **Deskripsi**: Sesi 28 (V2-4 batch 2), Rozi instruksikan "jangan gunakan opencode untuk eksekusi, gunakan agy". Hermes mengartikan "eksekusi" mencakup FINALIZE commit → memakai AGY untuk commit `57570b2` + `e475d34` + push. Padahal pembagian agent tetap: commit + push = OpenCode ("commit tugas opencode" — koreksi eksplisit Rozi).
- **Akar masalah**: Instruksi singkat "gunakan agy" diinterpretasikan luas tanpa klarifikasi scope (BUILD vs commit). Ambiguitas "eksekusi" tidak ditanyakan.
- **Perbaikan**: (1) PROJECT_MANAGER_BEHAVIOR.md di-update — tabel pembagian agent eksplisit: BUILD = AGY, FINALIZE commit = OpenCode; (2) knowledge/10-model-strategy.md di-update (instruksi eksplisit Rozi, override FORBIDDEN knowledge/*); (3) aturan: kalau instruksi agent ambigu (BUILD vs commit vs verifikasi), TANYA scope ke Rozi dulu.
- **Status**: RESOLVED (dokumentasi governance selesai 2026-08-02). Commit `e475d34` tetap berlaku (sudah di-push, repo publik) — bukan untuk di-revert.

---

# ARCHIVE — Incident Reports (2026-07-28 s.d. 2026-08-01)

> **Moved**: 2026-08-01 — file `incident-report-*.md` di root .agent-pm di-archive ke sini (keputusan Rozi).
> **Ringkas**: 2026-08-02 — detail kronologi dipangkas; esensi + pelajaran aktif dipertahankan.
> **Status**: Semua ARCHIVED (historis). Referensi: SESSION_START_PROTOCOL.md step 3.

## Incident 1 — 2026-07-28: 3 Task dalam 1 Cycle + BUILD OpenCode bukan AGY

- **Esensi**: C.2+C.3+Z.9 dikerjakan 1 siklus, 1 commit `05e66ad` → campur, sulit revert, tidak bisa approve per task. BUILD pakai OpenCode langsung tanpa coba AGY.
- **Pelajaran aktif**: 1 task = 1 AUTOMATION_CYCLE, tanpa pengecualian — bahkan jika Rozi minta "sekaligus". (→ SOUL Workflow Rules Aturan 2)
- **[UPDATE 2026-08-01]**: bagian "BUILD = AGY primary" **OBSOLETE** — keputusan Rozi 2026-07-31 membalik: OpenCode = builder default, AGY hanya task berat (quota + approval). Lihat SOUL.md Aturan 3.

## Incident 2 — 2026-07-30: Hermes Fix Langsung Tanpa Agent (Zero-Threshold Violation)

- **Esensi**: Error `Unexpected token '<'` di FE → Hermes read_file/patch/write_file/terminal langsung, tanpa OpenCode/AGY sekali pun, dengan alibi "cuma 5 baris proxy, terlalu kecil".
- **Pelajaran aktif**: **Zero-Threshold** — tidak ada "terlalu kecil buat agent". Setiap interaksi file project WAJIB lewat agent. Satu-satunya yang boleh langsung: `.agent-pm/` files, `todo`, `memory`. (→ SOUL Workflow Rules Aturan 5 + Workflow Baku C)

## Incident 3 — 2026-08-01: Audit Folder .agent-pm (multi-device sync)

- **Esensi**: Hasil kerja beda antar device padahal selalu push. Ditemukan 4 root cause:
  1. `.gitignore` baris `Skills/` (tanpa root anchor) ikut nge-ignore `.agent-pm/skills/` → skill kunci TIDAK PERNAH ter-push. Fix: `/Skills/` root-anchored (commit `4412eba`)
  2. Cron sync-hermes mati diam-diam (error sejak 2026-07-30) — jaring pengaman sync hilang
  3. Governance kontradiksi antar file (OpenCode default vs AGY #1, model Hermes diklaim 4 macam) — diseragamkan ke keputusan Rozi
  4. State files dual-source of truth (TODO klaim SELESAI + NEXT sekaligus; CURRENT_STATE klaim commit placeholder) — TODO = single source
- **Pelajaran aktif**:
  1. Pattern gitignore tanpa root-anchor bisa nge-ignore folder lain yang namanya sama
  2. Cron sync adalah jaring pengaman — kalau mati diam-diam, device divergen
  3. State file TIDAK boleh klaim SELESAI tanpa bukti commit (hash asli)
  4. Perubahan governance harus lintas-file konsisten — jangan update 1 file, biarkan 3 file kontradiksi
- **[UPDATE 2026-08-01]**: 5 folder skill sudah di-commit (`121fffe`), cron sync-hermes di-recreate (`05fd5c684e88`).
- **[UPDATE 2026-08-02]**: cron sync-hermes di-**pause** (keputusan Rozi — workflow manual push/pull cukup, jarang 2 device bersamaan).
