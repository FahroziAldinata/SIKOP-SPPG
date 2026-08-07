# CURRENT TASK — 2026-08-07 (sesi 46) — FASE 7 AI CHATBOT: BACKEND TUNTAS di main

## Status: ✅ Fase 7 Backend SELESAI + di main (9 commit, 625/625 test)

- **Deliverable backend lengkap**: model `ChatApiKey` + `ChatLog` (migration `20260807063342_add_chatbot_step1`), `lib/chat/encryption.js` AES-256-GCM + `providers/openaiCompatible.js`, route `/api/chat` (CRUD api-key + chat endpoint), RBAC `chatbot` READ, OpenAPI 4 endpoint, rate limiter 15/15 mnt/user, `ENCRYPTION_KEY` di .env.example.
- **baseUrl & model custom** di ChatApiKey — provider enum `['gemini','groq','openai','custom']`, request selalu prioritas atas preset.
- **Fix adapter kritis**: paksa `stream:false` (proxy 9router default SSE) + regression guard spy-fetch.
- **Verifikasi independen (ulang sesi ini)**: `npm test` 625/625 PASS (42 files, 166.42s), lint 0/0, E2E manual 9router sukses, RBAC tidak salah blokir, 0 kebocoran apiKey.
- **Branch `feat/fase7-chatbot-step1`**: merged ke main, lokal + remote DIHAPUS (Rozi approve).
- Model: [AGY claude-sonnet-4-6 utk build] + [OpenCode deepseek-v4-flash-free utk verify/fix].

## Next Step (backlog Fase 7 lanjutan — butuh TASK_SELECTION)
1. **UI frontend — widget chat** (kelola API key user + panel chat)
2. **Tool registry** (chatbot baca data sistem — read-only, tanpa SQL mentah)
3. **Kebijakan retensi ChatLog** (TTL/anonymization — perlu keputusan Rozi, relevan Fase 6 legal)

Fase 8 (Notifikasi eksternal Email + WhatsApp) masih di backlog setelah Fase 7 tuntas.
