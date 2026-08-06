# Handoff — 2026-08-06 (sesi 43) — SIDEBAR FE DINAMIS TUNTAS + MERGED + PUSHED

## Status Terakhir
- **Sidebar FE Dinamis SELESAI + MERGED KE MAIN + PUSHED**: HEAD main == origin/main == `533946b` (rev-parse identik).
- **Branch** `feat/sidebar-dynamic-permissions` (dari main `938a816`), 2 commit: `44a19a0` (wip migrasi hasPerm-only) + `533946b` (koreksi role-check) — merge ff-only ke main sebagai `533946b`. Branch remote (`git push origin --delete`) + lokal dihapus, diverifikasi `git fetch --prune && git branch -r | grep sidebar` → kosong.
- **Pola final WAJIB**: `user?.role === 'ROLE' && hasPerm('resource:AKSI')` — role check tetap wajib walau hasPerm() lolos (grant READ lintas modul KEPALA_SPPG bocor saat migrasi hasPerm-only).
- **Verifikasi**: simulasi rbacSeeder KEPALA_SPPG=4 PASS (hanya Menu Kepala), lint 0 error (152 warning lama), build exit 0, backend 0 file, ff-only aman (origin/main ancestor).

## Next Step (butuh TASK_SELECTION)
1. Migrasi route FE non-pilot ke `requiredPerm` (hanya 3 pilot: aslap/mitra/akuntan; sisanya `allowedRoles` lama)
2. Anomali b `/api-docs` guard — keputusan Rozi (3 opsi)
3. OpenAPI cover endpoint `my-permissions` + admin resources/permissions
4. Seeder RBAC `upsert` ≠ hapus — row lama perlu deleteMany manual
5. V3 Fase 4-8 (docs end-user, deployment, legal, AI chatbot, email+WhatsApp) — 100% backlog
6. ⚠️ `git fetch` ulang WAJIB awal sesi berikutnya (HEAD main = 533946b — verifikasi ke remote sebelum percaya state files)

## Pola yang Terbukti (sesi 43)
- **Role = batas section, hasPerm = kontrol granular**: migrasi permission-based sidebar HARUS pertahankan role gate di luar hasPerm — grant READ lintas modul bikin menu bocor ke role lain.
- **Simulasi RBAC**: evaluasi kondisi sidebar terhadap grant rbacSeeder per role → deteksi leak lebih awal dari browser test.

## Risiko / Pitfall
- Layout.jsx sisa `user?.role` = blok notifikasi (L77/106/125/317) + badge role (L291) — by design, JANGAN migrasi.
- DB test postgres lok: row seed RBAC lama — koreksi matriks butuh deleteMany + seed ulang, bukan edit seeder.
- GF-011: agent bisa revert uncommitted — cek git status sebelum tiap session agent.