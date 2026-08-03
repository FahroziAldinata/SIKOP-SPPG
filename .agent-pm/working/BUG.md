# Bug Log

## Active Bugs

### [BUG-003] TTD Basah tidak muncul di PDF + ukuran kecil (2026-08-03)
- **Root cause 1**: `getTtdBase64` (shared.js:162) path salah `'../../uploads/ttd'` dari `backend/src/templates/dokumen` → `backend/src/uploads/ttd` (tidak ada). Harus `'../../../'` → `backend/uploads/ttd`. Fix `acc8d6b`.
- **Root cause 2 (revisi Rozi)**: img TTD clamp `height:40px;max-width:180px` + PNG rasio 7.2:1 (canvas 100% lebar) → tinggi efektif ~25px + goresan off-center. Fix `24f640a` (canvas 480px rasio 3:1 + img 55px/220px + wrapper max(ruangTtd,55)).
- **Status**: SELESAI 2026-08-03 — diuji Rozi OK, task approved.

### [BUG-001] 500 error pada GET /rab-p12/harian dan /rab-p12/rekap
- **Severity**: Medium
- **Root cause**: `inp.hariAktif` diakses di accountingHelper.js:46 — kolom SUDAH dihapus dari `InputPenerimaManfaat` (dipindah ke model `GrupHari` saat refactor Task 1, commit `4dbad78`). Query tidak include `grupHari` → undefined → throw.
- **Fix**: commit `b9ba07b` — 4 file (lib/accountingHelper.js, routes/akuntan/_helpers.js, rabHarian.js, rabP12.js): include `grupHari: true` + guard `(inp.grupHari?.hariAktif || inp.hariAktif || [])`. Verifikasi OpenCode: 0 lokasi terlewat (grep seluruh backend/src), node --check OK, tes fungsi AGY sukses (porsi KECIL 180 / BESAR 340, pagu total 4.840.000).
- **Status**: SELESAI 2026-08-03 — tes HTTP penuh PASS 2026-08-03 (server start 15:26 sudah load fix): harian 200 + rekap 200 (hariAktif GrupHari bekerja, Minggu porsi 0), negatif bersih (404 periode tidak ditemukan, 400 tanggal di luar rentang).

### [BUG-002] 500 error pada GET /gizi/master-menu-list — schema drift MasterMenuMingguan
- **Severity**: Medium (error setiap kali halaman Menu Harian load master menu)
- **Langkah Reproduce**:
  1. Login role AHLI_GIZI
  2. GET `/api/gizi/master-menu-list?periodeId=<apa saja>`
  3. Response 500: `{"error":"Gagal mengambil daftar master menu"}`
- **Root cause**: Schema drift — `schema.prisma` model `MasterMenuMingguan` punya kolom `mingguKe` + `@@unique([periodeId,jalur,hari,mingguKe])`, tapi migration `20260703220600_init` TIDAK pernah membuat kolom itu (index DB masih 3 kolom). Query `orderBy: mingguKe` → Prisma P2022 (column does not exist) → 500.
- **Status**: SELESAI 2026-08-02 — migration `20260802220000_add_minggu_ke_master_menu` (ALTER TABLE add catatan + mingguKe DEFAULT 1, drop index lama, create unique 4-kolom). Cek duplikat (periodeId,jalur,hari) = 0. Verifikasi: kolom + index ada, findMany SUCCESS, endpoint 200 (periodeId `cms4u62zn001rt38c3x54zwrh` + `cms4uaudx0054t3x4mmuud2ab`).
- **Ditemukan saat**: test FE Menu Harian gizi oleh Rozi (2026-08-02, sesi 28)
- **Catatan**: PRE-EXISTING (bukan bug refactor batch 3c) — handler asli query identik, `git diff c017282..HEAD -- schema.prisma` kosong. Fix via `npx prisma db push` (AGY) — tanpa migration file sebelumnya; migration SQL dibuat manual oleh AGY.

### [BUG-004] 404 gambar bukti LPD2M di web (2026-08-03) — RESOLVED
- **Gejala**: setelah upload bukti gambar, thumbnail web tampil "[Gagal Load]", padahal PDF embed berhasil.
- **Severity**: Medium
- **Root cause (rantai, confidence TINGGI)**:
  1. `filePath` di DB = `uploads/bukti/<ts>-<nama>` (path.relative di bukti-lpd2m.js:61) — SUDAH berisi `uploads/`.
  2. fix `f837cc7` menambah prefix → `src={'/uploads/'+filePath}` = `/uploads/uploads/bukti/...` → DOUBLE PREFIX → 404.
  3. Root cause asli "gagal load": `frontend/vite.config.js` proxy hanya `/api` → URL gambar `/uploads/...` hit vite dev → 404.
  4. Faktor pembeda saat tes: server BE (PID 12308) jalan dengan kode LAMA (sebelum pull `3a4da6c` yang menambah static `/uploads` app.js:45) — bukti probe file 404 padahal ada.
- **Fix final** `d383faf` (AGY build, OpenCode verify+commit+push):
  - vite.config.js tambah proxy `/uploads` → localhost:3000 (root cause)
  - `Lpd2mBuktiSection.jsx:173` revert `'/uploads/'+` → `'/'+` (single prefix)
  - `Lpd2mBuktiSection.jsx:186` `nextSibling` → `nextElementSibling` (fallback onError crash di DOM React)
- **Verifikasi**: build PASS (independen OpenCode), diff scope 2 file, BE restart Rozi → thumbnail ✓ PDF ✓ → APPROVED.
- **Status**: SELESAI 2026-08-03 — approved Rozi, committed `d383faf` + `e602a9c` (hapus summary duplikat).

## Format Pelaporan Bug

### [BUG-00X] Judul Bug
- **Severity**: Low / Medium / High / Critical
- **Langkah Reproduce**:
  1. 
- **Status**: BARU / DIPROSES / SELESAI
- **Catatan**: 