# Quickstart — TextFX (Prototype)

Windows (PowerShell):

1. Install dependencies at repo root:

```powershell
npm install
```

2. Install workspace dependencies (app + backend):

```powershell
npm run bootstrap
```

3. Start the dev servers (opens two windows):

```powershell
.\scripts\dev.ps1
```

4. Open the UI in your browser: `http://localhost:5173`

Notes:
- Backend runs on `http://localhost:4000` and exposes mocked endpoints. Replace adapters in `backend/src/modules/` with real AI provider calls when ready.
- For full desktop packaging add the Electron main process and build config (scaffolded notes are in docs/).
