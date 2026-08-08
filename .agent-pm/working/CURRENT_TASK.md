# CURRENT TASK — 2026-08-08 (sesi 47 lanjutan) — FASE 7 LANJUTAN: WIDGET CHAT FE + MIGRASI API KEY

## Status: ✅ BUILD + COMMIT selesai (637/637 PASS) — MENUNGGU UJI MANUAL USER (Task 5)

**ROZI SEDANG ISTIRAHAT** — lanjut sesi berikutnya: jalankan uji manual dulu.

## Yang sudah selesai sesi ini
1. **Widget chat FE**: `ChatWidget.jsx` (BARU) + mount di `Layout.jsx` (guard `hasPerm('chatbot','READ')`) + section "AI Assistant" di `SettingPage.jsx` (kelola API key user awalnya; lalu di-migrasi jadi admin-managed)
2. **Migrasi API key**: `ChatApiKey` per-user → `SystemConfig` singleton (1 key global, hanya ADMIN bisa set) — schema + migration `20260808165619` + rbacSeeder (`chatbot-config:MANAGE` hanya ADMIN) + `chat.js` rewrite (guard MANAGE, key dari config, 400 'API key belum diatur, hubungi admin') + test update
3. **Guard FE Task 3 poin 3**: `{hasPerm('chatbot-config','MANAGE') && <AiApiKeySection />}` — non-ADMIN tidak melihat section + tidak fetch `/chat/api-key` sama sekali

### Verifikasi yang sudah jalan (semua PASS)
- `npm test` backend: **637/637 PASS** (buhttttng enum MANAGE non-breaking)
- `npm run lint` backend (oxlint): 0/0
- FE `npm run build`: exit 0
- Grep `chatApiKey` sisa: 0
- DB: grant `chatbot-config:MANAGE` = ADMIN ada

## Langkah berikutnya (BUTUH USER)
1. **UJI MANUAL** (jangan mulai task baru sebelum ini):
   - Restart BE dulu (migration `1276` belum aktif di BE yang jalan) — ingat aturan: Hermes boleh kill, WAJIB minta Rozi hidupkan ulang; atau task eksplisit minta BE jalan → start `npm run dev` bg + info Rozi
   - ADMIN login → `/setting` → section AI muncul → set API key
   - Role lain (mis. AKUNTAN) login → `/setting` → section AI TIDAK muncul
   - Role lain buka chat → kirim pesan → jawaban OK (key dari config)
   - ADMIN hapus key → role lain chat → pesan error 'API key belum diatur, hubungi admin'
2. Setelah uji OK → sesi berikutnya bisa mulai **Fase 7 item 2: Tool registry** (read-only, tanpa SQL mentah)
3. **Fase 7 item 3: retensi ChatLog** (TTL/anonymization — butuh keputusan Rozi)
4. **Fase 8: notifikasi eksternal** (Email + WhatsApp)

## Catatan runtime
- AGY claude-sonnet-4-6 quota 9router habis → sesi ini pakai **AGY gemini-3.6-flash-medium** (approved Rozi)
- 3x AGY timeout "tool jalan teks mati" → kerja di disk, verify independen OpenCode + npx oxlint