# Handoff — 2026-08-06 (sesi 42) — FASE 3 DYNAMIC RBAC TUNTAS + MERGED + PUSHED

## Status Terakhir
- **Fase 3 RBAC SELESAI + MERGED KE MAIN + PUSHED**: 11 commit RBAC, HEAD main == origin/main == `c20a864`.
- **Fix review `c68aee4`**: BUG 1 cache lockout (`requirePermission` reload saat `!permissionCache.has(role)` — bukan `size===0`), BUG 2 resource `aslap-po-approval` (pisah dari kepala-approval, ASLAP tak bisa akses POST /kepala/approval), regresi MITRA `aslap-periode`.
- **Penyempitan akses final `c20a864`** (keputusan Rozi): `akuntan-akun`/`akuntan-jenis-pekerjaan` (MITRA dilarang), `gizi-target` (AKUNTAN/ASLAP dilarang, hanya AHLI_GIZI+KEPALA).
- **Verifikasi**: 590/590 PASS (39 files), lint 0/0, prisma validate OK, migrate up-to-date (resource baru = data seed).
- **Arsip**: DOCUMENTATION.md entry Fase 3 dibuat; plans/ + prompts/ dibersihkan (isi dihapus, .gitkeep tetap).

## Next Step (sesi berikutnya, butuh TASK_SELECTION Rozi)
1. TASK 5: UI matrix role-resource admin (kelola resource & izin per role) — endpoint BE siap
2. Sidebar FE dinamis — Layout.jsx 10+ branch `user?.role`, butuh audit menu→permission mapping
3. Anomali b `/api-docs` guard — keputusan Rozi (3 opsi: biarkan / selalu guard / migrasi requirePermission)
4. V3 Fase 4-8 — backlog (docs end-user, deployment, legal, AI chatbot, notifikasi)
5. Branch `rbac-fase3-review` dipertahankan (belum dihapus)

## Pola yang Terbukti (sesi 42)
- **Test anti-bug**: revert fix sementara → test fail (buktikan bug), restore → PASS. Terbukti efektif utk cache lockout.
- **Resource granular RBAC**: resource coarse (akuntan-master, gizi-master, aslap-master) melebarkan akses ke role yang dulu 403. Fix = resource baru per domain endpoint sensitif (akuntan-akun, akuntan-jenis-pekerjaan, gizi-target, aslap-periode, aslap-po-approval).
- **Seeder upsert ≠ hapus**: resource/grant yang dihapus dari definisi tetap di DB — perlu `deleteMany` manual (dipakai 3x sesi ini: ASLAP kepala-approval, MITRA aslap-master).
- **`git push HEAD:branch` TIDAK switch branch lokal** — commit berikutnya jatuh ke branch lama (fix c68aee4 sempat ter-commit di main). Fix: `git branch -f main <old>` + checkout, tanpa reset --hard.
- **Checkout branch bisa "hilangkan" file**: file test baru yang hanya ada di commit branch review tak muncul di working tree main — cek `git branch --show-current` sebelum edit.

## Risiko / Pitfall
- DB test (`postgres` localhost:5432) berisi row seed RBAC lama — koreksi matriks butuh deleteMany + seed ulang, bukan hanya edit seeder.
- Full suite ±3-4 menit (PDF tests) — background + notify, jangan foreground timeout 180s.
- Jangan commit dump backup (`backend/backups/` — .gitignore aktif).
- GF-011: agent bisa revert uncommitted — cek git status sebelum/sesudah tiap session agent.
