# TextFX v5 — Dev launcher (PowerShell, Windows 8.1 compatible)
# Launches backend and Vite dev server in separate PowerShell windows, then Electron.
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1

$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host "=== TextFX v5 Dev Mode ===" -ForegroundColor Cyan

# 1. Start backend
Push-Location (Join-Path $rootDir "backend")
Start-Process -FilePath "powershell" `
  -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","npm run dev" `
  -WindowStyle Normal
Pop-Location

# 2. Start Vite frontend
Push-Location (Join-Path $rootDir "app")
Start-Process -FilePath "powershell" `
  -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","npm run dev" `
  -WindowStyle Normal
Pop-Location

# 3. Wait for Vite to be ready, then start Electron
Write-Host "Waiting for Vite on http://localhost:5173 ..." -ForegroundColor Yellow
$max = 30
for ($i = 0; $i -lt $max; $i++) {
  Start-Sleep -Seconds 1
  try {
    $null = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
    Write-Host "Vite is ready. Starting Electron..." -ForegroundColor Green
    break
  } catch {
    Write-Host "  attempt $($i+1)/$max ..." -ForegroundColor Gray
  }
}

Push-Location $rootDir
$env:ELECTRON_START_URL = "http://localhost:5173"
npx electron .
Pop-Location
