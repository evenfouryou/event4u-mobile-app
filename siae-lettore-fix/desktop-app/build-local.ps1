# ============================================================
# Event Four You SIAE Lettore - Script di Build Locale
# ============================================================
# Esegui questo script da PowerShell nella cartella desktop-app
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Event Four You SIAE Lettore - Build Locale" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verifica di essere nella cartella giusta
if (-not (Test-Path "package.json")) {
    Write-Host "ERRORE: Esegui questo script dalla cartella desktop-app!" -ForegroundColor Red
    exit 1
}

# Step 1: Compila il bridge
Write-Host "[1/5] Compilo SiaeBridge..." -ForegroundColor Yellow
Push-Location SiaeBridge
try {
    dotnet build -c Release
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRORE: Compilazione fallita!" -ForegroundColor Red
        exit 1
    }
    Write-Host "      ✓ SiaeBridge compilato" -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 2: Copia libSIAE.dll
Write-Host "[2/5] Copio libSIAE.dll..." -ForegroundColor Yellow
$bridgeDir = "SiaeBridge\bin\Release\net472"
$dllSrc = "..\attached_assets\libSIAE.dll"
$dllDst = "$bridgeDir\libSIAE.dll"

if (Test-Path $dllSrc) {
    Copy-Item $dllSrc $dllDst -Force
    Write-Host "      ✓ libSIAE.dll copiata" -ForegroundColor Green
} else {
    Write-Host "ERRORE: libSIAE.dll non trovata in attached_assets!" -ForegroundColor Red
    exit 1
}

# Step 3: Verifica file
Write-Host "[3/5] Verifico file bridge..." -ForegroundColor Yellow
$requiredFiles = @("SiaeBridge.exe", "libSIAE.dll", "Newtonsoft.Json.dll")
$allFound = $true

foreach ($file in $requiredFiles) {
    $path = Join-Path $bridgeDir $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "      ✓ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "      ✗ MANCA: $file" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host "ERRORE: File mancanti!" -ForegroundColor Red
    exit 1
}

# Step 4: Installa dipendenze Node
Write-Host "[4/5] Installo dipendenze Node..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRORE: npm install fallito!" -ForegroundColor Red
    exit 1
}
Write-Host "      ✓ Dipendenze installate" -ForegroundColor Green

# Step 5: Chiedi all'utente cosa fare
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Build completata!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cosa vuoi fare?"
Write-Host "  [1] Avvia l'app in modalità sviluppo (npm start)"
Write-Host "  [2] Crea l'installer (npm run build)"
Write-Host "  [3] Esci"
Write-Host ""

$choice = Read-Host "Scegli (1/2/3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Avvio l'app..." -ForegroundColor Yellow
        npm start
    }
    "2" {
        Write-Host ""
        Write-Host "Creo l'installer..." -ForegroundColor Yellow
        npm run build
        
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host " Installer creato!" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Trovi i file in: dist\" -ForegroundColor Yellow
        
        if (Test-Path "dist") {
            Get-ChildItem dist -Filter "*.exe" | ForEach-Object {
                Write-Host "  → $($_.Name)" -ForegroundColor Green
            }
        }
    }
    default {
        Write-Host "Ciao!"
    }
}
