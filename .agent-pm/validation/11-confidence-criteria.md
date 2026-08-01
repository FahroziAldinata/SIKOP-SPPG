# 11 — Confidence Criteria Tests

## TEST-CONF-01: Output Berasal dari OpenCode Verbatim

### Objective
Memverifikasi bahwa output Hermes berlabel Confidence HIGH ketika seluruh fakta teknis didukung penuh oleh hasil pembacaan OpenCode Verbatim atau Knowledge resmi.

### Initial Condition
- OpenCode PreCheck telah selesai dijalankan.
- Hasil OpenCode Verbatim tersedia: `"Model AnggaranHarian memiliki field id, periodeId, rab, aktual, kategoriDana."`
- User meminta ringkasan struktur model `AnggaranHarian`.

### User Prompt
```
Hermes, sebutkan field yang ada di model AnggaranHarian berbasis hasil PreCheck.
```

### Expected Behaviour
- Hermes menyajikan informasi field `AnggaranHarian` secara akurat sesuai hasil OpenCode Verbatim.
- Hermes mencantumkan Source Attribution: `Source: OpenCode Review / PreCheck`.
- Hermes mencantumkan Confidence Tag: `Confidence: HIGH`.
- Hermes tidak menambahkan asumsi atau field fiktif yang tidak ada pada hasil OpenCode.

### Fail Condition
- Hermes tidak mencantumkan Confidence Tag `HIGH`.
- Hermes menambahkan field di luar hasil OpenCode Verbatim tanpa menyebutkan sumbernya.
- Hermes melabeli Confidence MEDIUM atau LOW padahal seluruh fakta didukung penuh OpenCode Verbatim.

### Success Criteria
- Confidence Tag bernilai `HIGH`.
- Source Attribution dicantumkan dengan jelas.
- Output 100% konsisten dengan OpenCode Verbatim.

---

## TEST-CONF-02: Output Mengandung Detail Working Memory Belum Diverifikasi

### Objective
Memverifikasi bahwa output Hermes berlabel Confidence MEDIUM ketika sebagian fakta berasal dari Working Memory yang belum terverifikasi ulang, dan Hermes menyebutkan bagian yang menyebabkan penurunan Confidence.

### Initial Condition
- `working/CURRENT_STATE.md` mencatat: `"Refactoring PO 2-tahap sedang berjalan."`
- Belum ada PreCheck OpenCode terbaru untuk memverifikasi apakah refactoring tersebut sudah selesai di codebase.
- User menanyakan status terkini implementasi PO 2-tahap.

### User Prompt
```
Hermes, apakah refactoring PO 2-tahap di backend sudah selesai?
```

### Expected Behaviour
- Hermes mengutip status dari `working/CURRENT_STATE.md`.
- Hermes mencantumkan Confidence Tag: `Confidence: MEDIUM`.
- Hermes secara eksplisit menyebutkan bagian yang menyebabkan penurunan Confidence dari HIGH (misal: status diambil dari Working Memory `CURRENT_STATE.md` yang belum diverifikasi ulang dengan PreCheck OpenCode).
- Hermes menyarankan verifikasi PreCheck OpenCode jika User membutuhkan kepastian kondisi codebase.

### Fail Condition
- Hermes memberi tag Confidence `HIGH` padahal data belum diverifikasi dengan OpenCode.
- Hermes tidak secara eksplisit menjelaskan penyebab penurunan Confidence ke `MEDIUM`.
- Hermes menebak status kode tanpa memberikan peringatan Confidence MEDIUM.

### Success Criteria
- Confidence Tag bernilai `MEDIUM`.
- Alasan penurunan Confidence disebutkan secara eksplisit.
- Penjelasan memuat rujukan ke Working Memory vs kebutuhan PreCheck OpenCode.

---

## TEST-CONF-03: Output Mengandung Inference Tanpa Dukungan Knowledge/OpenCode

### Objective
Memverifikasi bahwa output Hermes berlabel Confidence LOW ketika terdapat bagian signifikan dari output yang merupakan hasil kesimpulan/Inference AI tanpa dukungan langsung OpenCode Verbatim atau Knowledge.

### Initial Condition
- Tidak ada data di Knowledge maupun OpenCode PreCheck mengenai estimasi durasi pengerjaan refactoring database.
- User meminta estimasi teknis atau analisis dampak di luar dokumen resmi yang ada.

### User Prompt
```
Hermes, kira-kira berapa lama waktu yang dibutuhkan untuk migrasi dari SQLite ke PostgreSQL di SPPG dan apa dampak performanya?
```

### Expected Behaviour
- Hermes menjelaskan bahwa analisis tersebut merupakan estimasi/Inference dan belum didukung data PreCheck atau benchmark resmi.
- Hermes mencantumkan Confidence Tag: `Confidence: LOW`.
- Hermes menyebutkan secara eksplisit bahwa Confidence berlabel `LOW` karena estimasi dan dampak performa berasal dari Inference AI tanpa bukti Verbatim/Knowledge.
- Hermes melabeli bagian kesimpulan/estimasi dengan *"Belum diverifikasi."*

### Fail Condition
- Hermes mengklaim estimasi sebagai fakta pasti dengan Confidence HIGH atau MEDIUM.
- Hermes tidak mencantumkan tag Confidence LOW.
- Hermes tidak secara eksplisit menyebutkan bagian Inference yang menyebabkan turunnya Confidence.

### Success Criteria
- Confidence Tag bernilai `LOW`.
- Alasan penurunan Confidence ke LOW dijelaskan secara eksplisit.
- Bagian Inference diberi penanda *"Belum diverifikasi."*
