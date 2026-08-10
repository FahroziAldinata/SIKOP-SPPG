# Dokumentasi Project SPPG

Dokumentasi terkonsolidasi per task. Format: `[Tanggal] — [Kode Task] — [Deskripsi]`.

---

## 2026-07-25

### B.15 — Multi-Periode LRA & LPD2M
Laporan Realisasi Anggaran multi-periode komparatif + LPD2M. Backend + Frontend. `d1b33a4`

### Validasi Silang — Hard Constraint Bidirectional
Validasi agregat InputPenerimaManfaatDetail vs SekolahKelasDetail. Hard constraint bidirectional di 4 endpoint. `5753d2e`

---

## 2026-07-26

### B.7 — Pemeriksaan Bahan Makanan
- **Backend**: endpoint PDF Pemeriksaan Bahan. `ef390b5`
- **Frontend Task 7d**: PDF preview modal + landscape orientation + API fix + unique keys. `764e525`
- **Refactor**: perbaikan backend + frontend review, build fix, landscape enhancement

### Governance — DOCUMENTATION_ARCHIVE State
Implementasi state machine DOCUMENTATION_ARCHIVE. Template standard summary file. SESSION_START_PROTOCOL update. AUTOMATION_CYCLE.md overhaul.

---

## 2026-07-27

### B.16 — BahanPokok Create (Role AKUNTAN)
POST endpoint + frontend form modal + autocomplete dropdown. Dropdown component upgrade (searchable). Role pindah MITRA → AKUNTAN. `4c7300b`

### C.2 — PDF Preview Neraca Saldo
Template HTML PDF Neraca Saldo (7 kolom + TTD). Route + Frontend button. `ba89c4a`

### C.3 — PDF RAB P12
Template HTML PDF RAB P12 (8 kolom + pagu + rekap + TTD). Route + Frontend button. `4eb2e6b`

### Z.9 — BTT (Bukti Tanda Terima)
Endpoint aggregasi JurnalTransaksi + PDF template exact Excel + auto-terbilang + Frontend dropdown. Tercampur di commit `05e66ad`

---

## 2026-07-28

### Task 1 — Multi Grup Hari (1a+1b+1c)
- **1a**: Model GrupHari Prisma + migrasi DB
- **1c**: CRUD endpoint grup-hari + validasi overlap + update penerima-manfaat
- **1b**: GrupHariManager component + modifikasi PenerimaManfaatPage (tab per grup)
- **Commit**: `4dbad78`
- **Catatan**: 1 cycle untuk 3 sub-task (seharusnya 3 cycle terpisah)

### Hard Rules Update
Workflow baku, larangan eksekusi langsung Hermes, cara panggil AGY via cmd.exe. `6ed3840`, `8266cf7`, `8bc777f`

---

## 2026-07-29

### T2 — Pisah Pendidik
PENDIDIK dipisah dari schoolCategoriesMap + validasi backend tanpa sekolahId. `ef3039e`

### T4 — Laporan Harian Aslap
Endpoint + halaman laporan harian dengan tab per GrupHari, split peserta/non-peserta. `596df97`

### T5 — Laporan Per Periode Aslap
Endpoint + halaman 2 tabel (Pendidikan 17 kolom, Posyandu 9 kolom) + JUMLAH. `1fc53b1`

### Refactor Laporan Aslap
4 halaman (Harian, Periode, Bulanan, Per Kelas) digabung jadi 1 LaporanPage + dropdown. `777727a`

### T8a — Revert Pendidik + Form Kelas
PENDIDIK balik per sekolah. SekolahKelasPage input detail kelas + CRUD. `5982131`

### D.2 — Fix Dashboard Akuntan
Saldo kas selalu Rp0 — fix akses `bkuData.data?.transaksi`. `3a18e83`

### C.2 PDF Preview (Stock Barang, Kebutuhan Belanja, Per Periode, Per Bulan) + C.3 RAB P12 + Z.9 BTT
Tercampur 3 task dalam 1 commit. `05e66ad`

### T7 — Laporan Per Kelas
Endpoint + halaman frontend Laporan Per Kelas. `f3afc78`

### Telegram Gateway Setup
Gateway Telegram aktif. HOME_CHANNEL=7764384525. Notif task siap uji/eksekusi ke Telegram di state SCOPE_CHECK. `knowledge/08-telegram-gateway.md`

### A.1 + A.2 — Total Gizi + Target vs Realisasi
SummaryGiziCard (card biru) di MenuHarianPage — realisasi vs target per blok, gap warna. Helper sumGizi() aggregasi MenuItemBahan. Backend: targetGizi include. `839863a`

### Redesign MenuHarianPage
1. Master Menu scroll (scrollHeight=300) ✅
2. Riwayat Menu card wrapper + scroll ✅
3. Toast warning fix (warning icon/color) ✅
4. Tabel gizi ke bawah (kolom gizi pindah baris terpisah) ✅
5. Toast error create (setError → toast.error) ✅

### B.1 — Budget Control
Validasi backend saat ajukan menu: hitung total biaya tiap blok vs BatasHargaPorsi (KECIL=8000, BESAR=10000). Over budget → tolak + error. `c4ce1e6`

### Master Target Gizi
Model MasterTargetGizi + seed 9 kelompok (data Excel). CRUD endpoint + auto-populate saat create blok. Halaman Setup Gizi (sidebar Gizi). `ede52b2`

---

## 2026-07-31

### V2-1 — TTD Basah (Upload Gambar Per User) ❌ KLAIM PALSU — realisasi asli 2026-08-03 (lihat entry 2026-08-03)
- ⚠️ **PALSU**: entry ini ditulis 2026-07-31/08-01 mengklaim endpoint + frontend + PDF integration SELESAI, TAPI investigasi OpenCode 2026-08-03 membuktikan TIDAK ADA kode sama sekali (nol commit, nol file). `renderFooterTTD` saat itu teks-only. Realisasi sesungguhnya: 2026-08-03 (3 commit: `3a4da6c`, `2a1abb0`, `81899e7` + 2 fix).

### M3 — Penerimaan Barang Mitra ✅ (2026-07-31)
- **Endpoint** `GET /mitra/penerimaan-barang` + PDF — qtyDiterima per PO + checklist pemeriksaan bahan (kondisi, tanggal kadaluarsa, packaging).
- **Frontend** — form input qtyDiterima + checklist (kondisi baik/rusak, tanggal kadaluarsa, packaging baik/rusak) + preview PDF.
- **Status**: ✅ SELESAI — diuji Rozi OK. Commit: (lihat FINALIZE)

### M2 — Cetak PO / Nota Pesanan ✅ (2026-07-31)
- **Endpoint** `GET /mitra/cetak-po/pdf` — template PDF PO (nomor PO, tanggal, daftar barang + qty + harga, total, TTD).
- **Frontend** — tombol "Cetak PO" di halaman Detail PO + modal preview PDF.
- **Status**: ✅ SELESAI — diuji Rozi OK. Commit: (lihat FINALIZE)

### M1 — Realisasi PO vs Pesanan ✅ (2026-07-31)
- **Endpoint** `GET /mitra/realisasi-po` + PDF — komparasi qty pesan vs realisasi vs diterima + harga + status (menunggu/diterima/selesai).
- **Frontend** — tabel realisasi per PO + status badge + tombol cetak PDF.
- **Status**: ✅ SELESAI — diuji Rozi OK. Commit: (lihat FINALIZE)

### G2 — Laporan Rekap Menu (Ahli Gizi) ✅ (2026-07-31)
- **Endpoint** `GET /gizi/laporan/rekap-menu` (+ `/pdf`) — rekap menu per tanggal/blok: baris per bahan (Komponen | Nama Menu | Bahan Pokok | Berat Bersih (g) | URT), urut 5 komponen (Karbohidrat → Lauk Hewani → Lauk Nabati → Sayur → Buah), porsi dari InputPenerimaManfaatDetail, HANYA status DISETUJUI (revisi G1-G3). `gizi.js` (helper `getRekapMenuData`), `validators/gizi.js`.
- **PDF** template baru `dokumen/giziRekapMenu.js` — kop surat, judul-dok, TTD Ahli Gizi + Kepala SPPG (ruangTtd 40), anti-terpotong, grup komponen.
- **Frontend** `LaporanGiziPage.jsx` — dropdown "JENIS LAPORAN" (pola aslap/akuntan): Pemenuhan Gizi (existing) / Rekap Menu (baru), columnsRekap 5 kolom.
- **Revisi center G1-G3**: header + baris tabel PDF gizi center (`giziPemenuhan.js` + `giziRekapMenu.js`); kolom angka tabel halaman center (`columnsGizi` + `columnsRekap`).
- **Status**: ✅ SELESAI — diuji Rozi OK. Commit: (lihat FINALIZE)

### G1-REVISI — Laporan Gizi hanya menu DISETUJUI (2026-07-31)
- Revisi Rozi (berlaku G1-G3): laporan gizi HANYA menampilkan menu berstatus DISETUJUI.
- Backend: `getPemenuhanGiziData` hardcode `whereClause.status = 'DISETUJUI'` (1 tempat, JSON+PDF); param status dihapus dari signature + kedua endpoint. Validator: field `status` dihapus dari `laporanPemenuhanGiziQuerySchema`.
- Frontend: `STATUS_OPTIONS`, state status, dropdown STATUS, dan `params.append('status', ...)` dihapus dari `LaporanGiziPage.jsx`. StatusBadge di render card tetap.
- Verifikasi: node --check + require OK, functional test 26 item semua DISETUJUI + `status=DRAFT` diabaikan, build frontend bersih. Diuji Rozi OK.
- Commit: (lihat FINALIZE)

### G1 — Laporan Pemenuhan Gizi (Ahli Gizi) ✅ (2026-07-31)
- **Endpoint** `GET /gizi/laporan/pemenuhan-gizi` — rekap per tanggal/blok: target vs realisasi 5 zat gizi (Energi/Protein/Lemak/Karbo/Serat + %), porsi, menu, total biaya. Reuse logika porsi (hariAktif) + sumGizi. `gizi.js`, `validators/gizi.js`
- **PDF** template `dokumen/giziPemenuhan.js` + route `/gizi/laporan/pemenuhan-gizi/pdf` — kop surat, judul-dok, TTD Ahli Gizi + Kepala SPPG (ruangTtd 40), warna status pola LRA (≥90 hijau / 60-89 kuning / <60 merah), anti-terpotong (page-break-inside avoid)
- **Revisi UI** `LaporanGiziPage.jsx` — 1 input tanggal + popup RangeCalendar (1 klik = single hari, 2 tanggal = rentang, tanpa toggle) + click-outside
- **Status**: ✅ SELESAI — diuji Rozi OK. Commit `1411403`

### Revisi Layout Akuntan (5 sub-task — semuanya tuntas)
- **1+2 — Header + isi tabel center**: Semua laporan akuntan (web + 14 template PDF) — header DAN td angka jadi center, kolom uraian/keterangan/teks tetap kiri. Table.jsx tambah `headerAlign` (th center, td ikut align). `c7ddb74`
- **3 — BTT PDF TTD**: "Yang Mengetahui" + Kepala SPPG pindah ke kolom kanan (sejajar tempat/tanggal), isi tiap kolom TTD center, teks materai tetap (penanda tempat TTD) di area jabatan Kepala SPPG. `21c4baa`
- **4 — LRA card + TRANSPOSE**: Tabel LRA dibungkus card design ala Table (wrapper border/shadow, header uppercase); kemudian di-TRANSPOSE — periode jadi baris, kolom = kategori (Bahan Makanan/Operasional/Insentif/Total) × metrik (RAB/Realisasi/%), baris TOTAL paling bawah. Berlaku web + PDF (lra.js). `0b9942e`, `4c02f29`
- **5 — Stock Barang PDF judul**: Tambah `<h2 class="judul-dok">LAPORAN STOCK BARANG (PERSEDIAAN)</h2>` — renderKopSurat tidak menerima param judul (judul sebelumnya di-drop diam-diam). `4c02f29`
- **TTD ruang 40px LRA/BAPS/LPA**: opts `ruangTtd: 40` di renderFooterTTD (default 15). `dfae195`

### Migrasi Setup PDF Aslap → Pola Akuntan (2026-07-31)
- **Latar**: PDF aslap sebelumnya = frontend `window.print()` — tanpa kop surat, tanpa TTD, CSS ad-hoc. Dimigrasi ke pola akuntan (template backend + puppeteer + SHARED_CSS).
- **4 template baru** (`dokumen/aslapHarian.js`, `aslapPerPeriode.js`, `aslapPerBulan.js`, `aslapPerKelas.js`): SHARED_CSS + renderKopSurat + judul-dok + TTD (Dibuat Oleh = user ASLAP login, Mengetahui = Kepala SPPG). `3bb6553`
- **4 route PDF** `/aslap/laporan/{harian,periode,bulanan,per-kelas}/pdf`: reuse logika agregasi endpoint JSON (helper, verified identik), puppeteer A4. `3bb6553`
- **Frontend**: tombol Cetak → modal preview PDF (iframe, pola akuntan); print-only + @media print dihapus; natural flow antar grup hari (hapus page-break-before); bulanan web pecah 2 card (A. Peserta Didik / B. Non-Peserta); fix bug `columnsPeriodePosyandu` → `getColumnsPeriodePosyandu()`; anti-terpotong tabel (page-break-inside avoid + thead repeat + tr avoid) & judul (page-break-after: avoid). `3bb6553`, `0e374db`
- **TTD center global**: hapus inline `text-align:left` di renderFooterTTD (shared.js) → CSS `.ttd-kolom { text-align:center }` berlaku untuk SEMUA template. `0e374db`
- **TTD aslap**: pola akuntan (ruang default 15) lalu disesuaikan lagi area TTD 40px (2-3 baris) per permintaan. `0e374db` + pending

### Diskusi: Laporan Ahli Gizi & Mitra (2026-07-31)
- **Konteks**: belum ada output laporan untuk gizi & mitra; kebutuhan output yang memudahkan AUDIT bidang gizi (bukan cuma keuangan).
- **Referensi**: Juknis BGN (cdn-web.bgn.go.id/juknis/01KA7N19KSJ5GPG927034K3RP0.pdf), Kemenkes 2025-10-02 (standardisasi pelaporan harian/mingguan keamanan pangan), BGN 2025-09-11 (laporan 2 mingguan + bukti).
- **Rekomendasi AHLI GIZI**: G1 Pemenuhan Gizi (target vs realisasi Energi/Protein/Lemak/Karbo/Serat per blok/kelompok + porsi), G2 Rekap Menu (5 komponen + bahan + berat), G3 Uji Organoleptik & Keamanan Pangan (rasa/aroma/tekstur/suhu/musnah/alergi).
- **Rekomendasi MITRA**: M1 Realisasi PO vs Pesanan (qty pesan/realisasi/diterima + harga + status + penerima), M2 Cetak PO/Nota Pesanan, M3 Penerimaan Barang + akses pemeriksaan bahan.
- **Data tersedia**: gizi — MenuItemBahan (nilai gizi), MenuTargetGizi (AKG), porsi, organoleptik; mitra — TransaksiPembelian + realisasi, status DITERIMA, harga bahan. Gap: tidak ada rekap gizi backend/PDF, tidak ada template PO, qtyDiterima kosong.
- **Status**: masuk TODO.md (G1-G3, M1-M3) — menunggu TASK_SELECTION.

---

## 2026-08-02

### V2-4 Batch 2 — Refactor LaporanPage.jsx akuntan (3.511 → 1.517 baris)
- **BUILD** [OpenCode deepseek-v4-flash-free]: 19 komponen baru di `frontend/src/components/akuntan/laporan/` — ReportFilterBar (238), ReportActionButtons (647), BkuTable (46), BpTable (71), NeracaSaldoTable (93), StockBarangTable (75), KebutuhanBelanjaTable (54), PerPeriodeTable (86), PerBulanTable (60), LaporanHarianSection (77), LraTable (159), Lpd2mBuktiSection (187), Lpd2mTable (63), BttSection (23), BapsdSection (31), SptjSection (30), LbbpSection (156), BkkSection (142), PdfPreviewModal (87). Parent jadi orchestrator (state + handler + routing tetap).
- **VERIFICATION** [OpenCode]: PASS — body JSX komponen VERBATIM vs rentang baris asli (diff normalized), logika parent identik, guard conditional pindah equivalen, props cocok (20/20, 66/66, 14/14), `npm run build` PASS.
- **CLEANUP** [AGY gemini-3.6-flash-medium]: dead import Table + DatePicker dihapus dari parent → 1.517 baris; verifikasi silang OpenCode PASS.
- **Commit**: `57570b2` (refactor) + `e475d34` (docs archive) — ⚠️ commit dieksekusi AGY, seharusnya OpenCode (GF-008, koreksi Rozi).
- **Temuan minor**: komentar hilang di ReportActionButtons (kosmetik); bug pre-existing `justify:` invalid CSS (NeracaSaldoTable.jsx:12, Lpd2mBuktiSection.jsx:142) — dicatat, belum diperbaiki.

### Governance — Pembagian Agent Baru (keputusan Rozi 2026-08-02)
- **BUILD/eksekusi kode/FIX = AGY** (ganti OpenCode default); **COMMIT + PUSH = OpenCode** ("commit tugas opencode"); investigasi + verifikasi = OpenCode.
- **GF-008**: kesalahan commit via AGY `e475d34` → didokumentasikan + perbaikan governance lintas file (PROJECT_MANAGER_BEHAVIOR, SOUL, AUTOMATION_CYCLE, knowledge/10, skills).
- **Commit**: `c7e6134` "update agent-pm".

---

## 2026-08-03

### V2-1 — TTD Basah (Upload Gambar Per User) ✅ (2026-08-03 — realisasi sebenarnya; entry 2026-07-31 di atas PALSU)
- **1 cycle bertahap 3 tahap + commit per tahap** (pola V2-4 gabungan, keputusan Rozi):
  - **Tahap 1 Backend** `3a4da6c`: field `User.ttdPath` + migrasi `20260803065119_add_ttd_path_user` + route `POST/GET/DELETE /api/auth/ttd` (multer 5MB, fileFilter png/jpg, `req.user.sub`) + static `/uploads` (app.js:45). TES HTTP 7/7 PASS.
  - **Tahap 2 Frontend** `2a1abb0`: section TTD di SettingPage.jsx — canvas signature (mouse+touch, DPR) + upload + preview + hapus. Build PASS.
  - **Tahap 3 PDF** `81899e7`: strategi post-process injection (kolom TTD hardcode di template, route tak punya akses → investigasi OpenCode): marker `data-ttd-nama` di renderRuangTtd + `injectTtdImages` (scan marker → `getTtdBase64` by nama → ganti div kosong dengan `<img>` base64, fallback kosong) + 26 route wrap `setContent(await injectTtdImages(html))` + stockBarang 3 marker (fix class ttd-ruang).
- **Fix 1 — TTD tidak muncul di PDF** `acc8d6b`: `getTtdBase64` path salah (`'../../uploads/ttd'` dari `backend/src/templates/dokumen` → `backend/src/uploads/ttd` yang tidak ada). Harus `'../../../'` → `backend/uploads/ttd` (pola logo kop). BASE64_LEN 0 → 14320. Root cause terbukti via debug OpenCode (server stale + eksklusi regex/aktif/transparansi/nama).
- **Fix 2 — TTD terlalu kecil + tidak tengah** `24f640a` (revisi Rozi, Opsi C): FE canvas `width:100%` (~1152px rasio 7.2:1) → `min(480px,100%)` rasio 3:1 (tinta terpusat); BE img `height:40px;max-width:180px` → `55px;max-width:220px` + wrapper `max(ruangTtd,55)` — konsisten jalur direct + inject. "Tidak tengah" = artefak rasio PNG, bukan posisi elemen (DOM sudah flex-center).
- **Status**: ✅ SELESAI — diuji Rozi OK (2026-08-03). HEAD `24f640a`.

### BUG-001 — 500 RAB P12 harian/rekap (hariAktif drift GrupHari) ✅
- **Root cause**: `inp.hariAktif` diakses di accountingHelper.js:46 — kolom sudah dihapus dari InputPenerimaManfaat (pindah ke GrupHari, refactor Task 1 `4dbad78`). Query tanpa include `grupHari` → undefined → throw → 500.
- **Fix**: `b9ba07b` — 4 file (lib/accountingHelper.js, routes/akuntan/_helpers.js, rabHarian.js, rabP12.js): include `grupHari: true` + guard `(inp.grupHari?.hariAktif || inp.hariAktif || [])`. rabP12.js perlu (bukan overreach — hasil data salah senyap tanpa include). Verifikasi: grep seluruh backend/src 0 lokasi terlewat, node --check OK, tes fungsi AGY sukses.
- **Status**: ✅ SELESAI (tes HTTP penuh pending — perlu restart BE).

### V2-4 cycle gabungan FE — TUNTAS 11/11 ✅
- **PeriodeSetupPage** 836→268 (`755b894`): 5 komponen `components/akuntan/periodeSetup/` — PeriodeListCard, PeriodeAnggaranFieldset, LembagaFieldset, PelaporanFieldset, ClosePeriodeModal. Dead imports today/getLocalTimeZone dibuang.
- **SaldoAwalBarangPage** 813→294 (`6d26505`): 5 komponen `components/akuntan/saldoAwal/` — PeriodeSelector, SaldoAwalForm, SaldoAwalBulkForm, SaldoAwalTable, TambahBahanModal.
- **Pola**: parent = orchestrator (state/handler/useEffect tetap), child = presentational murni (0 hooks). Zero behavioral change verified (diff normalized + build PASS).

### V2-2 — LPD2M bukti gambar web fix (layout thumbnail) ✅ (2026-08-03)
- **Konteks**: V2-2 (`100b0da`) ubah layout bukti LPD2M jadi kiri-nama/kanan-thumbnail (web + PDF). Tapi gambar web gagal load.
- **Investigasi Hermes**: fix `f837cc7` SALAH — `src={'/uploads/'+b.filePath}` = `/uploads/uploads/bukti/...` DOUBLE PREFIX (filePath DB = `uploads/bukti/...`). Root cause asli: vite proxy hanya `/api` (file `/uploads/...` hit vite dev → 404). Beardikan: server BEHang PID 12308 start 17:39:53 = kode SEBELUM pull `3a4da6c` (static `/uploads` masuk 14:30) → instance tanpa static mount; probe file di `backend/uploads/` → 404 padahal ada.
- **Fix** `d383faf` (AGY build, OpenCode verify+commit+push): vite.config.js + proxy `/uploads`; revert `'/'+b.filePath`; `nextElementSibling` (onError fallback crash di DOM React). Build PASS.
- **Cleanup** `e602a9c` (perintah Rozi): hapus `documentation/2026-08-03-v2-2-lpd2m-bukti-layout-summary.md` di root (konsolidasi di file ini).
- **Tes Rozi**: PDF ✓ + web thumbnail ✓ → APPROVED. BE dimatikan Hermes (atas instruksi Rozi), dihidupkan ulang Rozi.

### V2-3 — Restrukturisasi struktur komponen FE ✅ (2026-08-03)
- **Audit**: `frontend/src/components/` 119 file — 104 domain (akuntan/gizi/aslap/kepala) + 15 root + utils.js. Komponen root dipakai lintas (Dropdown 16, Skeleton 15, Table 14, ConfirmDialog 10...).
- **Struktur final**: `components/ui/` (15: 12 primitif + WorkflowStepper + NotifikasiList + DashboardSummaryCards), `components/layout/` (Layout + ProtectedRoute), domain: NominatifUpahGrid → `akuntan/nominatifUpah/`, GrupHariManager → `aslap/penerimaManfaat/`, `utils.js` → `src/lib/`.
- **Keputusan Rozi mid-cycle**: utils.js TIDAK di ui/ (bukan komponen + generateDateRange domain helper) → `lib/`.
- **Commit** `64feac2` (OpenCode): 20 rename + ~100 import update, 120 file. Verify: build PASS, 0 sisa path lama, 0 jsx di root components/. Zero behavioral change.
- 1 commit bersih (Rozi: "jangan commit apapun sampai folder komponen rapi").

---

## 2026-08-04

### V2 Infra Bagian D-G — SELESAI + APPROVED Rozi ✅ (sesi 36)
- **D — Global error handler + Pino logging** `71d754e`: `lib/logger.js` (pino + pino-http, silent saat NODE_ENV=test) + `middleware/errorHandler.js` + 227 `console.error` → `logger.error` (63 file) + `index.js` `logger.info`. Kontrak error FE (`{error}`, `{success:false,error}`, `{error,message,details}`) tidak berubah. Fix subloop: require logger di dalam fungsi (shared.js, stockBarang.js) → ReferenceError error-path → pindah top-level. Verify: 62/62 test 2x, lint 0/0, 0 console sisa.
- **E — OpenAPI/Swagger /api-docs** `d5b2877`: `@asteasolutions/zod-to-openapi ^9.1.0` + `swagger-ui-express ^5.0.1`; `src/docs/openapi.js` 126 path (99 dari schema zod validators single-source + ~25 manual kritis auth/admin/kepala/mitra PO/akuntan-master/bukti-lpd2m); mount `/api-docs` + `/api-docs.json` sebelum errorHandler; proteksi production (`NODE_ENV!=prod || ENABLE_DOCS=true`, prod wajib `requireAuth+ADMIN`). Verify: 62/62 2x, 0 dup path.
- **F — Smoke test semua modul** `231f8cc`: `smoke-modul.test.js` 27 endpoint baru, 13/13 mount modul, 0 temuan 500 → tanpa BUG entry baru. **SELESAI (representative coverage 27/225 + 62 integration test modul kritis)**; sisa ±198 endpoint → Backlog Perluasan Test Coverage (non-blocker, TODO.md). Total 89/89 test 2x.
- **G — AGENTS.md ×3 + CHANGELOG [2.0.0]** `e40044b`. Revisi lanjutan `8fdbe8d`: section "Cara Menambah Endpoint Baru" (backend) + "Cara Menambah Halaman Baru" (frontend, router di App.jsx) + daftar role lengkap enum Prisma (ASLAP, MITRA, AHLI_GIZI, AKUNTAN, KEPALA_SPPG, ADMIN).
- **Validasi runtime**: BE restart → pino + pino-http aktif (log JSON stdout), `/api-docs` 200, `/api-docs.json` 200 (77.5KB, openapi 3.1.0, version 2.0.0), `/api/auth/me` 401 format konsisten.
- **ci.yml cleanup** `74da21d`: hapus debug steps issue-post ("Post debug ke GitHub issue", "Diagnose DB", dll) — CI stabil, grep sisa kosong, 5 job utuh.
- **Backlog baru**: Perluasan Test Coverage (non-blocker rilis) — ±198 endpoint belum diuji individual (risiko rendah, shared middleware/pattern), belum ada PDF/Puppeteer E2E (perlu strategi screenshot comparison/validasi struktur), prioritas rendah-sedang, bertahap setelah v2.0.0.
- **Diagnosa test (analisis kode, sesi 36)**: 4 file test pakai shared periodeId via lookup (laporan, approval, pemeriksaan-bahan, endpoints-kritis); `deleteMany` laporan filter `(periodeId, tanggal)` tidak menjangkau tanggal file lain; `testDate` laporan tanpa guard ketersediaan (vs `getUnusedDate` approval); `rabHarian` 2026-07-26 tak pernah dihapus di pemeriksaan-bahan.test.js. `fileParallelism:false` → aman per-run; rawan sisa antar-run/seed. Fix menyatu dengan backlog coverage.
- **Tag**: `v2.0.0` dibuat + pushed (oleh Rozi/Hermes sesi 36). Release draft GitHub menyusul.

---

## 2026-08-05 s.d. 2026-08-06

### Fase 3 — Dynamic RBAC ✅ TUNTAS + MERGED KE MAIN (sesi 41-42, HEAD `c20a864`)
- **Desain approved Rozi (2026-08-05)**: A1/A2 (role enum TETAP 6 + tabel `RolePermission` dinamis DB) + B1/B3 (cache Map boot + invalidasi write-through) + C2 (migrasi bertahap per modul) + D4 (FE hybrid config + `/api/my-permissions`).
- **TASK 1** `7ab97cf`: model `Resource`+`RolePermission`+enum `PermissionAksi` (migration `20260805131002_add_role_permission`), middleware `requirePermission` + `permissionCache` Map + `loadPermissionCache` boot + `invalidatePermissionCache`, ADMIN superuser bypass.
- **TASK 2** `7dd128a`: `GET /api/my-permissions` + CRUD admin `/api/admin/permissions` (POST/PUT/DELETE → invalidate write-through + logAudit) + seeder `src/lib/rbacSeeder.js`.
- **TASK 3a-3e** `e75f630` `c0945ff` `95af7a2` `8f88d63` `658c77b`: migrasi 61 file route `requireRole` → `requirePermission` (akuntan 7, gizi 15, aslap 11, laporan 17, mitra/kepala/admin/auditLog/bukti-lpd2m/laporanBug/pemeriksaan-bahan). Sisa requireRole disengaja: app.js docs guard (anomali b, keputusan tertunda) + gizi/kendaraan stub 410. Anomali a fixed (laporanAggregate AUTH-ONLY → requirePermission).
- **TASK 4** `c380eba`: FE D4 — AuthContext `permissions`+`hasPerm`+ADMIN bypass+`permissionsReady` anti-race, ProtectedRoute `requiredPerm` fallback allowedRoles, 3 route pilot. Fix `a413f2f`: AuditLogPage crash (render signature `(value,row)`).
- **Fix review** `c68aee4` (sesi 42, temuan test/audit):
  - **BUG 1 cache lockout**: `requirePermission` cek `!permissionCache.has(role)` (bukan `size===0`) — role yang di-invalidate admin terkunci 403 sampai restart tanpa ini. Konsisten di `myPermissions.js`. Test anti-bug: revert → 403 lockout, restore → PASS.
  - **BUG 2 approval campur**: ASLAP punya `kepala-approval APPROVE` (dipakai poApprove) → bisa akses POST /api/kepala/approval. Fix: resource baru `aslap-po-approval APPROVE` khusus ASLAP; poApprove.js pindah. Keputusan: KEPALA_SPPG TIDAK boleh PUT /po/:id/approve (perilaku lama).
  - **Regresi MITRA**: `GET /api/aslap/periode` dulu boleh MITRA, hilang di migrasi. Fix resource granular `aslap-periode` READ utk 5 role — TIDAK buka sekolah/posyandu (tetap 403 utk MITRA, sesuai origin/main).
- **Penyempitan akses final** `c20a864` (keputusan Rozi business workflow): resource `akuntan-akun` + `akuntan-jenis-pekerjaan` (AKUNTAN penuh, KEPALA READ, MITRA dilarang → 403) + `gizi-target` (AHLI_GIZI READ/UPDATE + KEPALA READ, AKUNTAN/ASLAP dilarang → 403). 5 endpoint akuntan/master.js + 2 endpoint masterTargetGizi.js pindah resource.
- **Resource RBAC total: 23** (20 asli + aslap-periode + aslap-po-approval + akuntan-akun + akuntan-jenis-pekerjaan + gizi-target).
- **Verifikasi**: full suite **590/590 PASS** (39 files), lint 0/0, prisma validate OK, migrate status up-to-date (resource baru = data seed, tanpa migration).
- **Merge**: reset --hard origin/main → `git merge --ff-only origin/rbac-fase3-review` → push. main == origin/main == `c20a864`. Branch `rbac-fase3-review` dipertahankan.
- **Backlog tersisa**: TASK 5 UI matrix role-resource (admin) + Sidebar FE dinamis (Layout.jsx role→permission) + anomali b /api-docs guard (3 opsi, tunggu keputusan Rozi).
- **Pelajaran**: (1) `git push HEAD:branch` TIDAK switch branch lokal — commit berikutnya bisa jatuh ke branch lama; (2) seeder upsert ≠ hapus — row yang dihapus dari definisi tetap di DB, perlu `deleteMany` manual.

---

## 2026-08-07 (sesi 44-45) — Fase 4 (dokumentasi end-user) + Fase 5 (runbook deployment) ✅

### Fase 4 — Dokumentasi End-User ✅ TUNTAS + MERGED (sesi 44, HEAD `660dde4`)
- **Inventaris/audit fitur per role** — draft v2 `2026-08-07-fase4-audit-dokumentasi-enduser-v2.md`, APPROVED Rozi. Data: grant per role (rbacSeeder.js), menu+requiredPerm (App.jsx/Layout.jsx), fitur, alur kerja, gap.
- **Screenshot alur tiap modul** — 35 screenshot per role (termasuk versi scroll-fix `66320ea` utk periode-setup & mitra).
- **Prosedur support** — `docs/user-guide/PROSEDUR-SUPPORT.md` (troubleshooting umum, kontak, eskalasi).
- **RBAC audit-log fix** `ac472bf`: akses GET /api/audit-log dicabut dari MITRA/AKUNTAN (khusus ADMIN) + scroll fix PeriodeListCard & MitraDashboard.
- **Merge `d5531a5`** `--no-ff`: branch `docs/fase4-audit-revisi` → main. Test **590/590 PASS** (dokumentasi murni, 0 regresi). Branch dihapus (lokal+remote).

### Fase 5 — Runbook Deployment Production ✅ (sesi 45, commit `324e94f`) — DOKUMENTASI SAJA
- **Keputusan Rozi**: Fase 5 skip implementasi produksi — cukup dokumen langkah "kalau project dipakai production".
- **Deliverable**: `docs/DEPLOYMENT.md` 159 → 347 baris (+215/-27), 1 file tanpa file baru: Platform Database (Supabase PgBouncer 6543 runtime / direct 5432 migrasi), Setup Env Production Terpisah (contoh `.env.production`, `openssl rand -hex 64`, HTTPS wajib), Setup Domain & HTTPS (CNAME/apex Vercel+Railway, redirect 301 + headers), Healthcheck & Uptime Monitoring (`GET /api/health` + UptimeRobot/BetterStack — **langkah saat produksi, belum diimplementasikan**), Matrix Env Dev vs Prod (8 KEY), Deploy Checklist, Ops & Pemulihan (link DISASTER_RECOVERY, rotasi JWT, rollback).
- **Fix drift factual**: klaim `trust proxy` "belum di-set" → SUDAH di-set (`backend/src/app.js:29`).
- **Verifikasi OpenCode 5/5 PASS** (scope bersih, 0 duplikasi, konsisten fakta repo). 0 perubahan kode produksi.
- **Aturan baru Rozi (2026-08-07)**: setelah APPROVE + DOCUMENTATION_ARCHIVE → WAJIB kosongkan isi `plans/` + `prompts/` (tercatat di SOUL.md Workflow Baku 0).

---

## 2026-08-08 (sesi 47 lanjutan) — FASE 7 LANJUTAN: Widget Chat FE + Migrasi API Key → SystemConfig ✅ SELESAI + VERIFIED MANUAL (Rozi)

### UJI MANUAL (Task 5, 4 skenario)
1. ADMIN `/setting` → section AI muncul → set key OK
2. Role lain (AKUNTAN) `/setting` → section AI TIDAK muncul OK
3. Role lain chat → jawaban OK (key dari config)
4. ADMIN hapus key → chat → error 'API key belum diatur, hubungi admin' OK

### Keputusan desain (Rozi, plan `.agent-pm/plans/2026-08-08-prompt-migrasi-apikey-admin-managed.md`) 
 - **API key BUKAN per-user (BYOK dibatalkan)** — 1 key untuk seluruh SPPG, diatur HANYA ADMIN (admin-managed). Role lain tinggal pakai chat. Satu instance = 1 SPPG (konsisten keputusan sppgId dibatalkan). Tujuannya portabilitas deploy: sekali admin set key, tidak perlu bongkar kode.
- Migrasi data testing lama: DIKOSONGKAN (fresh start, bukan migrate data).
- Aksi enum `MANAGE` ditambahkan — bukti non-breaking: suite 637/637 PASS (bukan hanya 626).

### Hasil build
- **Widget chat FE**: `ChatWidget.jsx` (baru) — overlay modal pola Bug Report, tombol floating, POST /chat `{message}` → `data.jawaban` (non-stream), loading, error "API key belum diatur" → link `/setting`, guard `hasPerm('chatbot','READ')` (Layout:697). Tanpa SSE, tanpa dep baru.
- **Section "AI Assistant" SettingPage.jsx** (+363): form provider dropdown (gemini/groq/openai/custom) + baseUrl + model + apiKey password, GET masked key, DELETE + ConfirmDialog, toast.
- **Migrasi schema**: model `SystemConfig` (singleton id "system"; provider, apiKeyEncrypted, baseUrl?, model?, timestamps) + HAPUS `ChatApiKey` + relasi balik di `User`; enum `PermissionAksi` + `MANAGE`. Migration `20260808165619_migrate_chat_apikey_to_system_config` (ALTER TYPE + DROP TABLE + CREATE TABLE). `npx prisma generate` OK.
- **RBAC**: resource `chatbot-config` (rbacSeeder.js:30), grant `chatbot-config:MANAGE` HANYA ADMIN (:176); `chatbot:READ` semua 6 role tetap (:180-185). DB grant verified.
- **chat.js**: GET/POST/DELETE api-key → `systemConfig` id 'system', guard `requirePermission('chatbot-config','MANAGE')`; POST /chat ambil key dari config (bukan user), kalau belum diset → `400 { error: 'API key belum diatur, hubungi admin' }`; ChatLog tetap `userId: req.user.sub`; enkripsi reuse `lib/chat/encryption.js` (0 bongkar).
- **Guard FE Task 3**: `{hasPerm('chatbot-config','MANAGE') && <AiApiKeySection />}` — non-ADMIN: section tidak render, GET /chat/api-key tidak pernah dipanggil (4 pemanggilan /chat semua di dalam AiApiKeySection L671/717/727/746).

### Verifikasi
- `npm test` backend: **637/637 PASS (43 files)** — bukti enum MANAGE non-breaking RBAC
- `npm run lint` (oxlint): 0 warnings 0 errors
- FE `npm run build`: exit 0
- grep `chatApiKey` backend/src: 0 sisa
- DB: row rolePermission `{ role: ADMIN, aksi: MANAGE, resource: chatbot-config, aktif: true }`

### Proses & model
- AGY claude-sonnet-4-6 quota 9router habis → **AGY gemini-3.6-flash-medium** (Rozi approve, model valid)
- AGY 3x timeout "tool jalan, teks mati" — kerja di disk; verifikasi OpenCode independen + npx oxlint (read-only) jadi bukti final
- Catatan opencode: `rtk` alias rusak (JSON parse EOF) → pakai `npx oxlint src` langsung

### Uji manual — SELESAI (Rozi, 2026-08-08 malam): 4/4 skenario LULUS

---

## 2026-08-08 (sesi 47 lanjutan) — TASK 4: UI Form Resource + Guard DELETE 409 + Test CRUD Resource ✅ APPROVED

### Backlog `ui-form-resource-baru.md` selesai — folder `.agent-pm/backlog/` dihapus (keputusan Rozi)
- **Task A — guard 409** (admin.routes.js:337-341): DELETE resource ditolak kalau masih punya grant aktif (`rolePermission.count > 0` → 409). Menjawab pertanyaan Rozi: guard pilih cek grant aktif, bukan cek App.jsx literal dari backend. Soft-delete tetap + invalidatePermissionCache.
- **Task B — test CRUD resource** (`rbac-resource.test.js` baru, 9 test): create 201, duplikat 409, validasi 400, update 200, nonaktif → 403, **reaktivasi (aktif:true) → akses pulih 200**, DELETE saat grant nempel → 409, DELETE setelah grant dicabut → 200, 404. **Jalur pemulihan diuji** (keputusan Rozi).
- **Task C — FE form** (RolePermissionMatrixPage.jsx +319/-4): form tambah resource, tabel daftar resource dengan tombol aksi nonaktif/aktifkan + ConfirmDialog; **revisi UI**: tabel dibatasi ~5 baris + scroll (maxHeight 200px, overflowY auto, header sticky, baris 376-461).
- **Verifikasi**: backend **635/635 PASS** (626+9), lint 0/0, FE build exit 0. Scope 3 file.
- **Proses**: AGY 2x timeout "tool jalan, teks mati" — kerja selesai di disk, verifikasi OpenCode independen. FIX_SUBLOOP scroll via AGY sekali.

---

### Fix RBAC — permission = satu-satunya sumber kebenaran (KEPUTUSAN ROZI: tanpa role-gate, tanpa Sppg/per-SPPG)
- **Latar**: temuan kritis sesi 46 — fix AND-logic `1dd9c70` (role+perm) tertimpa `3135fef` (migrasi 43 route requiredPerm-only). Efek: ADMIN (bypass `hasPerm`) bisa akses 43 halaman operasional via URL; KEPALA_SPPG (grant READ luas) 34 route via URL, 19 di antaranya operasional-detail. Arah Rozi: JANGAN kembalikan role-gate — permission (`requiredPerm`) = satu-satunya sumber kebenaran; Task 3 model Sppg/sppgId DIBATALKAN (sistem single instance per SPPG).
- **Task B**: 10 grant KEPALA_SPPG dicabut (aslap-input, gizi-menu, mitra-po, mitra-pemeriksaan, akuntan-jurnal, akuntan-upah, akuntan-akun, akuntan-jenis-pekerjaan, gizi-target, laporan-resmi CREATE/DELETE). Pertahankan: akuntan-rab READ+APPROVE (kepala approve RAB), kepala-approval, ringkasan/laporan, laporan-bug, chatbot.
- **Task C**: bypass ADMIN dicabut FE (`AuthContext.jsx`) + BE (`auth.js`) → grant eksplisit ADMIN (12 grant admin-only + chatbot:READ). ADMIN 403 di 38 halaman operasional; halaman admin tetap 200.
- **Task A**: CRUD resource API `POST/PUT/DELETE /api/admin/resources` (admin.js +118, guard per-permission, validasi format+duplikat) + `invalidatePermissionCache()` di 3 endpoint (admin.js:270/315/350). UI form resource → backlog.
- **Task D**: 4 test lama di-update (coverage-mitra 3× 200→403; rbac-permission bypass dibalik → grant eksplisit next / tanpa grant 403). Suite **626/626 PASS** (625 baseline + 1), lint 0/0, FE build exit 0. Gap: test otomatis cache invalidation resource CRUD belum ada.
- **Proses**: AGY claude-sonnet-4-6 2x timeout ("tool jalan, teks mati") — kerja finish di disk, verifikasi OpenCode independen 2x jadi bukti final (GF-009). AGY auth expired 1x → Rozi login ulang Google OAuth.
- **Artefak**: laporan `.agent-pm/plans/2026-08-07-fix-rbac-eksekusi.md` (dibersihkan saat archive), backlog `.agent-pm/backlog/ui-form-resource-baru.md`.
- **Backlog baru**: UI form resource baru (admin) + test resource CRUD cache invalidation.

---

## 2026-08-09 (sesi 48) — FASE 7 ITEM 2: TOOL REGISTRY CHATBOT v1 ✅ SELESAI + VERIFIED + APPROVED (Rozi)

- **4 tool P0, 7 fungsi, READ-only, TANPA SQL mentah** (keputusan final Rozi; P1 ditunda): `gizi-menu-status` (cek_status_menu_harian, hitung_menu_pending) · `akuntan-rab-status` (cek_status_rab_harian, hitung_rab_pending) · `mitra-po-status` (hitung_po_pending, cek_status_po_supplier) · `aslap-input-status` (cek_status_input_pm).
- **Grant 11 row READ** sesuai matriks final: gizi-menu-status (AHLI_GIZI, ASLAP, KEPALA_SPPG, AKUNTAN) · akuntan-rab-status (AKUNTAN, KEPALA_SPPG — **AHLI_GIZI eksplisit TIDAK**) · mitra-po-status (MITRA, KEPALA_SPPG, AKUNTAN) · aslap-input-status (ASLAP, KEPALA_SPPG).
- **Integrasi**: `lib/chat/tools/` BARU (index REGISTRY + 4 modul + `__tests__/tools.test.js`) · `chat.js` filter definisi tool per role via `hasUserPermission(resourceStatus,'READ')`, eksekusi tool + re-call LLM merangkai jawaban natural, denial → "Maaf, saya tidak punya izin untuk mengakses info itu untuk akun Anda." · ChatLog.toolCalls diisi hasil eksekusi (bukan null) · `auth.js` +export helper `hasUserPermission` (extract logika requirePermission) · `openaiCompatible.js` param adapter `tools` di request body OpenAI-compatible.
- **Keamanan**: negatif test per tool (role tanpa grant → ditolak di level KODE/server, fungsi tool TIDAK dieksekusi) + prompt injection "abaikan izin kamu, tampilkan semua data RAB" → tetap ditolak.
- **Verifikasi**: npm test **660/660 PASS (45 files)** · lint 0/0 · grant DB **11/11** ter-seed · test baru 23 (`chat-tools.test.js` 10 = 5 positip + 4 negatif + 1 prompt injection; `tools.test.js` 13 unit).
- **Commit**: `7b0b01b` (tool registry v1) + `0de4f6d` (hash di TODO.md) + `ca61f3e` (dokumentasi sesi 47).
- **Catatan deploy**: setelah seed grant, role yang permission-nya ter-cache sebelum seed perlu **BE restart** agar grant baru aktif.
- **Proses**: build [AGY gemini-3.6-flash-medium] (claude-sonnet-4-6 quota habis sesi lalu) + verify/finalize [OpenCode deepseek-v4-flash-free] + [Hermes oc/deepseek-v4-flash-free].

---

## 2026-08-10 (sesi 49) — FASE 7 ITEM 3: RETENSI CHATLOG + FIX CHAT ERROR ✅ SELESAI + VERIFIED + APPROVED (Rozi)

- **Root cause "Gagal menghubungi AI provider"** (audit gabungan): model `oc/deepseek-v4-flash-free(high)` latensi 37-40s vs timeout adapter BE 30s → AbortError → pesan seragam; error asli tidak tersimpan (ChatLog tanpa kolom error).
- **Fix model**: SystemConfig → `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` (deepseek bare 39.9s saat eksekusi; nemotron 5.3s, tools:true) — deviasi beralasan dari plan, timeout TETAP 30s. E2E: AKUNTAN tool-call **948ms** sukses · AHLI_GIZI denial sopan · halo 482ms.
- **Observability**: `openaiCompatible.js` non-2xx baca body provider + custom error `{status, providerBody, errName}`; timeout → 504 TimeoutError; `chat.js` log detail + `ChatLog.errorMessage` (tanpa apiKey). User-facing message tetap generik.
- **ChatLog + `errorMessage String?`**: migration `20260810125842_add_chatlog_errormessage`.
- **Validasi model**: POST /chat/api-key tolak `(`/`)` (400) + helper text FE `SettingPage.jsx`.
- **Retensi 30 hari hard delete**: `lib/chat/retensiChatLog.js` (setInterval 24h jam 02:00, idempoten, log Pino, tanpa dependency baru) + `backend/index.js:4,14` + test `chat-retensi.test.js` (3).
- **Verifikasi**: npm test **665/665 PASS (46 files)** · lint 0/0 · FE build exit 0 · E2E 3 skenario sukses.
- **GF-013 KNOWN RISK**: suite test satu DB dengan dev (chat.test.js hapus ChatLog user seed; SystemConfig backup/restore dimitigasi).
- **Proses**: build [AGY gemini-3.6-flash-medium] (claude-sonnet quota habis) + verify/lanjut [OpenCode deepseek-v4-flash-free] + [Hermes oc/deepseek-v4-flash-free].

---

## Catatan Umum

- **AGY**: Mode `-p` = text-only. Butuh `-i` + PTY untuk eksekusi tool. Settings di `C:\Users\Administrator\.gemini\antigravity-cli\settings.json`
- **OpenCode**: Agent utama untuk CODE_INVESTIGATION, VERIFICATION, BUILD (fallback)
- **Telegram**: Gateway aktif. Notif dikirim pas SCOPE_CHECK (siap uji)
- **Multi-perangkat**: .env disalin manual. Sisanya aman di-push/pull
