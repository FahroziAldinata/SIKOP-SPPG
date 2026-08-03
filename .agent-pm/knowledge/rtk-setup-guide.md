# RTK (Rust Token Killer) — Setup Guide

> Dokumentasi pribadi — JANGAN di-commit ke Git.
> Setup: 2026-08-03 — perangkat Windows (Administrator).

---

## 1. Ringkasan RTK & Manfaat

RTK (**Rust Token Killer**) adalah tool CLI yang me-rewrite output command terminal
(terutama `git status`, `git diff`, dll) menjadi versi ringkas — menghemat token LLM
yang dikonsumsi agent AI (Hermes, OpenCode, Antigravity, Claude Code, dll) saat
membaca output tersebut.

Manfaat:
- Hemat token input per command (contoh: `git status` hemat 83.3%).
- Output tetap informatif (file yang berubah, statistik) tapi tanpa baris noise.
- Statistik penghematan bisa dilihat via `rtk gain`.

---

## 2. Prasyarat OS

RTK berjalan sebagai binary CLI. Prasyarat:

| OS | Shell | Catatan |
|---|---|---|
| Windows | Git Bash / MSYS atau WSL | PATH perlu di-set manual |
| macOS | zsh/bash | Homebrew tersedia (`brew install rtk`) |
| Linux | bash/zsh | Install script curl |

- RTK tidak butuh runtime tambahan (Rust binary statis).

---

## 3. Panduan Instalasi

### 3a. Windows (via Git Bash/MSYS) — catatan khusus

1. Buat folder `D:\Tools\RTK` terlebih dahulu **jika belum ada**:
   ```bash
   mkdir -p /d/Tools/RTK
   ```
2. Letakkan `rtk.exe` ke folder tersebut:
   - Download dari GitHub Releases: https://github.com/rtk-ai/rtk/releases
   - atau hasil extract installer.
3. Tambahkan `D:\Tools\RTK` ke PATH:
   - **GUI**: System Properties → Environment Variables → Path → New → `D:\Tools\RTK`
   - **atau bashrc**:
     ```bash
     echo 'export PATH="/d/Tools/RTK:$PATH"' >> ~/.bashrc
     source ~/.bashrc
     ```
4. Verifikasi:
   ```bash
   rtk --version
   rtk gain
   ```

> ⚠️ Setup aktual di perangkat ini: binary ada di `E:\Folder_Project\RTK\rtk`
> (v0.44.0) — sudah global di PATH, bukan per-project.

### 3b. macOS

```bash
brew install rtk
```

### 3c. Linux/macOS (alternatif tanpa Homebrew)

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

---

## 4. Integrasi Agent

| Agent | Command | Scope | Hasil |
|---|---|---|---|
| Hermes | `rtk init --agent hermes` | Global | Plugin `E:\Folder_Project\Hermes_House\plugins\rtk-rewrite` + config.yaml `plugins.enabled: - rtk-rewrite` |
| Google Antigravity | `rtk init --agent antigravity` | Project-scoped | Rules `.agents/rules/antigravity-rtk-rules.md` |
| OpenCode | `rtk init -g --opencode` | Global | Plugin `C:\Users\Administrator\.config\opencode\plugins\rtk.ts` |
| Claude Code | `rtk init -g` | Global | RTK.md + CLAUDE.md di `~/.claude/` (settings.json manual — lihat troubleshooting) |

Catatan: `rtk init -g` tanpa `--agent` default ke Claude Code.

---

## 5. Troubleshooting (yang pernah terjadi)

### 5a. Warning "No hook installed" saat `rtk gain`

```
[warn] No hook installed — run `rtk init -g` for automatic token savings
```

**Bukan berarti package RTK salah.** Ini berarti belum ada hook CLI global yang
aktif (settings.json Claude belum di-patch). Solusi: ikuti 5b.

### 5b. Patch `settings.json` gagal di mode non-interactive

`rtk init -g` menampilkan prompt `Patch existing ~/.claude/settings.json? [y/N]` —
di mode non-interactive (Hermes/terminal), prompt auto-default ke **N** → patch
tidak jalan. Tambahkan hook Claude **manual**:

```json
{
  "hooks": { "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{ "type": "command",
      "command": "rtk hook claude"
    }]
  }]}
}
```

ke file `C:\Users\Administrator\.claude\settings.json`.

### 5c. Restart wajib setelah setup

- **Hermes** — plugin `rtk-rewrite` dimuat saat start. Restart sesi dulu, baru
  `git status` ter-rewrite otomatis.
- **OpenCode** — plugin `rtk.ts` ke-load saat start. Restart OpenCode.
- Antigravity — rules dibaca per-project, tanpa restart.

---

## 6. Checklist Verifikasi Akhir

```bash
# 1. Versi + lokasi binary (global, bukan per-project)
rtk --version
which rtk

# 2. Statistik penghematan token
rtk gain

# 3. Integrasi Hermes — config harus berisi plugins.enabled: - rtk-rewrite
grep -n -A2 "plugins:" E:\Folder_Project\Hermes_House\config.yaml

# 4. Integrasi OpenCode — plugin file harus ada
ls "C:\Users\Administrator\.config\opencode\plugins\rtk.ts"

# 5. Integrasi Antigravity — rules project harus ada
ls .agents/rules/antigravity-rtk-rules.md

# 6. Uji auto-rewrite (setelah restart Hermes/OpenCode) — output git status
#    harus diringkas RTK, bukan full
git status
```

Status perangkat ini (2026-08-03): semua verifikasi PASS kecuali auto-rewrite
aktif setelah restart Hermes/OpenCode.
