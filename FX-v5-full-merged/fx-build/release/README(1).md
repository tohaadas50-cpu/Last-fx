# TextFX v5 — Windows Installer Release Notes

## Node version used: **18.17.1**

All scripts are validated against Node 18.17.1 (LTS) and Node 16.20.0.
If you switch to Node 16, replace every `node18-win-x64` target in `package.json`
and `backend/package.json` with `node16-win-x64`.

---

## Prerequisites (clean Windows 8.1 / Windows 10+ VM)

```powershell
# 1. Install Node 18.17.1 from https://nodejs.org (LTS installer)
#    → Keep install path SHORT, e.g. C:\fx\node

# 2. Verify
node --version   # must print v18.17.1
npm  --version   # must print 9.x

# 3. Install OpenSSL (required for cert generation)
#    https://slproweb.com/products/Win32OpenSSL.html  → Win64 OpenSSL v3.x Light
#    Accept defaults; add to PATH when prompted.
openssl version  # must print "OpenSSL 3.x.x ..."

# 4. Clone / extract project to a SHORT path
mkdir C:\fx\project
# extract ZIP or git clone into C:\fx\project
cd C:\fx\project
```

---

## Build steps

Run every command from `C:\fx\project` in a PowerShell terminal:

```powershell
# Step 1: Install all dependencies
npm run bootstrap

# Step 2: Compile + package backend → release/backend/fx-server.exe
npm run build:backend

# Step 3: Build React frontend → app/dist/
npm run build:app

# Step 4: Compile Electron TypeScript → electron/
npm run build:electron

# Step 5: Produce NSIS installer → release/installer/FX-Setup-v5.exe
npm run dist
```

Each step is PowerShell-safe (`Push-Location` / `Pop-Location`) and works
with `ExecutionPolicy Bypass`. No step requires Administrator privileges.

---

## Deliverables

| File | Description |
|------|-------------|
| `release/backend/fx-server.exe` | Self-contained Node 18 backend (pkg) |
| `release/installer/FX-Setup-v5.exe` | NSIS installer (~80–120 MB) |

---

## Install & first-run test (on clean VM)

```powershell
# 1. Run installer (double-click or PowerShell)
Start-Process "C:\fx\project\release\installer\FX-Setup-v5.exe"

# 2. Launch TextFX from Desktop shortcut (or Start Menu)
#    → The app will open. On first run an API Key modal appears.

# 3. Enter your OpenAI API key (starts with sk-)
#    → Key is stored in Windows Credential Store via keytar — never on disk.

# 4. Health check (replace PORT with the value shown in DevTools console)
$PORT = 30042   # example — actual port is random in 30000-31000
curl -k https://127.0.0.1:$PORT/healthz
# Expected:  {"ok":true,"ts":"2025-..."}

# 5. Agent demo (from PowerShell)
curl -k -X POST https://127.0.0.1:$PORT/agent/run `
  -H "Content-Type: application/json" -d "{}"
# Expected:  {"ok":true,"id":"<uuid>"}
```

---

## Verification checklist

```powershell
# ── Build ────────────────────────────────────────────────────────────────────
npm run bootstrap
npm run build:backend
npm run build:app
npm run build:electron
npm run dist

# ── After install ─────────────────────────────────────────────────────────────
# Replace PORT with actual port from app (see Electron DevTools → Console)
$PORT = 30042

# Health
curl -k https://127.0.0.1:$PORT/healthz

# Agent demo
curl -k -X POST https://127.0.0.1:$PORT/agent/run `
  -H "Content-Type: application/json" -d "{}"

# Key status (should return {"configured":true} after setup)
curl -k https://127.0.0.1:$PORT/api/key-status

# Confirm backend binds ONLY to 127.0.0.1 (not 0.0.0.0)
netstat -ano | findstr $PORT
# Must show 127.0.0.1:PORT — never 0.0.0.0:PORT

# Confirm no orphan processes after closing the app
#   1. Open TextFX
#   2. Close it (X button)
#   3. Check Task Manager — fx-server.exe must be gone
Get-Process -Name "fx-server" -ErrorAction SilentlyContinue
# Must return nothing

# Log inspection (redacted — no raw PII)
Get-Content "$env:APPDATA\fx-logs\fx-server.log" | Select -Last 20
# Must show hashed prompts e.g.  "input":"[REDACTED:a3f9c1...]"
```

---

## Security notes

| Requirement | Implementation |
|-------------|----------------|
| No keys in repo | `/llm` reads key via `keytar.getPassword('fx-openai','default')` only |
| Local HTTPS | `--cert` / `--key` args → self-signed cert in `%APPDATA%\fx-certs\` |
| Cert pinning | `main.ts` computes SHA-256 fingerprint → passes to renderer via IPC |
| 127.0.0.1 only | `server.listen(PORT, '127.0.0.1', ...)` — never `0.0.0.0` |
| Input sanitisation | Regex deny-list + 8 KB limit before any LLM call |
| Policy check | Blocked-term list checked before any LLM call |
| Rate limiting | 60 req/min per device for `/llm` via `express-rate-limit` |
| PII-free logs | All `prompt`/`input`/`content` fields replaced with `[REDACTED:sha256hash]` |
| Child cleanup | 120 s timeout + SIGKILL; all children killed on shutdown |
| Process tree kill | `tree-kill` used in Electron `before-quit` to avoid orphan `fx-server.exe` |
| CSP | Electron session CSP restricts `connect-src` to `https://127.0.0.1:<PORT>` only |

---

## Rollback instructions

```powershell
# Option A — Re-install previous version
#   Run the previous FX-Setup-vX.exe

# Option B — Uninstall current version
Start-Process "C:\Program Files\TextFX\Uninstall TextFX.exe"
# Then re-install older build.

# Option C — Git rollback (if building from source)
git checkout main    # or the stable tag
npm run dist

# Remove stored API key from Credential Store
# Run in PowerShell (no admin required):
[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]
$vault = New-Object Windows.Security.Credentials.PasswordVault
try { $vault.Remove($vault.Retrieve('fx-openai','default')) } catch {}
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `openssl` not found | Install Win64 OpenSSL Light and add to `PATH` |
| `pkg` fails with long-path error | Shorten dev path to `C:\fx\project`; enable Win10+ long paths with `fsutil behavior set disable8dot3 0` |
| `keytar` build error | Run `npm install` with admin PowerShell so node-gyp can access MSVC |
| Backend not starting | Check `%APPDATA%\fx-logs\fx-server.log`; verify port 30000–31000 is not blocked by firewall |
| `curl` returns `Connection refused` | App may still be starting — wait 3–5 s and retry |
| `CERT_AUTHORITY_INVALID` in browser test | Use `curl -k` (self-signed cert); the Electron renderer auto-trusts via cert pinning |
| Installer missing icon | Place a valid `build/icon.ico` (256×256) — see `build/icon-README.txt` |

---

## Branch & PR

- **Branch:** `fx/package-exe`
- **PR title:** `[FX] Windows installer — Electron + pkg backend — Win 8.1 compat`
- **Key commits:**
  1. `feat(backend): hardened index.ts — 127.0.0.1, keytar, /healthz, /agent/run, /llm, rate-limit`
  2. `feat(electron): main.ts — cert-gen, port-pick, spawn, poll, cert-pin, IPC`
  3. `feat(electron): preload.ts — contextIsolation, whitelist-only IPC`
  4. `feat(app): ApiKeySetup modal — first-run key prompt, keytar write via backend`
  5. `build: root package.json — PowerShell scripts, electron-builder NSIS config`
  6. `docs: release/README.md, CHANGELOG.md`
