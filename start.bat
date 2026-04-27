@echo off
REM Skrypt do uruchomienia licznika wpłat Łatwogang x Cancer Fighters

echo.
echo ╔════════════════════════════════════════════════╗
echo ║  Licznik wpłat Łatwogang x Cancer Fighters      ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Sprawdzanie czy Node.js jest zainstalowany
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Błąd: Node.js nie jest zainstalowany!
    echo.
    echo Pobierz i zainstaluj Node.js ze strony: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✓ Node.js znaleziony
echo.

REM Sprawdzanie czy node_modules istnieje
if not exist "node_modules" (
    echo → Instalowanie zależności (to może chwilę potrwać)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ✗ Błąd podczas instalacji!
        pause
        exit /b 1
    )
    echo ✓ Zależności zainstalowane
    echo.
)

echo → Uruchamianie serwera...
echo.
echo Serwer dostępny na: http://localhost:3000
echo.
echo Naciśnij Ctrl+C aby zatrzymać serwer
echo.

call npm start
