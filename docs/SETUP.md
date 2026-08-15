# Setup

Panduan instalasi, konfigurasi environment, migrasi database, seed, dan menjalankan **SPPG Management System** di lingkungan lokal.

## Prasyarat

Tidak ada field `engines` di `backend/package.json` maupun `frontend/package.json`. Berdasarkan dependensi di `package-lock.json`:

- **Node.js**: minimum 18.18, direkomendasikan 22 LTS atau lebih baru (berdasarkan dependensi di package-lock.json)
- **npm**: mengikuti versi Node yang terpasang
- **PostgreSQL**: database utama yang terhubung lewat `DATABASE_URL`.

## 1. Install Dependencies

```bash
# clone repositori, lalu:
cd backend
npm install        # menjalankan postinstall: prisma generate

cd ../frontend
npm install
```

## 2. Konfigurasi Environment

Salin template `.env.example` di folder `backend/` lalu isi nilainya:

```
DATABASE_URL=
JWT_SECRET=
PORT=
NODE_ENV=
ALLOWED_ORIGINS=
TEST_PASSWORD=
PUPPETEER_EXECUTABLE_PATH=
```

Keterangan variabel yang dipakai kode:

|| KEY | Dibutuhkan untuk |
||---|---|
|| `DATABASE_URL` | Koneksi Prisma ke PostgreSQL (contoh: `postgresql://user:***@localhost:5432/dbname`) |
|| `JWT_SECRET` | Menandatangani token JWT (wajib ada — backend gagal start jika kosong) |
|| `PORT` | Port backend (default `3000`) |
|| `NODE_ENV` | Mode environment (`development` / `production`) |
|| `ALLOWED_ORIGINS` | Daftar origin CORS, dipisah koma (default `http://localhost:5173,http://127.0.0.1:5173`) |
|| `TEST_PASSWORD` | Password akun test/seed |
|| `PUPPETEER_EXECUTABLE_PATH` | Path executable Chromium untuk pembuatan PDF |
|| **Email Configuration (V3)** | |
|| `SMTP_HOST` | SMTP server host (contoh: `smtp.gmail.com`) |
|| `SMTP_PORT` | SMTP server port (contoh: `587`) |
|| `SMTP_USER` | SMTP username |
|| `SMTP_PASS` | SMTP password |
|| **Chatbot Configuration (V3)** | |
|| `ENCRYPTION_KEY` | AES-256-GCM key untuk chatbot encryption (64 hex chars) |
|| `OPENAI_API_KEY` | OpenAI API key (opsional jika pakai provider lain) |
|| `GEMINI_API_KEY` | Gemini API key (opsional) |
|| `GROQ_API_KEY` | Groq API key (opsional) |

## 3. Migrasi Database

```bash
cd backend
npx prisma migrate deploy   # terapkan migrasi yang sudah ada (produksi/stabil)
# atau untuk development:
npx prisma migrate dev
```

## 4. Seed

`backend/package.json` mendefinisikan `"prisma": { "seed": "node prisma/seed.js" }`, sehingga seed tersedia:

```bash
cd backend
npx prisma db seed
```

## 5. Menjalankan Aplikasi

Script aktual dari `package.json`:

**Backend** (default port `3000`):

```bash
cd backend
npm run dev        # node --watch index.js (auto-restart)
# atau:
npm start          # node index.js
```

**Frontend** (default port `5173`, proxy `/api` → `http://localhost:3000`):

```bash
cd frontend
npm run dev        # vite
```

Buka `http://localhost:5173`. Pastikan backend dan frontend berjalan bersamaan.

## Lainnya

- **Lint FE**: `cd frontend && npm run lint` (oxlint).
- **Build FE**: `cd frontend && npm run build` (vite build).
- **Test BE**: `cd backend && npm test` (vitest + supertest, 671+ tests).
- **Test FE**: `cd frontend && npm test` (vitest).
- **API Documentation**: `http://localhost:3000/api-docs` (OpenAPI/Swagger).
- **Email Testing**: Configure SMTP in `.env` for email notifications.
- **Chatbot Testing**: Set `ENCRYPTION_KEY` and provider API keys for chatbot features.
