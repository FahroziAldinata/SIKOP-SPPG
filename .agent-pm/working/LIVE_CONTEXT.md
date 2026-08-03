# LIVE CONTEXT (auto-snapshot)
_Generated: 2026-08-03 — snapshot ringkas; sumber: CURRENT_TASK.md & CURRENT_STATE.md_

### dari CURRENT_TASK.md
## Status: V2-1 TTD Basah — 3 TAHAP SELESAI + COMMITTED + PUSHED (menunggu tes HTTP + approval akhir)
- Tahap 1 Backend `3a4da6c`: User.ttdPath + migrasi + route /api/auth/ttd + static /uploads
- Tahap 2 Frontend `2a1abb0`: SettingPage section TTD — canvas + upload + preview + hapus
- Tahap 3 PDF `81899e7`: marker data-ttd-nama + injectTtdImages + 26 route + stockBarang
- HEAD: `81899e7`, pushed. ⚠️ Tes HTTP PENDING (restart BE).

### dari CURRENT_STATE.md
**Scope Aktif: V2-1 TTD Basah — 3 tahap SELESAI + committed + pushed. Menunggu tes HTTP (restart BE) + approval akhir.**
## Sesi 31 (2026-08-03) — V2-1 TTD Basah: BUILD 3 tahap dalam 1 cycle bertahap ✅
- Keputusan Rozi: TTD per jabatan (profil user), SettingPage, 2 mode (canvas + upload), opsional.
- Strategi PDF: post-process injection (kolom hardcode di template) — marker + injectTtdImages base64 by nama, fallback kosong.
- Verifikasi: 31/31 node check, 28 inject 26 route, FE build exit 0.
- ⚠️ Tes HTTP + PDF penuh PENDING — butuh restart BE (server PID 18876 masih kode lama).
