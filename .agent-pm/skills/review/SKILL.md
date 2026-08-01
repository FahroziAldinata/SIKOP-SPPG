# Skill: Review

Gunakan skill ini setelah IDE Agent selesai mengimplementasikan sebuah task (`IMPLEMENTING` ──> `REVIEW`).

## Trigger
IDE Agent selesai mengimplementasikan task / perubahan kode.

## State Machine
State saat ini: `REVIEW` ──> `TESTING`

---

## Input
- Diff / berkas yang diubah oleh IDE Agent.
- Konteks dari `knowledge/03-architecture.md` dan `knowledge/05-coding-standard.md`.
- Hasil verifikasi dari OpenCode Desktop.

---

## Review Classification Rule

### Bug (Default jika ragu)
- Aplikasi crash, API error, data salah, validasi gagal, race condition, security issue, atau UI tidak sesuai requirement.

### Decision / Architecture
- Perubahan pola desain, perubahan struktur data, perubahan alur sistem, perubahan strategi deployment, perubahan standar coding, atau perubahan performa sistem yang permanen.

---

## Decision Policy & Manual Approval
`DECISION_LOG.md` **DILARANG** ditulis secara otomatis.  
Alur Pencatatan Keputusan: **Proposal** ──> **User Approval** ──> **Decision** ──> **Decision Log**.

---

## Proses

1. **Susun Review Prompt Siap-Tempel**:
   Hermes menyusun prompt review yang disesuaikan dengan tipe task (Backend vs Frontend).

2. **User Eksekusi Verifikasi di OpenCode Desktop**:
   - **Task Backend-Only**: OpenCode Desktop melakukan pengujian LANGSUNG via terminal PowerShell (misal: cURL / Invoke-RestMethod ke server lokal) untuk menguji endpoint API, response code, dan mutasi DB.
   - **Task Frontend / UI**: OpenCode Desktop WAJIB menjalankan build/lint aktual (contoh: `npm run build` atau `npx eslint [file]`) dan menyertakan output verbatim-nya. Review dianggap GAGAL kalau build/lint tidak bersih (error, warning, fail), walau kode terlihat sesuai spec.

3. **User Mengembalikan Hasil Verifikasi**:
   User menyalin hasil verifikasi dari OpenCode Desktop balik ke chat.

4. **Evaluasi Halt Condition & Klasifikasi**:
   - **Jika Review Gagal / Backend Gagal Start / Migrasi Gagal / Bug Critical / Konflik Knowledge**:
     Proses wajib **HALT**:
     ```text
     🛑 PROCESS HALTED
     Reason: <alasan kegagalan review / bug critical>
     Required Action: <tindakan perbaikan oleh IDE Agent>
     ```
     Update `working/BUG.md` jika ditemukan bug baru. Status `CURRENT_TASK.md` kembali ke `IMPLEMENTING`.
   - **Jika Ditemukan Keputusan Arsitektur Baru**:
     Hermes menyusun **Draf Proposal Decision** dan meminta persetujuan User sebelum menulis ke `working/DECISION_LOG.md`.

5. **Transisi ke State `TESTING` & Instruksi Browser Test**:
   - Jika verifikasi OpenCode sukses, update `working/CURRENT_TASK.md` ke status `TESTING` (AUTO WRITE).
   - Hermes menyajikan langkah-langkah **Test Manual di Browser** secara rinci kepada User untuk pengujian akhir.

---

## Output
- Review Prompt siap-tempel untuk OpenCode Desktop.
- Draf Proposal Decision Log (jika ada) untuk MANUAL APPROVAL User.
- Update `working/CURRENT_TASK.md` & `working/CURRENT_STATE.md` (AUTO WRITE).
- Langkah Test Manual di Browser untuk User.
- **Source Attribution**: `Source: OpenCode Review`, `Source: knowledge/05-coding-standard.md`.
- **Confidence**: `HIGH` / `MEDIUM` / `LOW` (disertai alasan jika bukan HIGH).

---

## Template Review Prompt (Siap-Tempel ke OpenCode Desktop)

```text
Review perubahan kode berikut:
[tempel diff/file]

Tipe Task: [Backend-Only / Frontend UI / Fullstack]

Petunjuk Verifikasi:
- JIKA BACKEND: Jalankan test langsung via terminal PowerShell (contoh: Invoke-RestMethod / cURL ke server lokal) untuk menguji endpoint, response JSON { success, data }, dan error handling.
- JIKA FRONTEND: Verifikasi keabsahan kode React/JSX vs spec task, pastikan sesuai dengan coding standard 05-coding-standard.md.

Cek juga: potensi bug, dummy data, mismatch field dengan handler asli, dan race condition pada transaksi multi-table ($transaction).

Berikan ringkasan temuan singkat.
```
