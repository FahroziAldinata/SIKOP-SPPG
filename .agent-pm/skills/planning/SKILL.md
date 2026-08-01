# Skill: Planning

Gunakan skill ini saat memulai sprint baru atau mengambil task baru dari backlog.

## Trigger
Mulai sprint baru / mengambil task baru dari backlog `working/SPRINT.md`.

## Task State Machine
Setiap task wajib mengikuti urutan state berikut tanpa melompati state:
`NEW` ──> `PRECHECK` ──> `READY` ──> `IMPLEMENTING` ──> `REVIEW` ──> `TESTING` ──> `APPROVED` ──> `DOCUMENTED` ──> `DONE`

*Catatan*: `working/CURRENT_TASK.md` wajib menyimpan status state terkini.

---

## Input
- `working/SPRINT.md`
- `working/DECISION_LOG.md`
- File-file di `knowledge/` (`01-project-overview.md` s/d `06-business-workflow.md`)
- Hasil penelusuran kode existing dari OpenCode Desktop (via Pre-Check Prompt)

---

## Batasan Hasil Planning Awal (Initial Planning Output)
Sebelum PreCheck selesai dijalankan oleh OpenCode, Planning awal **HANYA BOLEH** menghasilkan:
1. **Objective** (Tujuan task)
2. **Dependency** (Keterkaitan berkas/fitur)
3. **Risk** (Potensi risiko)
4. **Need PreCheck** (Daftar hal yang wajib diverifikasi OpenCode)

**DILARANG KETAT** membuat endpoint, query API, nama field, nama skema, atau rincian implementasi teknis sebelum hasil PreCheck OpenCode diterima.

---

## Proses

1. **Pecah Backlog & Inisialisasi Task (`NEW` ──> `PRECHECK`)**:
   - Ambil item backlog dari `working/SPRINT.md`.
   - Update `working/CURRENT_TASK.md` ke status `PRECHECK`.
   - Terapkan **Scope Lock**: Dilarang menambah fitur, endpoint, refactor, atau mengubah requirement di luar `SPRINT.md`.

2. **Susun Pre-Check Prompt Siap-Tempel**:
   - Susun Pre-Check Prompt untuk OpenCode Desktop agar membaca secara verbatim kode existing.

3. **User Eksekusi Pre-Check di OpenCode Desktop**:
   - User menjalankan Pre-Check di OpenCode Desktop dan menyalin hasilnya balik ke chat.

4. **Evaluasi PreCheck & Rule Kegagalan**:
   - Jika hasil Pre-Check **tidak ada, tidak lengkap, ambigu, atau tidak verbatim**:
     Status task TETAP `PRECHECK` dan eksekusi **HALT**:
     ```text
     🛑 PROCESS HALTED
     Reason: Hasil Pre-Check tidak lengkap / ambigu / belum verbatim.
     Required Action: Jalankan ulang Pre-Check di OpenCode Desktop untuk berkas terkait.
     ```
     *"Never continue implementation planning with incomplete Pre-Check data."*

5. **Transisi ke `READY` & Penyusunan Task Brief**:
   - Jika Pre-Check valid & lengkap verbatim, ubah status `CURRENT_TASK.md` ke `READY`.
   - Susun Task Brief presisi berdasarkan data verbatim OpenCode untuk diberikan ke IDE Agent (transisi ke `IMPLEMENTING`).

---

## Output
- Pre-Check Prompt siap-tempel untuk OpenCode Desktop.
- `working/CURRENT_TASK.md` ter-update (AUTO WRITE).
- Task Brief granular berbasis data verbatim untuk IDE Agent.
- **Source Attribution**: Wajib mencantumkan sumber (misal: `Source: OpenCode Pre-Check`, `Source: knowledge/03-architecture.md`).
- **Confidence**: `HIGH` / `MEDIUM` / `LOW` (disertai alasan jika bukan HIGH).

---

## Template Pre-Check Prompt (Siap-Tempel ke OpenCode Desktop)

```text
Jelaskan struktur dan implementasi kode existing yang berhubungan dengan task berikut:
Task: [Nama & Deskripsi Task dari SPRINT.md]

Tolong periksa file-file relevan dan berikan informasi VERBATIM (bukan rangkuman/asumsi):
1. Route backend / handler terkait (nama endpoint, method, parameter, dan format response JSON).
2. Schema model Prisma yang terlibat (nama model, nama kolom, tipe data, dan constraint).
3. Komponen frontend terkait (props, state, hook API, dan komponen UI yang digunakan).
4. Helper atau utility function yang sudah ada dan bisa digunakan kembali.

Tujuan: Memastikan spesifikasi task dibuat 100% berdasarkan kode nyata tanpa asumsi.
```
