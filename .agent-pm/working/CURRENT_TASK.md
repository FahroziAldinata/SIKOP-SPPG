# CURRENT TASK — 2026-08-10 — PDF E2E VALIDATION SUITE (32 endpoint)

**Status: APPROVED Rozi (pendekatan a — struktur PDF, tanpa dep baru). BUILD dimulai.**

## Scope
1. Validasi struktur PDF (magic bytes `%PDF` + buffer > 0) di 5 file test existing (21+4+3+1+1 endpoint)
2. Test BARU `GET /api/akuntan/rab-p12/pdf` — happy-path (AKUNTAN) + negatif RBAC 403 (role tanpa grant; cek actual resource/aksi di rabP12.js:151)
3. Test happy-path `GET /api/mitra/po/:id/pdf` (MITRA, PO valid) — pertahankan negatif existing
4. Regression penuh + lint 0/0; temuan PDF gagal → lapor + fix

## Investigasi kunci
- 32 endpoint PDF total (akuntan 1, aslap 4, gizi 3, mitra 2, pemeriksaan 1, laporan 21)
- 0 test cek body/struktur PDF — semua cuma status+header
- 0% test: rab-p12/pdf · mitra po/:id/pdf cuma negatif
- Fasilitas lengkap: puppeteer-core + CHROME_PATH ada, tanpa dep baru (keputusan Rozi)

## Verifikasi target
- npm test full PASS (run 2x, pola GF-009) · lint 0/0 · diff scope test-only (kecuali bug nyata)

## Model
[AGY build] + [OpenCode verify/finalize] + [Hermes oc/deepseek-v4-flash-free]