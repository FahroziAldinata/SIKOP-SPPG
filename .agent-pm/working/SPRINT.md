# Sprint Backlog

## Sprint 26 — V2-3 Restrukturisasi komponen FE ✅ (2026-08-03)
1. ✅ V2-3 struktur komponen — ui/ (15), layout/ (2), domain, src/lib/utils. Commit `64feac2`. Zero behavioral change, build PASS.

## Sprint 25 — V2-2 LPD2M fix gambar web ✅ (2026-08-03)
1. ✅ V2-2 LPD2M bukti gambar web 404 — fix `d383faf` (vite proxy /uploads + revert double prefix + nextElementSibling) + cleanup `e602a9c` (hapus summary duplikat). TES Rozi PASS → APPROVED.

## Sprint 24 — V2-1 TTD Basah ✅ (2026-08-03)
1. ✅ V2-1 TTD Basah — SELESAI + APPROVED Rozi. 3 tahap (`3a4da6c`, `2a1abb0`, `81899e7`) + fix path (`acc8d6b`) + fix ukuran/center (`24f640a`). Tes HTTP 7/7 + PDF E2E PASS + verifikasi visual OK.

## Sprint 23 — Laporan Ahli Gizi ✅ (2026-07-31)
1. ✅ G1 Laporan Pemenuhan Gizi — endpoint rekap target vs realisasi 5 zat gizi + PDF + UI RangeCalendar. Diuji Rozi OK.
2. ✅ G1-REVISI — hanya menu DISETUJUI (backend hardcode + hapus dropdown status FE).
3. ✅ G2 Laporan Rekap Menu — endpoint + PDF + dropdown jenis laporan + revisi center PDF G1-G3 (web+PDF). Diuji Rozi OK.
4. ✅ G3 Laporan Uji Organoleptik & Alergi — endpoint + PDF + opsi dropdown (center, DISETUJUI). Diuji Rozi OK.

## Sprint 22 — Laporan Mitra M1-M3 ✅ (2026-07-31)
1. ✅ M1 Realisasi PO vs Pesanan — endpoint + PDF (qty pesan/realisasi/diterima + harga + status + penerima).
2. ✅ M2 Cetak PO / Nota Pesanan — template PDF PO + route PDF.
3. ✅ M3 Penerimaan Barang + akses pemeriksaan bahan Mitra — endpoint + PDF (qtyDiterima + checklist).

## Sprint 21 — Revisi Layout Akuntan ✅ (2026-07-31)
1. ✅ Header + isi tabel center semua laporan akuntan (web + PDF)
2. ✅ BTT TTD — Kepala SPPG kanan, isi center, materai di area jabatan
3. ✅ LRA — transpose (periode baris, TOTAL bawah) + card style, web + PDF
4. ✅ Stock Barang PDF — judul ditambahkan

## Release 1.0 — Complete
Semua fitur per role (Aslap, Ahli Gizi, Akuntan) sudah selesai diimplementasikan.
Backlog teknis (Custom Zod + Excel Migration) juga selesai.
Project siap rilis.

## Backlog V2 (menunggu TASK_SELECTION — lihat TODO.md)
- V2-1 TTD Basah ← NEXT
- V2-2 Image handling
- V2-3 Perbaikan minor UX
