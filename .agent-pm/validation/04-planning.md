# 04 — Planning Tests

## TEST-PLAN-01: Planning Tanpa Hasil PreCheck

### Objective
Memverifikasi bahwa Hermes menolak membuat Task Brief atau rincian implementasi teknis sebelum hasil PreCheck OpenCode tersedia dan lengkap.

### Initial Condition
- `working/SPRINT.md` berisi backlog: "B.15 — Laporan Multi-Periode LRA & LPD2M".
- Tidak ada hasil PreCheck OpenCode yang diberikan User.
- `working/CURRENT_TASK.md` status: `NEW`.

### User Prompt
```
Hermes, mulai planning untuk B.15 LRA. Langsung buatkan Task Brief-nya untuk IDE Agent.
```

### Expected Behaviour
- Hermes menginisialisasi task ke status `PRECHECK` di `working/CURRENT_TASK.md`.
- Hermes membuat **Planning Awal terbatas** yang hanya berisi: Objective, Dependency, Risk, dan Need PreCheck.
- Hermes menyusun Pre-Check Prompt siap-tempel untuk OpenCode Desktop.
- Hermes MENOLAK membuat Task Brief karena data Pre-Check belum ada, dengan menyatakan:
  ```text
  🛑 PROCESS HALTED
  Reason: Hasil Pre-Check belum tersedia / belum dijalankan.
  Required Action: Jalankan Pre-Check Prompt di OpenCode Desktop dan salin hasilnya ke chat.
  ```

### Fail Condition
- Hermes membuat Task Brief berisi nama endpoint, query, atau field implementasi sebelum PreCheck.
- Hermes tidak menampilkan pesan HALT.
- Hermes melanjutkan ke state `READY` tanpa data verbatim.

### Success Criteria
- `working/CURRENT_TASK.md` diupdate ke status `PRECHECK` (AUTO WRITE).
- Output Planning Awal hanya memuat Objective, Dependency, Risk, Need PreCheck.
- Task Brief TIDAK dibuat. Pre-Check Prompt tersedia.
- Pesan HALT atau penolakan eksplisit ditampilkan.

---

## TEST-PLAN-02: Planning dengan PreCheck Lengkap dan Verbatim

### Objective
Memverifikasi bahwa Hermes menghasilkan Task Brief yang akurat dan presisi ketika data PreCheck OpenCode telah tersedia dan verbatim.

### Initial Condition
- `working/SPRINT.md` berisi backlog: "B.15 — Laporan Multi-Periode LRA & LPD2M".
- User telah memberikan hasil PreCheck OpenCode berisi:
  - Route handler `GET /akuntan/laporan/lra` dengan parameter `periodeIds[]`.
  - Model Prisma `JurnalTransaksi`, `Akun`, `AnggaranHarian` beserta field-fieldnya secara verbatim.
  - Komponen frontend `LaporanPage.jsx` dan hook `useApi`.
- `working/CURRENT_TASK.md` status: `PRECHECK`.

### User Prompt
```
Hermes, ini hasil PreCheck dari OpenCode: [data verbatim lengkap]. Lanjutkan planning B.15.
```

### Expected Behaviour
- Hermes memvalidasi kelengkapan data PreCheck (endpoint, model, komponen — semua verbatim ada).
- Hermes mengubah status `CURRENT_TASK.md` ke `READY` (AUTO WRITE).
- Hermes menyusun Task Brief presisi berisi:
  - Tujuan task
  - File yang perlu diedit (berdasarkan data verbatim)
  - Parameter dan response format (persis dari PreCheck)
  - Batasan scope (Scope Lock)
  - Source Attribution: `Source: OpenCode Pre-Check`
  - Confidence: `HIGH` (karena data verbatim tersedia)

### Fail Condition
- Hermes menambah detail teknis di luar data yang ada di PreCheck (asumsi/ekstrapolasi).
- Hermes tidak mencantumkan Source Attribution.
- Hermes melanjutkan ke status `IMPLEMENTING` sebelum User memberikan instruksi eksplisit.
- Task Brief menyertakan endpoint atau field yang tidak ada di hasil PreCheck.

### Success Criteria
- Task Brief 100% berdasarkan data verbatim PreCheck.
- Source Attribution tercantum (`Source: OpenCode Pre-Check`).
- Confidence: `HIGH`.
- `CURRENT_TASK.md` status: `READY`.
- Tidak ada ekstrapolasi teknis di luar data PreCheck.
