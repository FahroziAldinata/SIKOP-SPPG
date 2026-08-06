# Fase 4 — Dokumentasi Pengguna Akhir (v2, BERSIH hasil koreksi audit)

- Tanggal: 2026-08-07
- Ruang lingkup: ringkasan tanggung jawab, grant RBAC, menu sidebar, fitur, kerja utama, dan gap untuk 6 role — ASLAP, MITRA, AHLI_GIZI, AKUNTAN, KEPALA_SPPG, ADMIN.
- Status: DRAFT v2 — ditulis ulang dari nol (file v1 dianggap korup/mojibake, tidak dipakai).
- Sumber kebenaran: `backend/src/lib/rbacSeeder.js`, `frontend/src/App.jsx`, `frontend/src/components/layout/Layout.jsx`, `frontend/src/pages/akuntan/laporan/LaporanPage.jsx`.

---

## ASLAP

## Ringkasan Tanggung Jawab ASLAP

ASLAP menangani data master aslap (sekolah dan entitas master), input penerima manfaat, verifikasi/approval fisik PO, dan laporan aslap. Menjaga keakuratan data penerima manfaat dan kelancaran siklus persetujuan PO.

## Grant (rbacSeeder):

- `aslap-master: READ, CREATE, UPDATE, DELETE`
- `aslap-periode: READ`
- `aslap-input: READ, CREATE, UPDATE, DELETE`
- `aslap-laporan: READ, EXPORT`
- `aslap-po-approval: APPROVE`
- `gizi-master: READ`
- `gizi-menu: READ`
- `mitra-master: READ`
- `mitra-po: READ`
- `mitra-pemeriksaan: READ, CREATE`
- `laporan-bug: CREATE`

## Menu (urutan sidebar)

Urutan sidebar pada `Layout.jsx` — menu + path + `requiredPerm`:

1. Beranda / Dashboard — `/aslap` — `aslap-master:READ`
2. Sekolah — `/aslap/sekolah` — `aslap-master:READ`
3. Penerima Manfaat — `/aslap/penerima-manfaat` — `aslap-input:READ`
4. Verifikasi PO — `/aslap/po` — `aslap-po-approval:APPROVE`
5. Laporan — `/aslap/laporan` — `aslap-laporan:READ`

Catatan: tombol footer **Laporkan Bug** dan **Pengaturan Profil** (`/setting`) tampil untuk semua role dan tidak dihitung sebagai menu modul.

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan data aslap dan pembuka modul.
- **Sekolah**: mengelola master aslap (tambah/ubah/hapus sekolah dan data master lain).
- **Penerima Manfaat**: mengelola data penerima manfaat (tambah/ubah/hapus).
- **Verifikasi PO**: melakukan approval/konfirmasi tujuan fisik PO aslap (disk memakai hak APPROVE).
- **Laporan**: melihat dan mengekspor laporan aslap.

## Kerja Utama

- Input dan kelola data penerima manfaat serta master aslap.
- Melakukan verifikasi/approval PO dan memantau siklus penerimaan.
- Menyajikan laporan aslap untuk kebutuhan operasional.

## Gap (bila ada)

- ASLAP tidak memiliki akses ke resource akuntansi/jurnal/stok, sehingga tidak dapat melihat data keuangan.
- ASLAP tidak punya akses `audit-log`.
- ASLAP tidak termasuk penerima notifikasi lonceng (exclude).

---

## MITRA

## Ringkasan Tanggung Jawab MITRA

Mengelola master bahan & harga, pesanan pembelian (PO), pemeriksaan bahan, dan kendaraan. Mendukung realisasi belanja dan membaca data periode aslap.

## Grant (rbacSeeder):

- `mitra-master: READ, CREATE, UPDATE, DELETE`
- `mitra-po: READ, CREATE, UPDATE`
- `mitra-pemeriksaan: READ, CREATE`
- `aslap-periode: READ`
- `akuntan-master: READ`
- `audit-log: READ`
- `laporan-bug: CREATE`

## Menu (urutan sidebar)

1. Beranda / Dashboard — `/mitra` — `mitra-master:READ`
2. Harga Bahan — `/mitra/harga-bahan` — `mitra-master:READ`
3. Nota Pesanan (PO) — `/mitra/po` — `mitra-po:READ`
4. Kendaraan Operasional — `/mitra/kendaraan` — `mitra-master:READ`
5. Laporan — `/mitra/laporan` — `mitra-po:READ`
6. Audit Log — `/audit-log` — `audit-log:READ`

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan aktifitas mitra.
- **Harga Bahan**: mengelola daftar harga & bahan.
- **Nota Pesanan (PO)**: melihat nota pesanan pembelian.
- **Kendaraan Operasional**: mengelola data kendaraan operasional.
- **Laporan**: laporan sisi mitra.
- **Audit Log**: melihat riwayat audit (baca).

## Kerja Utama

- Mengelola master bahan/harga dan kendaraan.
- Membaca serta mengelola PO dan melakukan pemeriksaan bahan.
- Melakukan realisasi belanja (PUT `/api/mitra/po/:id/realisasi`).
- Membaca data periode untuk keperluan penjadwalan.

## Gap (bila ada)

- `POST /api/mitra/po` deprecated, mengembalikan **410**; pembuatan PO kini dialihkan ke Akuntan (`POST /api/akuntan/po`).
- MITRA tidak punya akses ke data akuntansi lain selain `akuntan-master:READ`.

---

## AHLI_GIZI

## Ringkasan Tanggung Jawab AHLI_GIZI

Mengoordinasikan master menu/gizi, target gizi, rencana & menu harian, serta laporan gizi.

## Grant (rbacSeeder):

- `gizi-master: READ, CREATE, UPDATE, DELETE`
- `gizi-target: READ, UPDATE`
- `gizi-menu: READ, CREATE, UPDATE, DELETE`
- `gizi-laporan: READ, EXPORT`
- `aslap-master: READ`
- `aslap-periode: READ`
- `aslap-input: READ`
- `aslap-laporan: READ, EXPORT`
- `mitra-master: READ`
- `laporan-bug: CREATE`

## Menu (urutan sidebar)

1. Beranda / Dashboard — `/gizi` — `gizi-master:READ`
2. Menu Harian — `/gizi/menu-harian` — `gizi-menu:READ`
3. Setup Gizi (Target) — `/gizi/target-gizi` — `gizi-target:READ`
4. Laporan Gizi — `/gizi/laporan-gizi` — `gizi-laporan:READ`

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan gizi.
- **Menu Harian**: menyusun rencana & menu harian.
- **Setup Gizi**: mengatur target gizi.
- **Laporan Gizi**: melihat dan mengekspor laporan gizi.

## Kerja Utama

- Menyusun menu harian dan rencana.
- Mengatur target gizi dan memantau pemenuhannya.
- Menghasilkan laporan pengelolaan gizi.

## Gap (bila ada)

- Tidak memiliki akses ke resource akuntansi/jurnal.
- Tidak memiliki akses `audit-log` maupun `admin-*`.

---

## AKUNTAN

## Ringkasan Tanggung Jawab AKUNTAN

Mengelola master akun, setup periode, jenis pekerjaan, RAB/anggaran harian, pembuatan PO, jurnal, stok & gudang, upah relawan, dan seluruh laporan keuangan/operasional.

## Grant (rbacSeeder):

- `akuntan-master: READ, CREATE, UPDATE, DELETE, APPROVE`
- `akuntan-akun: READ, CREATE, UPDATE, DELETE`
- `akuntan-jenis-pekerjaan: READ, CREATE, UPDATE, DELETE`
- `akuntan-rab: READ, CREATE, UPDATE, DELETE`
- `akuntan-jurnal: READ, CREATE, UPDATE, DELETE`
- `akuntan-stok: READ, CREATE, UPDATE, DELETE`
- `akuntan-upah: READ, CREATE, UPDATE, DELETE`
- `aslap-master: READ` | `aslap-periode: READ` | `aslap-input: READ` | `aslap-laporan: READ, EXPORT`
- `gizi-master: READ` | `gizi-menu: READ`
- `mitra-master: READ` | `mitra-po: READ, CREATE` | `mitra-pemeriksaan: READ, CREATE`
- `laporan-resmi: READ, CREATE, DELETE, EXPORT`
- `audit-log: READ`
- `laporan-bug: CREATE`

## Menu (urutan sidebar)

1. Beranda / Dashboard — `/akuntan` — `akuntan-master:READ` (header/sidebar atas, di luar area scroll)
2. Setup Periode — `/akuntan/laporan/periode-setup` — `akuntan-master:READ`
3. Jurnal Transaksi — `/akuntan/jurnal` — `akuntan-jurnal:READ`
4. Nota Pesanan (PO) — `/akuntan/po` — `mitra-po:READ`
5. Anggaran Harian — `/akuntan/anggaran-harian` — `akuntan-rab:READ`
6. Dokumen Resmi — `/akuntan/dokumen-resmi` — `laporan-resmi:READ`
7. Nominatif Upah — `/akuntan/nominatif-upah` — `akuntan-upah:READ`

Kelompok **Stok & Gudang**:
8. Input Saldo Awal — `/akuntan/saldo-awal-barang` — `akuntan-stok:READ`
9. Mutasi Stok — `/akuntan/mutasi-stok` — `akuntan-stok:READ`
10. Validasi Stok — `/akuntan/validasi-stok` — `akuntan-stok:READ`

Kelompok **Laporan**:
11. Laporan Keuangan — `/akuntan/laporan` — `laporan-resmi:READ`
12. Audit Log — `/audit-log` — `audit-log:READ`

Catatan: route laporan langsung (`/akuntan/laporan/stock-barang`, `/akuntan/laporan/kebutuhan-belanja-bahan`, `/akuntan/laporan/per-periode`, `/akuntan/laporan/per-bulan`, `/akuntan/laporan/harian`, `/akuntan/laporan/lra`, `/akuntan/laporan/lpd2m`, `/akuntan/laporan/bapsd`, `/akuntan/laporan/sptj`, `/akuntan/laporan/btt`) semua menuju `LaporanPage` dengan `laporan-resmi:READ` (App.jsx).

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan akuntansi.
- **Setup Periode**: mengatur periode pelaporan.
- **Jurnal Transaksi**: input dan kelola jurnal.
- **Nota Pesanan (PO)**: membuat PO sebagai akuntan (`POST /api/akuntan/po` → `akuntan-master CREATE`).
- **Anggaran Harian**: RAB & anggaran harian (`akuntan-rab`).
- **Dokumen Resmi**: kelola dokumen resmi (`laporan-resmi`).
- **Nominatif Upah**: kelola daftar upah relawan (`akuntan-upah`).
- **Input Saldo Awal, Mutasi Stok, Validasi Stok**: semua `akuntan-stok`.
- **Laporan Keuangan**: menyajikan BKU, BP, stock, LRA, LPD2M, BAPSD, SPTJ, BTT, LBBP, BKK, dan lainnya.

## Kerja Utama

- Mengelola master akun, setup periode, jenis pekerjaan.
- Menyusun jurnal, verifikasi stok, mutasi stok, dan validasi; serta mengelola upah.
- Membuat PO sebagai akuntan.
- Menghasilkan seluruh laporan keuangan/operasional.

## Gap (bila ada)

- `akuntan-akun` dan `akuntan-jenis-pekerjaan` dipisah dari `akuntan-master` (keputusan Rozi) — dilindungi terpisah.
- Nominatif memakai `akuntan-upah:READ`.
- Stok memakai `akuntan-stok:READ`.
- Route `/akuntan/rab-harian` tanpa menu sidebar; sidebar memakai `/akuntan/anggaran-harian`.

---

## KEPALA_SPPG

## Ringkasan Tanggung Jawab KEPALA_SPPG

Memberi approval keputusan (kepala-approval), memantau data pendukung dari tiap modul (aslap, gizi, mitra, akuntan), dan melihat laporan keuangan yang diizinkan.

## Grant (rbacSeeder):

- `kepala-approval: READ, CREATE, APPROVE`
- `aslap-master: READ` | `aslap-periode: READ` | `aslap-input: READ` | `aslap-laporan: READ, EXPORT`
- `gizi-master: READ` | `gizi-target: READ` | `gizi-menu: READ` | `gizi-laporan: READ, EXPORT`
- `mitra-master: READ` | `mitra-po: READ` | `mitra-pemeriksaan: READ`
- `akuntan-master: READ` | `akuntan-akun: READ` | `akuntan-jenis-pekerjaan: READ`
- `akuntan-rab: READ, APPROVE` | `akuntan-jurnal: READ` | `akuntan-upah: READ`
- `laporan-resmi: READ, CREATE, DELETE, EXPORT`
- `laporan-bug: CREATE`

## Menu (urutan sidebar)

1. Beranda / Dashboard — `/kepala` — `kepala-approval:READ`
2. Approval / Persetujuan — `/kepala/approval` — `kepala-approval:APPROVE`
3. Laporan Keuangan — `/akuntan/laporan` — `laporan-resmi:READ`

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan data untuk pimpinan.
- **Approval**: menyetujui/menolak keputusan yang membutuhkan persetujuan.
- **Laporan Keuangan**: melihat laporan via halaman akuntan dengan daftar laporan terbatas (lihat Gap).

## Kerja Utama

- Menyetujui atau menolak keputusan (approval).
- Memantau data aslap/gizi/mitra/akuntan (membaca).
- Melihat laporan keuangan yang diizinkan.

## Gap

- Laporan Kepala dibatasi hanya pada: **LPD2M, BKU, LRA, BAPSD, STOCK_BARANG, LBBP, BKK** — `allowedKepalaReports` (LaporanPage.jsx:34: `['LPD2M', 'BKU', 'LRA', 'BAPSD', 'STOCK_BARANG', 'LBBP', 'BKK']`). Di luar itu diarahkan ke `/akuntan/laporan`.
- Tidak memiliki akses `admin-user`, `admin-permission`, atau `audit-log`.

---

## ADMIN

## Ringkasan Tanggung Jawab ADMIN

Manajemen user, manajemen permission/akses, riwayat audit log, dan pengelolaan laporan bug.

## Grant (rbacSeeder):

- `admin-user: READ, CREATE, UPDATE, DELETE`
- `admin-permission: READ, CREATE, UPDATE, DELETE`
- `audit-log: READ`
- `laporan-bug: READ, CREATE, UPDATE`

## Menu (urutan sidebar)

1. Beranda / Dashboard — `/admin` — `admin-user:READ`
2. Kelola User — `/admin/users` — `admin-user:READ`
3. Kelola Akses & Permission — `/admin/permissions` — `admin-permission:READ`
4. Laporan Bug — `/admin/laporan-bug` — `laporan-bug:READ`
5. Audit Log — `/audit-log` — `audit-log:READ`

## Fitur per Menu

- **Beranda / Dashboard**: ringkasan admin.
- **Kelola User**: CRUD user.
- **Kelola Akses & Permission**: CRUD permission role/resource.
- **Laporan Bug**: melihat & mengelola laporan bug.
- **Audit Log**: melihat log aktivitas.

## Kerja Utama

- Mengatur akun user dan role.
- Mengelola matrix permission role/resource.
- Memantau audit log dan mengelola laporan bug.

## Gap

- ADMIN tidak memiliki akses ke resource modul operasional (akuntan/aslap/gizi/mitra) secara langsung.
- Tidak ada akses ke `akuntan-*`, `aslap-*`, `gizi-*` untuk ADMIN.

---

## Gap umum lintas role

1. **PO Mitra deprecated**: `POST /api/mitra/po` deprecated dan mengembalikan **410** (mitra.js:673) — proses pembuatan/pembentukan PO dialihkan ke Akuntan (`POST /api/akuntan/po`). MITRA tetap dapat membaca (READ) dan realisasi (UPDATE), serta `GET` `PO`-nya.

2. **`/akuntan/rab-harian` tanpa menu sidebar**: route `/akuntan/rab-harian` ada di App.jsx tapi tidak ada link di sidebar; menu sidebar memakai `/akuntan/anggaran-harian` (label "Anggaran Harian").

3. **Bell notifikasi**: 5 role — `AKUNTAN, AHLI_GIZI, KEPALA_SPPG, ADMIN, MITRA` — mendapat ikon lonceng; **ASLAP di-exclude**. Referensi Layout.jsx: baris **77** (fetch), **125** (polling), **317** (render). Baris 191 adalah `PAGE_TITLES`, bukan lonceng.

4. **Resource benar `audit-log`** (jangan dikira sebagai varian dengan akhiran "-logger"). Dipakai READ pada MITRA, AKUNTAN, ADMIN; KEPALA_SPPG dan AHLI_GIZI tidak punya akses.

5. **Permit akurat**: Nominatif `/akuntan/nominatif-upah` → `akuntan-upah:READ`; Stok (`/akuntan/saldo-awal-barang`, `/akuntan/mutasi-stok`, `/akuntan/validasi-stok`) → `akuntan-stok:READ` (jangan ditulis sebagai varian salah pada segmen nama resource upah/stok).

## Catatan proses

- Draft v2 ditulis ulang dari nol; file v1 tidak dibaca/dipakai.
- Data grant diambil langsung dari `RBAC_ROLE_PERMISSIONS` & `RBAC_RESOURCES` (`rbacSeeder.js`).
- Daftar menu & `requiredPerm` dari `App.jsx` dan urutan `Layout.jsx`.
- Daftar laporan Kepala dari `LaporanPage.jsx:34`.
- Klaim 3 poin (PO Mitra 410 deprecated, `/akuntan/rab-harian` tanpa menu sidebar, bell exclude ASLAP) diverifikasi terhadap sumber di atas.