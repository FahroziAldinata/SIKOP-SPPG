# CURRENT STATE — SPPG

**Status aktif: T1 GF-014 (setupFiles vitest) ✅ APPROVED — FINALIZE commit. Temuan BARU: RBAC stale grant (KEPALA_SPPG gizi-target masih di DB) → task prioritas tinggi sebelum T2.**

## 2026-08-11 — Sesi baru: Pull d148df1 + T1 GF-014 setupFiles Vitest ✅ + Temuan RBAC stale grant 🔴
- **Pull**: `d148df1` (docs handoff penutup sesi + state sync) — HEAD = origin/main d148df1, tree bersih.
- **T1 GF-014 (race DATABASE_URL)**: `backend/src/test/setup.js` BARU (dotenv.config path eksplisit) + `backend/vitest.config.js` + `setupFiles`. Verifikasi: 3 run stabil (2 normal + 1 `--sequence.shuffle.files` acak urutan file) = 671 tests, 0 PrismaError; standalone tools.test.js 13/13 + chat-retensi 3/3; lint 0/0. Race MATI — robust urutan file. APPROVED Rozi 2026-08-11.
- **🔴 TEMUAN RBAC STALE GRANT (investigasi Rozi request)**: grant `KEPALA_SPPG gizi-target READ` MASIH di DB (RolePermission cmsh9ss76003ot318ryv8y2nu, createdAt 2026-08-06). Akar: seeder upsert-only tak pernah delete → SEMUA cabut grant Task B sesi 47 (10 resource KEPALA_SPPG: aslap-input, gizi-menu, mitra-po, mitra-pemeriksaan, akuntan-jurnal, akuntan-upah, akuntan-akun, akuntan-jenis-pekerjaan, gizi-target, laporan-resmi CREATE/DELETE) berpotensi stale di DB. Klaim T3 "DB sudah benar" SALAH. **Task BARU prioritas tinggi sebelum T2/Fase 8**: audit 10 resource + fix sistemik seeder (hapus grant tak ada di definisi) + reseed/delete eksplisit.
- **Next**: T1 FINALIZE (commit+push) → RBAC stale grant fix (task baru) → T2 (password DB campur) → Fase 8.
- Model: [AGY gemini-3.6-flash-medium build] + [OpenCode deepseek-v4-flash-free investigate/verify/finalize] + [Hermes oc/deepseek-v4-flash-free].

## TODO PRIORITAS (next)
1. 🔴 **RBAC stale grant fix** (task baru, approve Rozi 2026-08-11) — audit + fix sistemik seeder + reseed
2. **T2 GF-014** — investigasi password DB campur (aslap/mitra Test@123456 vs 4 role ganti-password-ini)
3. **Fase 8 — Notifikasi eksternal** (Email Nodemailer + WhatsApp) — TASK_SELECTION
4. Tag v2.0.0 — ✅ SUDAH DIBUAT Rozi (verified remote, annotated e42e051f → 8fdbe8d)

## Sesi 2026-08-09 — FASE 7 ITEM 2: TOOL REGISTRY CHATBOT v1 ✅ SELESAI + VERIFIED (660/660) + APPROVED (Rozi)
- **4 tool P0, 7 fungsi, READ-only, TANPA SQL mentah** (keputusan final Rozi, P1 ditunda): `gizi-menu-status` (cek_status_menu_harian, hitung_menu_pending) · `akuntan-rab-status` (cek_status_rab_harian, hitung_rab_pending) · `mitra-po-status` (hitung_po_pending, cek_status_po_supplier) · `aslap-input-status` (cek_status_input_pm).
- **Grant 11 row READ** sesuai matriks final: gizi-menu-status (AHLI_GIZI, ASLAP, KEPALA_SPPG, AKUNTAN) · akuntan-rab-status (AKUNTAN, KEPALA_SPPG — **AHLI_GIZI eksplisit TIDAK**) · mitra-po-status (MITRA, KEPALA_SPPG, AKUNTAN) · aslap-input-status (ASLAP, KEPALA_SPPG).
- **Integrasi**: `lib/chat/tools/` BARU (index REGISTRY + 4 modul + `__tests__/tools.test.js`) · `chat.js` filter definisi tool per role (`hasUserPermission`, resourceStatus), eksekusi tool + re-call LLM merangkai jawaban, denial → "Maaf, saya tidak punya izin..."; ChatLog.toolCalls hasil eksekusi · `auth.js` +export helper `hasUserPermission` · `openaiCompatible.js` param adapter `tools`.
- **Keamanan**: negatif test per tool + prompt injection → ditolak.
- **Verifikasi**: npm test **660/660 PASS (45 files)** · lint 0/0 · grant DB **11/11** ter-seed. Test: 23 total.
- **Catatan deploy**: setelah seed grant, role yang permission-nya sudah ter-cache sebelum seed perlu **BE restart** agar grant baru aktif.
- Model: [AGY gemini-3.6-flash-medium build] + [OpenCode deepseek-v4-flash-free verify/finalize] + [Hermes oc/deepseek-v4-flash-free].

## Sesi 47 lanjutan (2026-08-08 malam) — FASE 7 LANJUTAN: WIDGET CHAT FE + MIGRASI API KEY → SYSTEMCONFIG ✅ APPROVED + VERIFIED MANUAL (Rozi)
- **UJI MANUAL Task 5 (4 skenario) LULUS** — Rozi konfirmasi: (1) ADMIN section AI muncul + set key OK; (2) AKUNTAN section AI tidak muncul OK; (3) AKUNTAN chat OK pakai key config; (4) hapus key → error 'API key belum diatur, hubungi admin' OK. BE sudah restart (migration aktif).
- **Widget chat FE**: `ChatWidget.jsx` (BARU, overlay modal pola Bug Report, floating button, `POST /chat` `{ message }` → `data.jawaban` non-stream, error "API key belum diatur" → link `/setting`, guard `hasPerm('chatbot','READ')` via Layout memakai `{user && hasPerm('chatbot','READ') && <ChatWidget/>}`, hooks sebelum conditional return — rules-of-hooks PASS). `Layout.jsx` +4. `SettingPage.jsx` +363: section "AI Assistant" (GET/POST/DELETE `/chat/api-key`, form provider dropdown+baseUrl+model+apiKey password, masked key, ConfirmDialog hapus).
- **Migrasi API key BYOK → Admin-Managed**: SystemConfig (id "system") + HAPUS ChatApiKey; enum PermissionAksi +MANAGE; rbacSeeder `chatbot-config` (L30) + grant MANAGE HANYA ADMIN (L176); chat.js guard + POST /chat key dari config + 400 'API key belum diatur, hubungi admin' persis + ChatLog per-user; test update.
- **Verifikasi**: npm test **637/637 PASS (43 files)** · lint 0/0 · FE build exit 0 · grep chatApiKey 0 sisa · DB grant ADMIN MANAGE ada.
- Model: [AGY gemini-3.6-flash-medium utk build] + [OpenCode deepseek-v4-flash-free utk verify] + [Hermes oc/deepseek-v4-flash-free].