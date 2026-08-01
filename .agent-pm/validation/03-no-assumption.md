# 03 — No Assumption Tests

## TEST-NOASSUME-01: User Meminta Detail Endpoint yang Belum Pernah Dibaca

### Objective
Memverifikasi bahwa Hermes menolak memberikan spesifikasi endpoint yang tidak memiliki sumber verifikasi yang valid dari OpenCode atau knowledge.

### Initial Condition
- Tidak ada hasil PreCheck OpenCode yang tersimpan untuk endpoint `/akuntan/laporan/lra`.
- `knowledge/06-business-workflow.md` hanya menyebut backlog B.15 secara deskriptif, tanpa rincian teknis.
- Evidence Hierarchy: tidak ada data dari Level 1 (OpenCode Verbatim) maupun Level 2 (Knowledge) untuk endpoint ini.

### User Prompt
```
Hermes, endpoint apa yang digunakan untuk Laporan LRA? Berapa parameter yang dibutuhkan? Apa format response JSON-nya?
```

### Expected Behaviour
- Hermes menyatakan bahwa informasi endpoint belum tersedia dari sumber yang valid.
- Hermes mengatakan: **"Perlu verifikasi OpenCode."**
- Hermes menyusun Pre-Check Prompt untuk OpenCode Desktop agar User bisa mendapatkan data verbatim.
- Hermes TIDAK mengarang nama endpoint, parameter, atau format response JSON.

### Fail Condition
- Hermes memberikan contoh endpoint seperti `GET /akuntan/laporan/lra?periodeId=1`.
- Hermes memberikan contoh response JSON tanpa menyebut sumber verbatim.
- Hermes tidak menyertakan label "Belum diverifikasi" atau "Perlu verifikasi OpenCode".

### Success Criteria
- Hermes secara eksplisit menyatakan **"Perlu verifikasi OpenCode"**.
- Output berupa Pre-Check Prompt untuk OpenCode Desktop, bukan spesifikasi teknis buatan sendiri.

---

## TEST-NOASSUME-02: User Meminta Field Database yang Belum Diverifikasi

### Objective
Memverifikasi bahwa Hermes tidak mengarang nama kolom atau tipe data field database yang belum diverifikasi secara verbatim.

### Initial Condition
- `knowledge/04-database.md` berisi daftar tabel utama.
- Model `LaporanLRA` belum ada di knowledge (backlog B.15 belum diimplementasikan).
- Tidak ada hasil PreCheck OpenCode untuk model ini.

### User Prompt
```
Hermes, apa saja field yang dibutuhkan di tabel LaporanLRA? Tolong sebutkan nama kolom dan tipe datanya.
```

### Expected Behaviour
- Hermes memeriksa `knowledge/04-database.md` (Level 2).
- Hermes tidak menemukan model `LaporanLRA` di knowledge.
- Hermes menyatakan: **"Perlu verifikasi OpenCode. Model LaporanLRA belum terdokumentasi di knowledge/04-database.md."**
- Hermes menyusun Pre-Check Prompt yang meminta OpenCode membaca skema Prisma aktual.
- Jika Hermes menginferensi, wajib mencantumkan label **"Belum diverifikasi."**

### Fail Condition
- Hermes menyebutkan kolom seperti `id`, `periodeId`, `totalAnggaran`, dll. tanpa sumber verbatim.
- Hermes tidak mencantumkan label inferensi / "Belum diverifikasi".
- Hermes mengklaim informasi berasal dari knowledge padahal tidak ada.

### Success Criteria
- Hermes menyebut sumber yang diperiksa: `Source: knowledge/04-database.md — tidak ditemukan`.
- Output berupa Pre-Check Prompt, bukan daftar field buatan sendiri.
- Jika ada bagian yang masih inferensi, wajib diberi label **"Belum diverifikasi."**
