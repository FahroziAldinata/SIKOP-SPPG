# CURRENT TASK — 2026-08-11 — T1: GF-014 T1 setupFiles Vitest (race DATABASE_URL)

**Status: ✅ APPROVED Rozi (2026-08-11) — FINALIZE commit berjalan.**

## Ringkas
- Fix race DATABASE_URL: `backend/src/test/setup.js` BARU (dotenv.config path eksplisit relatif file) + `backend/vitest.config.js` + `setupFiles: ['./src/test/setup.js']`.
- Tanpa dependency baru (dotenv ^17.4.2 sudah ada), tanpa .env.test, app.js tidak disentuh.
- Plan: `.agent-pm/plans/2026-08-11-t1-vitest-setupfiles.md`.

## Verifikasi (bukti lengkap)
- Run 1: 671 tests = 670 PASS + 1 FAIL (rbac-fix-review pre-existing), 0 PrismaError.
- Run 2: IDENTIK 671, FAIL sama, 0 PrismaError.
- Run 3 `--sequence.shuffle.files` (urutan file DIACAK, vitest 4.1.10): IDENTIK 670 PASS + 1 FAIL sama → race MATI, robust urutan file.
- Standalone: tools.test.js 13/13 + chat-retensi.test.js 3/3 PASS (sebelumnya race saat berdiri sendiri).
- Lint 0/0 (verifikasi-1).
- 1 FAIL konsisten = RBAC DB drift (bukan regresi T1 — T1 tidak sentuh RBAC/DB/seed).

## ⚠️ TEMUAN BARU (dari klarifikasi Rozi, 2026-08-11) — RBAC STALE GRANT, PRIORITAS TINGGI
- Investigasi OpenCode (query DB verbatim): grant `KEPALA_SPPG gizi-target READ` MASIH ADA di RolePermission (id cmsh9ss76003ot318ryv8y2nu, createdAt 2026-08-06T08:44:59.971Z).
- Assertion test rbac-fix-review.test.js:214 = 403 (benar, fix T3), tapi DB masih kasih 200 → FAIL.
- Akar masalah: **seeder upsert-only, TIDAK PERNAH delete grant** → semua pencabutan grant Task B sesi 47 (10 resource KEPALA_SPPG) berpotensi masih stale di DB. Klaim T3 "DB sudah benar sejak 4f8ec31" SALAH (4f8ec31 hanya ubah file seeder, DB tidak di-reseed).
- **Task baru PRIORITAS TINGGI (sebelum T2)**: audit KEPALA_SPPG vs daftar 10 resource Task B + fix sistemik seeder (hapus grant yang tidak lagi di definisi) + reseed/delete eksplisit. Detail di TODO.md section "RBAC STALE GRANT".

## Model
[AGY gemini-3.6-flash-medium build] + [OpenCode deepseek-v4-flash-free investigate/verify/finalize] + [Hermes oc/deepseek-v4-flash-free].