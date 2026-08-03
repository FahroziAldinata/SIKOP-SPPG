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
- **Status**: SELESAI 2026-08-03 — ⚠️ tes HTTP penuh masih pending (perlu restart BE, server instance lama saat fix).

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

## Format Pelaporan Bug

### [BUG-00X] Judul Bug
- **Severity**: Low / Medium / High / Critical
- **Langkah Reproduce**:
  1. 
- **Status**: BARU / DIPROSES / SELESAI
- **Catatan**: 