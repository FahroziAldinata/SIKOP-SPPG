# Handoff — 2026-08-01 — Audit & Rapi .agent-pm

## Update Sesi Ini (2026-08-01, sesi ke-2)
- **Pemindahan file governance (keputusan Rozi)**:
  - `hard-rules.md` (root) → `knowledge/09-hard-rules.md`
  - `MODEL_STRATEGY.md` (root) → `knowledge/10-model-strategy.md`
  - `incident-report-2026-07-28/30/08-01.md` (root) → di-archive ke `working/GOVERNANCE_FINDINGS.md` (section "ARCHIVE — Incident Reports")
  - Referensi di-update: SESSION_START_PROTOCOL.md (step 2-3, referensi numerik), hermes-workflow-practices.md (step 2-3), TODO.md (pointer model strategy)
- **Blocker beres**: 5 folder skill ter-commit (`121fffe`) + cron sync-hermes di-recreate (job `05fd5c684e88`, every 30m, silent-on-success + alert Telegram saat error)
- **Catatan**: file lama di root sudah dihapus — sesi baru baca lokasi baru sesuai SESSION_START_PROTOCOL.md

## Konteks Sesi (sebelumnya)
- Audit folder .agent-pm + perbaikan konsistensi governance multi-device
- Backlog V2 menunggu: V2-1 TTD Basah (NEXT), V2-2 image handling, V2-3 minor UX

## Perubahan Sesi Ini
| Item | Keterangan |
|------|------------|
| .gitignore | Fix `Skills/` → `/Skills/` root-anchored + exception `.agent-pm/skills/` (sebelumnya skill tidak pernah ter-commit) |
| hard-rules.md | OpenCode = builder default konsisten (semua tabel), AGY per-device terverifikasi, model AGY 2 (claude-sonnet-4-6 / gemini-flash-3.6-medium), hapus typo |
| AUTOMATION_CYCLE.md | BUILD state → OpenCode default, AGY quota+approval |
| PROJECT_MANAGER_BEHAVIOR.md | Pembagian agent konsisten, fallback OpenCode → nemotron-4-ultra |
| MODEL_STRATEGY.md | Hermes = nemotron-3-ultra, AGY 2 model, OpenCode backup nemotron-4-ultra |
| working/* | TODO/CURRENT_TASK/CURRENT_STATE koreksi: V2-1 masih TODO (bukan SELESAI), single source TODO.md |
| plans/ + pre-check/ | Dihapus (task selesai, usang) |
| README-workflow + scripts | Dihapus permanen (konfirmasi Rozi) |

## Keputusan Rozi (2026-08-01)
- AGY 2 model: `gemini-flash-3.6-medium` + `claude-sonnet-4.6` — saling fallback kuota
- OpenCode backup: `nemotron-4-ultra` (belum ditesting penuh)
- Model Hermes: `nemotron-3-ultra`
- V2-1 TTD Basah: MASIH TODO (belum dikerjakan)
- README-workflow + scripts: hapus permanen
- RELEASE_CANDIDATE + validation/: simpan

## Catatan Penting
- V2-1 TTD Basah TIDAK ada commit di git — jangan klaim selesai sebelum ada commit
- Sync lintas device: pastikan cron sync-hermes aktif setelah fix

## Backlog
- V2-1 TTD Basah (upload gambar per user — SEMUA ROLE) ← NEXT
- V2-2 Image handling
- V2-3 Perbaikan minor UX
