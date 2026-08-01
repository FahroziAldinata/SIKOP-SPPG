# Bug Log

## Active Bugs

### [BUG-001] 500 error pada GET /rab-p12/harian dan /rab-p12/rekap
- **Severity**: Medium
- **Langkah Reproduce**:
  1. Login role AKUNTAN
  2. GET `/api/akuntan/rab-p12/harian` atau `/api/akuntan/rab-p12/rekap` (periode tertentu)
  3. Response 500: `{"error":"Terjadi kesalahan server saat mengambil pagu & porsi RAB harian"}`
- **Root cause**: `hitungPaguHarian` → `getPorsiPerJenisPorsi` throw pada `hariAktif` undefined
- **Status**: BARU — suspected **pre-existing** (confidence MEDIUM: jalur kode identik dengan original akuntan.js per grep baris 81-82, 135, 4529, tapi belum dual-run head-to-head dengan data sama)
- **Prioritas**: perlu investigasi terpisah, **BUKAN blocker** untuk refactor V2-4 batch 1
- **Ditemukan saat**: smoke test V2-4 Batch 1 (2026-08-02, sesi verifikasi behavioral)

## Format Pelaporan Bug

### [BUG-00X] Judul Bug
- **Severity**: Low / Medium / High / Critical
- **Langkah Reproduce**:
  1. 
  2. 
- **Status**: BARU / DIPROSES / SELESAI
- **Catatan**: 