@echo off
title Event4U Smart Card Reader - Installazione
color 0A

echo.
echo ========================================
echo   Event4U Smart Card Reader
echo   Installazione Automatica
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js non trovato. Scaricamento in corso...
    echo.
    
    :: Download Node.js installer
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node-installer.msi'}"
    
    if exist node-installer.msi (
        echo [*] Installazione Node.js...
        msiexec /i node-installer.msi /qn
        del node-installer.msi
        echo [OK] Node.js installato!
        echo.
        echo [!] Riavvia questo script dopo l'installazione.
        pause
        exit
    ) else (
        echo [ERRORE] Download fallito. Scarica Node.js manualmente da:
        echo https://nodejs.org/
        pause
        exit
    )
)

echo [OK] Node.js trovato!
echo.

:: Check if node_modules exists
if not exist node_modules (
    echo [*] Installazione dipendenze...
    call npm install --production
    echo.
)

echo [*] Avvio Event4U Smart Card Reader...
echo.
echo ========================================
echo   Server attivo su porta 18765
echo   NON CHIUDERE QUESTA FINESTRA
echo ========================================
echo.

node server.js

pause
