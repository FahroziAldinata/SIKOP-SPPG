# Deployment

Panduan deployment **SIKOP-SPPG** (SPPG MBG) ke production: arsitektur, HTTPS, environment, dan langkah deploy.

## Ringkasan Arsitektur Deploy

Monorepo dengan 3 komponen yang di-deploy terpisah:

| Komponen | Stack | Artefak deploy | Catatan |
|---|---|---|---|
| **Backend** | Express 5 + Prisma + PostgreSQL (puppeteer-core untuk PDF) | Proses Node.js via Nixpacks (`backend/nixpacks.toml`) | Start: `npm start` (`node index.js`, port `$PORT`/3000) |
| **Frontend** | React 19 + Vite (SPA) | Build statis via Vercel (`frontend/vercel.json`) | Build: `npm run build` (`vite build`) → `dist/` |
| **Database** | PostgreSQL | Supabase (hosted) | Runtime: pooler port 6543 (`?pgbouncer=true`); migrasi/backup: direct port 5432. Lihat [Platform Database](#platform-database) |

Alur request production:

```
Browser (HTTPS)
  └─ Vercel edge (TLS termination, serve static FE)
       └─ /api/*  →  Backend Node.js (Railway)  →  PostgreSQL (Supabase, pooler 6543)
```

- Frontend adalah SPA statis; Vercel di-set dengan rewrite semua route ke `index.html` (`frontend/vercel.json`) agar client-side routing React berfungsi.
- Backend menyajikan REST API di `/api/*`, static uploads di `/uploads`, dan Swagger `/api-docs` (dinonaktifkan di production kecuali `ENABLE_DOCS=true`).
- Frontend memanggil API melalui `VITE_API_URL` (dari `frontend/.env.example`). Di production, nilai ini harus berupa URL HTTPS backend, mis. `https://sppg-api.example.com/api`.

## Platform Database

Database production **wajib** PostgreSQL yang di-host di **Supabase**. Ada DUA mode koneksi yang penggunaannya berbeda dan TIDAK boleh tertukar:

| Operasi | Port | Contoh `DATABASE_URL` | Keterangan |
|---|---|---|---|
| **Runtime backend** (request API) | **6543** (Supabase PgBouncer pooler) | `postgresql://user:pass@db.supabase.co:6543/postgres?sslmode=require&pgbouncer=true` | Memakai connection pooler (flag `?pgbouncer=true`) agar koneksi Prisma aman; diset di Railway. |
| **Migrasi & backup/restore** (operasional) | **5432** (direct connection) | `postgresql://user:pass@db.supabase.co:5432/postgres?sslmode=require` | Migrasi skema (`prisma migrate deploy`), `pg_dump`/`pg_restore`, dan verifikasi WAJIB memakai direct connection — PgBouncer tidak mendukung transaksi/sesi panjang yang dibutuhkan. |

Aturan singkat:

1. **Jangan pernah** jalankan `prisma migrate deploy` atau backup lewat pooler port `6543`.
2. **Jangan pernah** mengarahkan runtime backend ke direct connection port `5432` (kapasitas koneksi langsung terbatas).
3. Prosedur backup/restore lengkap (manual `pg_dump`, RPO 24h / RTO 4h target rekomendasi, bukan SLA): lihat **`docs/DISASTER_RECOVERY.md`**.

> Referensi historic: kombinasi "Railway/Supabase/Neon/VPS" di dokumen lama ambigu — keputusan platform DB saat ini adalah **Supabase**, sesuai `docs/DISASTER_RECOVERY.md`.

## Setup Environment Production Terpisah

Gunakan file env terpisah per environment: `.env` untuk dev, **`.env.production`** untuk production — masing-masing di `backend/` dan `frontend/`. `.env.production` sudah masuk `.gitignore` (lihat `.gitignore`), jadi **JANGAN commit** file ini; nilainya diset langsung di dashboard platform (Railway/Vercel) atau disimpan di secret manager.

Referensi format nilai: `backend/.env.example` dan `frontend/.env.example`.

### Generate `JWT_SECRET`

Backend gagal start jika `JWT_SECRET` kosong (`backend/src/middleware/auth.js`). Generate secret acak 64 byte (wajib unik, beda dari dev):

```bash
openssl rand -hex 64
```

### Contoh `backend/.env.production`

```
DATABASE_URL="postgresql://sppg_prod:CHANGE-ME@db.supabase.co:6543/postgres?sslmode=require&pgbouncer=true"
JWT_SECRET="<hasil openssl rand -hex 64>"
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS="https://sppg.example.com"
PUPPETEER_EXECUTABLE_PATH=""
# TEST_PASSWORD TIDAK perlu di production (hanya untuk seed/test)
```

Catatan:

- `ALLOWED_ORIGINS` **HARUS** berupa URL HTTPS domain frontend yang asli (bisa dipisah koma). Jangan pernah dibiarkan `http://localhost:5173` di production.
- `PUPPETEER_EXECUTABLE_PATH` boleh kosong: di production non-Windows kode otomatis memakai `@sparticuz/chromium` (`backend/src/lib/launchPuppeteer.js`). Set path manual hanya jika ada binary Chromium sendiri.
- `DATABASE_URL` runtime memakai pooler 6543 — migrasi/backup tetap direct 5432 (lihat [Platform Database](#platform-database)).

### Contoh `frontend/.env.production`

```
VITE_API_URL=https://sppg-api.example.com/api
```

Catatan:

- `VITE_API_URL` di-inline saat `vite build` (bukan runtime), jadi harus sudah benar SEBELUM build di Vercel.
- **HARUS HTTPS** (bukan `http://localhost:3000/api`), sesuai domain backend yang sudah disetup.
- Jangan tulis `/api` dua kali — `useApi` di FE otomatis menambahkan prefix.

## HTTPS

### Status: HTTPS otomatis oleh platform

Repo sudah menyiapkan konfigurasi platform yang menyediakan TLS termination otomatis di edge:

- **Frontend → Vercel** (`frontend/vercel.json`): setiap deployment `*.vercel.app` atau custom domain mendapat sertifikat TLS otomatis. SPA disajikan via HTTPS tanpa konfigurasi tambahan.
- **Backend → Railway via Nixpacks** (`backend/nixpacks.toml`, tanpa `PORT` hardcode): Railway menyediakan HTTPS otomatis (`*.up.railway.app` / custom domain) dan menterminate TLS di proxy-nya sebelum diteruskan ke aplikasi Node.js.

**Implikasi:** aplikasi Node.js TIDAK perlu (dan tidak boleh) mengelola sertifikat TLS sendiri — tidak ada `https.createServer` di kode. HTTPS di-terminate oleh platform; backend hanya menerima HTTP dari proxy internal platform. Karena itu tidak ada kode/konfigurasi TLS di repo, dan tidak ada file `Dockerfile`, `Procfile`, `render.yaml`, `fly.toml`, `railway.json` (konfigurasi railway cukup lewat dashboard + `nixpacks.toml`).

### Yang HARUS dipastikan agar HTTPS berjalan benar

Karena TLS berada di depan proxy platform, backend harus mempercayai header proxy dan origin yang benar:

1. **Trust proxy di Express** — **SUDAH di-set**: `app.set('trust proxy', 1)` ada di `backend/src/app.js:29` (langsung setelah `const app = express();`). Pastikan baris ini tetap aktif saat production agar `req.protocol`/`req.secure` benar di belakang reverse proxy Vercel/Railway. (Opsional: `app.set('trust proxy', true)` jika platform melewati beberapa hop.)

2. **CORS origin production** — `ALLOWED_ORIGINS` default masih `http://localhost:5173`. Di production HARUS di-set ke domain HTTPS frontend yang sebenarnya, contoh:

   ```
   ALLOWED_ORIGINS=https://sppg.example.com
   ```

   (bisa dipisah koma untuk beberapa origin; `credentials: true` tetap aktif di `app.js`).

3. **Redirect HTTP → HTTPS** — frontend Vercel otomatis me-redirect HTTP ke HTTPS tanpa konfigurasi. Untuk backend, redirection di-handle oleh Vercel/Railway juga; jika butuh kontrol eksplisit di Vercel, lihat contoh `redirects` di [Setup Domain & HTTPS](#setup-domain--https-custom-domain).

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

## Setup Domain & HTTPS (custom domain)

Selain domain bawaan platform (`*.vercel.app`, `*.up.railway.app`), production disarankan memakai custom domain sendiri.

### Frontend — Vercel

1. Dashboard Vercel → Project → **Settings → Domains → Add**.
2. Untuk **apex/root** (`sppg.example.com`): set A record mengarah ke IP Vercel (ditampilkan dashboard).
3. Untuk **subdomain** (`www.sppg.example.com`): set CNAME ke `cname.vercel-dns.com`.
4. Vercel menerbitkan sertifikat TLS otomatis dan verifikasinya selesai dalam beberapa menit.

### Backend — Railway

1. Railway → Project → Service → **Settings → Domains → Generate Domain** (dapat `*.up.railway.app`), atau **Custom Domain**.
2. Untuk custom domain: set CNAME ke target yang ditampilkan Railway (biasanya `*.up.railway.app`).
3. Railway menerbitkan sertifikat TLS otomatis untuk custom domain.

### Verifikasi sertifikat TLS

- Buka `https://<domain>` di browser → tidak ada peringatan sertifikat.
- `curl -I https://sppg.example.com` → status `200` (FE) dan `curl -I https://sppg-api.example.com/api/health` → `200`.
- `openssl s_client -connect sppg.example.com:443 -servername sppg.example.com </dev/null 2>/dev/null | openssl x509 -noout -issuer` → issuer Let's Encrypt / platform (bukan self-signed).

### Redirect HTTP→HTTPS & security headers (opsional)

Vercel sudah otomatis me-redirect HTTP → HTTPS (301). Contoh berikut hanya jika ingin redirect eksplisit untuk `/api/*` serta menambahkan security headers — **JANGAN ubah `frontend/vercel.json` tanpa keperluan** (struktur saat ini hanya berisi `rewrites`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "redirects": [
    { "source": "/api/:path*", "destination": "https://sppg-api.example.com/api/:path*", "permanent": true }
  ],
  "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ]
}
```

## Healthcheck & Uptime Monitoring

> Langkah ini adalah **tugas saat production berjalan** (post-deploy), bukan implementasi yang sudah ada — endpoint `/api/health` saat ini **belum ada** di backend.

1. **Tambahkan endpoint `GET /api/health`** di backend: return `{ "success": true, "data": { "status": "ok", "db": "up" } }` dengan:
   - **Liveness** — endpoint selalu merespons `200` selama proses Node.js hidup.
   - **DB ping** — eksekusi `SELECT 1` via Prisma (`prisma.$queryRaw`) sebagai indikator koneksi ke Supabase; jika gagal, return `503`.
   - Endpoint ini TIDAK butuh auth agar bisa dipantau eksternal (tidak mengungkap data sensitif).

2. **URL yang dimonitor:**

   | URL | Tujuan | Ekspektasi |
   |---|---|---|
   | `https://sppg.example.com` | Frontend utama (availability) | HTTP 200 |
   | `https://sppg-api.example.com/api/health` | Backend liveness + DB ping | `{ "success": true }` |
   | `https://sppg-api.example.com/api-docs` | Swagger (hanya jika `ENABLE_DOCS=true`; butuh login admin) | HTTP 200 dengan kredensial admin |

   > Catatan: `/api-docs` dinonaktifkan di production kecuali `ENABLE_DOCS=true` dan dilindungi `requireAuth` admin (`backend/src/app.js`). Jika tidak dipakai, jangan monitor URL ini.

3. **Konfigurasi UptimeRobot / BetterStack:**
   - Interval pengecekan: **5 menit**.
   - Timeout: 30 detik.
   - Alert keyword: `success: true` (untuk `GET /api/health`) agar down detection akurat.
   - Notifikasi: **email + Telegram** (dan/atau Slack) untuk tim operasional.
   - Buat monitor terpisah untuk FE dan `/api/health` agar tahu komponen mana yang down.

## Variabel Environment Production

Dari `backend/.env.example` (wajib di production):

| KEY | Contoh production | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@db.supabase.co:6543/postgres?sslmode=require&pgbouncer=true` | Runtime → pooler Supabase port 6543. Migrasi/backup pakai direct port 5432 (lihat [Platform Database](#platform-database)) |
| `JWT_SECRET` | string acak panjang (`openssl rand -hex 64`) | Menandatangani token JWT — wajib, backend gagal start jika kosong |
| `NODE_ENV` | `production` | Mode production (menonaktifkan Swagger publik, memilih binary Chromium untuk PDF) |
| `PORT` | `3000` | Backend mendengarkan port ini (platform biasanya menyuntikkan `PORT` sendiri) |
| `ALLOWED_ORIGINS` | `https://sppg.example.com` | Origin CORS diizinkan, dipisah koma (WAJIB diubah dari default localhost) |
| `PUPPETEER_EXECUTABLE_PATH` | kosong (default) / path binary Chromium di container | Opsional; bila kosong di production non-Windows, otomatis pakai `@sparticuz/chromium` |
| `TEST_PASSWORD` | — | Hanya untuk seed/test, tidak perlu di production |

Dari `frontend/.env.example` (di-build saat `vite build`, bukan runtime):

| KEY | Contoh production | Keterangan |
|---|---|---|
| `VITE_API_URL` | `https://sppg-api.example.com/api` | Base URL backend; dipakai `useApi` + AuthContext (di-production harus HTTPS, bukan `localhost`) |

## Matrix Environment Dev vs Prod

Ringkasan per KEY environment (kolom nilai & status kewajiban):

| KEY | Dev | Prod | Status |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/sppg` | `...@db.supabase.co:6543/postgres?pgbouncer=true` (runtime); direct `5432` utk migrasi/backup | **Wajib** |
| `JWT_SECRET` | `change-me` | string acak `openssl rand -hex 64` (unik, bukan dev) | **Wajib** |
| `NODE_ENV` | `development` | `production` | **Wajib di prod** |
| `PORT` | `3000` | `3000` (atau disuntikkan platform) | Opsional (default `3000`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | `https://sppg.example.com` | **Wajib di prod** |
| `PUPPETEER_EXECUTABLE_PATH` | kosong (Chrome lokal auto-detect) | kosong → `@sparticuz/chromium`; atau path binary container | Opsional (default `@sparticuz/chromium` di prod) |
| `TEST_PASSWORD` | `change-me` | tidak diset | Opsional (dev/test saja) |
| `VITE_API_URL` | `http://localhost:3000/api` | `https://sppg-api.example.com/api` | **Wajib** (FE, build-time) |

## Langkah Deploy Ringkas

### 1. Database

```bash
cd backend
npx prisma migrate deploy   # apply migrasi ke database production — WAJIB direct connection port 5432 (bukan pooler 6543)
npx prisma db seed          # opsional, seed data awal
```

> **PENTING — guard seed production:** `seed.js` menolak berjalan saat `NODE_ENV=production`
> (exit tanpa mengubah data) kecuali ada override eksplisit `ALLOW_PROD_SEED=true` atau argumen
> `--force`. Seed membuat akun dengan password default `ganti-password-ini` yang ada di repo
> publik, jadi:
>
> ```bash
> # First deploy yang disengaja — pakai SALAH SATU override:
> ALLOW_PROD_SEED=true npx prisma db seed
> # ATAU
> npx prisma db seed --force
> ```
>
> **WAJIB setelah seed pertama:** ganti password **SELURUH akun** (admin, aslap, mitra,
> ahligizi, akuntan, kepalasppg) via halaman admin atau `PUT /api/admin/users/:id` segera
> setelah seed selesai. Jangan biarkan akun apa pun memakai password default.

### 2. Backend (Railway / Nixpacks)

1. Push repo ke Git provider (GitHub).
2. Di Railway: **New Project → Deploy from GitHub** → pilih repo.
3. **Root directory: `backend/`** (Nixpacks otomatis terbaca `backend/nixpacks.toml`).
4. Set env (lihat tabel di atas / `.env.production`). `npm install` menjalankan `postinstall: prisma generate`.
5. Deploy → Railway membuat domain `*.up.railway.app` (HTTPS otomatis). Catat URL-nya untuk `VITE_API_URL`.
6. Konfirmasi endpoint: `curl https://<backend-domain>/api/...` → `{ "success": true, ... }`.

### 3. Frontend (Vercel)

1. Impor repo di Vercel.
2. **Root directory: `frontend/`**, **Build command: `npm run build`**, **Output directory: `dist`**.
3. Set env `VITE_API_URL` ke URL HTTPS backend (langkah 2.5) — nilai di-inline saat build, jadi set sebelum build pertama.
4. Deploy → SPA tersaji di `*.vercel.app` / custom domain dengan HTTPS otomatis; `vercel.json` menangani rewrite SPA.

### 4. Verifikasi production

- Akses frontend via `https://...` (browser tanpa peringatan sertifikat).
- Login berhasil, token JWT di-`localStorage`, request `/api/*` sampai ke backend tanpa error CORS (artinya `ALLOWED_ORIGINS` benar).
- Buka `https://<frontend>/*` path dalam (mis. `/aslap/penerima-manfaat`) → tidak 404 (rewrite SPA berfungsi).
- `http://<frontend>` → ter-redirect 301 ke `https://`.

## Deploy Checklist

Urutan eksekusi deploy production (jalankan berurutan):

1. **DB** — `npx prisma migrate deploy` (direct port 5432) sukses tanpa error. Seed hanya saat first deploy + password default diganti (lihat guard di Langkah 1).
2. **Backend — Railway** — root directory `backend/`, env sesuai `.env.production`.
3. **Frontend — Vercel** — root directory `frontend/`, build `npm run build`, output `dist`, `VITE_API_URL` benar.
4. **Verifikasi curl** — `curl https://<backend-domain>/api/...` → `{ "success": true, ... }`.
5. **Cek CORS** — `ALLOWED_ORIGINS` = domain HTTPS FE; request dari browser FE tanpa error CORS.
6. **Cek SPA rewrite** — navigasi path dalam FE (mis. `/aslap/penerima-manfaat`) tidak 404; `http://` → 301 `https://`.

Checklist centang:

- [ ] `npx prisma migrate deploy` dijalankan via direct connection port **5432** (bukan pooler 6543), tanpa error
- [ ] Seed hanya saat first deploy (guard `NODE_ENV=production`); password seluruh akun sudah diganti dari default
- [ ] Backend deployed di Railway root `backend/`; env sesuai `.env.production` (`NODE_ENV=production`, `JWT_SECRET` baru, `ALLOWED_ORIGINS` HTTPS)
- [ ] Frontend deployed di Vercel root `frontend/`; build `npm run build`, output `dist`, `VITE_API_URL` HTTPS
- [ ] `curl https://sppg-api.example.com/api/...` → `{ "success": true }` (atau `/api/health` setelah endpoint tersedia)
- [ ] Login FE tanpa error CORS (verifikasi `ALLOWED_ORIGINS`)
- [ ] Navigasi path dalam FE (mis. `/aslap/penerima-manfaat`) tidak 404 (SPA rewrite)
- [ ] `http://` → redirect 301 ke `https://`; sertifikat TLS valid (tanpa warning)
- [ ] (Post-deploy) Healthcheck `/api/health` + monitor uptime aktif (interval 5 menit)

## Ops & Pemulihan

### Backup & restore

- Prosedur lengkap (backup manual `backend/scripts/backup-db.js`, restore `pg_restore`, verifikasi): **`docs/DISASTER_RECOVERY.md`**.
- Target rekomendasi: **RPO 24 jam / RTO 4 jam** (target internal, bukan SLA). Backup memakai direct connection port **5432**.
- Setiap backup pasca-produksi **wajib dipindahkan ke off-site storage** (jangan hanya di `backend/backups/`).

### Rotasi secret JWT

Jika `JWT_SECRET` bocor atau sebagai hygiene berkala:

```bash
openssl rand -hex 64
```

1. Generate secret baru (contoh di atas).
2. Set di Railway (env backend) dan perbarui `backend/.env.production` (jangan commit).
3. **Restart/deploy ulang backend** — seluruh token JWT lama otomatis invalid (semua user harus login ulang).
4. Rotasi kredensial DB juga jika insiden terkait akses database.

### Prosedur rollback

| Komponen | Cara rollback |
|---|---|
| **Backend (Railway)** | Railway → deployment history → **Redeploy versi/commit sebelumnya** (atau pin ke commit tertentu via Git deploy). |
| **Frontend (Vercel)** | Vercel → **Deployments** → pilih deployment stabil sebelumnya → **Promote to Production** (instant rollback). |
| **Database** | Restore dari backup terakhir via `docs/DISASTER_RECOVERY.md` (direct port 5432) → verifikasi data kritis → `npx prisma migrate deploy` agar skema konsisten dengan kode. |

> Prinsip: rollback aplikasi dulu (backend + frontend) agar trafik kembali stabil, lalu tangani DB secara hati-hati karena restore menimpa data. Jika DB pernah bocor/kompromi, ikuti [Rotasi secret JWT](#rotasi-secret-jwt) setelah restore.
