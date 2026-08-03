# AGENTS.md (Frontend)

Panduan khusus untuk coding agent di `frontend/` — SIKOP-SPPG (React 19 + Vite + HeroUI + TailwindCSS, file `.jsx`).

## Struktur `src/`

- `components/ui/` — komponen primitif terstandar: `Button`, `Card`, `Table`, `NumberInput`, `DatePicker`, `Skeleton`, `ConfirmDialog`, `Toast`, `StatusBadge`, `WorkflowStepper`, `NotifikasiList`, dll
- `components/layout/` — `Layout.jsx`, `ProtectedRoute.jsx`
- `components/akuntan/`, `components/gizi/`, `components/aslap/`, `components/kepala/` — komponen modular per domain (hasil pecah dari halaman besar)
- `pages/` — halaman per domain (`akuntan/`, `gizi/`, `aslap/`, `kepala/`, `admin/`, `mitra/`, `auth/`, `shared/`)
- `lib/utils.js` — util bersama (format rupiah, tanggal, dsb; ada `utils.test.js`)
- `context/` — `AuthContext.jsx`, `ToastContext.jsx`
- `hooks/useApi.js` — client fetch dengan token JWT + auto-prefix base `/api` (dari `VITE_API_URL`)

## Konvensi

- **Kolom Table**: alignment center/left untuk nilai & header, sesuai konten
- **API**: `useApi().request` mengirim `Authorization: Bearer <token>` otomatis; 401 → logout + redirect login
- **PDF preview**: buka via modal dengan blob + `iframe` (dari response PDF), bukan unduh langsung
- **Error**: pakai `ToastContext` (`showToast(msg, 'error')`) untuk feedback aksi; error inline hanya untuk validasi form di tempat
- **Komponen**: gunakan `NumberInput` (rupiah), `DatePicker` (tanggal), `Skeleton` (loading), `ConfirmDialog` (konfirmasi) — jangan `window.confirm`
- **State**: `useState` lokal per halaman; state global hanya AuthContext & ToastContext
- **Quotes**: double quotes di JSX, single quotes di JS logic; indentasi 2 spasi

## Perintah

- Dev: `npm run dev` (vite)
- Build: `npm run build` (vite build)
- Lint: `npm run lint` (oxlint)
- Test: `npm test` (vitest)
- Vite proxy dev: `/api` dan `/uploads` → `http://localhost:3000`

## Aturan

- Jangan import komponen langsung dari node_modules HeroUI bila sudah ada wrapper di `components/ui/`
- Jangan ubah `lib/utils.js` tanpa menyesuaikan `utils.test.js`
