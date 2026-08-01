# 03. Architecture

## Struktur Repository & Folder

```
Sistem_SPPG/
├── .agents/                          ← AI agent skills (cavecrew, dll)
├── .ai-context/                      ← Dokumentasi proyek & TODO aktif
├── backend/                          ← Backend Node.js + Express
│   ├── .env / .env.production
│   ├── index.js                      ← Entry point
│   ├── nixpacks.toml                 ← Build config Railway
│   ├── prisma/
│   │   ├── schema.prisma             ← Schema utama (38+ model)
│   │   ├── seed.js / clear-db.js
│   │   └── migrations/               ← 15 migration files
│   └── src/
│       ├── app.js                    ← Express app setup
│       ├── lib/
│       │   ├── prisma.js             ← Singleton Prisma Client
│       │   └── porsiHelper.js        ← Helper kalkulasi porsi
│       ├── middleware/
│       │   └── auth.js               ← requireAuth + requireRole
│       ├── routes/                   ← Flat router files
│       │   ├── admin.js, akuntan.js, aslap.js, auth.js, dashboard.js,
│       │   │   gizi.js, kepala.js, laporan.js, laporanBug.js, mitra.js, notifikasi.js
│       └── templates/dokumen/        ← HTML string templates untuk PDF Puppeteer
│           ├── shared.js, bku.js, bp.js, catatan.js, lpa.js, sptj.js, bapsd.js, laporanHarian.js
└── frontend/                         ← Frontend React + Vite
    ├── index.html, vercel.json, vite.config.js, tailwind.config.js
    └── src/
        ├── App.jsx, main.jsx, index.css
        ├── context/ (AuthContext.jsx, ToastContext.jsx)
        ├── hooks/ (useApi.js)
        ├── styles/ (tokens.css)
        ├── components/ (Layout.jsx, NominatifUpahGrid.jsx, Dropdown.jsx, DatePicker.jsx, NumberInput.jsx, Skeleton.jsx, ConfirmDialog.jsx, StatusBadge.jsx, Table.jsx, Toast.jsx, WorkflowStepper.jsx, dll)
        └── pages/ (admin/, akuntan/, aslap/, auth/, gizi/, kepala/, mitra/, shared/)
```

## Pola Routing & Arsitektur Backend
- **Monolith — Flat Route Architecture**: Tidak menggunakan Service Layer, Repository Pattern, Clean Architecture, atau Controller terpisah. Semua logika bisnis, query Prisma, validasi, dan response formatting ditulis inline di file `src/routes/*.js`.
- **Naming & Route Prefix**: Route backend menggunakan `kebab-case` atau `/` modular (`/api/auth`, `/api/aslap`, `/api/mitra`, `/api/gizi`, `/api/akuntan`, `/api/kepala`, `/api/admin`, `/api/laporan`, `/api/dashboard`, `/api/notifikasi`, `/api/laporan-bug`).
- **Response Standard**:
  - Sukses: `{ success: true, data: <payload> }`
  - Error: `{ error: "<pesan>" }` dengan HTTP status 400, 401, 403, 404, 409, 410, 500.
  - PDF: Binary (`Content-Type: application/pdf`) via Puppeteer.

## Pola Frontend & Routing
- **React SPA** dengan React Router DOM v6.
- **Role-Based Routing**: `ProtectedRoute` membungkus halaman dengan prop `allowedRoles`.
- **Co-located State**: State halaman dikelola internal komponen halaman masing-masing (kecuali Auth & Toast yang global).
- **HTTP Client**: Hook `useApi` membungkus native `fetch`, menyisipkan token `Authorization: Bearer`, dan otomatis logout pada response 401.

## Auth Flow
1. **Login**: Client kirim credentials ke `POST /api/auth/login` → Backend memverifikasi password hash (`bcryptjs`) → mengembalikan JWT token dan payload user.
2. **State Storage**: Client menyimpan token dan data user di `AuthContext` / `localStorage`.
3. **Request Authentication**: Setiap API call via `useApi` menyisipkan header `Authorization: Bearer <token>`.
4. **Middleware Verification (`middleware/auth.js`)**:
   - `requireAuth`: Memverifikasi JWT `jsonwebtoken`, memeriksa status `aktif` user di database, lalu menginjeksi `req.user`.
   - `requireRole(...roles)`: Memeriksa apakah `req.user.role` sesuai dengan role yang diizinkan.
5. **PDF Authentication**: Karena `window.open` tidak dapat menyisipkan header `Authorization`, frontend melakukan `fetch` ke endpoint PDF dengan header Auth → mengonversi response ke Binary Blob → membuat ObjectURL (`URL.createObjectURL`) → menampilkan di modal `<iframe>`. ObjectURL di-revoke setelah 30 detik.

## Key Design & Calculation Patterns
- **`recalcAktualAnggaran`**: Dipanggil dalam transaksi yang sama saat mutasi `JurnalTransaksi` untuk mengupdate `AnggaranHarian.aktual`.
- **`normalizeDateUTC`**: Normalisasi string `"YYYY-MM-DD"` ke UTC midnight mencegah drift timezone client-database.
- **Fallback Harga (`getHargaBahan`)**: Mengambil harga bahan periode aktif, fallback ke harga periode sebelumnya jika belum diisi, menyertakan flag `isFallback: true`.
- **Find-or-Create**: Menggunakan `findFirst` terlebih dahulu lalu `create` (menghindari `create-catch(P2002)` yang membatalkan transaksi Postgres).
- **Row-Level Locking**: Menggunakan `$queryRaw\`SELECT ... FOR UPDATE\`` untuk transaksi konkuren kritis (approval, validasi hari aktif, inisiasi PO).
- **State Machine Status**:
  - `MenuHarian` & `RabHarian`: DRAFT → DIAJUKAN → DISETUJUI | DITOLAK
  - `TransaksiPembelian (PO)`: DIAJUKAN → DIREALISASI → DITERIMA
