# Handoff — 2026-08-03 — Sesi 33 (V2-2 LPD2M fix gambar web APPROVED + ARCHIVE)

## Status Terakhir
- **V2-2 LPD2M bukti gambar web 404** FIXED + APPROVED Rozi. HEAD `e602a9c`, semua pushed, tree bersih.
- State files disinkronkan (CURRENT_STATE/TASK/TODO/SPRINT/BUG) + entry DOCUMENTATION.md + HANDOFF ini.
- **Scope Aktif**: CYCLE_END — next: V2-3 (TASK_SELECTION baru).

## Task Selesai (Sesi 33)
1. Investigasi V2-2: `f837cc7` double prefix + root cause vite proxy + server stale.
2. Fix `d383faf` (3 edit, AGY build + OpenCode verify/commit/push) — vite proxy /uploads + `'/'+filePath` + `nextElementSibling`.
3. Cleanup `e602a9c` — hapus `documentation/2026-08-03-v2-2-lpd2m-bukti-layout-summary.md` (perintah Rozi).
4. BE dimatikan Hermes (kill PID 12308) → Rozi hidupkan → tes PASS → APPROVED.

## Task Pending / Next Step
1. **V2-3 minor UX** — TASK_SELECTION baru (belum dipilih Rozi).
2. Prompts cleanup bagian archive — `prompts/` isi dihapus (folder + .gitkeep tetap).
3. Catatan: `rtk-setup-guide.md` sempat dihapus di working tree lalu direstore OpenCode — cek `ls .agent-pm/knowledge/` kalau hilang lagi.

## Pola yang Terbukti Sesi 33
- **Diagnosa server stale**: bukti konkret = probe file di folder upload (git-ignored) → curl `/uploads/<file>` → 404 "Cannot GET" padahal file ADA = static mount tidak terdaftar di instance → server jalan kode sebelum pull. Pembanding `git log -S "express..." -- app.js` + start time proses (PowerShell Get-CimInstance CreationDate).
- **Proxy/static path**: filePath DB berisi `uploads/bukti/...` → URL web `'/'+filePath` + vite proxy `/uploads` → BE static strip `/uploads` → file. JANGAN tambah `/uploads/` lagi ke filePath.

## Risiko / Pitfall
- Server BE sering jalan dengan kode lama (restart manual Rozi). Verifikasi version via probe file sebelum diagnosa lompat ke path code.
- Vite config change (proxy) kadang tidak auto-restart di Windows → restart FE manual di CLI Rozi.