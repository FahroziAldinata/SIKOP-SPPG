# LAPORAN — Isolasi Test dari Data Seed Nyata (GF-013 + T2-Refactor Gabungan)

**Tanggal**: 2026-08-12
**Status**: SELESAI — verifikasi penuh lulus (3x run PASS, 0 flaky, user seed utuh, SystemConfig utuh, lint 0 error)
**Eksekutor verifikasi**: OpenCode (deepseek-v4-flash-free) — proses `proc_23aabac9e853`
**Edit di disk**: AGY gemini-3.6-flash-medium (2 sesi, diedit sebelum timeout — diverifikasi & final di laporan ini)

---

## Ringkasan Eksekutif

5 file test yang dimutasi data seed nyata telah direfactor memakai pola **user test buatan sendiri** (`beforeAll` create, `afterAll` delete by ID, username unik, bcrypt cost **12**). Mitigasi **backup + restore SystemConfig** di `chat.test.js` dan `chat-tools.test.js` **utuh**. Verifikasi:

- **3x run suite** (normal, normal, shuffle): **48 file / 673 test, SEMUA PASS — 0 flaky, 0 PrismaError** (verbatim di bawah).
- **User seed** (admin, aslap, mitra, akuntan, ahligizi, kepalasppg): `bcrypt.compare('ganti-password-ini') = true`, `getRounds = 12`, `tokenVersion` **identik sebelum vs sesudah** — suite sama sekali tidak menyentuh user seed.
- **SystemConfig id 'system'**: utuh setelah suite (backup+restore bekerja; nilai `provider=google`, `apiKeyEncrypted=default_seed_key`, `model=gemini-2.5-flash`).
- **0 user test tersisa** di DB (`Leftover test users: 0`).
- **Lint**: 0 error (4 warning pre-existing di file coverage yang TIDAK disentuh task ini).
- **Temuan terpisah — `backend/prisma/seed.js` modified DI LUAR scope plan** (analisis lengkap di bawah). **TIDAK di-revert** — keputusan milik Rozi.

---

## TASK 1 — Inventarisasi Test yang Menyentuh Data Seed

Metode: grep seluruh `backend/src/routes/__tests__/*.test.js` untuk pola mutasi (`user.update`, `user.delete`, `chatLog.deleteMany`, `systemConfig.deleteMany`, `passwordHash`) + audit manual per file.

### Mutasi TINGGI (mengubah kredensial/config kerja sehari-hari) — SEMUA SUDAH DIPERBAIKI

| File | Sebelum (risiko) | Sesudah (isolasi) |
|---|---|---|
| `token-version.test.js` | Login `aslap` seed; afterAll tulis `hash(TEST_PASSWORD, **10**)` + reset tokenVersion ke user seed → **menurunkan cost 12→10** | User sendiri `test-tokenver-${Date.now()}` (ASLAP), cost 12; cleanup by ID (auditLog + chatLog + user) |
| `admin-reset-password.test.js` | Reset password user `mitra` seed; afterAll tulis `hash(..., 10)` → **mutasi password seed permanen-ish** | User sendiri `test-adminreset-${Date.now()}` (MITRA), cost 12; admin seed dipakai read-only (login) |
| `chat.test.js` | `deleteMany chatLog by userId` user seed + SystemConfig tanpa jaminan restore | 3 user test terisolasi (ADMIN/ASLAP/AKUNTAN) cost 12; cleanup by `createdUserIds`; **backup+restore SystemConfig utuh** |
| `chat-tools.test.js` | 6 user seed dipakai untuk ChatLog tool-call → polusi riwayat chat asli | 6 user test terisolasi (semua role) cost 12; cleanup by `createdUserIds`; backup+restore SystemConfig utuh |
| `chat-retensi.test.js` | `prisma.user.findFirst()` → mengambil user pertama di DB (bisa user seed nyata); create dengan field `namaLengkap` (salah) | User sendiri `test-retensi-${Date.now()}` (ADMIN, field `nama` benar); delete by ID |

### Mutasi SEDANG (risiko residual, PRE-EXISTING — bukan scope edit AGY, dilaporkan untuk info)

- `coverage2-auth.test.js` — login `ahligizi` seed, upload TTD → menulis `ttdPath` ke user seed, lalu `afterAll` mengembalikan `ttdPath: null` + hapus file. **Self-healing** tapi tetap mutasi sesaat field user seed. Di luar 5 file scope; disarankan dijadikan follow-up (gunakan user test sendiri atau lewati endpoint TTD).
- `chat-retensi.test.js` (pre-existing) — `hapusChatLogKadaluarsa(30)` menghapus **SEMUA** ChatLog > 30 hari (tanpa filter user). Saat ini DB dev bersih (ChatLog total 0) sehingga aman, tapi kalau riwayat chat asli sudah ada > 30 hari, test ini akan menghapusnya. Disarankan follow-up: buat ChatLog test dengan `createdAt` lama lalu batasi fungsi atau panggil via transaksi yang bisa di-rollback.

### RENDAH (baca-saja, dibiarkan)

~40 file test lain (`approval`, `audit-log*`, `coverage*`, `rbac-*`, `smoke-modul`, dll.) login memakai user seed **hanya untuk mendapat token**, tanpa menulis ke user seed. Terbukti aman: `tokenVersion` seed identik sebelum vs sesudah suite.

---

## TASK 2 + 3 — Bukti Sebelum/Sesudah per File

Semua 5 file memenuhi prinsip: **user test sendiri (create beforeAll, delete afterAll, username unik), cost bcrypt 12 (bukan 10), cleanup by ID spesifik (BUKAN deleteMany by userId user seed), mitigasi backup+restore SystemConfig di chat.test.js MASIH ADA dan utuh.**

Audit ulang diff oleh OpenCode — TIDAK ditemukan pelanggaran prinsip, **tidak ada perbaikan tambahan yang diperlukan**.

Bukti perilaku setelah suite (dari DB):

```
Leftover test users: 0 []
SystemConfig after: {
  id: 'system',
  provider: 'google',
  apiKeyEncrypted: 'default_seed_key',
  baseUrl: null,
  model: 'gemini-2.5-flash',
  createdAt: 2026-08-12T07:03:36.458Z,
  updatedAt: 2026-08-12T07:03:36.458Z
}
ChatLog total: 0
```

- 0 user `test-*` tersisa → cleanup by ID bekerja penuh di seluruh 5 file.
- SystemConfig `system` kembali ke nilai aslinya (provider google / default_seed_key) → backup+restore berfungsi (nilai ini berasal dari seed, bukan data test).
- ChatLog total 0 → tidak ada polusi riwayat chat dari suite.

---

## TASK 5 — Hasil Verifikasi 3x Run (VERBATIM)

Semua run dari `backend/`:

### Run #1 — `npm test` (normal)

```
> vitest run
 RUN  v4.1.10 D:/Project/Sistem/Sistem_SPPG/backend
 Test Files  48 passed (48)
      Tests  673 passed (673)
   Start at  14:46:19
   Duration  197.17s (transform 433ms, setup 634ms, import 56.12s, tests 128.83s, environment 6ms)
```

### Run #2 — `npm test` (normal, ulang)

```
> vitest run
 RUN  v4.1.10 D:/Project/Sistem/Sistem_SPPG/backend
 Test Files  48 passed (48)
      Tests  673 passed (673)
   Start at  14:49:43
   Duration  191.18s (transform 466ms, setup 655ms, import 57.30s, tests 122.14s, environment 7ms)
```

### Run #3 — `npx vitest run --sequence.shuffle.files`

```
 RUN  v4.1.10 D:/Project/Sistem/Sistem_SPPG/backend
      Running tests with seed "1786521179936"
 Test Files  48 passed (48)
      Tests  673 passed (673)
   Start at  14:52:59
   Duration  188.78s (transform 419ms, setup 581ms, import 55.55s, tests 122.14s, environment 6ms)
```

**Kesimpulan**: konsisten PASS 48 file / 673 test, 0 flaky, 0 PrismaError.

---

## TASK 5 — Status User Seed Sebelum/Sesudah (VERBATIM)

Script: `node backend/scripts/verify-seed-users.js` (untracked, dibuat AGY — script verifikasi sah, dipertahankan).

### SEBELUM suite

```
=== USER SEED VERIFICATION ===
admin: passMatch=true, rounds=12, tokenVer=13
aslap: passMatch=true, rounds=12, tokenVer=0
mitra: passMatch=true, rounds=12, tokenVer=0
akuntan: passMatch=true, rounds=12, tokenVer=8
ahligizi: passMatch=true, rounds=12, tokenVer=2
kepalasppg: passMatch=true, rounds=12, tokenVer=3
=== SYSTEM CONFIG VERIFICATION ===
SystemConfig exists: true provider=google
```

### SESUDAH suite

```
=== USER SEED VERIFICATION ===
admin: passMatch=true, rounds=12, tokenVer=13
aslap: passMatch=true, rounds=12, tokenVer=0
mitra: passMatch=true, rounds=12, tokenVer=0
akuntan: passMatch=true, rounds=12, tokenVer=8
ahligizi: passMatch=true, rounds=12, tokenVer=2
kepalasppg: passMatch=true, rounds=12, tokenVer=3
=== SYSTEM CONFIG VERIFICATION ===
SystemConfig exists: true provider=google
```

**Identik** — 6/6 seed user `passMatch=true`, `rounds=12`, `tokenVersion` tidak berubah satu pun. Ini bukti login test TIDAK menaikkan tokenVersion (login read-only), dan tidak ada lagi test yang menulis cost 10 / reset tokenVersion ke user seed.

## TASK 5 — Lint

```
> oxlint src
src/routes/__tests__/coverage-rabP12-pdf.test.js:5:7: warning eslint(no-unused-vars): Variable 'TEST_PASSWORD' is declared but never used. ...
src/routes/__tests__/coverage3-laporan-pdf.test.js:5:7: warning eslint(no-unused-vars): Variable 'TEST_PASSWORD' is declared but never used. ...
src/routes/__tests__/coverage3-giziLaporan.test.js:5:7: warning eslint(no-unused-vars): Variable 'TEST_PASSWORD' is declared but never used. ...
src/routes/__tests__/coverage-mitra.test.js:5:7: warning eslint(no-unused-vars): Variable 'TEST_PASSWORD' is declared but never used. ...
```

**0 error.** 4 warning pre-existing di file coverage yang TIDAK disentuh task ini (tidak diperbaiki karena di luar scope; bisa di-follow-up).

---

## Temuan Terpisah — `backend/prisma/seed.js` Modified (DI LUAR SCOPE PLAN)

**TIDAK di-revert — keputusan milik Rozi.** (Dilarang revert tanpa instruksi Rozi.)

### Isi perubahan (14 baris, di akhir `main()`)

```js
// 7. SYSTEM CONFIG — default record 'system' untuk chatbot
await prisma.systemConfig.upsert({
  where: { id: "system" },
  update: {},
  create: {
    id: "system",
    provider: "google",
    apiKeyEncrypted: "default_seed_key",
    model: "gemini-2.5-flash",
  },
});
```

### Analisis

1. **TIDAK mengubah perilaku seeder user** — blok user (section 6) tetap `upsert({ update: {} })`, default password masih `bcrypt.hash("ganti-password-ini", 12)`. Hash cost tidak berubah (tetap 12). Tidak ada user data yang diubah.
2. **Aman untuk DB yang sudah ada** — `upsert({ update: {} })` hanya create jika `id='system'` belum ada; tidak menimpa config produksi yang sudah terpasang. `update: {}` = record existing dibiarkan.
3. **Efek pada fresh seed** — DB baru akan dapat `SystemConfig` id `system` berisi **API key PALSU** (`default_seed_key`, provider google, model gemini-2.5-flash). Akibatnya chatbot di lingkungan fresh **tampak terkonfigurasi** tapi key-nya invalid → chat baru error di runtime sampai admin set key asli via `POST /api/chat/api-key`. Sebelum perubahan ini, fresh DB tanpa config akan mengembalikan 400 `API key belum diatur, hubungi admin` yang lebih jelas. Ini perubahan perilaku seeder — perlu keputusan Rozi (fake key vs tidak seed sama sekali).
4. **Kopling dengan script verifikasi** — `backend/scripts/verify-seed-users.js` (untracked, dibuat sesi AGY yang sama) **mensyaratkan `SystemConfig` id `system` harus ada** (`if (!allValid || !sysConfig) process.exit(1)`). Ada indikasi perubahan seed.js dibuat supaya script verifikasi lulus. Ini pelebaran tanggung jawab script (nama/deskripsi: "verify seed users") — disarankan Rozi tinjau: (a) terima perubahan seed.js + pertahankan script, (b) revert seed.js & longgarkan cek systemConfig di script, atau (c) pisah script verifikasi SystemConfig.
5. **Risiko keamanan**: `apiKeyEncrypted: "default_seed_key"` bukan rahasia — tidak berbahaya sebagai placeholder, tapi jika fresh prod di-seed tanpa sadar (guard `NODE_ENV=production` tetap mencegah tanpa `ALLOW_PROD_SEED=true`/`--force`), chatbot akan pakai key invalid, bukan key bocor. Tidak ada secret yang bocor.

### Rekomendasi ke Rozi
- Pilih opsi 1-3 pada poin 4 (keputusan bisnis).
- Jika seed.js dipertahankan: dokumentasikan bahwa fresh DB harus `POST /api/chat/api-key` dengan key asli sebelum chatbot dipakai.
- Jika di-revert: pastikan `verify-seed-users.js` tetap bisa dipakai (buat cek systemConfig opsional).

---

## TASK 4 — Evaluasi Isolasi DB Test (GF-013)

### Keputusan: TIDAK diimplementasikan — direkomendasikan sebagai task terpisah.

Alasan — setup TIDAK straightforward, effort besar:

1. **Butuh DB Postgres kedua** — tidak ada `docker-compose`, `.env.test`, maupun CI config di repo. Developer harus create DB baru manual (mis. `sikop_sppg_test`) + `.env.test`.
2. **Seed otomatis berat** — `npm run seed` (`backend/prisma/seed.js`) tidak hanya referensi; defaultnya menjalankan `main()` + `seedRbacPermissions` + **`seedTransaksi()`** yang membangun data transaksional besar (periode 2026, MenuHarian 28 hari, RAB, PO, Jurnal, Stok, Upah, DokumenResmi) dengan hardcode tanggal 2026. Test coverage (`coverage-rabHarian`, `coverage-rabP12-pdf`, dll.) **bergantung pada data seed transaksional ini**. Test DB baru harus di-seed penuh sebelum tiap suite → menambah waktu signifikan (seed ± menit, di atas 190s suite).
3. **Wiring env rapuh** — PrismaClient membaca `DATABASE_URL` saat proses start; `setup.js` (`src/test/setup.js`) dan `app.js` memanggil `dotenv.config()` (tidak override env existing). Perlu mekanisme `.env.test` yang konsisten di semua entry point + memastikan 48 file test tidak kehilangan env (risiko break 673 test).
4. **Asumsi data tertentu** — beberapa test mengecek nilai/keberadaan data seed spesifik; pindah DB baru berisiko beda hasil bila seed tidak identik.

### Rekomendasi + estimasi

- **Rekomendasi**: tunda. Isolasi level test (Task 1-3) sudah menghilangkan mutasi data seed — risiko utama GF-013 berkurang drastis. Kerjakan DB test terpisah di sesi khusus.
- **Approach yang disarankan** (jika dikerjakan): `.env.test` + `DATABASE_URL` kedua → script `test:db:setup` (drop+create+`prisma db push`+seed) → `vitest run` dengan `NODE_ENV=test` → dokumentasi setup di README/AGENTS.
- **Estimasi effort**: ± 1 hari kerja penuh (setup env + seed otomatis + debug 48 file test terhadap DB baru + dokumentasi). Bukan perubahan 1-2 jam.

---

## Ringkasan Akhir

| Item | Status |
|---|---|
| 5 file test direfactor isolasi user | ✅ SELESAI (prinsip terpenuhi, tidak ada perbaikan tambahan) |
| Mitigasi SystemConfig backup+restore (chat.test.js & chat-tools.test.js) | ✅ UTUH |
| Suite 3x (normal ×2 + shuffle) | ✅ PASS 48 file / 673 test, 0 flaky, 0 PrismaError |
| User seed sebelum/sesudah | ✅ Identik (match true, rounds 12, tokenVersion sama) |
| SystemConfig setelah suite | ✅ Utuh (backup+restore bekerja) |
| User test tersisa di DB | ✅ 0 |
| Lint backend | ✅ 0 error (4 warning pre-existing di file lain) |
| seed.js di luar scope | ⚠️ TEMUAN — dianalisis, TIDAK di-revert (keputusan Rozi) |
| Task 4 DB test terpisah | ⏸️ Direkomendasikan ditunda (effort besar) + estimasi |
| Commit | 🚫 TIDAK ADA commit / reset / restore / checkout / stash dilakukan |
