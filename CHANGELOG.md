# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versi mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-08-15

### Added
- **Fase 8 - Notifikasi Eksternal**: Email notification infrastructure (Nodemailer + SMTP), integration hooks di semua approval workflows, frontend email management untuk semua role, dan complete test coverage (671/671 PASS)
- **Fase 7 - AI Chatbot**: Backend chatbot dengan multiple providers (OpenAI, Gemini, Groq, Custom), tool registry untuk akses data sistem baca-saja, frontend widget chat + API key management, ChatLog dengan retensi 30 hari, dan encryption AES-256-GCM
- **Dynamic RBAC v2**: Kolom `source` (SEED/MANUAL) untuk safe pruning grant manual, UI matrix role-resource permission, dan CRUD permission admin
- **Test isolation**: Isolasi dari data seed nyata (refactor 5 test file) + validasi API key placeholder + GF-014 environment fixes
- **Production readiness**: Complete deployment documentation, disaster recovery procedures, dan security audit

### Changed
- **RBAC system**: Migrasi dari role-based ke permission-based dengan dynamic RBAC v2
- **Security**: Rate limiting endpoint login, bcrypt cost factor 12, audit trail lengkap, dan JWT tokenVersion
- **Frontend email integration**: Email input di SettingPage (semua role) + email management di UserManagementPage (ADMIN)
- **Backend email service**: SMTP configuration dengan multiple provider support dan HTML email templates
- **Chatbot integration**: Function calling dengan tool registry per role dan RBAC proteksi

### Fixed
- **GF-014 Environment issues**: DATABASE_URL race condition di vitest, password DB campur, dan drift RBAC grant
- **GF-013 Test isolation**: Suite test tidak lagi menghapus data seed produksi
- **BUG-004**: LPD2M gambar bukti web 404 fix (vite proxy + double prefix)
- **BUG-003**: TTD basah ukuran/center fix (canvas 480px rasio 3:1 + img 55x220px)
- **BUG-001**: 500 error /rab-p12/harian & /rekap (hariAktif drift ke GrupHari)

## [2.0.0] - 2026-08-04

### Added

- **TTD basah**: upload tanda tangan per user (canvas/PNG) via `/api/auth/ttd` + field `User.ttdPath`, section TTD di SettingPage (canvas signature + upload + preview + hapus), serta injeksi gambar TTD ke PDF (`renderFooterTTD` marker + `injectTtdImages`, 26 route) dengan fix ukuran (canvas 480px rasio 3:1, img 55x220px) dan fix path `getTtdBase64`.
- **OpenAPI/Swagger**: dokumentasi API dari schema Zod (`src/docs/openapi.js`) dengan UI live di `/api-docs` + `/api-docs.json` (diproteksi `requireRole('ADMIN')` di production).
- **Testing infrastructure**: Vitest + supertest — 89 test di `src/routes/__tests__/`, `fileParallelism: false`, `testTimeout` 20s, strategi setup DB child-first (deleteMany) untuk stabilitas CI.
- **CI GitHub Actions** (`.github/workflows/ci.yml`, trigger main + PR): 5 job — `node-check`, `test-backend` (Postgres 16 service + Google Chrome + JWT_SECRET env), `lint-fe`, `lint-be`, `build-fe`.

### Changed

- **Restrukturisasi komponen frontend**: UI primitif dipindah ke `components/ui/`, layout ke `components/layout/`, utils ke `lib/`.
- **Refactor modular backend**: route besar dipecah per domain — `gizi.js` → 17 file, `aslap.js` → 12 file, `laporan.js` → 19 file (tiap folder punya `index.js` + file per fitur).
- **Refactor frontend file >800 baris**: RabHarianPage (10 komponen), AkuntanPoPage (10), JurnalTransaksiPage (6), MenuHarianPage (13), PenerimaManfaatPage (7), SekolahPage (6), ApprovalPage (8), LaporanPage aslap (7), LaporanPage akuntan (19), LaporanGiziPage (8), SaldoAwalBarangPage (813→294), PeriodeSetupPage (836→268).
- **Global error handler + logging Pino**: `middleware/errorHandler.js` + `lib/logger.js` (pino/pino-http), menggantikan logging ad-hoc.
- **Lint oxlint**: 80 warning backend diperbaiki — 0 errors / 0 warnings + script lint.

### Fixed

- **LPD2M bukti gambar**: layout ringkasan kiri nama / kanan gambar (web + PDF), fix path prefix `/uploads/`, dan fix proxy Vite `/uploads` + fallback `onError` (BUG-003).
- **BUG-001**: 500 error `GET /rab-p12/harian` & `/rekap` — guard `hariAktif` dipindah ke GrupHari (include grupHari + fallback).

## [1.0.0] - 2026-08-02

### Added

#### Akuntan
- RAB P12: harian, rekap, dan ekspor PDF (`/api/akuntan/rab-p12/harian`, `/api/akuntan/rab-p12/rekap`).
- RAB harian dengan anggaran harian, verifikasi, dan rincian item.
- Jurnal transaksi: CRUD, prefill, dan bulk-generate.
- Dokumen resmi LPA/SPTJ/BAPSD: generate + CRUD.
- Daftar nominatif upah.
- Stok barang: saldo awal, mutasi, dan validasi stok.
- Master data: akun, supplier, periode, jenis pekerjaan, hari libur, bahan pokok, PO, dan kebutuhan hitungan.

#### Laporan
- Laporan LPA, SPTJ, BAPSD, BKU, LRA, LPD2M, BTT, BKK, LBBP dengan ekspor PDF dan Excel.
- Neraca saldo, ringkasan anggaran, laporan per-periode/per-bulan/harian.
- Laporan stock barang, kebutuhan belanja, bentuk pengeluaran, catatan.
- Bukti LPD2M dan pemeriksaan bahan.

#### Aslap
- Master sekolah/posyandu/kategori/periode.
- Penerima manfaat: CRUD.
- Grup hari.
- Approve PO.
- Laporan harian/bulanan/per-periode/per-kelas/aggregate dengan ekspor PDF.

#### Gizi
- Master menu dan menu harian dengan blok.
- Target gizi, organoleptik, batas harga porsi.
- Pengiriman harian, kendaraan, dan alergi.
- Laporan rekap-menu, pemenuhan-gizi, dan organoleptik dengan ekspor PDF.

#### Mitra
- Harga bahan per periode.
- PO + realisasi + PDF.
- Laporan realisasi PO.

#### Auth & RBAC
- Login, me/profile, dan kontrol akses berbasis peran (Admin, Akuntan, Aslap, Gizi, Kepala, Mitra).

#### Dashboard & Admin
- Dashboard dengan ringkasan 6 stage dan notifikasi.
- Modul approval Kepala.
- Manajemen pengguna (users).
- Laporan bug dan pengaturan umum.

### Known Issues

- **BUG-001**: `500` error pada `GET /rab-p12/harian` dan `GET /rab-p12/rekap` — suspected pre-existing (sebelum refactor). Detail: lihat `.agent-pm/working/BUG.md`.
