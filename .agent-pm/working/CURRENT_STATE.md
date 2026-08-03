# CURRENT STATE — SPPG

**Scope Aktif: V2-1 TTD Basah SELESAI + APPROVED ✅ (2026-08-03). CYCLE_END — next: V2-2/V2-3 (TASK_SELECTION baru).**

## Sesi 31 (2026-08-03) — V2-1 TTD Basah: APPROVED ✅ + ARCHIVE (CYCLE_END)
- Rozi approve setelah verifikasi visual revisi ukuran (canvas 480px, TTD 55px/220px terpusat di PDF).
- HEAD `24f640a` (3 feat + 2 fix), semua pushed. DOCUMENTATION.md entry asli + klaim palsu ditandai, BUG-003 logged, state files final.

## Sesi 31 (2026-08-03) — REVISI ukuran/posisi TTD (24f640a) ✅
- Investigasi OpenCode: TTD kecil karena img clamp 40×180px + PNG rasio 7.2:1 (canvas 100% lebar) → tinggi efektif ~25px; "tidak tengah" = goresan off-center di PNG lebar, bukan posisi elemen (DOM sudah flex-center).
- Fix Opsi C (Rozi: "samakan saja"): FE canvas `min(480px,100%)` rasio 3:1 + BE img `55px/220px` + wrapper `max(ruangTtd,55)`. Verify E2E PASS, build exit 0. Commit `24f640a`.
- ⚠️ BE perlu restart (shared.js).

## Sesi 31 (2026-08-03) — V2-1 TTD Basah: FIX BUG path TTD (acc8d6b) ✅
- **Bug Rozi**: TTD canvas tidak muncul di PDF. Debug OpenCode: root cause TERBUKTI — `getTtdBase64` (shared.js:162) path `'../../uploads/ttd'` dari `backend/src/templates/dokumen` → resolve ke `backend/src/uploads/ttd` (tidak ada). Harus `'../../../'` → `backend/uploads/ttd` (pola sama logo kop).
- **Eksklusi**: regex inject MATCH, field `aktif` valid, PNG canvas putih (bukan transparan), nama user cocok — semua bukan penyebab.
- **Fix AGY** + verify OpenCode: `getTtdBase64('Ahli Gizi')` BASE64_LEN 0 → 14320. Test inject end-to-end: HAS_IMG true + `<img src="data:image/png;base64,...">`. Test negatif: tanpa <img>, tanpa error. Commit `acc8d6b` + pushed.
- ⚠️ **Server perlu restart lagi** (shared.js di-load saat start) sebelum tes ulang visual.

## Sesi 31 (2026-08-03) — V2-1 TTD Basah: TES SELESAI ✅ (setelah restart BE Rozi)
- **Tes HTTP 7/7 PASS** (OpenCode): login akuntan → POST /auth/ttd (logo-bgn.png) → GET → static 200 → file di disk → negative test 400 "Hanya PNG/JPG" → DELETE (file fisik hilang, static 404).
- **Tes PDF PASS**: `/api/laporan/bkk/pdf?periodeId=cmscsxrzz0054tcssmk3bsphy` → 200 + `%PDF-` (123KB). Chain TTD lengkap: user "Akuntan" == `namaAkuntanSPPG` seed, ttdPath ada, `injectTtdImages` aktif di route (bkk.js:41).
- ⏳ Sisa: verifikasi VISUAL Rozi (TTD muncul di PDF) + approval → archive.

## Sesi 31 (2026-08-03) — V2-1 TTD Basah: BUILD 3 tahap dalam 1 cycle bertahap ✅
- **Keputusan Rozi**: TTD per jabatan (profil user, bukan SetupLembaga), UI di SettingPage, 2 mode input (canvas + upload), opsional tanpa TTD → PDF tetap kosong. 1 cycle bertahap + commit per tahap (pola V2-4 gabungan).
- **Tahap 1 Backend** (`3a4da6c`): `User.ttdPath` + migrasi `20260803065119_add_ttd_path_user` + route `/api/auth/ttd` POST/GET/DELETE (multer 5MB png/jpg, `req.user.sub`) + static `/uploads` (app.js:45). VERIFY OpenCode 8/8 PASS.
- **Tahap 2 Frontend** (`2a1abb0`): SettingPage section TTD — canvas signature (mouse+touch, DPR) + upload + preview + hapus. Build PASS. Fix dep `[request]` → `[]`.
- **Tahap 3 PDF** (`81899e7`): strategi post-process injection (keputusan dari investigasi OpenCode — kolom TTD hardcode di template, route tak punya akses): marker `data-ttd-nama` di renderRuangTtd + `injectTtdImages` (scan marker → getTtdBase64 by nama → ganti div dengan `<img>` base64, fallback kosong) + 26 route wrap `setContent(await injectTtdImages(html))` + stockBarang 3 marker (fix class ttd-ruang).
- **Perbaikan mid-cycle**: AGY timeout (3 route belum) → fix 4 file (rabP12, pemeriksaan-bahan, mitra, stockBarang class). OpenCode pitfall Temp auto-reject → prompt ulang tanpa redirect.
- Verifikasi final: 31/31 node --check, 28 pemakaian inject 26 route, fast path + escape test PASS, FE build exit 0, scope bersih 34 file.
- HEAD: `81899e7`, pushed. ⚠️ Tes HTTP + PDF penuh PENDING — butuh restart BE (server PID 18876 masih kode lama).

## Sesi 30 (2026-08-03) — BUG-001 fix + V2-4 tuntas 11/11 (3 cycle serial)
- **BUG-001** ✅ FIXED: 500 /akuntan/rab-p12/harian + /rekap — `inp.hariAktif` drift ke GrupHari (kolom dihapus dari InputPenerimaManfaat, refactor Task 1). Fix 4 file (accountingHelper, _helpers, rabHarian, rabP12): include `grupHari: true` + guard `(inp.grupHari?.hariAktif || inp.hariAktif || [])`. Verifikasi OpenCode: 0 lokasi terlewat, node --check OK, tes fungsi AGY sukses (porsi 180/340). Commit `b9ba07b`.
- **V2-4 cycle gabungan TUNTAS 11/11** ✅: PeriodeSetupPage 836→268 (`755b894`, 5 komponen periodeSetup/), SaldoAwalBarangPage 813→294 (`6d26505`, 5 komponen saldoAwal/). Semua zero behavioral change verified (diff normalized + build PASS).
- **Catatan**: tes HTTP BUG-001 butuh restart BE (server instance lama saat fix). PUPPETEER aman (test approved sesi 29).
- HEAD: `6d26505`, working tree bersih.

## Sesi 29 (2026-08-03) — Setup perangkat baru (clone v2) ✅ + Fix drift migration
- **Setup lengkap perangkat ini**: node_modules backend (269 pkg) + frontend (140 pkg), .env dibuat (DB lokal `sppg` Postgres 18), 18 migration applied, seed BERHASIL, FE build PASS, backend boot OK.
- **Fix drift (pola BUG-002 terulang)**: 3 model tanpa migration — `GrupHari`, `MasterTargetGizi`, `DokumenBuktiLpd2m` + drift `InputPenerimaManfaat` (hariAktif vs grupHarId). Migration manual `20260803000000_add_gruphari_mastertarget_dokumenbukti` (AGY).
- **Fix 404 FE**: `VITE_API_URL` butuh prefix `/api` — frontend/.env + frontend/.env.example diperbaiki (`.env.example` repo tadinya salah, jebakan clone).
- **Catatan**: DB Postgres 18 lokal jalan port 5432, password postgres dari Rozi. PUPPETEER_EXECUTABLE_PATH diisi `C:\Program Files\Google\Chrome\Application\chrome.exe` + tes launch OK + PDF test Rozi APPROVED.
- HEAD: `5a50282`, working tree bersih.

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
