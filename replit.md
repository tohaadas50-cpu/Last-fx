# TextFX v5

AI-powered creative direction tool for lateral thinking and copywriting. Helps creative teams generate insights, concepts, and scripts using structured lateral thinking techniques (provocation, analogies, random stimulus, opposite thinking, constraint reversal).

## Architecture

- **Frontend**: React + Vite (TypeScript), runs on port 5000
- **Backend**: Express + TypeScript API, runs on port 3001 (accessed via Vite proxy)
- **AI Providers**: OpenAI (GPT-4o-mini) and Google Vertex AI
- **Languages**: English and Arabic (RTL supported)

## Project Layout

```
fx-build/
  app/          React + Vite frontend
  backend/      Express API (compiled TypeScript)
  start.sh      Startup script (runs both services)
```

## Running the App

The workflow `Start application` runs `bash fx-build/start.sh` which:
1. Starts the backend on port 3001 (localhost only)
2. Starts the Vite dev server on port 5000 (0.0.0.0)

Vite proxies all `/api/*` and `/health*` requests to the backend at `http://localhost:3001`.

## AI Configuration

The app works without an AI key using template-based fallbacks. To enable real AI:
- Set `OPENAI_API_KEY` env var for OpenAI (GPT-4o-mini)
- Set `GOOGLE_CLOUD_PROJECT` env var for Google Vertex AI
- Optional: `SERPAPI_KEY` for live trend data

## Build & Compile

```bash
# Compile backend TypeScript
cd fx-build/backend && npx tsc -p tsconfig.json

# Install frontend deps
cd fx-build/app && npm install

# Rebuild after changes
cd fx-build/backend && npx tsc -p tsconfig.json && cd ../.. && # restart workflow
```

## User Preferences

- Keep the dual-language (EN/AR) support intact
- Backend always binds to 127.0.0.1 (localhost only) for security
- Frontend proxies API requests — never expose backend port directly
