# 05. Coding Standards & Conventions

## Aturan Format & Styling Code
- **Indentasi**: 2 spasi (standard JavaScript/React).
- **Naming Conventions**:
  - Variable & Function: `camelCase` (contoh: `recalcAktualAnggaran`, `handleAjukanMenu`).
  - React Component: `PascalCase` (contoh: `MenuHarianPage`, `WorkflowStepper`).
  - Route Backend: `kebab-case` atau `/` modular (contoh: `/menu-harian`, `/daftar-nominatif`).
  - Model Database / Prisma: `PascalCase` (contoh: `JurnalTransaksi`, `MenuHarianBlok`).
  - Kolom Database: `camelCase` (contoh: `beratKotorGr`, `isFallback`).
- **Quotes**: Single quotes (`'`) di JavaScript logic; Double quotes (`"`) di JSX code.

## Aturan Eksekusi Environment & Terminal
- **PowerShell / Terminal**: Pengembangan backend dan frontend dijalankan dari terminal melalui PowerShell (`cd backend` → `npm run dev`, `cd frontend` → `npm run dev`).
- **Keterbatasan Backend Watch Mode (`node --watch`)**: `node --watch` tidak me-reload middleware atau file `.env` secara otomatis jika ada perubahan pada file konfigurasi atau `middleware/auth.js` / `src/app.js`.
- **Manual Backend Restart**: Setelah mengedit file `.env`, `middleware/auth.js`, atau `src/app.js`, backend wajib di-restart secara manual (kill proses Node.js dengan Ctrl+C / Task Manager lalu jalankan ulang `npm run dev`).

## Aturan Database & Migration
- **Koneksi Migrasi**: `prisma migrate dev` dan `prisma migrate deploy` DILARANG diarahkan ke Supabase PgBouncer (Port 6543) karena akan fail/hang. Wajib menggunakan PostgreSQL lokal atau Direct Connection (Port 5432).
- **Regenerasi Prisma Client**: Jalankan `npx prisma generate` setiap kali ada perubahan pada `schema.prisma`.
- **No Dummy Data**: Pengujian dan penambahan data harus menggunakan struktur real/verbatim sesuai handler dan seeder yang ada (`prisma/seed.js`).

## Standards Respons & Handler
- **Format Response REST API**:
  - Response sukses: `{ success: true, data: <payload> }`
  - Response error: `{ error: "<pesan error>" }` dengan HTTP status 400, 401, 403, 404, 409, 410, atau 500.
- **Handling Field Verbatim**: Response dan request field harus verbatim mengikuti schema handler/Prisma tanpa mengubah nama properti secara acak.
- **Mutasi Data Multi-Table**: Semua transaksi yang melibatkan mutasi pada lebih dari satu tabel wajib dibungkus dalam `prisma.$transaction(...)`.
- **Input Tanggal**: Semua string tanggal (`"YYYY-MM-DD"`) wajib divalidasi dan dinormalisasi menggunakan helper `normalizeDateUTC` untuk mencegah timezone drift antara client dan PostgreSQL.
- **Pattern Find-or-Create**: Lakukan `findFirst` terlebih dahulu, baru `create` jika data tidak ditemukan. Jangan menggunakan pola `create-catch(P2002)` karena PostgreSQL akan membatalkan seluruh transaksi jika terjadi constraint violation.

## UI & Custom Component Standards (Frontend)
- **Error Handling**: Handler frontend wajib dibungkus `try-catch` saat memanggil `useApi`, dan error ditampilkan menggunakan `ToastContext` (`showToast(pesan, 'error')`).
- **State Management**: Gunakan `useState` lokal per halaman untuk state spesifik. Hindari state global kecuali untuk Auth (`AuthContext`) dan Toast (`ToastContext`).
- **Penggunaan Custom Component**: Menggunakan komponen terstandar yang sudah ada di `frontend/src/components/`:
  - Input Angka/Rupiah: `NumberInput` (format ribuan Indonesia dengan titik).
  - Input Tanggal: `DatePicker` (native-styled popover kalender).
  - Loading State: `Skeleton` shimmer placeholder.
  - Dialog Konfirmasi: `ConfirmDialog` (bukan `window.confirm` native browser).
