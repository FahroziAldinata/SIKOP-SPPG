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

---

## Catatan Umum

- **AGY**: Mode `-p` = text-only. Butuh `-i` + PTY untuk eksekusi tool. Settings di `C:\Users\Administrator\.gemini\antigravity-cli\settings.json`
- **OpenCode**: Agent utama untuk CODE_INVESTIGATION, VERIFICATION, BUILD (fallback)
- **Telegram**: Gateway aktif. Notif dikirim pas SCOPE_CHECK (siap uji)
- **Multi-perangkat**: .env disalin manual. Sisanya aman di-push/pull
