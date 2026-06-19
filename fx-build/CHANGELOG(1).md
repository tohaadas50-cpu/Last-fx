# CHANGELOG — TextFX v5 Windows Installer

## [5.0.0] — 2025-03-15  Branch: fx/package-exe

### Added

#### Backend (`backend/src/index.ts`)
- **CLI args** `--port`, `--cert`, `--key` parsed from `process.argv`
- **Bind to 127.0.0.1 only** — removed all `0.0.0.0` bindings
- **HTTPS** via `https.createServer` when `--cert` / `--key` provided; falls back to HTTP for local dev without certs
- **`GET /healthz`** → `{ ok: true, ts }` — used by Electron to poll readiness
- **`POST /agent/run`** → spawns child process with 120 s timeout, returns `{ ok: true, id }`; auto-kills on timeout; full registry cleanup on shutdown
- **`POST /llm`** → sanitizer → policy check → `keytar.getPassword('fx-openai','default')` → OpenAI call; returns 401 if key missing; never logs raw input
- **`POST /api/set-key`** + **`DELETE /api/set-key`** + **`GET /api/key-status`** — keytar write/delete/check endpoints for the UI
- **Rate limiting** — `express-rate-limit` 60 req/min on `/llm`
- **PII-redacted structured logging** — all `prompt`/`input`/`content`/`key` fields replaced with `[REDACTED:<sha256>]`; logs written to `%APPDATA%\fx-logs\fx-server.log`
- **Graceful shutdown** — SIGTERM/SIGINT/uncaughtException kill all child agents, close server, exit 0
- **`keytar`** added as a runtime dependency (`^7.9.0`)
- **`express-rate-limit`** added (`^7.3.1`)

#### Electron (`electron-src/main.ts`)
- Self-signed cert generation via `openssl` CLI on first run; stored in `%APPDATA%\fx-certs\`
- SHA-256 fingerprint computed from the cert PEM and transferred to renderer via `ipcMain.handle('fx:get-backend-info')`
- Dynamic port selection in range 30000–31000 via `net.createServer` probe
- Backend spawned as `windowsHide: true` child process with `execFile`
- `/healthz` polling with basic TLS fingerprint check (cert pinning)
- Content Security Policy injected via `session.defaultSession.webRequest.onHeadersReceived`
- `tree-kill` used in `before-quit` to eliminate orphan process trees on Windows
- `uncaughtException` handler kills backend and calls `app.quit()`

#### Electron (`electron-src/preload.ts`)
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- `window.fx.getBackendInfo()` — returns `{ port, certFingerprint, protocol, host }`
- `window.fx.request(channel, payload)` — whitelist-only IPC router

#### Frontend (`app/src/ApiKeySetup.tsx`) — NEW FILE
- Modal component shown on first run or when `/llm` returns 401
- Validates `sk-` prefix before sending
- Posts to `POST /api/set-key` on local backend (key never stored in renderer)
- Clears input field from memory immediately after successful save
- Accessible (`role="dialog"`, `aria-modal`, `aria-labelledby`)

#### Frontend (`app/src/App.tsx`)
- Added `window.fx.getBackendInfo()` bootstrap `useEffect` — dynamically sets backend origin from Electron IPC
- Added `GET /api/key-status` check on startup — shows `ApiKeySetup` modal if key is missing
- `ApiKeySetup` modal rendered conditionally

#### Build (`package.json` — root)
- Replaced all `npm run` scripts with PowerShell-safe equivalents using `Push-Location` / `Pop-Location`
- `electron-builder` configured with NSIS target, `extraResources` for `fx-server.exe`, output to `release/installer/`
- `tree-kill` added as runtime dependency for Electron main
- Electron pinned to `^32.3.3` (Node 18 compatible, Windows 8.1 compatible renderer)

#### Build (`backend/package.json`)
- `pkg ^5.8.1` added as dev dependency
- `build:pkg` script targets `node18-win-x64`
- `pkg.config.json` added — includes `keytar.node` as binary asset for pkg

#### Build assets
- `build/installer.nsh` — NSIS macro for Add/Remove Programs registry entry
- `build/icon-README.txt` — icon generation instructions

#### Docs
- `release/README.md` — full build, install, test, security, and rollback guide
- `CHANGELOG.md` — this file

### Changed
- `backend/tsconfig.json` — target downgraded to `ES2019` for Node 16/18 compatibility; added `resolveJsonModule`
- `scripts/dev.ps1` — rewrites to use `Push-Location`/`Pop-Location`, polls Vite before launching Electron
- `electron/main.js` — superseded by compiled `electron-src/main.ts` → `electron/main.js`

### Security
- **Zero-key policy enforced**: no `OPENAI_API_KEY` in any `.env` file, no key in any bundled file
- **127.0.0.1 binding enforced** in `backend/src/index.ts`
- **PII never logged** — SHA-256 hashes only
- **CSP** restricts renderer `connect-src` to `https://127.0.0.1:<port>` only
- **Cert pinning** between Electron main and renderer via IPC fingerprint transfer

### Rollback
See `release/README.md § Rollback instructions`.
