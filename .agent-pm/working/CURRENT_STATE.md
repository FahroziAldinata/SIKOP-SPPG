# CURRENT STATE — SPPG

**Scope Aktif: V2 Infra/Docs/Finalisasi — Bagian A-G SELESAI + APPROVED Rozi (2026-08-04, sesi 36). Tag v2.0.0 dibuat. V2 TUNTAS → CYCLE_END.**

## Sesi 36 (2026-08-04) — V2 Bagian D-G: APPROVED + ARCHIVED ✅ (CYCLE_END)
- **Approval final Rozi**: diberikan (instruksi "approval final Bagian DG telah diberikan").
- **Tag `v2.0.0`** dibuat + pushed.
- Arsip: DOCUMENTATION.md entry sesi 36 (D-G + validasi runtime + ci.yml cleanup + backlog coverage + diagnosa test), cleanup prompts/ (isi dihapus, folder + .gitkeep tetap).
- AGENTS.md revisi `8fdbe8d`: cara tambah endpoint/halaman baru + daftar role lengkap (ASLAP, MITRA, AHLI_GIZI, AKUNTAN, KEPALA_SPPG, ADMIN — enum Prisma). Path test konsisten `src/routes/__tests__/`.
- ci.yml debug steps dihapus `74da21d`. Validasi runtime PASS (docs 200, pino live).
- **Catatan akhir sesi**: AGENTS.md revisi `8fdbe8d` (path test konsisten `__tests__`), arsip docs+state `6f4af55`, backlog V3 ditambahkan ke TODO.md + commit `eec6b1c` (8 fase: keamanan dasar, data safety, Dynamic RBAC, dokumentasi end-user, deployment/env production, legal/administratif, AI Chatbot, notifikasi eksternal — BACKLOG, belum dikerjakan).
- **D — error handler + Pino** `71d754e`: lib/logger.js (pino + pino-http, silent saat test) + middleware/errorHandler.js + 227 console.error → logger.error (63 file) + index.js logger.info. AGY 2x timeout (tool jalan, teks final tak keluar) — verifikasi OpenCode temukan require logger di DALAM fungsi (shared.js, stockBarang.js) → ReferenceError error-path → FIX_SUBLOOP AGY pindah ke top-level. Final: 62/62 test 2x, lint 0/0, 0 console sisa, 66 file.
- **E — OpenAPI/Swagger** `d5b2877`: @asteasolutions/zod-to-openapi ^9.1.0 + swagger-ui-express ^5.0.1, src/docs/openapi.js (126 path: 99 dari schema zod validators single-source + ~25 manual auth/admin/kepala/mitra PO/akuntan-master/bukti-lpd2m), mount /api-docs + /api-docs.json SEBELUM errorHandler, proteksi: NODE_ENV!=production || ENABLE_DOCS=true, production wajib requireAuth+ADMIN. AGY tahap 1 timeout, tahap 2 network error → retry sukses (126 path). Verifikasi final: 62/62 2x, 0 dup path, sampel cocok route aktual.
- **F — smoke test semua modul** `231f8cc`: smoke-modul.test.js 27 endpoint baru (13/13 mount modul), 0 temuan 500 → TANPA BUG entry baru. Total 89/89 test 2x run (GF-009). **STATUS: SELESAI (representative coverage — 27/225 endpoint + 62 integration test modul kritis)**; sisa ~198 endpoint masuk Backlog Perluasan Test Coverage (non-blocker).
- **G — AGENTS.md ×3 + CHANGELOG** `e40044b`: AGENTS.md root/backend/frontend + CHANGELOG section [2.0.0] (atas, riwayat lama utuh).
- ✅ **Validasi runtime sesi 36**: BE restart → pino + pino-http aktif (log JSON), /api-docs 200, /api-docs.json 200 (77.5KB, openapi 3.1.0), /api/auth/me 401 format konsisten. **ci.yml debug steps DIHAPUS** (AGY, grep sisa kosong).
- ⚠️ **Tag v2.0.0 BELUM** (oleh Rozi). Pending: approval final D-G → arsip.
- HEAD `e40044b`, tree BERSIH, semua pushed.

## Sesi 35 (2026-08-03) — V2 Bagian A-C: SELESAI + PAUSED (perintah Rozi "jangan lanjut, catat sesi")
- **Bagian A — Vitest**: backend `npm test` = `vitest run` (7 file, 62 test PASS, coverage lines 24.33%), FE vitest (3 test utils PASS). Konversi 6 integration test HTTP → Vitest+supertest (app export dari app.js, index.js listen). endpoints-kritis.test.js (5 endpoint Akuntan+Laporan). Fix race: `fileParallelism:false` (GF-009 — self-report AGY "62/62" keliru, verifikasi independen temukan 3 FAIL). Commits: `be5d967`, `6201e45`.
- **Bagian B — CI/CD**: `.github/workflows/ci.yml` — 5 job: node --check, test backend (postgres service + migrate + seed + Chrome), lint FE (oxlint), lint BE, build FE. **2x hijau ci-test + 3x hijau main berturut**. Perjalanan: Chrome missing → JWT_SECRET missing (`auth.js:5` throw) → P2002 unique AnggaranHarian/MenuHarian (seed fresh vs DB lokal beda periode) → **Strategi A** deleteMany chain child→parent idempotent → hijau. Flaky 2x fail di main (kode sama) → testTimeout 20s. Merge `a8b6b6e` + `ba23398` + `b5af929`. PENDING: debug steps (issue-post) masih di ci.yml — keputusan keep/remove saat final.
- **Bagian C — oxlint backend**: `oxlint ^1.77.0` + script `lint` (`oxlint src`). 80 warning (77 no-unused-vars + 3 no-useless-escape) → **0/0**, 30 file. `d5c7ce2`. npm test tetap 62/62.
- Commit sesi: `d5c7ce2` (C), `bb0e5ef` (docs arsip). HEAD == origin, tree BERSIH.
- Note CI: Node 24 (setup-node), trigger push main + PR main. probe commits (e46c289, 0a58646) + debug b5af929 di riwayat — kosmetik.

## Sesi 34 (2026-08-03) — V2-3 restrukturisasi struktur komponen FE ✅ + ARCHIVE
- **Audit**: `frontend/src/components/` 119 file — 104 domain (akuntan/gizi/aslap/kepala) + 15 root + utils.js. 78 pemakaian komponen root lintas pages/domain.
- **Keputusan Rozi** (koreksi mid-cycle): komponen UI primitif → folder independen; utils.js → `src/lib/` (bukan ui/ — bukan komponen + generateDateRange domain helper); 7 file root dievaluasi satu-satu.
- **Struktur final**: `components/ui/` 15 (12 primitif + WorkflowStepper + NotifikasiList + DashboardSummaryCards), `components/layout/` 2 (Layout, ProtectedRoute), domain: NominatifUpahGrid → `akuntan/nominatifUpah/`, GrupHariManager → `aslap/penerimaManfaat/`, `src/lib/utils.js`.
- **Commit** `64feac2` (OpenCode): 20 rename + ~100 import update, 120 file. Build PASS independen, 0 sisa path lama, 0 jsx root.
- Rozi: "jangan commit apapun sampai folder rapi" → arsip state files DIBIARKAN uncommitted (perintah Rozi — belum di-commit).

## Sesi 33 (2026-08-03) — V2-2 LPD2M gambar web: FIX APPROVED ✅ + ARCHIVE
- **Investigasi Hermes** (statis + runtime): fix `f837cc7` SALAH — double prefix `/uploads/uploads/` (filePath DB sudah berisi `uploads/`). Root cause asli: vite proxy cuma `/api` → URL gambar 404. Terbukti: probe file di `backend/uploads/` → 404 padahal ada; server BE PID 12308 start 17:39:53 = kode SEBELUM pull `3a4da6c` (static /uploads masuk 14:30) → instance RAM tanpa static mount.
- **Fix AGY** `d383faf`: vite.config.js + proxy `/uploads` + `src={'/'+b.filePath}` (revert double) + `nextElementSibling` (onError fallback crash). Build PASS. Verify + commit + push OpenCode. `e602a9c` hapus summary V2-2 duplikat di root `documentation/` (konsolidasi di .agent-pm/documentation/DOCUMENTATION.md) — perintah Rozi.
- **BE dimatikan Hermes** (kill PID 12308, atas instruksi Rozi) → Rozi hidupkan sendiri → tes: PDF ✓ + web thumbnail ✓ → APPROVED.
- Plan: `.agent-pm/plans/2026-08-03-v2-2-lpd2m-gambar-fix.md`. Prompt AGY/OC di `.agent-pm/prompts/` (dibersihkan saat archive).

## Sesi 32 (2026-08-03) — BUG-001 tes HTTP penuh PASS ✅
- Fix `b9ba07b` (13:10) < server start 15:26 → BE sudah load fix, tanpa restart. Tes OpenCode: harian 200 + rekap 200 (hariAktif GrupHari bekerja, Minggu porsi 0), negatif bersih (404 periode invalid, 400 tanggal di luar rentang). BUG-001 TUTUP TOTAL.

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
- V2-2 Image handling, V2-3 minor UX — backlog (menunggu TASK_SELECTION)

## Catatan
- ⚠️ State files sempat beberapa kali kena overwrite eksternal ke versi lama — ditulis ulang manual. Pantau kalau berulang.
- OpenCode punya pitfall: menulis file ke Temp → auto-reject. Workaround: instruksi keras "DILARANG tulis ke Temp", `--auto`, process substitution.
- Bug pre-existing tercatat (jangan diperbaiki di scope refactor): ConfirmDialog `isOpen` di AnggaranList (dialog tak muncul), handleDayCheckboxChange ReferenceError (dead code), menuData.filter di ApprovalPage.
