# CURRENT TASK — 2026-08-08 (sesi 47) — FIX RBAC: bypass ADMIN + grant KEPALA_SPPG berlebih dicabut

## Status: ✅ Fix RBAC SELESAI + APPROVED Rozi (suite 626/626) — menunggu commit FINALIZE

- **Task B**: 10 grant KEPALA_SPPG dicabut (aslap-input, gizi-menu, mitra-po, mitra-pemeriksaan, akuntan-jurnal, akuntan-upah, akuntan-akun, akuntan-jenis-pekerjaan, gizi-target, laporan-resmi CREATE/DELETE). Ringkasan/laporan + akuntan-rab READ+APPROVE tetap.
- **Task C**: bypass ADMIN dicabut FE (`AuthContext.jsx`) + BE (`auth.js`) → grant eksplisit ADMIN + `chatbot:READ`. ADMIN 403 di 38 halaman operasional.
- **Task A**: CRUD resource API `POST/PUT/DELETE /api/admin/resources` + invalidatePermissionCache (admin.js:270/315/350).
- **Task D**: 4 test lama di-update, suite **626/626 PASS**, lint 0/0, build exit 0.
- **Gap terdokumentasi (backlog, bukan blocker)**: (1) test otomatis cache invalidation resource CRUD belum ada; (2) UI form resource baru belum dibangun → `.agent-pm/backlog/ui-form-resource-baru.md`.
- **Arah Rozi**: Task 3 per-SPPG (Sppg/sppgId) DIBATALKAN — single instance per SPPG, permission = satu-satunya sumber kebenaran, JANGAN kembalikan role-gate.
- Model: [AGY claude-sonnet-4-6 utk build] + [OpenCode deepseek-v4-flash-free utk verify] + [Hermes oc/deepseek-v4-flash-free].

## Next Step (backlog Fase 7 lanjutan — butuh TASK_SELECTION)
1. **UI frontend — widget chat** (kelola API key user + panel chat)
2. **Tool registry** (chatbot baca data sistem — read-only, tanpa SQL mentah)
3. **Kebijakan retensi ChatLog** (TTL/anonymization — perlu keputusan Rozi, relevan Fase 6 legal)
4. **Backlog baru**: UI form resource baru (admin) + test otomatis resource CRUD cache invalidation — `.agent-pm/backlog/ui-form-resource-baru.md`

Fase 8 (Notifikasi eksternal Email + WhatsApp) masih di backlog setelah Fase 7 tuntas.