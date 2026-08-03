# Handoff — 2026-08-03 — Sesi 35 (V2 Bagian A-C selesai, PAUSED per Rozi)

## Status Terakhir
- **V2 Infra/Docs/Finalisasi**: Bagian A (Vitest) ✅, B (CI/CD) ✅, C (oxlint) ✅. **PAUSED** — Rozi: "jangan lanjut, catat sesi sekarang, commit bertahap, push origin main, pastikan clean".
- HEAD `bb0e5ef`, tree BERSIH, semua pushed (commit A `be5d967`+`6201e45`, B merge `a8b6b6e`+`ba23398`+`b5af929`, C `d5c7ce2`, docs `bb0e5ef`).

## Task Selesai (Sesi 35)
1. **A** — Vitest BE+FE: app.js export + index.js listen, 6 integration test → supertest, endpoints-kritis (5 endpoint), `fileParallelism:false` (GF-009 race). 62 BE + 3 FE PASS, coverage lines 24.33%.
2. **B** — ci.yml 5 job (node-check, test backend dgn postgres+seed+Chrome, lint FE/BE, build FE). Iterasi: Chrome → JWT_SECRET → P2002 (Strategi A deleteMany) → testTimeout. Hijau 2x ci-test + 3x main.
3. **C** — oxlint backend 80 warning → 0/0, script `lint`, 30 file. 62/62 tetap.

## Task Pending / Next Step
1. **Bagian D** — global error handler + Pino logging terpusat.
2. **Bagian E** — audit validators + OpenAPI (zod-to-openapi, swagger-ui-express, GET /api-docs, proteksi production).
3. **Bagian F** — smoke test semua modul, BUG.md baru.
4. **Bagian G** — AGENTS.md root/backend/frontend + CHANGELOG [2.0.0] (tag v2.0.0 oleh Rozi).
5. **Keputusan pending**: debug steps (issue-post) masih aktif di ci.yml — keep/remove. probe commits e46c289/0a58646 kosmetik.

## Pola yang Terbukti Sesi 35
- **GF-009**: self-report "62/62 PASS" AGY keliru — verifikasi independen menemukan 3 FAIL (fileParallelism default paralel di DB shared). Setiap klaim PASS wajib re-run sendiri.
- **CI iterasi tanpa log admin**: 403 log Actions utk non-admin; trik: debug step post ke GitHub issue (public) via GITHUB_TOKEN → baca via API. Debug dihapus setelah stabil (keep/remove pending).
- **P2002 seed vs test**: seed mengisi semua tanggal periode → testDate bentrok. Strategi A: deleteMany chain child→parent idempotent di awal setup (bukan delete per-model).

## Risiko / Pitfall
- Test integration butuh DB seeded + Chrome (CI) / DB lokal + PUPPETEER_EXECUTABLE_PATH (lokal).
- Flaky CI sempat 2x fail dgn kode sama — testTimeout 20s + fileParallelism false; pantau.
- JWT_SECRET wajib ada di env manapun (auth.js:5 throw).