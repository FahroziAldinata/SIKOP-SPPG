# Arsitektur

Dokumen ini menjelaskan struktur folder aktual proyek serta alur data utama **SPPG Management System**.

## Struktur Folder

### Backend (`backend/`)

```
backend/src/
├── index.js                        # entry point (require src/app)
├── prisma/
│   ├── migrations/                 # migrasi database
│   │   ├── 20260813092213_add_email_notifikasi/    # Email notifikasi schema
│   │   └── 20260807063342_add_chatbot_step1/       # Chatbot schema
│   ├── schema.prisma               # 49+ model Prisma (tabel = nama model)
│   └── seed.js                     # data awal (kategori, master, akun, dll)
└── src/
    ├── app.js                      # setup Express, CORS, mount semua router
    ├── constants/
    │   └── kategori.js             # konstanta kategori/aturan bisnis
    ├── lib/
    │   ├── accountingHelper.js     # helper akuntansi (double-entry, saldo)
    │   ├── auditHelper.js          # pencatatan AuditLog
    │   ├── exportExcel.js          # ekspor Excel (ExcelJS / xlsx)
    │   ├── launchPuppeteer.js      # bootstrap puppeteer-core + @sparticuz/chromium
    │   ├── pemeriksaanBahanHelper.js
    │   ├── prisma.js               # PrismaClient singleton
    │   ├── email.js                # Email service (Nodemailer + SMTP)
    │   ├── emailHelper.js          # Email integration helpers
    │   ├── chat/                   # Chatbot infrastructure
    │   │   ├── encryption.js       # AES-256-GCM encryption
    │   │   ├── tools/              # Tool registry (4 tools status)
    │   │   └── openaiCompatible.js  # Multi-provider adapter
    │   └── chat.js                 # Chat endpoint + RBAC protection
    ├── middleware/
    │   ├── auth.js                 # requireAuth (JWT) + requirePermission (RBAC v2)
    │   └── validate.js             # validasi Zod per request (body/params/query)
    ├── routes/
    │   ├── auth.js                 # /api/auth — login, me, profile, email management
    │   ├── akuntan/                # /api/akuntan — router modular per domain
    │   │   ├── index.js            # aggregator & mount sub-router
    │   │   ├── _helpers.js
    │   │   ├── rabP12.js
    │   │   ├── rabHarian.js
    │   │   ├── jurnal.js
    │   │   ├── dokumenResmi.js
    │   │   ├── nominatifUpah.js
    │   │   ├── stok.js
    │   │   └── master.js
    │   ├── aslap.js                # /api/aslap
    │   ├── gizi.js                 # /api/gizi
    │   ├── mitra.js                # /api/mitra
    │   ├── laporan.js              # /api/laporan
    │   ├── bukti-lpd2m.js          # /api/laporan/lpd2m/bukti
    │   ├── pemeriksaan-bahan.js    # /api/laporan/pemeriksaan-bahan
    │   ├── kepala.js               # /api/kepala — approval + email notif
    │   ├── dashboard.js            # /api/dashboard
    │   ├── notifikasi.js           # /api/notifikasi — email management
    │   ├── admin.js                # /api/admin — users + permission RBAC
    │   ├── laporanBug.js           # /api/laporan-bug
    │   ├── chat.js                 # /api/chat — chatbot + API key CRUD
    │   └── __tests__/              # smoke/behavioral tests (supertest + vitest)
    ├── templates/
    │   └── dokumen/                # generator template dokumen (HTML → PDF)
    │       ├── lpa.js, sptj.js, bapsd.js, bku.js, lra.js, lpd2m.js
    │       ├── btt.js, bkk.js, lbbp.js, neracaSaldo.js, bp.js
    │       ├── laporanHarian.js, perBulan.js, perPeriode.js, perKelas.js
    │       ├── rabP12.js, stockBarang.js, kebutuhanBelanja.js, catatan.js
    │       ├── aslapHarian.js, aslapPerBulan.js, aslapPerKelas.js, aslapPerPeriode.js
    │       ├── giziRekapMenu.js, giziPemenuhan.js, giziOrganoleptik.js
    │       ├── poRealisasi.js, notaPesanan.js, pemeriksaanBahan.js
    │       └── shared.js
    └── validators/                 # skema Zod per domain
        ├── akuntan.js, aslap.js, gizi.js, laporan.js, mitra.js
```

### Frontend (`frontend/src/`)

```
frontend/src/
├── main.jsx                        # entry point Vite
├── App.jsx                         # router & layout utama
├── index.css                       # Tailwind entry
├── context/
│   ├── AuthContext.jsx             # state auth global
│   └── ToastContext.jsx            # state notifikasi UI
├── hooks/
│   └── useApi.js                   # hook fetch + error/loading
├── api/                            # lapisan akses API (per resource)
├── components/                     # komponen UI reusable
│   ├── Layout.jsx, ProtectedRoute.jsx, WorkflowStepper.jsx
│   ├── Table.jsx, Card.jsx, Button.jsx, Dropdown.jsx, DatePicker.jsx
│   ├── ConfirmDialog.jsx, StatusBadge.jsx, Toast.jsx, Skeleton.jsx
│   ├── NumberInput.jsx, NominatifUpahGrid.jsx, GrupHariManager.jsx
│   ├── DashboardSummaryCards.jsx, NotifikasiList.jsx, FieldButton.jsx
│   ├── ChatWidget.jsx              # Chatbot widget (Fase 7)
│   └── utils.js
├── pages/
│   ├── auth/Login.jsx
│   ├── admin/        — AdminDashboard, UserManagementPage, LaporanBugPage, PermissionMatrixPage
│   ├── akuntan/      — AkuntanDashboard, RabHarianPage, NominatifUpahPage,
│   │                   JurnalTransaksiPage, DokumenResmiPage, SaldoAwalBarangPage,
│   │                   MutasiStokPage, ValidasiStokPage, AkuntanPoPage,
│   │                   laporan/LaporanPage, laporan/PeriodeSetupPage
│   ├── aslap/        — AslapDashboard, SekolahPage, PenerimaManfaatPage,
│   │                   AslapPoPage, LaporanPage
│   ├── gizi/         — GiziDashboard, MenuHarianPage, MasterTargetGiziPage,
│   │                   LaporanGiziPage
│   ├── kepala/       — KepalaDashboard, ApprovalPage
│   ├── mitra/        — MitraDashboard, HargaBahanPage, MitraPoPage,
│   │                   KendaraanPage, LaporanPage
│   └── shared/       — SettingPage (email management + TTD basah + chat API key)
└── styles/tokens.css               # design tokens Tailwind
```

## Alur Data

```
React FE (frontend, Vite :5173)
   │  fetch / axios (proxy /api)
   ▼
Express routes (backend, :3000)
   │  middleware requireAuth (verifikasi JWT + cek akun aktif)
   │  middleware requireRole (RBAC per role)
   │  middleware validate (Zod: body/params/query)
   ▼
Route handler per resource (routes/*)
   │  Prisma $transaction untuk operasi multi-tabel
   │  helper akuntansi (double-entry jurnal) / ekspor Excel / template PDF
   ▼
PrismaClient → PostgreSQL
   │  (49 model, tabel = nama model)
   ▼
Response JSON (atau PDF/Excel stream)
   │
   ▼
React FE → render UI
```

## Pola / Pattern Konsisten

- **Modular Express Router per resource** — `routes/akuntan/` dipecah per domain (`rabP12.js`, `jurnal.js`, `stok.js`, dst) dan digabung di `index.js`.
- **Autentikasi & otorisasi** — `middleware/auth.js`: `requireAuth` verifikasi JWT (`Authorization: Bearer ***`) sekaligus memastikan akun masih aktif; `requirePermission` (RBAC v2) membatasi akses berdasarkan permission dengan SEED/MANUAL source distinction.
- **Validasi Zod** — `middleware/validate.js` mem-parse `body`/`params`/`query` dengan skema dari `validators/`; error dikembalikan sebagai 400 berisi pesan per field.
- **Prisma `$transaction`** — operasi yang menyentuh beberapa tabel (mis. input penerima manfaat + detail, transaksi pembelian + item, pembuatan dokumen resmi) dibungkus transaksi agar atomik.
- **PDF generation** — `lib/launchPuppeteer.js` membootstrap `puppeteer-core` + `@sparticuz/chromium`; tiap dokumen punya template HTML sendiri di `templates/dokumen/`.
- **Akuntansi double-entry** — `lib/accountingHelper.js` menjamin jurnal dan laporan keuangan (BKU, LRA, neraca saldo) konsisten.
- **Email notification** — `lib/email.js` dengan Nodemailer + SMTP configuration (Gmail, Brevo, Ethereal, Custom) dan HTML email templates dengan proper escaping.
- **AI Chatbot** — `lib/chat/` dengan multi-provider adapter (OpenAI, Gemini, Groq, Custom), tool registry baca-saja, encryption AES-256-GCM, dan ChatLog retensi 30 hari.
- **Penanganan error global** — error handler di `app.js` mengembalikan JSON tanpa membocorkan stack trace ke client.
- **Audit trail** — `lib/auditHelper.js` mencatat aksi penting ke `AuditLog`.
- **Dynamic RBAC v2** — kolom `source` (SEED/MANUAL) untuk safe pruning grant manual dan UI matrix permission management.
