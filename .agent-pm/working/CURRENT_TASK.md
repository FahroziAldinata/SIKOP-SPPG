# CURRENT TASK — 2026-08-02

## Status: IN_PROGRESS — V2-4 Refactor Batch 1 (verifikasi + commit pending)

### Task
V2-4: Refactor file ribuan baris — design modular. Batch 1: `backend/src/routes/akuntan.js` (4.637 baris) → folder `routes/akuntan/` 9 file.

### Progress
- ✅ 9 file dibuat: index.js, _helpers.js, rabP12.js, rabHarian.js, jurnal.js, dokumenResmi.js, nominatifUpah.js, stok.js, master.js
- ✅ akuntan.js lama dihapus
- ✅ node --check ALL PASS, APP_OK boot sukses (port 3000)
- ⏳ BELUM: verifikasi endpoint (curl 401 test), commit

### Next Step
1. Verifikasi: curl tanpa auth → 401 untuk sample endpoint tiap sub-router; cek daftar route = target
2. Commit: `refactor: akuntan.js split into modular sub-routers (V2-4 batch 1)`
3. Lanjut batch 2: `frontend/src/pages/akuntan/laporan/LaporanPage.jsx` (3.511 baris)

### Referensi
- Plan: `.agent-pm/plans/V2-4-refactor-modular.md`
- TODO.md V2-4
