# Skrypt do uruchomienia licznika wpłat Łatwogang x Cancer Fighters

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Licznik wpłat Łatwogang x Cancer Fighters      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Sprawdzanie czy Node.js jest zainstalowany
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✓ Node.js znaleziony: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Błąd: Node.js nie jest zainstalowany!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pobierz i zainstaluj Node.js ze strony: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Naciśnij Enter aby zamknąć"
    exit 1
}

Write-Host ""

# Sprawdzanie czy node_modules istnieje
if (-not (Test-Path "node_modules")) {
    Write-Host "→ Instalowanie zależności (to może chwilę potrwać)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "✗ Błąd podczas instalacji!" -ForegroundColor Red
        Read-Host "Naciśnij Enter aby zamknąć"
        exit 1
    }
    Write-Host "✓ Zależności zainstalowane" -ForegroundColor Green
    Write-Host ""
}

Write-Host "→ Uruchamianie serwera..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Serwer dostępny na: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Naciśnij Ctrl+C aby zatrzymać serwer" -ForegroundColor Yellow
Write-Host ""

npm start
