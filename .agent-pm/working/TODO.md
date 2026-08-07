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
- **V2-1: TTD Basah (upload gambar per user) — SEMUA ROLE** ✅ SELESAI + APPROVED (2026-08-03)
  - ✅ **Tahap 1 Backend** (`3a4da6c`): `User.ttdPath` + migrasi `20260803065119_add_ttd_path_user` + route `/api/auth/ttd` POST/GET/DELETE (multer 5MB png/jpg, `req.user.sub`) + static `/uploads`
  - ✅ **Tahap 2 Frontend** (`2a1abb0`): SettingPage section TTD — canvas signature (mouse+touch, DPR) + upload + preview + hapus. Build PASS
  - ✅ **Tahap 3 PDF** (`81899e7`): marker `data-ttd-nama` + `injectTtdImages` (base64 by nama) + 26 route + stockBarang
  - ✅ **Fix path** (`acc8d6b`): getTtdBase64 `../../` → `../../../` (bug TTD tidak muncul)
  - ✅ **Fix ukuran/center** (`24f640a`): canvas 480px rasio 3:1 + img 55px/220px + wrapper max(ruangTtd,55) — revisi Rozi
  - ✅ Tes HTTP 7/7 + PDF E2E + verifikasi visual Rozi OK → approved → archived
- V2-2: Image handling (upload → report → auto-delete by period) ✅ SELESAI (commit 100b0da, f837cc7, e898cfb) + FIX gambar web 2026-08-03:
  - ✅ Fix `d383faf`: vite proxy `/uploads` + revert double prefix (`'/'+b.filePath`) + `nextElementSibling` — gambar bukti web tampil, APPROVED Rozi
  - ✅ Cleanup `e602a9c`: hapus summary V2-2 duplikat di root documentation/ (perintah Rozi)
- V2-3: Perbaikan minor UX (jika ada) ✅ SELESAI (2026-08-03) — restrukturisasi struktur komponen FE: ui/ (15), layout/ (2), domain terpisah, utils → src/lib. Commit `64feac2`.
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
  - ✅ **Sisa cycle gabungan TUNTAS 11/11** (2026-08-03):
    - PeriodeSetupPage 836 → 268 (`755b894`) — 5 komponen `components/akuntan/periodeSetup/`
    - SaldoAwalBarangPage 813 → 294 (`6d26505`) — 5 komponen `components/akuntan/saldoAwal/`
  - 🏁 **V2-4 SELESAI 11/11** (2026-08-03)

## V2 Infra, Docs, Finalisasi (2026-08-03 → 2026-08-04) ✅ SEMUA SELESAI (sesi 36, approval + tag pending)
- ✅ **A — Vitest**: BE 62 test (7 file, supertest) + FE 3 test. `be5d967`, `6201e45`. Coverage lines 24.33%.
- ✅ **B — CI/CD**: `.github/workflows/ci.yml` 5 job hijau (2x ci-test + 3x main). Merge `a8b6b6e` + `ba23398` + `b5af929`.
- ✅ **C — oxlint backend**: 80 warning → 0/0, script `lint`, 30 file. `d5c7ce2`.
- ✅ **D — global error handler + Pino logging**: lib/logger.js + middleware/errorHandler.js + 227 console.error → logger (63 file). `71d754e`. 62/62 test 2x, lint 0/0.
- ✅ **E — validators audit + OpenAPI/Swagger**: /api-docs 126 path (zod single-source + manual kritis), proteksi production. `d5b2877`. 62/62 2x, 0 dup.
- ✅ **F — smoke test semua modul**: smoke-modul.test.js 27 endpoint, 13/13 modul bersih, 0 bug baru. `231f8cc`. Total 89/89 2x. **SELESAI (representative coverage 27/225 + 62 integration test modul kritis)** — sisa ~198 endpoint → Backlog Perluasan Test Coverage (non-blocker).
- ✅ **G — AGENTS.md ×3 + CHANGELOG [2.0.0]**: `e40044b`. Revisi `8fdbe8d` (cara tambah endpoint/halaman + daftar role lengkap). **Tag `v2.0.0` DIBUAT + pushed** (`e42e051`) — draft GitHub Release tidak dibuat (gh CLI tidak terpasang di device ini).

## Backlog Perluasan Test Coverage (2026-08-04) — ✅ CYCLE 1-3 SELESAI + PUSHED (2026-08-05, verified via git log origin/main); sisa = endpoint minor non-blocker
- **✅ CYCLE 1 SELESAI (2026-08-05)**: 30 endpoint baru (6 file) — commit `69d10e5` (pushed). Suite 123 → 210.
- **✅ CYCLE 2 SELESAI (2026-08-05)**: 45 endpoint baru (11 file) — commit `682da6c` (pushed). Suite 210 → 342.
- **✅ CYCLE 3 SELESAI (2026-08-05)**: 216 test baru (6 file: laporan/* data+pdf+excel, gizi sub-modul + laporan, aslap laporan, top-level notifikasi/laporanBug/dashboard/bukti/rab-harian) — commit `cb2803b` (pushed). Suite 342 → **558**.
- **Sisa (BACKLOG NON-BLOCKER)**: endpoint yang belum ter-cover individu tersisa minor (beberapa matcher-longgar utk PDF body; beberapa conservative). PDF/Puppeteer E2E screenshot comparison belum — butuh keputusan pendekatan saat dikerjakan.
- **Latar**: smoke test Bagian F = cakupan REPRESENTATIF, bukan penuh. Total endpoint backend ±225 (213 router.* + 12 sub-router).
- **Cakupan saat ini**: 27 endpoint smoke (13/13 modul) + 62 integration test modul kritis = 89 test PASS stabil.
- **Gap**:
  - ±198 endpoint belum diuji individual — risiko RENDAH (berbagi middleware/pattern yang sama: requireAuth/requireRole/validate + pola handler seragam), dikerjakan bertahap.
  - Belum ada PDF/Puppeteer E2E testing — butuh strategi (screenshot comparison ATAU validasi struktur PDF), keputusan pendekatan saat dikerjakan.
- **Prioritas**: RENDAH-SEDANG. Dikerjakan BERTAHAP setelah rilis v2.0.0. TIDAK memblokir rilis.
- Catatan teknis terkait (diagnosa sesi 36): testDate laporan.test.js tanpa guard ketersediaan (pola getUnusedDate approval) + rabHarian 2026-07-26 tak dihapus pemeriksaan-bahan.test.js — fix menyatu saat perluasan coverage.

## V3 — Production Readiness + Fitur Lanjutan (BACKLOG, belum dikerjakan)

> Status: BACKLOG murni — seluruh isi di bawah ini DOKUMENTASI RENCANA, belum dikerjakan. Menunggu instruksi eksekusi Rozi. Jangan mulai sebelum TASK_SELECTION.

### FASE 1 — Keamanan Dasar
- Rate limiting pada endpoint login (anti brute-force)
- HTTPS production (termination di reverse proxy / platform deploy)
- Review mekanisme JWT: expiry, algoritma, dan kebutuhan refresh token
- Audit implementasi AuditLog (kelengkapan, konsistensi pencatatan)
- Audit bcrypt/password hashing: SEMUA jalur password (login, reset, ganti password, seed, dll) — evaluasi cost factor yang dipakai
- Audit logging password: pastikan tidak ada password/log sensitif tercatat di log mana pun (Pino, error handler, pino-http)
- Audit fitur reset password (ada/tidak, alur, keamanan)

### Backlog Audit Log (STEP 4 audit, sesi 2026-08-04 — lihat CURRENT_STATE.md sesi 38-39 untuk detail lengkap)
- ✅ **[PRIORITAS TINGGI] SELESAI** — GET /api/audit-log (filter tanggal/user/aksi/resource + pagination, akses AKUNTAN/MITRA/ADMIN) + FE AuditLogPage + registrasi OpenAPI + 9 test — commit `1e3b08c`
- ✅ **[PRIORITAS TINGGI] SELESAI** — tutup gap logAudit: kepala/approval, poApprove, akuntan/master (10/11), akuntan/rabHarian (4/5), + temuan tersembunyi mutasiStok/validasiStok — commit `a98d236` (16 titik + 14 test)
- ✅ **[PRIORITAS SEDANG] SELESAI** — STEP C logAudit 16 endpoint: nominatifUpah (3), mitra (8), bukti-lpd2m (2), admin (3) — commit `6b4645f` + test audit-log-stepc.test.js (7 test, 16/16 endpoint). 123/123 PASS, lint 0/0 (sesi 40, 2026-08-05)
  - ⚠️ **KNOWN RISK (keputusan Rozi: jangan diperbaiki sekarang)**: bukti-lpd2m DELETE — `fs.unlinkSync` file fisik di luar `$transaction` (best-effort, error ditelan). Jika tx rollback setelah unlink (mis. logAudit gagal), file fisik bisa tersisa tanpa record DB. Catatan: pola existing sejak awal, STEP C tidak mengubahnya.

### FASE 2 — Data Safety
- ✅ Backup script `backend/scripts/backup-db.js` (pg_dump -Fc, PGPASSWORD env, timestamp, E2E TESTED) — commit `343b2b0`
- ✅ `docs/DISASTER_RECOVERY.md` (prosedur restore, RPO 24h/RTO 4h rekomendasi bukan SLA) — commit `343b2b0`
- ✅ Backup PostgreSQL OTOMATIS — **keputusan Rozi 2026-08-05: scope LOCAL saja, tanpa scheduler nyata** — panduan jadwal (Windows Task Scheduler schtasks + alternatif cron/bash + retensi forfiles 7 hari) ditambahkan ke `docs/DISASTER_RECOVERY.md` section "Panduan Otomatisasi (Local Windows)". Script `backend/scripts/backup-db.js` siap diintegrasikan (exit 0/1).
- ✅ Audit kebocoran data: TASK A errorHandler NODE_ENV guard (`92fcba5`) + leak fix `.message` 3 titik (`9dc3c7f`). Temuan audit: 95 titik, 92 AMAN, 3 BERISIKO — SEMUA di-fix.

### FASE 3 — Dynamic RBAC ✅ TUNTAS + MERGED KE MAIN (2026-08-06, sesi 42, HEAD `c20a864`)
- ✅ Model Prisma: `Resource` & `RolePermission` (migration `20260805131002_add_role_permission`) + middleware `requirePermission()` + cache Map boot + invalidasi write-through — TASK 1 (`7ab97cf`)
- ✅ CRUD permission admin (GET/POST/PUT/DELETE `/api/admin/permissions` + audit trail) + endpoint `/api/my-permissions` — TASK 2 (`7dd128a`)
- ✅ Migrasi per modul requireRole → requirePermission (C2): akuntan, gizi, asap, mitra/kepala/admin/auditLog/bukti-lpd2m/laporanBug/pemeriksaan-bahan, laporan/* (17 file) — TASK 3a-3e
- ✅ Anomali a (laporanAggregate AUTH-ONLY) — FIXED. Anomali b (/api-docs guard kondisional) — tercatat, keputusan Rozi tertunda
- ✅ Seeder RBAC: 23 resource + matriks permission per role, upsert idempotent + invalidate cache
- ✅ Fix review `c68aee4`: cache lockout (`!permissionCache.has(role)`), resource `asap-po-approval` (approval PO ASLAP pisah dari kepala-approval), regresi MITRA `asap-periode`
- ✅ Penyempitan akses final `c20a864`: `akuntan-akun`/`akuntan-jenis-pekerjaan` (MITRA dilarang), `gizi-target` (AKUNTAN/ASLAP dilarang)
- ✅ Full suite **590/590 PASS** + lint 0/0 + prisma valid — MERGED + PUSHED ke main
- ✅ Sidebar dinamis (menu muncul sesuai izin) — **SELESAI sesi 43 (2026-08-06)**: `533946b` merged ke main. Pola `user?.role === 'ROLE' && hasPerm('resource:AKSI')` — role gate + hasPerm granular (role tetap batas section; hasPerm-only bocor utk KEPALA_SPPG). Notifikasi tetap role (backend requireAuth saja). Branch dihapus.
- ✅ Seeder RBAC `upsert ≠ hapus` (perlu deleteMany) — **CLOSED (False Alarm) sesi 44 (2026-08-07)**: dry-run audit menunjukkan 0 resource stale, 0 grant stale, seluruh 138 grant sesuai `rbacSeeder.js` — kemungkinan sudah bersih sejak commit `c20a864`. TIDAK perlu deleteMany.
- ✅ UI matrix role-resource (TASK 5) — **CLOSED (Verified & Approved) sesi 44 (2026-08-07)**: verifikasi manual dilakukan & disetujui Rozi — tidak perlu diverifikasi ulang. Commit `dc4dbe5`.
- ✅ Admin sebagai superuser (bypass di requirePermission)

### FASE 4 — Dokumentasi End-User ✅ TUNTAS + MERGED KE MAIN (2026-08-07, sesi 44, HEAD `d5531a5`)
- ✅ **Inventaris/audit fitur per role** — draft v2 `2026-08-07-fase4-audit-dokumentasi-enduser-v2.md`, APPROVED Rozi. Data: grant per role (rbacSeeder.js), menu+requiredPerm (App.jsx/Layout.jsx), fitur, alur kerja, gap.
- ✅ **Screenshot alur tiap modul** — 35 screenshot per role (termasuk versi scroll-fix 66320ea utk periode-setup & mitra).
- ✅ **Prosedur support** — `docs/user-guide/PROSEDUR-SUPPORT.md` (troubleshooting umum, kontak, eskalasi).
- ✅ **Merge `d5531a5`** `--no-ff`: branch `docs/fase4-audit-revisi` → main + RBAC audit-log fix `ac472bf` (audit-log HANYA ADMIN) — keduanya TERPUSH + branch dihapus. Test **590/590 PASS**.

### FASE 5 — Deployment & Environment Production
- Pisahkan environment production (env file terpisah, build terpisah, proteksi /api-docs production sudah ada — lengkapi sisanya)
- Setup domain bila perlu
- Uptime monitoring (healthcheck berkala, alert)

### FASE 6 — Legal/Administratif ✅ SELESAI (2026-08-07, sesi 44) — scope disederhanakan jadi disclaimer saja (keputusan Rozi, bukan proses legal formal)
- ✅ `docs/DISCLAIMER.md` ADA: project pembelajaran (learning/design exercise), alur mengacu pola MBG, seluruh data dummy/fiktif, tanpa data asli/pribadi/instansi. Verifikasi OpenCode verbatim.
- Catatan: FASE 6 ditutup sebagai item disclaimer saja; pertanyaan data ownership/handover tetap terbuka bila sistem naik produksi (non-blocker).

### FASE 7 — Fitur AI Chatbot
- BYOK (bring-your-own-key) — user pakai API key sendiri
- Default provider: Gemini / Groq
- Tool calling TANPA SQL langsung (agent tidak pernah eksekusi query mentah)
- Read-only (chatbot tidak bisa mutasi data)
- Scope per role (jawaban dibatasi data yang boleh dilihat role tsb)
- Audit endpoint reusable (log pertanyaan-jawaban-tool-call untuk audit)
- Desain tool registry (daftar tool terpusat + dokumentasi)
- UI API key (halaman kelola key user)
- Endpoint chat (backend)
- Chat widget (frontend)
- Pengujian pembatasan akses (uji role A tidak bisa bocorkan data role B)

### FASE 8 — Notifikasi Eksternal
- **Email**: Nodemailer + Gmail App Password; integrasi dengan model `Notifikasi` existing; template email; preferensi user (jenis notif via email atau tidak)
- **WhatsApp**: evaluasi WhatsApp Business API vs Baileys/whatsapp-web.js (non-resmi); jika pakai non-resmi wajib nomor khusus (bukan nomor pribadi); dokumentasikan risiko (ban/block, ToS)

## Backlog Infra (2026-08-02)
- ~~**INFRA-1: Fix sync-hermes.sh gagal jalan**~~ — **CANCELLED** (keputusan Rozi 2026-08-02): workflow manual push sebelum pindah device + pull di device lain sudah cukup. Job cron `sync-hermes` (05fd5c684e88) di-pause.

## BUG (2026-08-03)
- ✅ **BUG-001** SELESAI: 500 /akuntan/rab-p12/harian + /rekap — `inp.hariAktif` drift ke GrupHari, fix commit `b9ba07b` (4 file). Tes HTTP penuh PASS (harian + rekap 200, negatif bersih).
- ✅ **BUG-002** SELESAI: 500 /gizi/master-menu-list — schema drift MasterMenuMingguan, migration `20260802220000_add_minggu_ke_master_menu`, commit `77a5e19`
- ✅ **BUG-003** SELESAI: 404 gambar LPD2M — fix final `d383faf` (2026-08-03): root cause = vite proxy tanpa /uploads + double prefix dari `f837cc7` + server stale. Approved Rozi. (Catatan: penomoran BUG-003 di TODO.md = LPD2M, di BUG.md = TTD — BUG-004 baru dibuat untuk LPD2M agar rapi.)

---
Model sesi: [Hermes oc/deepseek-v4-flash-free] (lihat knowledge/10-model-strategy.md)
