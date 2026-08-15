# Handoff — 2026-08-10 — Penutup Sesi (RBAC + Tool Registry + PDF E2E + T3 drift fix)

## Status Sekarang
- **SEMUA task sesi ini CLOSED** + committed + pushed. Working tree BERSIH total. HEAD = origin/main = `ca16bfe`.
- Urutan commit sesi (git log -10, urut terbaru):
  - `ca16bfe` docs: sinkronisasi state files pasca T3 (drift grant RBAC gizi-target)
  - `d9d6a44` fix: sinkronkan test + komentar seeder dengan keputusan Task B - KEPALA_SPPG tidak dapat gizi-target
  - `6091861` feat(test): PDF E2E validation 32 endpoint + gap rab-p12/mitra po + GF-014 env findings
  - `1e13e5a` docs: isi hash commit FINALIZE (8ead008 + 31b2163) di TODO.md
  - `31b2163` + `8ead008` — Fase 7 item 3: retensi ChatLog + fix chat error + GF-013
  - `d6fbf88` + `ca61f3e` + `0de4f6d` + `7b0b01b` — Tool Registry chatbot v1 (Fase 7 item 2)
- Tag `v2.0.0` dibuat [USER] (annotated `e42e051f` → `8fdbe8d`, pushed).

## Backlog Terbuka (urutan prioritas rekomendasi — keputusan mulai tetap milik [USER])

1. **GF-014 T1 — `setupFiles` di vitest config (DIREKOMENDASIKAN LEBIH DULU)**
   - Bug rapuh NYATA: unit test yang instantiate `new PrismaClient()` langsung (tanpa lewat `src/app.js` — satu-satunya tempat `dotenv.config()`) tidak dapat `DATABASE_URL` → hasil test tergantung URUTAN eksekusi file (kadang PASS kadang FAIL).
   - Fix: tambah `setupFiles` di `backend/vitest.config.js` (setup file yang load `.env` sendiri), independen urutan.
   - Prioritas tinggi karena mempengaruhi keandalan SEMUA test ke depan.

2. **GF-014 T2 — Investigasi password DB lokal campur**
   - `aslap`/`mitra` = hash `Test@123456`, 4 role lain = `ganti-password-ini`, padahal seed.js cuma 1 hash default. Sesi lalu 665/665 PASS sekarang tidak → DB diubah antar sesi (kemungkinan re-seed parsial / ganti via UI).
   - Non-blocker, tapi worth tahu akar penyebab sebelum reset environment berikutnya.

3. **Fase 8 — Notifikasi eksternal (Email Nodemailer + WhatsApp)**
   - Fitur baru, tidak ada dependency ke T1/T2 — bisa dikerjakan kapan saja terlepas urutan.
   - WhatsApp: evaluasi API resmi vs Baileys (non-resmi wajib nomor khusus + dokumentasi risiko ban/ToS).

## Known Risks Tercatat (jangan dihapus dari governance findings — rangkuman)

- **GF-013**: test suite jalan di DB dev yang SAMA dengan development/manual-use (bukan DB test terpisah). Mitigasi parsial: backup/restore SystemConfig di afterAll chat.test.js. Keputusan User: KNOWN RISK, jangan fix sekarang.
- **GF-014**: (1) DATABASE_URL race condition di sebagian unit test (lihat backlog T1); (2) password DB campur (lihat T2); (3) drift grant RBAC GIZI-TARGET — RESOLVED via d9d6a44 (keputusan B: KEPALA_SPPG tidak dapat gizi-target).
- **Known risk lama**: `bukti-lpd2m` DELETE — `fs.unlinkSync` file fisik di luar `$transaction` (best-effort; tx rollback bisa sisakan file fisik tanpa record). Keputusan User: jangan diperbaiki sekarang.
- **Backlog UI form resource baru**: API CRUD resource sudah ada (POST/PUT/DELETE /api/admin/resources), form FE belum dibangun (backlog sejak fix RBAC awal).

## Catatan Penting untuk Audit Protokol Sesi Berikutnya

- Seluruh commit sesi ini (regresi RBAC, Tool Registry v1, migrasi API key → SystemConfig, PDF E2E validation, fix drift T3) SUDAH pushed dan sync. Sesi berikutnya bisa mulai dari `git log` sebagai sumber kebenaran — TIDAK perlu re-investigasi ulang apa yang sudah selesai.
- Null-file (sampah). `nul` sudah bersih. `.agents/` (RTK rules antigravity) untracked — keputusan User: biarkan.
- Model sesi: [AGY gemini-3.6-flash-medium build (sering timeout "tool jalan, teks mati" — kerja di disk, verifikasi OpenCode bukti final)] + [OpenCode deepseek-v4-flash-free verify/finalize] + [Hermes oc/deepseek-v4-flash-free]. AGY claude-sonnet-4-6 quota habis (reset 57h, 2026-08-10).
- Command AGY model ID: `gemini-3.6-flash-medium` (bukan `gemini-flash-3.6-medium`).
- BE perlu restart bila grant/permission cache berubah (pola existing).