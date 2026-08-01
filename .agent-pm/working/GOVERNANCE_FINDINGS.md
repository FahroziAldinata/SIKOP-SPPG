# Governance Findings

> **Ringkas**: 2026-08-02 — detail panjang dipangkas atas keputusan Rozi (efisiensi context). Esensi per temuan + pelajaran aktif dipertahankan.

## Temuan Resolved (GF-001 s.d. GF-007)

| ID | Tanggal | Kategori | Esensi | Status |
|---|---|---|---|---|
| GF-001 | 2026-07-25 | Operational Boundary | Hermes hanya definisikan input/output/workflow — eksekusi tool milik user/agent | RESOLVED |
| GF-002 | 2026-07-25 | Process Violation | Prompt wajib di-save ke audit trail SEBELUM ditampilkan ke chat | RESOLVED |
| GF-003 | 2026-07-26 | Process Violation | Aturan baru → default ke file governance permanen, bukan file task spesifik; tanya balik jika ambigu | RESOLVED |
| GF-004 | 2026-07-26 | Structural Gap | governance/*.md wajib di-load di SESSION_START_PROTOCOL (rules aktif sebelum proses task) | RESOLVED |
| GF-006 | 2026-07-26 | QA Gap | Review frontend WAJIB sertakan build/lint aktual verbatim — gagal jika tidak bersih | RESOLVED |
| GF-007 | 2026-07-26 | Process Violation | Self-check wajib sebelum mark SELESAI: sudah lewat AWAITING_USER_VERIFICATION + Rozi OK eksplisit? | RESOLVED |

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
