# Decision Log

## Log Keputusan Arsitektur & Desain

### [2026-07-03] - Flat Router Pattern (Monolith)
- **Keputusan**: Menggunakan Flat Router Pattern di Express.js tanpa Service Layer, Repository Pattern, atau Controller terpisah. Logika bisnis langsung berada di dalam route handlers (`src/routes/*.js`).
- **Alasan**: Menjaga kesederhanaan codebase dan kecepatan eksekusi, serta mempermudah navigasi code tanpa abstraction layer yang tidak diperlukan pada monolith SPPG.

### [2026-07-03] - JWT Stateless Authentication + DB Verification
- **Keputusan**: Menggunakan JWT custom (`jsonwebtoken`) stateless dengan pengecekan `user.aktif` secara langsung di middleware `auth.js`.
- **Alasan**: Menghindari overhead session storage di server dan sangat cocok untuk komunikasi SPA React frontend via header `Authorization: Bearer`.

### [2026-07-03] - PDF Generation via Puppeteer-Core & Serverless Chromium
- **Keputusan**: PDF di-generate di server menggunakan `puppeteer-core` + `@sparticuz/chromium`.
- **Alasan**: Paket `@sparticuz/chromium` berukuran ringan (~40MB vs ~170MB+ full Chromium) yang aman dari risiko Out-Of-Memory (OOM) pada Railway free tier (RAM 512MB).

### [2026-07-03] - PDF Auth Pattern via Fetch & Blob ObjectURL
- **Keputusan**: Frontend mendownload/menampilkan PDF dengan cara `fetch` request menyertakan header `Authorization: Bearer` → dikonversi ke Binary Blob → di-render via `URL.createObjectURL` dalam `<iframe>` modal.
- **Alasan**: Native browser `window.open` tidak mendukung penyisipan header HTTP `Authorization` untuk JWT authentication.

### [2026-07-03] - Connection Strategy Dual-Port PostgreSQL
- **Keputusan**: Runtime aplikasi menggunakan Supabase PgBouncer (Port 6543, `?pgbouncer=true`), sedangkan Prisma Migration menggunakan Direct Connection (Port 5432).
- **Alasan**: Supabase PgBouncer mode transaction tidak mendukung prepared statement yang dibutuhkan oleh Prisma migration engine saat menjalankan `prisma migrate dev/deploy`.

### [2026-07-03] - Double-Entry General Ledger System
- **Keputusan**: Seluruh laporan keuangan di-generate secara realtime dari transaksi `JurnalTransaksi` (double-entry `Akun` Kas dan Biaya/Dana).
- **Alasan**: Menjamin integritas dan konsistensi data keuangan tanpa risiko rekonsiliasi atau drift angka antar tabel laporan terpisah.

### [2026-07-03] - `recalcAktualAnggaran` Transaction Pattern
- **Keputusan**: Memanggil fungsi `recalcAktualAnggaran` di dalam transaksi `$transaction` Prisma yang sama pada setiap operasi mutasi `JurnalTransaksi`.
- **Alasan**: Memastikan nilai kolom `aktual` pada `AnggaranHarian` selalu realtime dan konsisten dengan jurnal transaksi.

### [2026-07-03] - Row-Level Locking untuk Transaksi Kritis
- **Keputusan**: Menggunakan `$queryRaw\`SELECT ... FOR UPDATE\`` untuk transaksi konkuren kritis (approval Kepala SPPG, validasi penerima Aslap, inisiasi PO).
- **Alasan**: Mencegah terjadinya race condition atau konflik data saat diakses oleh beberapa pengguna secara bersamaan.

### [2026-07-25] - Penambahan Kriteria Objektif Confidence & Context Freshness di SOUL.md
- **Keputusan**: Menambahkan sub-bagian "Kriteria Penentuan Confidence" (definisi objektif HIGH/MEDIUM/LOW) dan memperbarui "Context Freshness" (3 kondisi konkret PreCheck dianggap kedaluwarsa: ada commit baru, beda sesi tanpa konfirmasi, atau jeda >24 jam) di SOUL.md.
- **Alasan**: validation/SUMMARY.md menandai dua area ini sebagai gap governance sejak RC 1.0 dibuat (tidak ada kriteria objektif Confidence, tidak ada definisi konkret "usang"). Tanpa kriteria eksplisit, penilaian Confidence dan Context Freshness bisa bersifat subjektif dan tidak konsisten antar sesi/model.

### [2026-07-25] - Restrukturisasi HANDOFF.md ke Session Start Protocol
- **Keputusan**: Menambahkan langkah "Load HANDOFF.md" di SESSION_START_PROTOCOL.md, di antara Load DECISION_LOG.md dan Load Sprint.
- **Alasan**: HANDOFF.md sebelumnya dihasilkan oleh skills/handoff/SKILL.md di akhir sesi, tetapi tidak pernah dibaca ulang secara otomatis di sesi berikutnya — menyebabkan potensi kehilangan konteks next-step meskipun filenya sudah tersimpan.

### [2026-07-25] - Pemisahan Governance Findings dari Bug Log
- **Keputusan**: Memindahkan temuan governance/operational boundary (sebelumnya "RC Finding #001" di BUG.md) ke file baru working/GOVERNANCE_FINDINGS.md dengan format [GF-001].
- **Alasan**: BUG.md ditujukan khusus untuk bug produk (aplikasi crash, error, data salah), bukan temuan tata kelola AI. Mencampur keduan

### [2026-07-25] - Perubahan Provider Model Hermes: GLM-4.5-flash sebagai Primary
- **Keputusan**: Mengganti model utama Hermes dari Gemini 3.6 Flash ke glm-4.5-flash (via Z.AI, akses langsung), dengan fallback chain:
  1. gemini-flash-lite-latest (via Google AI Studio)
  2. nvidia/nemotron-3-super-120b-a12b:free (via OpenRouter)
- **Alasan**: Gemini 3.6 Flash mengalami rate limit ketat (5 RPM, 250 request/hari) yang tidak cukup untuk workflow agentic Hermes. GLM-4.5-flash dipilih karena stabilitas kuota, dengan tiga jalur provider independen untuk fallback (masing-masing punya kuota terpisah, tidak berbagi limit).
- **Validasi**: Kedua model (Nemotron 3 Super dan GLM-4.5-flash) sudah diuji manual dengan skenario judgment ambigu — perubahan kode yang memindahkan fungsi recalcAktualAnggaran keluar dari $transaction demi performa. Keduanya berhasil:
  a. Mendeteksi konflik dengan keputusan arsitektur yang sudah tercatat sebelumnya (Row-Level Locking & Transaction Pattern)
  b. Mengklasifikasikan dengan benar sebagai BUG (race condition), bukan Decision, sesuai definisi di skills/review/SKILL.md
  c. GLM-4.5-flash tambahan menjelaskan secara eksplisit kenapa test bisa lolos meski ada bug (test environment tidak simulasikan concurrent access) — nuansa yang menambah keyakinan atas kualitas judgment model ini.
- **Provider Ditolak**: Groq gagal karena TPM terlalu kecil (~6.000) untuk payload besar Hermes; Cerebras context free tier terbatas 8.192 token; Mistral tidak menyediakan opsi gratis di akun yang didaftarkan; DeepSeek direct API tidak dipakai karena kreditnya trial 30 hari (5 juta token), bukan kuota permanen.

### [2026-08-02] - Sinkronisasi Dokumentasi Model Hermes dengan Config Aktual
- **Keputusan**: Dokumentasi model Hermes diselaraskan dengan config.yaml — model aktif = `oc/deepseek-v4-flash-free` (provider custom `9router`), bukan Nemotron-3-Ultra. Fallback chain: `glm-4.5-flash` (zai) → `gemini-3.1-flash-lite` (gemini) → `nvidia/nemotron-3-ultra-550b-a55b:free` (openrouter).
- **Alasan**: Validasi Rozi 2026-08-02 menemukan knowledge/10-model-strategy.md + TODO.md klaim "Hermes = nemotron-3-ultra" padahal config aktual deepseek-v4-flash-free. Dokumentasi stale = sumber salah informasi untuk agent lintas device.
- **Catatan**: Tanggal perubahan config tidak tercatat — terdeteksi saat validasi sesi ini. Entry 2026-07-25 (GLM-4.5-flash primary) sudah tidak relevan: GLM kini fallback, bukan primary. File di-update: knowledge/10, SOUL.md (Aturan 3b contoh), TODO.md footer.