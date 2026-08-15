# Telegram Gateway — Setup & Konfigurasi

**Dibuat**: 2026-07-29
**Tujuan**: Dokumentasi setup gateway Telegram biar aman di-push/pull antar perangkat.

---

## 1. Kredensial (di .env — TIDAK di-commit)

File `.env` di `[HERMES_HOME]/.env` berisi:

```
TELEGRAM_BOT_TOKEN=[TELEGRAM_BOT_TOKEN]
TELEGRAM_ALLOWED_USERS=[TELEGRAM_ALLOWED_USERS]
```

**Catatan**: `.env` TIDAK masuk git — disalin manual ke tiap perangkat.

---

## 2. Gateway sudah running

- **Service**: Scheduled Task `[TELEGRAM_SERVICE_NAME]`
- **Script**: `[TELEGRAM_SCRIPT_PATH]`
- **PID saat ini**: [TELEGRAM_PID]
- **Auto-start**: Ya (Windows login)

Cek status:
```
hermes gateway status
```

---

## 3. Kirim pesan via Telegram

Dari Hermes (CLI) ke Telegram:
```
hermes send --to telegram:[TELEGRAM_USER_ID] "Pesan"
```

Dari Telegram ke Hermes:
- Cari bot di Telegram (username dari BotFather)
- Kirim `/start`
- Langsung chat — nanti masuk ke sesi Hermes

---

## 4. Bot Telegram

- **Token**: [TELEGRAM_BOT_TOKEN] (dari BotFather)
- **User ID**: [TELEGRAM_USER_ID]
- **Home Channel**: Belum diset

Set home channel (biar kirim tanpa perlu specify ID):
```
hermes config set TELEGRAM_HOME_CHANNEL [TELEGRAM_HOME_CHANNEL]
```

---

## 5. Catatan

- Gateway pakai profile `[TELEGRAM_PROFILE_NAME]` (lihat config.yaml bagian profiles)
- `use_gateway: false` di config.yaml hanya untuk web/browser tool, bukan gateway messaging
- Gateway jalan sebagai background process — tidak perlu dijalankan manual tiap sesi
- Multiple perangkat: tinggal clone repo + salin `.env` + jalankan `hermes gateway start`

---

## 6. MINI-REFRESH CONTEXT (Telegram → CLI cross-device sync)

**Masalah**: Sesi Telegram lama & terus dipakai → tidak auto-reload progress terbaru yang ditulis sesi CLI laptop. SESSION_START_PROTOCOL hanya jalan di sesi BARU.

**Solusi**: Rule mini-refresh wajib sebelum merespons pesan Telegram.

### Rule (WAJIB, berlaku tiap pesan masuk di Telegram)

1. **Cek idle**: Jika sesi Telegram idle > [IDLE_THRESHOLD] menit sejak pesan/aktivitas terakhir → WAJIB lakukan mini-refresh SEBELUM merespons:
   - Baca ulang `working/CURRENT_STATE.md`
   - Baca ulang `working/LIVE_CONTEXT.md` (auto-snapshot terbaru dari sesi CLI)
2. **Cakupan**: Cukup 2 file ini — BUKAN full SESSION_START_PROTOCOL 15-step.
3. **Kalau idle ≤ [IDLE_THRESHOLD] menit**: Tidak perlu refresh — konteks masih segar.
4. **LIVE_CONTEXT.md** bersifat live snapshot auto-write (cron `live-context-snapshot`, tiap [SNAPSHOT_INTERVAL] menit, silent) — sumber: CURRENT_TASK.md + CURRENT_STATE.md. Bukan decision log — tidak butuh approval.

---