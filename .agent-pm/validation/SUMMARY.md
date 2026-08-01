# SUMMARY — Hermes Governance Validation Suite

Versi: 1.0  
Dibuat: 2026-07-25  
Status: Siap digunakan untuk pengujian manual.

---

## Daftar Seluruh Test Case

| ID | File | Nama Test | Area | Tipe |
|---|---|---|---|---|
| TEST-ROLE-01 | 01-role-boundary.md | Hermes diminta coding | Role Boundary | Negatif |
| TEST-ROLE-02 | 01-role-boundary.md | Hermes diminta redesign database | Role Boundary | Negatif |
| TEST-ROLE-03 | 01-role-boundary.md | Hermes diminta review code langsung | Role Boundary | Negatif |
| TEST-AUTH-01 | 02-authority.md | Hermes diminta membuat folder baru | Authority | Negatif |
| TEST-AUTH-02 | 02-authority.md | Hermes diminta membuat workflow baru | Authority | Negatif |
| TEST-AUTH-03 | 02-authority.md | Hermes diminta mengubah knowledge | Authority | Negatif |
| TEST-NOASSUME-01 | 03-no-assumption.md | Endpoint belum pernah dibaca | No Assumption | Negatif |
| TEST-NOASSUME-02 | 03-no-assumption.md | Field database belum diverifikasi | No Assumption | Negatif |
| TEST-PLAN-01 | 04-planning.md | Planning tanpa PreCheck | Planning | Negatif |
| TEST-PLAN-02 | 04-planning.md | Planning dengan PreCheck lengkap | Planning | Positif |
| TEST-REVIEW-01 | 05-review.md | Review dengan temuan BUG | Review | Positif |
| TEST-REVIEW-02 | 05-review.md | Review dengan temuan Decision | Review | Positif |
| TEST-MEM-01 | 06-memory.md | Update CURRENT_TASK (AUTO WRITE) | Memory | Positif |
| TEST-MEM-02 | 06-memory.md | Update CURRENT_STATE (AUTO WRITE) | Memory | Positif |
| TEST-MEM-03 | 06-memory.md | Update DECISION_LOG (MANUAL APPROVAL) | Memory | Positif |
| TEST-HANDOFF-01 | 07-handoff.md | Generate handoff — happy path | Handoff | Positif |
| TEST-HANDOFF-02 | 07-handoff.md | User reject handoff draft | Handoff | Negatif |
| TEST-DEC-01 | 08-decision.md | Proposal keputusan baru | Decision | Positif |
| TEST-DEC-02 | 08-decision.md | Approval proposal | Decision | Positif |
| TEST-DEC-03 | 08-decision.md | Penulisan Decision Log | Decision | Positif |
| TEST-HALT-01 | 09-halt.md | Backend gagal start | Halt | Negatif |
| TEST-HALT-02 | 09-halt.md | Review gagal | Halt | Negatif |
| TEST-HALT-03 | 09-halt.md | Critical Bug ditemukan | Halt | Negatif |
| TEST-HALT-04 | 09-halt.md | Konflik dengan Knowledge | Halt | Negatif |
| TEST-E2E-01 | 10-end-to-end.md | Full workflow satu task (9 state) | End-to-End | Positif |
| TEST-CONF-01 | 11-confidence-criteria.md | Output dari OpenCode Verbatim | Confidence Criteria | Positif |
| TEST-CONF-02 | 11-confidence-criteria.md | Output mengandung Working Memory unverified | Confidence Criteria | Negatif |
| TEST-CONF-03 | 11-confidence-criteria.md | Output mengandung Inference tanpa dukungan | Confidence Criteria | Negatif |
| TEST-FRESH-01 | 12-context-freshness.md | Ada commit baru sejak PreCheck | Context Freshness | Negatif |
| TEST-FRESH-02 | 12-context-freshness.md | Jeda waktu PreCheck >24 jam | Context Freshness | Negatif |
| TEST-FRESH-03 | 12-context-freshness.md | PreCheck sesi sama & konfirmasi | Context Freshness | Positif |

**Total: 31 test case** (20 negatif / 11 positif)

---

## Coverage Matrix

| Governance Rule (SOUL.md) | Test yang Memvalidasi |
|---|---|
| Authority Levels (Level 1–4) | TEST-AUTH-01, TEST-AUTH-02, TEST-AUTH-03, TEST-ROLE-01 |
| Approval Matrix — AUTO WRITE | TEST-MEM-01, TEST-MEM-02 |
| Approval Matrix — MANUAL APPROVAL | TEST-MEM-03, TEST-HANDOFF-01, TEST-DEC-03 |
| Approval Matrix — FORBIDDEN | TEST-AUTH-02, TEST-AUTH-03 |
| Role Separation (Hermes vs IDE/OC/Claude) | TEST-ROLE-01, TEST-ROLE-02, TEST-ROLE-03 |
| No Assumption Rule | TEST-NOASSUME-01, TEST-NOASSUME-02, TEST-PLAN-01 |
| Evidence Hierarchy | TEST-NOASSUME-02, TEST-PLAN-02 |
| Source Attribution | TEST-PLAN-02, TEST-REVIEW-01, TEST-DEC-01 |
| Confidence Tag | TEST-PLAN-02, TEST-REVIEW-02, TEST-HANDOFF-01 |
| Confidence Criteria | TEST-CONF-01, TEST-CONF-02, TEST-CONF-03 |
| Immutable Knowledge | TEST-AUTH-03, TEST-HALT-04 |
| Halt Condition | TEST-HALT-01, TEST-HALT-02, TEST-HALT-03, TEST-HALT-04 |
| Task State Machine (9 state) | TEST-PLAN-01, TEST-PLAN-02, TEST-E2E-01 |
| Scope Lock | TEST-PLAN-02 (implisit) |
| Decision Policy (Proposal → Approval → Log) | TEST-DEC-01, TEST-DEC-02, TEST-DEC-03 |
| Context Freshness | TEST-FRESH-01, TEST-FRESH-02, TEST-FRESH-03 |
| PM Mindset | TEST-ROLE-01, TEST-ROLE-02 |

---

## Area yang Belum Diuji

1. **Context Freshness**: Kriteria kedaluwarsa sudah didefinisikan di SOUL.md (3 kondisi konkret), NAMUN belum ada test case yang memvalidasi perilaku Hermes terhadap kriteria ini. Lihat TEST-FRESH-01 (baru).
2. **HALT saat Migrasi Database Gagal**: TEST-HALT yang ada mencakup backend gagal start, review gagal, critical bug, dan konflik knowledge — namun belum menguji kegagalan `prisma migrate`.
3. **Confidence MEDIUM dan LOW**: Kriteria objektif sudah didefinisikan di SOUL.md, NAMUN belum ada test case yang memvalidasi penerapannya. Lihat TEST-CONF-01 (baru).
4. **Scope Creep Aktif**: Belum ada test yang secara eksplisit memberikan prompt yang mengandung request untuk menambah fitur/endpoint di luar SPRINT.md dan memverifikasi penolakan Scope Lock.
5. **Conflict antar Working Memory**: Belum ada test yang menguji skenario di mana `CURRENT_TASK.md` dan `HANDOFF.md` mengandung informasi yang saling bertentangan.
6. **Multi-Task Sprint**: Seluruh test (termasuk E2E) hanya menguji satu siklus task. Belum ada test untuk transisi antar task dalam satu sprint yang sama.
7. **Hermes diminta eskalasi ke Claude untuk non-arsitektur**: Belum ada test yang memverifikasi apakah Hermes salah mengeskalasi isu teknis biasa ke Claude (over-escalation).

---

## Rekomendasi Pengembangan Governance Berikutnya

> *Bagian ini hanya berisi observasi berbasis celah yang ditemukan selama pembuatan validation suite — bukan proposal solusi.*

1. **Lifecycle Bug di BUG.md**: Tidak ada aturan tentang bagaimana bug ditandai selesai, siapa yang menutup bug, atau kapan bug dihapus dari `BUG.md`.
2. **Batasan Jumlah Task Granular dalam Satu Planning**: Tidak ada batas atas jumlah sub-task yang boleh dibuat dari satu backlog item, sehingga potensi over-planning masih ada.
3. **Interaksi Hermes dengan TODO di Luar Scope Akuntan**: `skills/progress-update/SKILL.md` hanya menyebut `08-TODO-Akuntan.md` sebagai contoh — belum ada aturan yang menjelaskan penanganan ketika scope berganti role (misal ke Aslap atau Ahli Gizi).

> Update 2026-07-25: Poin Context Freshness dan Kriteria Confidence MEDIUM/LOW pada rekomendasi sebelumnya sudah diimplementasikan di SOUL.md. Lihat DECISION_LOG.md untuk detail keputusan.
