# Governance Findings

> **Ringkas**: 2026-08-02 — detail panjang dipangkas atas keputusan User (efisiensi context). Esensi per temuan + pelajaran aktif dipertahankan.

## Temuan Resolved (GF-001 s.d. GF-008)

| ID | Tanggal | Kategori | Esensi | Status |
|---|---|---|---|---|
| GF-001 | 2026-07-25 | Operational Boundary | Hermes hanya definisikan input/output/workflow — eksekusi tool milik user/agent | RESOLVED |
| GF-002 | 2026-07-25 | Process Violation | Prompt wajib di-save ke audit trail SEBELUM ditampilkan ke chat | RESOLVED |
| GF-003 | 2026-07-26 | Process Violation | Aturan baru → default ke file governance permanen, bukan file task spesifik; tanya balik jika ambigu | RESOLVED |
| GF-004 | 2026-07-26 | Structural Gap | governance/*.md wajib di-load di SESSION_START_PROTOCOL (rules aktif sebelum proses task) | RESOLVED |
| GF-006 | 2026-07-26 | QA Gap | Review frontend WAJIB sertakan build/lint aktual verbatim — gagal jika tidak bersih | RESOLVED |
| GF-007 | 2026-07-26 | Process Violation | Self-check wajib sebelum mark SELESAI: sudah lewat AWAITING_USER_VERIFICATION + User OK eksplisit? | RESOLVED |
| GF-008 | 2026-08-02 | Process Violation | FINALIZE commit via AGY — seharusnya OpenCode ("commit tugas opencode", koreksi User) | RESOLVED |
| GF-009 | 2026-08-03 | QA Gap | Klaim "semua test PASS" wajib verifikasi independen — self-report AI bisa keliru (race condition) | RESOLVED (aturan diadopsi) |
| GF-010 | 2026-08-04 | Source Attribution | Frasa "12 jam + refresh token" (instruksi STEP 3 V3 F1) TIDAK punya sumber di riwayat/sesi/prompt/file state — hanya muncul di pesan User sendiri; "refresh token" bersumber dari backlog V3 FASE 1 (TODO.md:79) tanpa angka durasi | RESOLVED (dokumentasi) |
| GF-011 | 2026-08-05 | Process Violation | Perubahan uncommitted TASK A (errorHandler.js) HILANG dari working copy saat session OpenCode leak fix — tidak di reflog/stash/commit; kemungkinan `git reset`/`restore` tak sengaja oleh agent. Terdeteksi saat FINALIZE (OpenCode lapor "identik HEAD"). Recovery: re-apply diff verbatim (index hash identik), verifikasi 123/123 + lint 0/0, commit `92fcba5`. Plus file stray `"how 9dc3c7f --stat"` di root (untracked sampah) | RESOLVED (aturan diadopsi) |
| GF-012 | 2026-08-05 | Source of Truth | State files (CURRENT_STATE/TODO/HANDOFF) klaim "commit BELUM push" padahal `git log origin/main` menunjukkan SUDAH pushed — state files tertinggal dari kondisi git remote. Aturan: setiap awal sesi, `git log origin/main` = sumber kebenaran PRIMARY; state files = referensi SEKUNDER | RESOLVED (aturan diadopsi) |
| GF-013 | 2026-08-10 | Structural Gap | Test suite backend jalan di DB YANG SAMA dengan dev/uji manual (tanpa DB test terpisah) — chat.test.js login user seed produksi + deleteMany ChatLog by userId seed (ChatLog produksi-dev ikut terhapus, count 0); SystemConfig pernah hilang total oleh test. DIMITIGASI: backup/restore SystemConfig di afterAll. Keputusan User: KNOWN RISK, jangan fix sekarang (pola bukti-lpd2m) | KNOWN RISK (tercatat) |
| GF-014 | 2026-08-10 | Environment/Structural (3 temuan) | 3 temuan env dari verifikasi PDF E2E: (1) DATABASE_URL tidak ke-load di unit test yang TIDAK lewat src/app.js (dotenv.config() hanya di app.js) → hasil test tergantung URUTAN file (race — kadang PASS kadang FAIL); (2) Password DB campur: aslap/mitra = Test@123456 vs 4 role lain ganti-password-ini, padahal seed.js hanya punya 1 hash default; (3) Drift seed grant RBAC: GIZI-TARGET grant KEPALA_SPPG hilang dari DB (= rbac-fix-review fail). SEMUA RESOLVED — T1 via setupFiles (`1fbad1b`), T2 via investigasi 2026-08-12 (mekanisme jelas = test suite mutasi user seed; kondisi campur sudah hilang sendiri — lihat detail bawah), T3 via `d9d6a44` | RESOLVED (T1/2/3) |

## Detail GF-014 — 3 temuan environment dari verifikasi PDF E2E (2026-08-10)

- **Konteks**: verifikasi suite penuh untuk task PDF E2E Validation Suite menemukan 8 FAIL + 19 skipped — SEMUA pre-existing env, 0 dari perubahan task. Verifikasi per-file task 100% PASS.
- **Temuan 1 — DATABASE_URL tidak ke-load di unit test yang tidak lewat app.js** (kategori: bug rapuh NYATA, bukan cuma env lokal):
  - `dotenv.config()` HANYA di `src/app.js`. Unit test yang instantiate `new PrismaClient()` langsung (mis. `src/lib/chat/tools/__tests__/tools.test.js`, `chat-retensi.test.js`) tanpa `require` app → `process.env.DATABASE_URL` kosong → `PrismaClientInitializationError`.
  - Karena vitest `fileParallelism: false` (1 proses), begitu ada file test yang require app.js, env global terisi → file berikutnya kebetulan dapat env. **Hasil test tergantung URUTAN eksekusi file** — kadang PASS kadang FAIL (race, nondeterministik). Ini benar-benar bug infra test, bukan masalah lokal User.
  - **Backlog task (worth dikerjakan)**: tambah `setupFiles` di `backend/vitest.config.js` (mis. setup file yang `dotenv.config()`) supaya TIAP file test load `.env` sendiri, independen urutan.
- **Temuan 2 — Password DB campur** ✅ **RESOLVED 2026-08-12 (investigasi T2) — penjelasan resmi**:
  - **Gejala asli (2026-08-10)**: DB lokal: `admin/akuntan/ahligizi/kepalasppg` = `ganti-password-ini`, `aslap/mitra` = `Test@123456`. Padahal `seed.js:181` hanya punya 1 hash default `ganti-password-ini` (literal tak pernah berubah sejak awal, cost 12 sejak `bd1c58b`). Akibat: `TEST_PASSWORD=Test@123456` di .env → 401 massal untuk 4 role; override `ganti-password-ini` → 401 untuk aslap/mitra.
  - **Akar penyebab (mekanisme — JELAS, diverifikasi 2x via bcrypt.compare ke DB)**: test suite MUTASI user seed nyata — `token-version.test.js` (`afterAll` menulis `bcrypt.hash(TEST_PASSWORD, 10)` untuk user `aslap`) dan `admin-reset-password.test.js` (sama, untuk `mitra`). Saat `.env` berisi `TEST_PASSWORD=Test@123456`, tiap run suite mengunci aslap/mitra jadi `Test@123456`; 4 role lain tak pernah disentuh test → tetap `ganti-password-ini`. Literal `Test@123456` BUKAN dari seed.js/git mana pun — disuntikkan dari `.env` oleh test cleanup. Bukti pendukung: AuditLog `mitra` = 66x admin-reset (passwordChanged=true, byUserId=admin, pola `admin-reset-password.test.js` berulang 08-08→08-11); `aslap` = 0 audit admin (direset via `PUT /auth/profile` self).
  - **Kenapa sekarang bersih (2026-08-12)**: `.env` kini TANPA `TEST_PASSWORD` → fallback default `ganti-password-ini`; run suite terakhir sesi pruning RBAC 08-11 memulihkan aslap/mitra ke default, lalu rehash login (auth.js:86-95, cost 10→12). Verifikasi DB actual: semua 6 user = cost 12, `bcrypt.compare('ganti-password-ini')` = true; `updatedAt` 08-11 10:23-24Z. Kondisi campur HILANG — non-issue.
  - **Asal-usul kapan `Test@123456` pertama masuk .env**: TIDAK BISA dipastikan — history git di-purge (reset repo 08-02, DECISION_LOG.md); 0 catatan manual di .agent-pm. Moot karena kondisi sudah hilang.
  - **Risiko nyata 1 (rendah, dev-only, JANGAN di-fix di task ini)**: test tulis ke user seed nyata (username hardcoded) + restore cost 10 (di bawah kebijakan cost 12). Refactor test-user terpisah dijadwalkan — 1 task gabungan dengan GF-013 (akar sama: test tidak terisolasi dari data kerja nyata), keputusan User 2026-08-12. Endpoint reset password AMAN (requirePermission admin-user + invalidasi sesi + audit + cost 12) — tanpa celah eksploitasi.
  - **Laporan**: `.agent-pm/plans/2026-08-12-t2-investigasi-password-campur.md` (170 baris, bukti verbatim). 0 password/data diubah selama investigasi.
- **Temuan 3 — Drift seed grant RBAC: GIZI-TARGET KEPALA_SPPG hilang dari DB** (kelas lebih sensitif — RBAC):
  - `rbac-fix-review.test.js` fail: grant GIZI-TARGET untuk KEPALA_SPPG tidak ada di DB, padahal `rbacSeeder.js` mendefinisikannya (keputusan 2026-08-06, `c20a864`).
  - Pertanyaan kunci: cuma DB lokal yang drift, atau seed script berubah? Perlu cek cepat (bukan sekarang, tapi JANGAN lupa) — RBAC drift kelasnya lebih sensitif dari password test. Verify: `git diff rbacSeeder.js` vs DB grant actual.
- **Status**: BACKLOG (tercatat 2026-08-10, keputusan User). Task PDF E2E di-commit tanpa menunggu fix env (bukti per-file PASS).

- **Kategori**: Structural Gap / Known Risk (isolasi environment test vs dev).
- **Deskripsi**: Seluruh suite backend (vitest) jalan di database lokal dev yang SAMA dengan BE live + uji manual User. Tidak ada DB test terpisah.
- **Bukti**:
  1. `backend/vitest.config.js` TIDAK punya override `DATABASE_URL`/setupFiles env; `.env.test` tidak ada — tiap file test me-load `.env` dev ("injected env (3) from .env" = DATABASE_URL/ENCRYPTION_KEY/JWT_SECRET).
  2. `chat.test.js:53-63` login pakai USER SEED PRODUKSI (`login('admin')/('aslap')/('akuntan')`) — bukan create user test.
  3. Dampak nyata: `chat.test.js:71,80` `chatLog.deleteMany({ where: { userId: { in: [userAdmin.id, userAslap.id, userAkuntan.id] } } })` menghapus SEMUA ChatLog milik user seed — terverifikasi setelah suite terakhir (2026-08-10 21:14 WIB): **ChatLog count = 0** (13 row hari ini hilang: error audit + E2E sukses). Ini pola LAMA (sejak sesi 46/47), bukan baru dari Tahap 3 retensi.
  4. `SystemConfig` id 'system' juga ditimpa tiap suite (`chat.test.js:337,430` deleteMany id 'system' untuk test 400) — pernah menyebabkan record hilang total (2026-08-10, sesi fullfix). DIMITIGASI: backup+restore di afterAll (`chat.test.js` + `chat-tools.test.js`) + deleteMany di-scope `where id 'system'`.
- **Keputusan User (2026-08-10)**: dicatat sebagai KNOWN RISK — JANGAN di-fix sekarang (pola sama dengan known risk bukti-lpd2m DELETE). Dokumentasi saja.
- **Usulan backlog (non-blocker)**: isolasi DB test (DATABASE_URL test terpisah + seeder khusus test) ATAU setidaknya sandbox: test chat jangan delete ChatLog user seed (pakai user test ber-id unik).
- **Status**: KNOWN RISK (tercatat 2026-08-10). Mitigasi parsial SystemConfig SUDAH diterapkan.

## Detail GF-012 — State files tertinggal dari git remote (2026-08-05)

- **Kategori**: Source of Truth (integritas status project).
- **Deskripsi**: CURRENT_STATE.md, TODO.md, HANDOFF.md mencatat commit coverage cycle 2 (`682da6c`) dan cycle 3 (`cb2803b`) sebagai "BELUM push — menunggu review User + Claude", padahal verifikasi independen `git log origin/main -10 --oneline` menunjukkan KEDUANYA SUDAH di remote (push sudah terjadi di luar sesi). State files menyimpan status basi → informasi salah ke User.
- **Akar masalah (probable)**: state files di-update saat commit dibuat, tapi tidak diverifikasi ulang terhadap remote setelah push; asumsi "belum push" dipertahankan dari teks lama tanpa cek git.
- **Pelajaran aktif**: (1) SETIAP awal sesi, jalankan `git log origin/main -N --oneline` (dan `git rev-parse HEAD origin/main`) SEBELUM mempercayai klaim push/pending di state files; (2) `git remote` = sumber kebenaran PRIMARY untuk status commit; state files = referensi SEKUNDER yang boleh tertinggal; (3) klaim "BELUM push"/"menunggu approval" di state files harus diverifikasi ulang ke remote sebelum dijadikan dasar keputusan/blocker.
- **Status**: RESOLVED (aturan diadopsi 2026-08-05). Sinkronisasi state files → commit `docs: sinkronisasi state file dengan kondisi git remote aktual`.

## Detail GF-011 — Uncommitted changes hilang oleh session agent (2026-08-05)

- **Kategori**: Process Violation (integritas working copy).
- **Deskripsi**: Setelah TASK A (errorHandler NODE_ENV guard) diverifikasi (5/5 behavior + 123/123 test), session OpenCode leak-fix (git apply + commit `9dc3c7f`) secara tak sengaja menghilangkan perubahan uncommitted errorHandler.js — status pasca-session: file identik HEAD, tidak ada di reflog/stash/commit mana pun. Di luar itu, muncul file untracked aneh bernama `"how 9dc3c7f --stat"` (sampah, dihapus).
- **Akar masalah (probable)**: agent session yang menjalankan command git recovery/cleanup (reset/restore/checkout) tanpa scope eksplisit, atau command malformed yang diinterpretasikan sebagai operasi git. Tidak ada bukti commit ilegal (git log errorHandler hanya `71d754e`).
- **Pelajaran aktif**: (1) SEBELUM tiap agent session: catat `git status --short` baseline (file modified + hash diff); (2) SESUDAH tiap session: verifikasi file yang diharapkan MASIH modified (`git diff HEAD -- <file>`); (3) jangan pernah instruksikan agent melakukan `git reset`/`git restore`/`git checkout` di working copy yang punya uncommitted changes selain file scope task; (4) prompt agent WAJIB menyebut "JANGAN jalankan git reset/restore/checkout/stash"; (5) diff TASK A tersimpan verbatim di state files → recovery cepat via re-apply.
- **Status**: RESOLVED (aturan diadopsi 2026-08-05). Commit `92fcba5` = hasil re-apply.

## Detail GF-010 — Frasa "12 jam + refresh token" tanpa sumber riwayat (2026-08-04)

- **Kategori**: Source Attribution (instruksi ambigu / asal-usul spesifikasi).
- **Deskripsi**: Di laporan audit JWT (STEP 3 V3 F1), Hermes menyebut "Opsi B: expiry 12 jam dengan refresh token" persis dari instruksi User, lalu mencatat bahwa 12 jam > 8 jam berarti memperpanjang (bukan mengurangi) dan meminta klarifikasi. User meminta bukti sumber frasa "12 jam + refresh token" — dicek lengkap, tidak ditemukan.
- **Bukti pencarian (lokasi yang diperiksa, semuanya)**: (1) session_search "refresh token"/"12 jam"/"expiry" — hanya sesi aktif tersedia; match = item backlog V3 FASE 1, tidak ada "12 jam"; (2) search_files .agent-pm (pattern `refresh token|12 jam|expiry|TOKEN_EXPIRY|tokenVersion`) — 1 match: TODO.md:79 "Review mekanisme JWT: expiry, algoritma, dan kebutuhan refresh token"; (3) `git log --all --grep "refresh|12 jam|expiry|jwt"` — hanya `62c76ca ci: tambah JWT_SECRET env di job backend test` (tidak relevan); (4) `.agent-pm/prompts/` — 4 file commit docs (arsip sesi 36, backlog V3, tag), tidak ada prompt JWT; (5) `.agent-pm/plans/` — 5 plan (V2 + step1-rate-limit), tidak ada "12 jam"; (6) backup sesi lama `D:\Tools_Project\hermes_backup_sessions_20260804\state.db` (bytes scan penuh) — `"12 jam"` = **0 match**, `"refresh token"` = 6 match, SEMUA berasal dari pesan User "TASK: Susun Backlog V3" (sesi 20260804_021320_63ac73) + eksekusi update TODO.md section V3 — tanpa angka durasi.
- **Kesimpulan**: Tidak ditemukan sumber "12 jam" di mana pun. Satu-satunya kemunculan = instruksi User sendiri di pesan TASK STEP 3 sesi ini. "refresh token" bersumber dari backlog V3 FASE 1 (TODO.md:79, commit `eec6b1c`) — tanpa nilai durasi. Bukan diklaim "salah kutip" — fakta: frasa datang dari instruksi User, tapi tidak didukung riwayat/prompt/file state mana pun.
- **[UPDATE 2026-08-04 — KEPUTUSAN User]**: Keputusan final — expiry JWT TETAP `8h`. Frasa "12 jam + refresh token" diakui sebagai **usulan agent** (dari opsi rekomendasi Hermes) yang kemudian salah diatribusikan seolah instruksi user. Pelajaran ditambah: (1) angka spesifik dalam instruksi (durasi, limit, cost) yang tidak ada di sumber tertulis → TANYA dulu sebelum dipakai sebagai opsi; (2) hasil klarifikasi sumber WAJIB didokumentasikan + bukti pencarian, bukan asumsi; (3) **laporan WAJIB membedakan eksplisit antara opsi/skenario usulan agent vs instruksi nyata dari user** — label jelas (mis. "usulan Hermes" vs "instruksi User") supaya tidak terjadi salah atribusi lagi.
- **Status**: RESOLVED (dokumentasi 2026-08-04). Keputusan expiry menunggu User.

## Detail GF-009 — Pentingnya verifikasi independen, bukan self-report (2026-08-03)

- **Kategori**: QA Gap (Process / Verification)
- **Deskripsi**: Saat setup testing infra V2 Bagian A (Vitest backend), laporan self-report awal AI mengklaim **62/62 test PASS**. Verifikasi independen (jalankan `npm test` sendiri) menemukan **3 FAIL** — `pemeriksaan-bahan.test.js` `[T7]` (PDF 200→404) & `[T8]` (nomorUrut 200→404) — yang TIDAK terlihat di run AI.
- **Akar masalah (race condition)**: `fileParallelism` default Vitest menjalankan file test SECARA PARALEL, padahal semua integration test memakai database shared yang SAMA (Prisma) dan saling create/delete data → tabrakan antar file. File lulus saat dijalankan sendirian, gagal saat satu suite.
- **Perbaikan**: atur `fileParallelism: false` di `backend/vitest.config.js` (file test SEKUENSIAL) → **62/62 stabil selama 2x run**.
- **Pelajaran aktif**: Setiap klaim "semua PASS"/"selesai/berhasil" dari agent (AGY/OpenCode) WAJIB diverifikasi independen, terutama untuk test/integrasi yang menyentuh SHARED STATE (database, file system, dll.) — race condition bisa muncul hanya pada run berikutnya. Verifikasi = jalankan ulang sendiri + bukti verbatim, bukan terima laporan.
- **Status**: RESOLVED (aturan diadopsi sebagai kebiasaan verifikasi).

## Detail GF-008 — FINALIZE commit via AGY (koreksi User 2026-08-02)

- **Kategori**: Process Violation
- **Deskripsi**: Sesi 28 (V2-4 batch 2), User instruksikan "jangan gunakan opencode untuk eksekusi, gunakan agy". Hermes mengartikan "eksekusi" mencakup FINALIZE commit → memakai AGY untuk commit `57570b2` + `e475d34` + push. Padahal pembagian agent tetap: commit + push = OpenCode ("commit tugas opencode" — koreksi eksplisit User).
- **Akar masalah**: Instruksi singkat "gunakan agy" diinterpretasikan luas tanpa klarifikasi scope (BUILD vs commit). Ambiguitas "eksekusi" tidak ditanyakan.
- **Perbaikan**: (1) PROJECT_MANAGER_BEHAVIOR.md di-update — tabel pembagian agent eksplisit: BUILD = AGY, FINALIZE commit = OpenCode; (2) knowledge/10-model-strategy.md di-update (instruksi eksplisit User, override FORBIDDEN knowledge/*); (3) aturan: kalau instruksi agent ambigu (BUILD vs commit vs verifikasi), TANYA scope ke User dulu.
- **Status**: RESOLVED (dokumentasi governance selesai 2026-08-02). Commit `e475d34` tetap berlaku (sudah di-push, repo publik) — bukan untuk di-revert.

---

# ARCHIVE — Incident Reports (2026-07-28 s.d. 2026-08-01)

> **Moved**: 2026-08-01 — file `incident-report-*.md` di root .agent-pm di-archive ke sini (keputusan User).
> **Ringkas**: 2026-08-02 — detail kronologi dipangkas; esensi + pelajaran aktif dipertahankan.
> **Status**: Semua ARCHIVED (historis). Referensi: SESSION_START_PROTOCOL.md step 3.

## Incident 1 — 2026-07-28: 3 Task dalam 1 Cycle + BUILD OpenCode bukan AGY

- **Esensi**: C.2+C.3+Z.9 dikerjakan 1 siklus, 1 commit `05e66ad` → campur, sulit revert, tidak bisa approve per task. BUILD pakai OpenCode langsung tanpa coba AGY.
- **Pelajaran aktif**: 1 task = 1 AUTOMATION_CYCLE, tanpa pengecualian — bahkan jika User minta "sekaligus". (→ SOUL Workflow Rules Aturan 2)
- **[UPDATE 2026-08-01]**: bagian "BUILD = AGY primary" **OBSOLETE** — keputusan User 2026-07-31 membalik: OpenCode = builder default, AGY hanya task berat (quota + approval). Lihat SOUL.md Aturan 3.

## Incident 2 — 2026-07-30: Hermes Fix Langsung Tanpa Agent (Zero-Threshold Violation)

- **Esensi**: Error `Unexpected token '<'` di FE → Hermes read_file/patch/write_file/terminal langsung, tanpa OpenCode/AGY sekali pun, dengan alibi "cuma 5 baris proxy, terlalu kecil".
- **Pelajaran aktif**: **Zero-Threshold** — tidak ada "terlalu kecil buat agent". Setiap interaksi file project WAJIB lewat agent. Satu-satunya yang boleh langsung: `.agent-pm/` files, `todo`, `memory`. (→ SOUL Workflow Rules Aturan 5 + Workflow Baku C)

## Incident 3 — 2026-08-01: Audit Folder .agent-pm (multi-device sync)

- **Esensi**: Hasil kerja beda antar device padahal selalu push. Ditemukan 4 root cause:
  1. `.gitignore` baris `Skills/` (tanpa root anchor) ikut nge-ignore `.agent-pm/skills/` → skill kunci TIDAK PERNAH ter-push. Fix: `/Skills/` root-anchored (commit `4412eba`)
  2. Cron sync-hermes mati diam-diam (error sejak 2026-07-30) — jaring pengaman sync hilang
  3. Governance kontradiksi antar file (OpenCode default vs AGY #1, model Hermes diklaim 4 macam) — diseragamkan ke keputusan User
  4. State files dual-source of truth (TODO klaim SELESAI + NEXT sekaligus; CURRENT_STATE klaim commit placeholder) — TODO = single source
- **Pelajaran aktif**:
  1. Pattern gitignore tanpa root-anchor bisa nge-ignore folder lain yang namanya sama
  2. Cron sync adalah jaring pengaman — kalau mati diam-diam, device divergen
  3. State file TIDAK boleh klaim SELESAI tanpa bukti commit (hash asli)
  4. Perubahan governance harus lintas-file konsisten — jangan update 1 file, biarkan 3 file kontradiksi
- **[UPDATE 2026-08-01]**: 5 folder skill sudah di-commit (`121fffe`), cron sync-hermes di-recreate (`05fd5c684e88`).
- **[UPDATE 2026-08-02]**: cron sync-hermes di-**pause** (keputusan User — workflow manual push/pull cukup, jarang 2 device bersamaan).
