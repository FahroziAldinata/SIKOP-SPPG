# Disaster Recovery

Panduan pemulihan bencana (disaster recovery) dan manajemen backup database untuk **SPPG Management System**. Dokumen ini mencakup prosedur backup manual/on-demand, langkah-langkah pemulihan data (restore), estimasi target pemulihan, serta status otomatisasi backup.

## Ringkasan

Database production **SPPG Management System** menggunakan PostgreSQL yang di-host via Supabase. Runtime aplikasi menggunakan connection pooler pada port 6543 (`?pgbouncer=true`), sedangkan operasi migrasi skema dan backup memerlukan koneksi langsung (direct connection) pada port 5432 (referensi `docs/DEPLOYMENT.md`).

Proses backup dan restore mengandalkan perkakas standar PostgreSQL (`pg_dump` dan `pg_restore`). Untuk mempermudah backup manual atau eksekusi dari script, sistem menyediakan script khusus di `backend/scripts/backup-db.js`.

## Prosedur Backup (Manual / On-Demand)

### Prasyarat
1. Perkakas client PostgreSQL (`pg_dump`) terpasang dan dapat diakses dari PATH sistem host/runner.
2. Variabel environment `DATABASE_URL` sudah dikonfigurasi.
   - **PENTING (Production Supabase):** WAJIB menggunakan direct connection port `5432`, BUKAN connection pooler / PgBouncer port `6543`.

### Cara Menjalankan Backup
Jalankan script backup dari direktori `backend`:

```bash
cd backend
DATABASE_URL="postgresql://user:password@db.example.com:5432/sppg?sslmode=require" node scripts/backup-db.js
```

### Hasil Output Backup
- File backup akan tersimpan otomatis di direktori `backend/backups/` dengan nama bertimestamp: `sppg-backup-YYYYMMDDHHmmss.dump` (format biner kustom `pg_dump -Fc`).
- **WAJIB:** Setelah backup selesai, pindahkan file `.dump` tersebut ke lokasi penyimpanan terpisah (_off-site storage_ / _cloud storage_ terisolasi) demi keamanan data.

### Verifikasi Hasil Backup
Untuk memastikan file backup valid dan tidak korup, jalankan perintah daftar isi dari `pg_restore`:

```bash
pg_restore --list backend/backups/sppg-backup-YYYYMMDDHHmmss.dump
```

## Prosedur Restore

### Prasyarat
1. Perkakas client PostgreSQL (`pg_restore`) terpasang pada host/runner.
2. Akses direct connection ke PostgreSQL target beserta kredensial user yang memiliki izin mutasi skema/tabel.

### Perintah Restore
Gunakan `pg_restore` dengan opsi `--clean` dan `--if-exists` untuk membersihkan objek sebelum ditimpa. Opsi `--single-transaction` disarankan agar proses restore berjalan secara atomik:

```bash
pg_restore --clean --if-exists --single-transaction -h <host> -p 5432 -U <user> -d <dbname> backend/backups/sppg-backup-YYYYMMDDHHmmss.dump
```

### Langkah Pasca-Restore
1. **Jalankan Migrasi Prisma:** Pastikan skema database konsisten dengan versi kode terbaru:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
2. **Verifikasi Data Kritis:** Lakukan pengecekan jumlah baris dan validitas data pada tabel-tabel utama seperti `User`, `Periode`, dan `JurnalTransaksi`.
3. **Rotasi Kredensial (Kondisional):** Jika pemulihan dilakukan akibat insiden keamanan atau kebocoran akses, segera lakukan rotasi `JWT_SECRET` dan password akun database.

## RPO & RTO (Target Rekomendasi, BUKAN SLA)

- **RPO (Recovery Point Objective):** Target rekomendasi 24 jam (berdasarkan skenario backup manual/on-demand harian).
- **RTO (Recovery Time Objective):** Target rekomendasi 4 jam (alokasi waktu untuk mengunduh dump file, restore database, verifikasi integritas data, dan restart service).

> **Catatan:** Angka RPO dan RTO di atas merupakan target rekomendasi internal proyek, BUKAN Service Level Agreement (SLA) formal, dan akan dikalibrasi ulang saat otomatisasi backup aktif di production.

## Status Otomatisasi

**Status: backup manual/on-demand, otomatisasi terjadwal MENUNGGU keputusan platform production final.**

- Saat ini belum ada cron job atau scheduler otomatis yang berjalan di repo ini.
- Opsi otomatisasi yang dapat dipilih saat platform production final ditentukan:
  - Cron job di platform PaaS (misal: Railway Cron Jobs).
  - Workflow terjadwal GitHub Actions (Scheduled Workflows).
  - Layanan backup otomatis terkelola dari penyedia database (misal: Supabase Daily Backups paid plan).
  - Scheduler OS pada VPS/server mandiri (misal: Linux `crontab` atau Windows Task Scheduler).
- Script `backend/scripts/backup-db.js` dirancang modular dan siap diintegrasikan dengan alat penjadwalan apa pun (mengembalikan exit code `0` saat sukses dan exit code `1` saat gagal).
