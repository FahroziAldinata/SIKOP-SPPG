# Skill: Handoff

Gunakan skill ini di akhir sesi kerja untuk membuat ringkasan handoff dan menjaga keberlanjutan sesi.

## Trigger
Akhir sesi kerja / sebelum pergantian sesi AI.

## State Machine
State referensi: `APPROVED` ──> `DOCUMENTED`

---

## Input
- `working/CURRENT_TASK.md`
- `working/CURRENT_STATE.md`
- `working/BUG.md`
- `working/DECISION_LOG.md`
- Progress dan log perubahan pada sesi aktif.

---

## Proses

1. **Evaluasi Status Sesi**:
   Baca `working/CURRENT_TASK.md`, `working/BUG.md`, dan `working/DECISION_LOG.md` untuk mendapatkan gambaran status terkini.

2. **Susun Draft Preview HANDOFF.md di Chat**:
   Hermes menyusun draft preview terlebih dahulu di chat dengan format:
   ```text
   HANDOFF PREVIEW (Draft — Belum Tersimpan)
   ==========================================
   Ringkasan Sesi   : ...
   Task Selesai     : ...
   Task Pending     : ...
   Bug Aktif        : ...
   Keputusan Baru   : ...
   Next Step        : ...

   Source: CURRENT_TASK.md, BUG.md, DECISION_LOG.md
   Confidence: HIGH / MEDIUM / LOW (alasan jika bukan HIGH)
   ```

3. **Minta Manual Approval User**:
   ```text
   Apakah saya boleh menyimpan HANDOFF.md di atas? [Y/N]
   ```
   *Hermes DILARANG menulis ke `working/HANDOFF.md` tanpa persetujuan eksplisit User.*

4. **Tulis HANDOFF.md** (hanya jika User approve):
   Simpan konten draft ke `working/HANDOFF.md`.

5. **Update CURRENT_STATE.md** (AUTO WRITE):
   Perbarui `working/CURRENT_STATE.md` untuk merefleksikan status proyek terkini dan scope aktif.

---

## Output
- Draf Preview Handoff di chat (selalu ditampilkan dulu).
- `working/HANDOFF.md` ter-update (MANUAL APPROVAL).
- `working/CURRENT_STATE.md` ter-update (AUTO WRITE).
- **Source Attribution**: `Source: CURRENT_TASK.md`, `Source: BUG.md`, dll.
- **Confidence**: `HIGH` / `MEDIUM` / `LOW` (disertai alasan jika bukan HIGH).
