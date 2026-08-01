# 02. Technology Stack

## Backend
- **Framework**: Express.js v5.2.1
- **Runtime**: Node.js (`node --watch` untuk dev)
- **Bahasa**: JavaScript (CommonJS — `require`/`module.exports`)
- **ORM**: Prisma v6.19.3 (di-pin ke v6, v7 ditunda karena breaking change `prisma.config.ts`)
- **Database Driver**: `@prisma/client` v6.19.3
- **Auth**: JWT custom via `jsonwebtoken` v9.0.3 (stateless, verify + DB check `user.aktif`)
- **Password Hashing**: `bcryptjs` v3.0.3
- **CORS**: `cors` v2.8.6 (origin dari env `ALLOWED_ORIGINS` comma-separated)
- **Environment**: `dotenv` v17.4.2
- **PDF Generation**: `puppeteer-core` v25.3.0 + `@sparticuz/chromium` v149.0.0 (serverless-safe build ~40MB vs 170MB+ full Chromium)
- **Validation**: App-layer manual (tidak ada library seperti Joi/Zod)
- **Logging**: `console.error` native
- **API Docs / Scheduler / Queue / Cache / Email / Upload**: Tidak ditemukan di repository (Upload via API JSON)
- **Entry Point**: `backend/index.js` (`require('./src/app.js')`)

## Frontend
- **Framework**: React v19.2.7
- **Build Tool**: Vite v8.1.1
- **Routing**: React Router DOM v6.30.4
- **UI Library**: HeroUI v3.2.2 (`@heroui/react`, `@heroui/styles`)
- **Styling**: TailwindCSS v4.3.2 (via `@tailwindcss/vite` + `@tailwindcss/postcss`) + Vanilla CSS Custom (design tokens `styles/tokens.css`)
- **State Management**: React Context API (`AuthContext`, `ToastContext`) — tidak ada Redux/Zustand
- **HTTP Client**: Native `fetch` API (via custom hook `useApi`)
- **Form Validation**: Manual/app-layer
- **Charts**: Recharts v3.9.2 (BarChart & AreaChart)
- **Date Handling**: `@internationalized/date` v3.12.2
- **Icons**: Lucide React v1.23.0
- **Linter**: oxlint v1.71.0
- **Type Checking**: `@types/react` + `@types/react-dom` (file `.jsx`)
- **Deployment Config**: `vercel.json` (SPA rewrite to `index.html`)

## Database
- **Engine**: PostgreSQL (Supabase free tier)
- **ORM**: Prisma v6.19.3
- **Migration Tool**: Prisma Migrate (`prisma migrate dev` / `prisma migrate deploy`)
- **Seeder**: `prisma/seed.js`
- **Schema Version**: v5.4 (komentar internal schema)
- **Model Count**: 38+ model, 24 enum
- **Connection Strategy**:
  - *Dev*: PostgreSQL lokal port 5432
  - *Production Runtime*: Supabase pooler port 6543 + `?pgbouncer=true`
  - *Production Migration*: Supabase direct connection port 5432

## DevOps & Infrastructure
- **Backend Hosting**: Railway (`sppg-management-system-production.up.railway.app`)
- **Frontend Hosting**: Vercel (`sppg-management-system.vercel.app`)
- **Database Hosting**: Supabase (PostgreSQL)
- **Build Config Backend**: `nixpacks.toml` (apt packages Debian/Ubuntu untuk Chromium headless Puppeteer)
- **CI/CD / Docker / Reverse Proxy / Monitoring**: Tidak ditemukan di repository
- **Environment Files**:
  - Backend: `.env` (dev), `.env.production` (Railway)
  - Frontend: `.env` (`VITE_API_URL`)

## console
- **localhost:20128** : jika kamu diintruksikan matikan console jangan matikan ini. ini adalah localhost model 