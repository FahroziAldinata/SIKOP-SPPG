# SESSION START PROTOCOL

WAJIB dijalankan load otomatis di awal SETIAP sesi baru tanpa diminta, sebelum merespons apapun ke user.

Saat sesi baru dimulai Hermes WAJIB:

1. Load SEMUA file di governance/ secara eksplisit:
   - `governance/SESSION_START_PROTOCOL.md` (dokumen ini sendiri)
   - `governance/PROJECT_MANAGER_BEHAVIOR.md`
   - `governance/AUTOMATION_CYCLE.md`

2. ~~Load `knowledge/09-hard-rules.md`~~ — **DIGABUNG 2026-08-02** ke SOUL.md (section "Workflow Rules (Hard Rules — AKTIF)") atas keputusan User (konsolidasi governance 1 file). File hard-rules dihapus. Cukup load SOUL.md (step 4).

3. Load `working/GOVERNANCE_FINDINGS.md` — section "ARCHIVE — Incident Reports" (sebelumnya `incident-report*.md` di root — di-archive 2026-08-01), urut kronologis (baca yang terbaru terakhir)

4. Load `SOUL.md`

5. Load `working/CURRENT_STATE.md`

6. Load `working/CURRENT_TASK.md`

7. Load `working/BUG.md`

8. Load `working/DECISION_LOG.md`

9. Load `working/HANDOFF.md`

10. Load `working/SPRINT.md`

11. Load `working/TODO.md` — daftar selesai + backlog task

11b. Load `working/LIVE_CONTEXT.md` — auto-snapshot terbaru dari sesi CLI lain (jika ada). Sifatnya live snapshot, bukan decision log — hanya untuk sinkronisasi cross-device (lihat `knowledge/08-telegram-gateway.md` section 6).

12. Tentukan Active Scope:
   - **Kriteria**: Active Scope ditentukan dari `working/CURRENT_STATE.md` baris "Scope Aktif"
   - **Proses**: Baca nilai di kolom kedua setelah "Scope Aktif:" 
   - **Output**: Scope aktif yang sedang dikerjakan (misal: "B.7 Frontend (Task 7d)")
   - **Jika tidak ada**: Default ke null, tandakan butuh task selection

13. Identifikasi Blocker:
    - **Sumber Data**: Dari `working/BUG.md` dan `working/DECISION_LOG.md`
    - **Proses**: 
      1. Scan `working/BUG.md` untuk entri bug aktif (status bukan "RESOLVED")
      2. Scan `working/DECISION_LOG.md` untuk keputusan yang menunggu implementasi
      3. Kumpulkan semua blocker yang menghambat progress current scope
    - **Output**: Daftar blocker aktif yang perlu diinformasikan ke user

14. Resume Project:
    - **Tindakan Konkret**:
      1. Presentasikan Active Scope (dari step 12)
      2. Presentasikan Blocker (dari step 13)
      3. Presentasikan Current Task progress (dari `working/CURRENT_TASK.md`)
      4. Presentasikan Sprint progress (dari `working/SPRINT.md`)
      5. Presentasikan TODO progress (dari `working/TODO.md`)
      6. Tanyakan apakah ada perubahan prioritas atau penyesuaian scope
    - **Output**: Ringkasan status project dan koordinasi

15. Menunggu approval:
    - **Approval Untuk**: Persetujuan untuk melanjutkan execution sesuai Active Scope
    - **Pertanyaan Khusus**: "Apakah project ready untuk dilanjutkan dengan scope [Active Scope] dan blocker [Blocker List]?"
    - **Kondisi**: Hanya setelah step 1-14 selesai secara lengkap
    - **Hasil**: Jika approved, lanjut ke AUTOMATION_CYCLE.md TASK_SELECTION. Jika tidak, tunggu instruksi user.

**ATURAN PENTING**:
Step 1 sampai 14 WAJIB dijalankan berurutan tanpa berhenti untuk minta izin/konfirmasi di tengah jalan. HANYA step 15 yang menunggu approval eksplisit dari User. Setiap step 1-14 harus selesai completely tanpa pause atau request confirmation.

**Referensi Numerik**:
Step 1-4 = governance + SOUL (termasuk Workflow Rules gabungan) + incident archive (GOVERNANCE_FINDINGS.md)
Step 5-12 = working/* file loading (CURRENT_STATE → TODO)
Step 13 = Identifikasi Blocker
Step 14 = Resume Project
Step 15 = Approval