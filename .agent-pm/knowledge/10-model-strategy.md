# MODEL STRATEGY — [PROJECT_NAME] Multi-Agent Stack

> **Moved**: 2026-08-01 — dipindah dari `.agent-pm/MODEL_STRATEGY.md` (root) ke knowledge/ atas keputusan User (governance → knowledge base).
> **Status**: AKTIF — acuan model agent (referensi: TODO.md, PROJECT_MANAGER_BEHAVIOR.md).

**Updated:** 2026-08-02  
**Scope:** [DEVICE_1] & [DEVICE_2] — shared via git sync

---

## 🎯 OVERVIEW

|| Layer | Model | Provider | Quota | Role ||
||-------|-------|----------|-------|------||
|| **Hermes Orchestrator** | DeepSeek-V4-Flash-Free (`oc/deepseek-v4-flash-free`) | 9router (custom provider) | Unlimited | Planning, analysis, orchestration, memory, skills ||
|| **AGY ([DEVICE_1] only)** | Claude-Sonnet-4-6 ATAU Gemini-Flash-3.6-Medium | Anthropic / Gemini (via Antigravity CLI) | **LIMITED** | Heavy coding, complex refactors (quota + approval) ||
|| **OpenCode Primary** | DeepSeek-V4-Flash-Free | OpenCode proxy (gratis) | Unlimited | Default coding agent (build features, PRs) ||
|| **OpenCode Backup** | Nemotron-4-Ultra | OpenCode proxy (gratis) | Unlimited | Backup when DeepSeek slow/timeout ||

\* OpenRouter free tier via local proxy

---

## ⚠️ CRITICAL CONSTRAINTS

### AGY (Antigravity CLI)
- **Quota sering habis** — hanya untuk task berat yg butuh reasoning model besar
- **[DEVICE_1] only**: `[AGY_PATH_PC] -p 'prompt' --model [AGY_MODEL_PRIMARY]` (atau `--model [AGY_MODEL_BACKUP]` kalau claude quota habis)
- **2 model**: `[AGY_MODEL_PRIMARY]` + `[AGY_MODEL_BACKUP]` — saling fallback kuota (keputusan User 2026-08-01)
- **[DEVICE_2]**: panggil langsung dari bash, tanpa cmd.exe /c (pipe BROKEN, avoid)
- **JANGAN** pakai AGY untuk task rutin — pakai OpenCode

### OpenCode (Primary Builder)
- Default model: `deepseek-v4-flash-free` (gratis, context 200k)
- **Masalah**: Sering timeout 180s, lambat start
- **Backup**: `nemotron-4-ultra` — belum ditesting penuh, tes dulu sebelum dipakai serius (keputusan User 2026-08-01)

### Hermes (Orchestrator Only)
- **JANGAN** baca/tulis file project langsung
- **HANYA**: tulis plan, spawn agent (OpenCode/AGY), baca output, update memory/todo
- Model: `oc/deepseek-v4-flash-free` (via 9router custom provider) — fallback chain: `glm-4.5-flash` (zai) → `gemini-3.1-flash-lite` (gemini) → `nvidia/nemotron-3-ultra-550b-a55b:free` (openrouter). SELALU tampilkan model aktual di laporan

---

## 🔄 MULTI-DEVICE SYNC

|| Device | AGY Path | OpenCode Path | Hermes Profile ||
||--------|----------|---------------|----------------||
|| **[DEVICE_1]** | `[AGY_PATH_PC]` | `[OPENCODE_PATH_PC]` | default ||
|| **[DEVICE_2]** | `[AGY_PATH_LAPTOP]` (panggil langsung dari bash, tanpa cmd.exe /c) | Same (portable) | default ||

- `.agent-pm/` sinkron via git remote (push setiap FINALIZE + cron 30 menit)
- Credential manager sudah diset

---

## 📋 DECISION MATRIX

| Task Type | Agent | Model | Trigger |
|-----------|-------|-------|---------|
| Planning, analysis, audit, research | **Hermes** | DeepSeek-V4-Flash-Free (`oc/`) | Always |
| Coding: features, refactor, PR, bugfix | **OpenCode** | DeepSeek-V4-Flash-Free | Default |
| Coding: DeepSeek timeout/lambat | **OpenCode** | Nemotron-4-Ultra | Fallback (belum ditesting penuh) |
| Coding: complex reasoning, architecture | **AGY** | Claude-Sonnet-4-6 / Gemini-Flash-3.6-Medium | Quota available + explicit approval |

> **[UPDATE 2026-08-02 — KEPUTUSAN User, MENGUBAH MATRIX DI ATAS]**: User instruksikan "jangan gunakan opencode untuk eksekusi, gunakan agy". Pembagian agent BARU:
> - **BUILD (eksekusi kode)** = **AGY** (bukan OpenCode default) — `gemini-3.6-flash-medium` (default settings AGY device ini) atau `claude-sonnet-4-6`
> - **CODE_INVESTIGATION + VERIFICATION** = OpenCode (tetap)
> - **FINALIZE (commit + push)** = **OpenCode** — "commit tugas opencode" (koreksi eksplisit User, lihat GF-008)
> - "AGY untuk eksekusi" = eksekusi kode BUILD, BUKAN commit. Jangan ulangi kesalahan GF-008 (commit via AGY `e475d34`).
> - Referensi: PROJECT_MANAGER_BEHAVIOR.md section "KEPUTUSAN 2026-08-02".

---

## 🚀 OPENCODE COMMANDS

```bash
# Primary (DeepSeek)
opencode run 'prompt'

# Backup (Nemotron-4-Ultra) — belum ditesting penuh
opencode run -m nemotron-4-ultra 'prompt'

# Interactive (background, pty)
opencode -m nemotron-4-ultra
```

---

## 📝 HISTORY

- 2026-08-02: Keputusan User — pembagian agent: BUILD/eksekusi kode = AGY, FINALIZE commit + push = OpenCode (koreksi GF-008, commit via AGY `e475d34` salah). Update PROJECT_MANAGER_BEHAVIOR.md + GOVERNANCE_FINDINGS.md + file ini (instruksi eksplisit User, override FORBIDDEN knowledge/*)
- 2026-08-02: Validasi User — model Hermes aktual = `oc/deepseek-v4-flash-free` (9router), dokumentasi sebelumnya klaim Nemotron-3-Ultra (STALE). Diselaraskan dgn config.yaml + DECISION_LOG entry
- 2026-08-01: Keputusan User — AGY 2 model (claude-sonnet-4-6 + gemini-flash-3.6-medium, saling fallback kuota); OpenCode backup = nemotron-4-ultra (belum ditesting)
- 2026-08-01: Audit .agent-pm — fix kontradiksi governance (OpenCode builder default konsisten di semua file)
- 2026-07-31: AGY quota exhausted → OpenCode promoted to primary builder
- 2026-07-30: Governance updated — OpenCode default, display model in reports

---

## ✅ RULES FOR AGENTS (PC & LAPTOP)

1. **Check quota** before spawning AGY
2. **BUILD/eksekusi kode = AGY** (keputusan User 2026-08-02 — ganti rule lama "default OpenCode untuk coding")
3. **Use Nemotron backup** if DeepSeek > 60s no response
4. **Always report model used** in completion message to User
5. **Commit + push = OpenCode ALWAYS** ("commit tugas opencode" — koreksi User 2026-08-02). AGY TIDAK boleh commit. Lihat GF-008.
6. **Sync .agent-pm** via git push after every cycle end

---

*File ini untuk referensi agent di PC & Laptop — jangan dihapus.*