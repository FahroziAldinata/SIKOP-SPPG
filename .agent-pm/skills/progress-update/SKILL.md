# Skill: Progress Update

Gunakan skill ini setelah User memberikan persetujuan (approval) atas hasil test manual suatu task (per-task workflow).

## Trigger
User meng-approve hasil test manual per-task (konfirmasi bahwa task berfungsi dengan baik).

## State Machine
State saat ini: `APPROVED` ──> `DOCUMENTED` ──> `DONE`

---

## Input
- `working/CURRENT_TASK.md` (task yang baru disetujui / approved)
- File TODO role terkait di `.ai-context/` (misal: `.ai-context/08-TODO-Akuntan.md`)
- File progress proyek `.ai-context/02-PROGRESS.md`

---

## Proses

1. **Susun Draft Preview Update di Chat**:
   Sebelum menulis ke berkas apapun, Hermes menyusun draft preview di chat:
   ```text
   PROGRESS UPDATE PREVIEW (Draft — Belum Tersimpan)
   ==================================================
   Task yang Selesai : [Judul task dari CURRENT_TASK.md]
   Perubahan di TODO : 08-TODO-[Role].md — item "[nama item]" ditandai [x]
   Log Progress      : 02-PROGRESS.md — entri baru: "[ringkasan singkat]"
   Reset CURRENT_TASK: Kosongkan (Status: DONE)

   Source: CURRENT_TASK.md
   Confidence: HIGH / MEDIUM / LOW (alasan jika bukan HIGH)
   ==================================================
   "Apakah saya boleh menyimpan perubahan di atas? [Y/N]"
   ```

2. **Tulis Update TODO Role** (hanya jika User approve):
   Tandai/checklist task terkait di `.ai-context/08-TODO-[role].md` sebagai selesai (`[x]`).

3. **Tulis Update Log Progress** (hanya jika User approve):
   Tambahkan catatan ringkasan singkat ke `.ai-context/02-PROGRESS.md`.

4. **Reset CURRENT_TASK.md** (AUTO WRITE):
   Kosongkan `working/CURRENT_TASK.md` ke state `DONE` / template kosong siap task berikutnya.

5. **Konfirmasi Pengambilan Task Berikutnya (NO AUTO LOOP)**:
   Setelah semua update berhasil tersimpan, Hermes menampilkan konfirmasi:
   ```text
   Progress berhasil diperbarui.
   Apakah saya boleh mengambil task berikutnya dari SPRINT.md? [Y/N]
   ```
   - Jika User jawab **[Y]**: Jalankan `skills/planning/SKILL.md`.
   - Jika User jawab **[N]**: Hermes berhenti dan menunggu instruksi selanjutnya dari User.

---

## Output
- Draft Preview update untuk konfirmasi User (selalu ditampilkan dulu).
- `.ai-context/08-TODO-[role].md` ter-update (MANUAL APPROVAL).
- `.ai-context/02-PROGRESS.md` ter-update (MANUAL APPROVAL).
- `working/CURRENT_TASK.md` direset ke template kosong (AUTO WRITE).
- Konfirmasi manual `[Y/N]` sebelum memulai Planning task berikutnya.
- **Source Attribution**: `Source: CURRENT_TASK.md`.
- **Confidence**: `HIGH` / `MEDIUM` / `LOW` (disertai alasan jika bukan HIGH).
