# AGENTS.md (Backend)

Panduan khusus untuk coding agent di `backend/` — REST API SIKOP-SPPG (Express 5 + Prisma + PostgreSQL + Zod v4, CommonJS).

## Struktur `src/`

- `routes/` — router per domain: `auth.js`, `admin.js`, `kepala.js`, `mitra.js`, `dashboard.js`, `notifikasi.js`, dan folder modular `akuntan/`, `aslap/`, `gizi/`, `laporan/` (tiap folder punya `index.js` + file per fitur + `_helpers.js`)
- `middleware/` — `auth.js` (requireAuth, requireRole), `validate.js`, `errorHandler.js` (global error handler)
- `validators/` — schema Zod per domain (`akuntan.js`, `aslap.js`, `gizi.js`, `laporan.js`, `mitra.js`)
- `lib/` — `prisma.js`, `logger.js` (Pino), `launchPuppeteer.js`, `exportExcel.js`, helper akuntansi/audit
- `templates/dokumen/` — template PDF (puppeteer-core) per laporan/dokumen
- `docs/` — `openapi.js` (Swagger dari schema Zod, live di `/api-docs`)
- `prisma/` — `schema.prisma`, `migrations/`, `seed.js`

## Pola Route

- Router Express per domain: `const router = express.Router()` + `module.exports = router`
- Proteksi: `requireAuth` (semua), lalu `requireRole('ASLAP', 'MITRA', 'AHLI_GIZI', 'AKUNTAN', 'KEPALA_SPPG', 'ADMIN')` — role valid LENGKAP sesuai enum `Role` di `prisma/schema.prisma`
- Validasi body: `validate(schema)` dari `middleware/validate.js` (Zod, error → 400 `{ error }`)
- Mount di `src/app.js` dengan prefix `/api/<domain>`

## Cara Menambah Endpoint Baru

Ikuti 5 langkah berikut saat menambah endpoint API baru di backend:

1. **Buat/extend schema Zod** di `backend/src/validators/<domain>.js` — ikuti pola schema yang sudah ada di file validators domain tersebut (mis. `akuntan.js`, `aslap.js`, `gizi.js`, `laporan.js`, `mitra.js`).
2. **Buat route handler** di file route domain yang sesuai (`backend/src/routes/`), pakai `requireAuth + requireRole(...) + validate(schema)` — ikuti pola `backend/src/middleware/auth.js` + `backend/src/middleware/validate.js`.
3. **Registrasikan endpoint di `backend/src/docs/openapi.js`** (WAJIB — kalau tidak, endpoint tidak muncul di Swagger `/api-docs`).
4. **Tambahkan test** di `backend/src/routes/__tests__/` — pola supertest + `const { app } = require('../../app')`.
5. **Jalankan `cd backend && npm test`** → pastikan seluruh 89+ test lama tetap PASS (`fileParallelism: false` — jangan ubah test existing).

## Pola Test

- Framework: Vitest + supertest, lokasi wajib `src/routes/__tests__/`
- `vitest.config.js`: `fileParallelism: false`, `testTimeout: 20000` — JANGAN diubah
- Jangan break 89 test yang sudah ada; test membutuhkan DB PostgreSQL + JWT_SECRET + Google Chrome (PDF)

## Prisma & Migration

- `schema.prisma` di `backend/prisma/`; regenerasi client wajib `npx prisma generate` tiap ganti schema
- Migrasi HANYA lewat koneksi langsung port 5432 (JANGAN PgBouncer 6543)
- Seeder: `prisma/seed.js`; mutasi multi-tabel wajib `prisma.$transaction(...)`; pola find-or-create (findFirst → create), jangan create-catch(P2002)

## Environment (`backend/.env`)

- Wajib: `DATABASE_URL`, `JWT_SECRET`, `PUPPETEER_EXECUTABLE_PATH` (untuk PDF)
- Opsional: `PORT` (default 3000), `NODE_ENV`, `ALLOWED_ORIGINS`, `TEST_PASSWORD`
- Referensi: `backend/.env.example` — jangan commit `.env`

## Lint

- `npm run lint` → `oxlint src` (target 0 warning / 0 error)
- Test: `npm test` (vitest run), dev: `npm run dev` (`node --watch index.js`)

## Aturan

- Format response REST API: sukses `{ success: true, data }`, error `{ error: "<pesan>" }` — JANGAN diubah
- Logging via `lib/logger.js` (Pino), bukan `console.log`
- Indentasi 2 spasi; single quotes di JS logic
