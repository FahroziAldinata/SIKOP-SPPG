# AGENTS.md

Panduan ringkas untuk coding agent yang bekerja di repo **SIKOP-SPPG** (sistem keuangan & operasional SPPG MBG).

## Arsitektur (Monorepo)

- `backend/` — REST API Express 5 + Prisma + PostgreSQL + Zod v4 (CommonJS)
- `frontend/` — React 19 + Vite + HeroUI + TailwindCSS, komponen di `components/ui`
- `.agent-pm/` — knowledge, prompts, working state (jangan diubah tanpa instruksi)

## Struktur Folder Utama

- `backend/src/` — `routes/` (per domain: akuntan, aslap, gizi, laporan), `middleware/`, `validators/`, `lib/`, `templates/dokumen/`, `docs/`, `prisma/`
- `frontend/src/` — `components/` (ui, layout, akuntan, gizi, aslap, kepala), `pages/`, `lib/utils.js`, `context/`, `hooks/useApi.js`

## Perintah Penting

- Backend: `npm run dev` (node --watch), `npm test` (vitest), `npm run lint` (oxlint src)
- Frontend: `npm run dev` (vite), `npm run build` (vite build), `npm run lint` (oxlint)
- Migrasi: `npx prisma migrate dev` / `migrate deploy` via koneksi langsung port 5432 — JANGAN ke Supabase PgBouncer 6543

## Konvensi

- Validasi request: Zod via middleware `validate` di `backend/src/middleware/validate.js`
- PDF: puppeteer-core, template di `backend/src/templates/dokumen/`
- Format response: sukses `{ success: true, data }`, error `{ error: "<pesan>" }`
- Logging: Pino (`backend/src/lib/logger.js`), bukan `console.log`
- OpenAPI/Swagger: `backend/src/docs/openapi.js`, live di `/api-docs`
- FE: gunakan komponen terstandar di `components/ui` (NumberInput, DatePicker, Skeleton, ConfirmDialog); error via ToastContext

## Aturan

- JANGAN ubah format response error `{ error }` dan pola response REST API
- Test backend wajib di `src/routes/__tests__/` (Vitest + supertest) — jangan break 89 test
- Jangan commit secret (JWT_SECRET, DATABASE_URL) ke repo
- Indentasi 2 spasi; single quotes di JS logic, double quotes di JSX
