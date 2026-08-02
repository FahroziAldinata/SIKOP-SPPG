# TODO — SPPG (diperbarui 2026-08-01)

## Release V1.0.0 (2026-08-02) ✅
- ✅ Reset repo + publikasi publik: `github.com/FahroziAldinata/SIKOP-SPPG` — commit `c017282` Initial release v1.0.0 + tag `v1.0.0`, history bersih (kredensial lama tidak ikut)
- ✅ Dokumen: README, CHANGELOG, LICENSE, docs/ARCHITECTURE, docs/SETUP, backend/.env.example, frontend/.env.example
- ✅ Sanitasi seed (10 nama asli → generik) + rename `.hermes` → `.agent-pm`

## Sprint Sebelumnya: Selesai ✅
- ✅ Audit Akuntan A-1 s.d. A-9 (`74b3919`..`eca619a`)
- ✅ Kepala SPPG K1-K3 (`f770f59`..`b7d6e05`)
- ✅ PDF Format BGN/SAP (`a534377`..`1c939e3`)
- ✅ Bulk Generate Jurnal (`2fa2928`..`11fda72`)
- ✅ Laporan Ahli Gizi G1-G3 (`1411403`..`e22a8ac`)
- ✅ Laporan Mitra M1-M3 (`commit-M1`..`commit-M3`)

## Backlog V2 (menunggu TASK_SELECTION)
- **V2-1: TTD Basah (upload gambar per user) — SEMUA ROLE** ← NEXT
- V2-2: Image handling (upload → report → auto-delete by period)
- V2-3: Perbaikan minor UX (jika ada)
- **V2-4: Refactor file ribuan baris — design modular** (2026-08-02): pecah file >800 baris jadi komponen/modul per domain. BE: routes akuntan.js (4637), laporan.js (2934), aslap.js (2916), gizi.js (2757). FE: LaporanPage akuntan (3511), MenuHarianPage (2088), LaporanPage aslap (2031), + 9 file lain 800-1500.
  - ✅ **Batch 1** (2026-08-02): akuntan.js → `routes/akuntan/` 9 file — verified PASS, commit `12557a0` (ter-include initial release)
  - ✅ **Batch 2** (2026-08-02): `frontend/src/pages/akuntan/laporan/LaporanPage.jsx` 3.511 → 1.517 baris — 19 komponen di `components/akuntan/laporan/`, verified PASS, approved Rozi. Commit menyusul (FINALIZE).
  - ⏳ **Batch 3**: backend `routes/laporan.js` (2.934), `routes/aslap.js` (2.916), `routes/gizi.js` (2.757)

## Backlog Infra (2026-08-02)
- ~~**INFRA-1: Fix sync-hermes.sh gagal jalan**~~ — **CANCELLED** (keputusan Rozi 2026-08-02): workflow manual push sebelum pindah device + pull di device lain sudah cukup; jarang pakai 2 device bersamaan. Job cron `sync-hermes` (05fd5c684e88) di-pause.

---
Model sesi: [Hermes oc/deepseek-v4-flash-free] (lihat knowledge/10-model-strategy.md)
