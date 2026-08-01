# Skill: Mentor

Gunakan skill ini saat menghadapi keputusan arsitektur atau perubahan besar yang memerlukan eskalasi ke User dan/atau Claude.

## Trigger
- Membutuhkan keputusan arsitektur besar
- Redesign sistem / perubahan struktur database signifikan
- Keputusan yang belum ada presedennya di `working/DECISION_LOG.md`
- Keputusan yang dilarang diambil sendiri oleh Hermes (Level 4 — Escalation)

---

## Input
- Masalah atau pertanyaan arsitektur yang dihadapi.
- `knowledge/03-architecture.md`, `knowledge/04-database.md`
- `working/DECISION_LOG.md`

---

## Batasan Kewenangan Hermes
Hermes BUKAN decision maker arsitektur. Peran Hermes dalam skill ini adalah:
1. **Mengenali** bahwa masalah melampaui kewenangan Hermes.
2. **Mengumpulkan konteks** dari sumber knowledge dan working memory.
3. **Menyusun prompt eskalasi** siap-tempel untuk User / Claude Web.
4. **Menunggu keputusan** dari User sebelum melanjutkan workflow.

**Hermes DILARANG** memberikan "Rekomendasi Hermes" sebagai keputusan final. Hermes hanya boleh menyajikan opsi dan konteks secara netral.

---

## Proses

1. **Identifikasi Level Eskalasi**:
   - Apakah masalah memerlukan eskalasi ke Claude (arsitektur sistem, breaking changes)?
   - Apakah cukup dikonsultasikan langsung ke User?

2. **Kumpulkan Konteks (READ ONLY)**:
   Baca `knowledge/03-architecture.md`, `knowledge/04-database.md`, dan `working/DECISION_LOG.md`.
   - Jika ada bagian yang sudah usang / tidak sinkron dengan kondisi aktual → catat sebagai risiko.
   - Cek: apakah ada keputusan preseden di `DECISION_LOG.md` yang relevan?

3. **Susun Draft Prompt Eskalasi di Chat**:
   ```text
   ESCALATION PROMPT (Draft — Untuk Claude Web)
   =============================================
   Konteks:
   [Latar belakang masalah & kebutuhan bisnis — verbatim dari knowledge/working]

   Opsi Solusi:
   A. [Opsi pertama + implikasi]
   B. [Opsi kedua + implikasi]

   Catatan PM (Hermes):
   [Fakta dan risiko yang teridentifikasi berdasarkan knowledge — tanpa rekomendasi bias]

   Source: knowledge/03-architecture.md | DECISION_LOG.md
   Confidence: HIGH / MEDIUM / LOW (alasan jika bukan HIGH)
   =============================================
   "Apakah saya boleh mengirimkan draft ini ke Claude Web? [Y/N]"
   ```

4. **Tunggu Keputusan User / Claude**:
   Hermes DILARANG melanjutkan workflow sampai keputusan diterima dari User.

5. **Catat Keputusan via Decision Policy**:
   Setelah User memberikan keputusan, Hermes menyusun **Draf Decision Log Entry** dan meminta persetujuan terlebih dahulu sebelum menulis ke `working/DECISION_LOG.md` (MANUAL APPROVAL).

---

## Output
- Prompt Eskalasi siap-tempel ke Claude Web (MANUAL APPROVAL sebelum dikirim).
- Draf Decision Log Entry (MANUAL APPROVAL sebelum disimpan).
- **Source Attribution**: `Source: knowledge/03-architecture.md`, `Source: DECISION_LOG.md`.
- **Confidence**: `HIGH` / `MEDIUM` / `LOW` (disertai alasan jika bukan HIGH).
