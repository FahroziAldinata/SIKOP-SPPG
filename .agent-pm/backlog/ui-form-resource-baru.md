# Backlog — UI Form Resource Baru (admin)

**Tanggal dicatat**: 2026-08-08
**Sumber**: Task 3 `.agent-pm/plans/2026-08-07-prompt-fix-minimal-rbac.md`
**Status**: BACKLOG — belum dikerjakan

## Apa yang Sudah Bisa Sekarang
- Backend API lengkap: `POST /api/admin/resources` (buat), `PUT /api/admin/resources/:id` (ubah), `DELETE /api/admin/resources/:id` (hapus) — guard requirePermission per resource, validasi format + duplikat, panggil invalidatePermissionCache (admin.js:270/315/350)
- Admin bisa create/edit/delete resource lewat API langsung (Postman/curl) kalau perlu manual sesekali
- Matrix UI (`RolePermissionMatrixPage.jsx`) sudah BISA tampilkan resource baru begitu dibuat (karena render dari DB, bukan hardcode)

## Yang Perlu Dibangun Nanti
- Form React sederhana di halaman admin: input nama resource + deskripsi → submit ke API yang sudah ada (POST/PUT/DELETE)
- Reuse pola matrix UI existing (RolePermissionMatrixPage) + komponen ui/ (ConfirmDialog dll) sesuai konvensi FE
- Tambahan test otomatis CRUD resource (termasuk cache invalidation) — digabung dengan test resource yg belum ada (lihat laporan fix-rbac-eksekusi.md gap 1)

## KONTEKS KEPUTUSAN
- Task 3 per-SPPG (Sppg/sppgId/multi-tenant) DIBATALKAN (sistem dipakai 1 instance per SPPG) — hanya ini yang relevan: role→resource→aksi 100% konfigurasi data
- UI form ini = satu-satunya gap tersisa supaya "admin atur akses tanpa developer sentuh kode" jadi penuh