# TODO — SPPG (diperbarui 2026-08-03)

## Setup Perangkat Baru (2026-08-03) ✅
- ✅ Setup lokal lengkap: npm install (backend 269 + frontend 140 pkg), .env dibuat (DB `sppg` Postgres 18 lokal), 18 migration applied, seed sukses, FE build PASS.
- ✅ Fix drift migration `20260803000000_add_gruphari_mastertarget_dokumenbukti` — 3 model tanpa migration (GrupHari, MasterTargetGizi, DokumenBuktiLpd2m) + InputPenerimaManfaat grupHarId (pola BUG-002 terulang).
- ✅ Fix frontend/.env + .env.example: `VITE_API_URL=http://localhost:3000/api` (kurang prefix /api → 404).
- ✅ PUPPETEER_EXECUTABLE_PATH diisi (`C:\Program Files\Google\Chrome\Application\chrome.exe`) — tes launch OK + PDF test Rozi APPROVED.

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
- **V2-4: Refactor file ribuan baris — design modular** (2026-08-02): pecah file >800 baris jadi komponen/modul per domain.
  - ✅ **Batch 1** (2026-08-02): akuntan.js → `routes/akuntan/` 9 file — commit `12557a0`
  - ✅ **Batch 2** (2026-08-02): FE LaporanPage.jsx akuntan 3.511 → 1.517 baris — 19 komponen. Commits `57570b2`, `e475d34`, `c7e6134`, `f94694b`
  - ✅ **Batch 3** (2026-08-02): backend 3/3 — laporan.js → 19 file (`108be87`), aslap.js → 12 file (`5f640f7`), gizi.js → 17 file (`9bf3b2c`)
  - ✅ **Batch 4a** (2026-08-02): FE MenuHarianPage gizi 2.088 → 991 baris — 13 komponen. Commit `baceb85`
  - ✅ **Cycle gabungan FE** (2026-08-02, keputusan Rozi: 1 cycle bertahap, approval akhir): 8/11 file selesai + verified + committed:
    - LaporanPage aslap 2.031 → 351 (`fd1906c`)
    - AkuntanPoPage 1.457 → 418 (`4b6f420`)
    - PenerimaManfaatPage 1.443 → 746 (`7eede38`)
    - RabHarianPage 1.216 → 533 (`a865413`)
    - LaporanGiziPage 1.096 → 492 (`27f4683`)
    - JurnalTransaksiPage 1.056 → 454 (`bb5fa15`)
    - SekolahPage 1.017 → 431 (`f231e9d`)
    - ApprovalPage 878 → 289 (`3a5e9da`)
    - Working state (`41bf661`)
  - ⏳ **Sisa cycle gabungan**: PeriodeSetupPage (835) + SaldoAwalBarangPage (812) — investigasi siap, BUILD AGY → VERIFY OpenCode → commit

## Backlog Infra (2026-08-02)
- ~~**INFRA-1: Fix sync-hermes.sh gagal jalan**~~ — **CANCELLED** (keputusan Rozi 2026-08-02): workflow manual push sebelum pindah device + pull di device lain sudah cukup. Job cron `sync-hermes` (05fd5c684e88) di-pause.

## BUG (2026-08-02)
- ✅ **BUG-002** SELESAI: 500 /gizi/master-menu-list — schema drift MasterMenuMingguan, migration `20260802220000_add_minggu_ke_master_menu`, commit `77a5e19`
- ⏳ **BUG-001** open: 500 /akuntan/rab-p12/harian + /rekap — investigasi terpisah (pre-existing suspected)

---
Model sesi: [Hermes oc/deepseek-v4-flash-free] (lihat knowledge/10-model-strategy.md)
