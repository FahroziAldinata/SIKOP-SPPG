# CURRENT TASK — 2026-08-11 — RBAC v2: kolom source (SEED/MANUAL) — pruning aman grant manual

**Status: IN PROGRESS — PLANNING selesai (opsi A), masuk BUILD (AGY).**

## Kronologi
- v1 (pruning general): audit 11 stale KEPALA_SPPG → build → seed (pruned 11) → suite 671/671 PASS. **HALT oleh Rozi sebelum FINALIZE** — pruning general berisiko hapus grant manual admin di resource seeder.
- Arahan Rozi (`.agent-pm/plans/2026-08-11-prompt-fix-pruning-preserve-manual-grant.md`): pruning harus bedakan stale (sisa definisi lama) vs manual admin (keputusan sah via UI). 3 tugas: pilih opsi + implementasi + test 2 skenario + dokumentasi admin.
- Investigasi v2 (OpenCode): penulis grant cuma 2 (seeder + admin.js POST/PUT/DELETE /permissions); UI matrix POST+DELETE saja; RolePermission minim (id/role/resourceId/aksi/createdAt); tak ada preseden kolom source.

## Keputusan: Opsi A — kolom `source` enum GrantSource {SEED, MANUAL} @default(SEED)
- Seeder: create source SEED, update {}; pruning filter source=SEED.
- admin.js: POST + PUT set source MANUAL (hardcoded).
- Test baru rbac-pruning.test.js: skenario 1 (manual via endpoint dipertahankan setelah seed) + skenario 2 (stale SEED terhapus).
- Dokumentasi admin di README/docs.
- Plan: `.agent-pm/plans/2026-08-11-rbac-v2-source-column.md`.

## Hasil v1 yang dipertahankan
- 11 grant stale SUDAH terhapus dari DB lokal (pruned 11, KEPALA_SPPG 33→22) — jangan balik.

## Model
[Hermes oc/deepseek-v4-flash-free] + [OpenCode deepseek-v4-flash-free investigate] — BUILD: AGY gemini-3.6-flash-medium.