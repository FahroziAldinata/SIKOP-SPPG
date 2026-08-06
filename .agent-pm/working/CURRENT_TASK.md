# CURRENT TASK — 2026-08-06 (sesi 43) — SIDEBAR FE DINAMIS MERGED KE MAIN ✅

## Status: ✅ SIDEBAR FE DINAMIS — TUNTAS + MERGED + PUSHED (HEAD `533946b`)

- **Branch**: `feat/sidebar-dynamic-permissions` (dari main 938a816) — 2 commit: `44a19a0` (wip migrasi hasPerm-only) + `533946b` (koreksi role-check di 38+ kondisi). Merge ff-only → main `533946b` → push. Branch remote + lokal dihapus.
- **Pola final** (WAJIB utk semua render menu): `user?.role === 'ROLE' && hasPerm('resource:AKSI')` — role-check tetap wajib walau hasPerm() lolos (KEPALA_SPPG punya grant READ lintas modul).
- **Keputusan**: Notifikasi tetap hardcode role; Kendaraan `mitra-master:READ`; Laporan Mitra `mitra-po:READ`; Pengaturan universal.
- **Verifikasi**: simulasi rbacSeeder KEPALA_SPPG=4 PASS (hanya Menu Kepala), lint 0 error, build exit 0, backend 0 file, ff aman.

## Next Step (prioritas — dari audit sesi 43)
1. **Migrasi route FE non-pilot**: masih pakai `allowedRoles` lama, belum migrasi ke `requiredPerm` (3 pilot: aslap/mitra/akuntan sudah) — butuh TASK_SELECTION
2. **Anomali b /api-docs guard** (`app.js`) — keputusan Rozi (3 opsi: biarkan / selalu guard / migrasi requirePermission)
3. **OpenAPI belum cover** endpoint `my-permissions` + admin resources/permissions — registrasi swagger kurang
4. **Seeder RBAC `upsert` ≠ hapus** — row lama (resource/grant yang dihapus) tetap di DB, perlu deleteMany manual
5. **V3 Fase 4-8** (docs end-user, deployment, legal, AI chatbot, notifikasi eksternal) — 100% backlog
6. `git fetch` ulang WAJIB di awal sesi berikutnya (HEAD main = 533946b, verifikasi ulang ke remote)

## Catatan sesi
- **Pelajaran (CLAUDE sandbox)**: Claude bisa jalankan `npm install`, `npm run lint`, `npm run build` sendiri di sandbox (exit 0) — verifikasi lint/build tidak lagi sepenuhnya bergantung laporan agent.
- Layout.jsx: 43 hasPerm semuanya ber-role-check, 0 bare; sisa `user?.role` = blok notifikasi (77/106/125/317) + badge role (291) — by design.
