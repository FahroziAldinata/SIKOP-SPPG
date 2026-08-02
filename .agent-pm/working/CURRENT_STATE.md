# CURRENT STATE — SPPG

**Scope Aktif: V2-4 Cycle gabungan FE — PAUSED (8/11 selesai + committed). Sisa: PeriodeSetupPage + SaldoAwalBarangPage**

## Sesi 28 (2026-08-02) — V2-4 Refactor modular: backend 3/3 ✅ + FE 10/13 ✅
- **Backend** ✅ 3/3: akuntan.js → 9 file (`12557a0`), laporan.js → 19 file (`108be87`), aslap.js → 12 file (`5f640f7`), gizi.js → 17 file (`9bf3b2c`). Zero behavioral change, semua verified.
- **FE** ✅: Batch 2 LaporanPage akuntan (`57570b2`+`e475d34`), Batch 4a MenuHarianPage gizi (`baceb85`), cycle gabungan 8/11:
  - fd1906c LaporanPage aslap 2.031→351 | 4b6f420 AkuntanPoPage 1.457→418 | 7eede38 PenerimaManfaatPage 1.443→746 | a865413 RabHarianPage 1.216→533 | 27f4683 LaporanGiziPage 1.096→492 | bb5fa15 JurnalTransaksiPage 1.056→454 | f231e9d SekolahPage 1.017→431 | 3a5e9da ApprovalPage 878→289
- **BUG-002** ✅: 500 /gizi/master-menu-list — schema drift MasterMenuMingguan (`mingguKe`), migration `20260802220000_add_minggu_ke_master_menu`, commit `77a5e19`.
- **Governance**: pembagian agent PERMANEN (Rozi 2026-08-02): BUILD/FIX=AGY, INVESTIGASI+VERIFIKASI=OpenCode, COMMIT+PUSH=OpenCode ALWAYS (GF-008). Cycle gabungan FE: eksekusi bertahap per file, tanpa approve per file, commit per task setelah verified.
- HEAD: `5a50282`, working tree bersih.

## Pending
- ⏳ V2-4 cycle gabungan sisa: PeriodeSetupPage (835) + SaldoAwalBarangPage (812) — investigasi siap di `.agent-pm/prompts/oc-v2-4-batch6b-investigasi.txt`
- V2-1 TTD Basah — backlog (Sprint 24, tertulis NEXT)
- V2-2 Image handling, V2-3 minor UX — backlog
- BUG-001: 500 `/akuntan/rab-p12/harian` + `/rekap` — investigasi terpisah (pre-existing suspected, MEDIUM)

## Catatan
- ⚠️ State files sempat beberapa kali kena overwrite eksternal ke versi lama — ditulis ulang manual. Pantau kalau berulang.
- OpenCode punya pitfall: menulis file ke Temp → auto-reject. Workaround: instruksi keras "DILARANG tulis ke Temp", `--auto`, process substitution.
- Bug pre-existing tercatat (jangan diperbaiki di scope refactor): ConfirmDialog `isOpen` di AnggaranList (dialog tak muncul), handleDayCheckboxChange ReferenceError (dead code), menuData.filter di ApprovalPage.
