# Deployment

Panduan deployment **SIKOP-SPPG** (SPPG MBG) ke production: arsitektur, HTTPS, environment, dan langkah deploy.

## Ringkasan Arsitektur Deploy

Monorepo dengan 3 komponen yang di-deploy terpisah:

| Komponen | Stack | Artefak deploy | Catatan |
|---|---|---|---|
| **Backend** | Express 5 + Prisma + PostgreSQL (puppeteer-core untuk PDF) | Proses Node.js via Nixpacks (`backend/nixpacks.toml`) | Start: `npm start` (`node index.js`, port `$PORT`/3000) |
| **Frontend** | React 19 + Vite (SPA) | Build statis via Vercel (`frontend/vercel.json`) | Build: `npm run build` (`vite build`) → `dist/` |
| **Database** | PostgreSQL | Hosted (Railway / Supabase / Neon / VPS) | Koneksi via `DATABASE_URL`; migrasi `npx prisma migrate deploy` |

Alur request production:

```
Browser (HTTPS)
  └─ Vercel edge (TLS termination, serve static FE)
       └─ /api/*  →  Backend Node.js (Railway)  →  PostgreSQL
```

- Frontend adalah SPA statis; Vercel di-set dengan rewrite semua route ke `index.html` (`frontend/vercel.json`) agar client-side routing React berfungsi.
- Backend menyajikan REST API di `/api/*`, static uploads di `/uploads`, dan Swagger `/api-docs` (dinonaktifkan di production kecuali `ENABLE_DOCS=true`).
- Frontend memanggil API melalui `VITE_API_URL` (dari `frontend/.env.example`). Di production, nilai ini harus berupa URL HTTPS backend, mis. `https://sppg-api.example.com/api`.

## HTTPS

### Status: HTTPS otomatis oleh platform

Repo sudah menyiapkan konfigurasi platform yang menyediakan TLS termination otomatis di edge:

- **Frontend → Vercel** (`frontend/vercel.json`): setiap deployment `*.vercel.app` atau custom domain mendapat sertifikat TLS otomatis. SPA disajikan via HTTPS tanpa konfigurasi tambahan.
- **Backend → Railway via Nixpacks** (`backend/nixpacks.toml`, tanpa `PORT` hardcode): Railway menyediakan HTTPS otomatis (`*.up.railway.app` / custom domain) dan menterminate TLS di proxy-nya sebelum diteruskan ke aplikasi Node.js.

**Implikasi:** aplikasi Node.js TIDAK perlu (dan tidak boleh) mengelola sertifikat TLS sendiri — tidak ada `https.createServer` di kode. HTTPS di-terminate oleh platform; backend hanya menerima HTTP dari proxy internal platform. Karena itu tidak ada kode/konfigurasi TLS di repo, dan tidak ada file `Dockerfile`, `Procfile`, `render.yaml`, `fly.toml`, `railway.json` (konfigurasi railway cukup lewat dashboard + `nixpacks.toml`).

### Yang HARUS dipastikan agar HTTPS berjalan benar

Karena TLS berada di depan proxy platform, backend harus mempercayai header proxy dan origin yang benar:

1. **Trust proxy di Express** — wajib agar `req.protocol`/`req.secure` benar di belakang reverse proxy (Vercel/Railway). Saat ini **belum di-set** di `backend/src/app.js`. Tambahkan setelah `const app = express();`:

   ```js
   app.set('trust proxy', 1); // percaya 1 hop proxy platform
   ```

   (Opsional: `app.set('trust proxy', true)` di platform yang melewati beberapa hop.)

2. **CORS origin production** — `ALLOWED_ORIGINS` default masih `http://localhost:5173`. Di production HARUS di-set ke domain HTTPS frontend yang sebenarnya, contoh:

   ```
   ALLOWED_ORIGINS=https://sppg.example.com
   ```

   (bisa dipisah koma untuk beberapa origin; `credentials: true` tetap aktif di `app.js`).

3. **Redirect HTTP → HTTPS** — frontend Vercel otomatis me-redirect HTTP ke HTTPS tanpa konfigurasi. Untuk backend, redirection di-handle oleh Vercel/Railway juga; jika butuh kontrol eksplisit di Vercel, tambahkan di `frontend/vercel.json`:

   ```json
   {
     "redirects": [
       { "source": "/api/:path*", "destination": "https://<api-domain>/api/:path*", "permanent": true }
     ],
     "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ]
   }
   ```

4. **Cookie secure** — auth memakai **JWT di `localStorage`** (lihat `frontend/src/context/AuthContext.jsx`), bukan cookie. Karena itu tidak ada cookie `Secure`/`SameSite` yang perlu di-set di backend. Jika di masa depan pindah ke cookie, cookie harus diberi flag `Secure` (hanya via HTTPS) dan backend harus berada di balik `trust proxy` agar tidak salah menandai request.

5. **HSTS (opsional, rekomendasi)** — Vercel/Railway menyediakan HSTS otomatis. Jika perlu header eksplisit, tambahkan di middleware backend:

   ```js
   app.use((req, res, next) => {
     res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
     next();
   });
   ```

### Catatan jika di-host manual (VPS, tanpa platform)

Jika backend/frontend TIDAK di-deploy ke Vercel/Railway melainkan VPS sendiri, HTTPS harus ditangani manual di depan aplikasi (reverse proxy + TLS termination):

1. Dapatkan sertifikat TLS (mis. Let's Encrypt via certbot).
2. Pasang reverse proxy (Nginx/Caddy) di port 443 → terminate TLS → forward ke app di `127.0.0.1:3000` (backend) / static FE.
3. Set `trust proxy` dan `ALLOWED_ORIGINS` seperti di atas.
4. Redirect seluruh HTTP (port 80) ke HTTPS (301).
5. Pasang header HSTS.

> Opsional tersebut tidak dieksekusi di repo ini — dokumentasi untuk panduan production manual saja.

## Variabel Environment Production

Dari `backend/.env.example` (wajib di production):

| KEY | Contoh production | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/sppg?sslmode=require` | Koneksi Prisma ke PostgreSQL (pakai SSL di production) |
| `JWT_SECRET` | string acak panjang | Menandatangani token JWT — wajib, backend gagal start jika kosong |
| `NODE_ENV` | `production` | Mode production (menonaktifkan Swagger publik, memilih binary Chromium untuk PDF) |
| `PORT` | `3000` | Backend mendengarkan port ini (platform biasanya menyuntikkan `PORT` sendiri) |
| `ALLOWED_ORIGINS` | `https://sppg.example.com` | Origin CORS diizinkan, dipisah koma (WAJIB diubah dari default localhost) |
| `PUPPETEER_EXECUTABLE_PATH` | path binary Chromium di container | Wajib untuk PDF; di platform gunakan `@sparticuz/chromium` yang sudah dipakai kode production |
| `TEST_PASSWORD` | — | Hanya untuk seed/test, tidak perlu di production |

Dari `frontend/.env.example` (di-build saat `vite build`, bukan runtime):

| KEY | Contoh production | Keterangan |
|---|---|---|
| `VITE_API_URL` | `https://sppg-api.example.com/api` | Base URL backend; dipakai `useApi` + AuthContext (di-production harus HTTPS, bukan `localhost`) |

## Langkah Deploy Ringkas

### 1. Database

```bash
cd backend
npx prisma migrate deploy   # apply migrasi ke database production
npx prisma db seed          # opsional, seed data awal
```

### 2. Backend (Railway / Nixpacks)

1. Push repo ke Git provider (GitHub).
2. Di Railway: **New Project → Deploy from GitHub** → pilih repo.
3. Root directory: `backend/` (Nixpacks otomatis terbaca `backend/nixpacks.toml`).
4. Set env (lihat tabel di atas). `npm install` menjalankan `postinstall: prisma generate`.
5. Deploy → Railway membuat domain `*.up.railway.app` (HTTPS otomatis). Catat URL-nya untuk `VITE_API_URL`.
6. Konfirmasi endpoint: `curl https://<backend-domain>/api/...` → `{ "success": true, ... }`.

### 3. Frontend (Vercel)

1. Impor repo di Vercel.
2. **Root directory**: `frontend/`, **Build command**: `npm run build`, **Output directory**: `dist`.
3. Set env `VITE_API_URL` ke URL HTTPS backend (langkah 2.5).
4. Deploy → SPA tersaji di `*.vercel.app` / custom domain dengan HTTPS otomatis; `vercel.json` menangani rewrite SPA.

### 4. Verifikasi production

- Akses frontend via `https://...` (browser tanpa peringatan sertifikat).
- Login berhasil, token JWT di-`localStorage`, request `/api/*` sampai ke backend tanpa error CORS (artinya `ALLOWED_ORIGINS` benar).
- Buka `https://<frontend>/*` path dalam (mis. `/aslap/penerima-manfaat`) → tidak 404 (rewrite SPA berfungsi).
- `http://<frontend>` → ter-redirect 301 ke `https://`.
