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

## Cara Menambah Halaman Baru

Router di `frontend/src/App.jsx` (React Router `BrowserRouter` + `Routes`/`Route`, bukan `createBrowserRouter`). Semua route halaman berada di dalam satu root `<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>`, lalu route per halaman adalah anak dengan pola:

```jsx
<Route
  path="aslap/penerima-manfaat"
  element={
    <ProtectedRoute allowedRoles={['ASLAP']}>
      <PenerimaManfaatPage />
    </ProtectedRoute>
  }
/>
```

Ikuti langkah berikut saat menambah halaman baru:

1. **Buat file di `frontend/src/pages/<domain>/NamaHalaman.jsx`** — ikuti pola halaman existing di folder domain (mis. `pages/aslap/`, `pages/gizi/`, `pages/akuntan/`).
2. **Pecah logic besar ke `frontend/src/components/<domain>/`** — mengikuti pola restrukturisasi V2-3: `components/ui/`, `components/layout/`, dan folder domain terpisah (`components/akuntan/`, `components/gizi/`, `components/aslap/`, `components/kepala/`).
3. **Gunakan komponen dari `frontend/src/components/ui/` SEBELUM membuat komponen baru** (HeroUI/komponen custom) — reuse dulu (mis. `NumberInput`, `DatePicker`, `Skeleton`, `ConfirmDialog`, `Table`, `StatusBadge`).
4. **Panggil API melalui `frontend/src/hooks/useApi.js`** (BUKAN fetch/axios langsung) — catatan: `useApi` auto-prefix `/api` dari `VITE_API_URL`, jadi jangan tulis `/api/...` dua kali di URL.
5. **Daftarkan route pada file `frontend/src/App.jsx`** — tambahkan import halaman + `<Route path="..." element={...} />` di dalam root `<Route>`.
6. **Bungkus dengan `ProtectedRoute` + role yang sesuai** kalau halaman butuh proteksi role (`allowedRoles={['ROLE']}`), mengikuti pola existing di `frontend/src/App.jsx`.
