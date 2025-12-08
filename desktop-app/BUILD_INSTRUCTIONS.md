# 🔧 ISTRUZIONI DI BUILD - Event Four You SIAE Lettore

## ✅ BUG FIX v3.3 (Dicembre 2024)

**Problema:** PIN mostrato come errato anche quando corretto

### Correzioni applicate:

1. **Parametro `nPIN` corretto:**
   - Prima: `VerifyPINML(pin.Length, pin, slot)` - passava 4-8 (lunghezza)
   - Dopo: `VerifyPINML(1, pin, slot)` - passa 1 (identificatore PIN utente)

2. **Marshalling stringa PIN corretto:**
   - Aggiunto `[MarshalAs(UnmanagedType.LPStr)]` per garantire che il PIN venga passato come puntatore a stringa ANSI null-terminated

3. **Sanitizzazione input PIN:**
   - Rimossi automaticamente spazi e caratteri non numerici dal PIN prima della verifica

**Riferimento:** Documentazione ufficiale SIAE `test.c` riga 233:
```c
res=pVerifyPINML(1, (char*) pin, slot);
```

**IMPORTANTE:** Devi ricompilare per applicare queste correzioni!

---

## ❌ PROBLEMA ATTUALE
Il bridge .NET (SiaeBridge.exe) non è compilato, quindi l'app non funziona.

## ✅ SOLUZIONE

### OPZIONE A: Build Locale su Windows (RACCOMANDATA)

1. **Scarica il progetto da GitHub:**
   ```
   https://github.com/evenfouryou/event-four-you-siae-lettore
   → Code → Download ZIP → Estrai
   ```

2. **Apri PowerShell come Amministratore nella cartella del progetto**

3. **Esegui questi comandi:**
   ```powershell
   # Vai nella cartella del bridge
   cd desktop-app\SiaeBridge

   # Compila il bridge (32-bit)
   dotnet build -c Release

   # Copia la DLL SIAE nella cartella del bridge
   Copy-Item ..\..\attached_assets\libSIAE.dll .\bin\Release\net472\ -Force

   # Verifica che i file esistano
   dir .\bin\Release\net472\

   # Torna alla cartella desktop-app
   cd ..

   # Installa dipendenze Node
   npm install

   # Avvia l'app in modalità sviluppo per testare
   npm start
   ```

4. **Se funziona, crea l'installer:**
   ```powershell
   npm run build
   ```
   L'installer sarà in `desktop-app\dist\`

---

### OPZIONE B: Build Automatica su GitHub Actions

1. **Vai su GitHub:** https://github.com/evenfouryou/event-four-you-siae-lettore

2. **Crea il workflow:**
   - Clicca **Add file** → **Create new file**
   - Nome: `.github/workflows/build.yml`
   - Incolla il contenuto del file `WORKFLOW.yml` qui sotto
   - Clicca **Commit changes**

3. **Avvia la build:**
   - Vai su **Actions**
   - Clicca sul workflow **Build SIAE Lettore**
   - Clicca **Run workflow** → **Run workflow**

4. **Scarica l'installer:**
   - Quando è verde (✓), clicca sulla build
   - Scarica **SIAE-Lettore-Installer**

---

## 📁 FILE RICHIESTI

Dopo la compilazione, la cartella `SiaeBridge/bin/Release/net472/` deve contenere:

| File | Descrizione |
|------|-------------|
| `SiaeBridge.exe` | Bridge .NET (32-bit) |
| `libSIAE.dll` | Libreria SIAE (32-bit) |
| `Newtonsoft.Json.dll` | Libreria JSON |

---

## 🔍 TROUBLESHOOTING

### "Il lettore si disconnette quando inserisco la carta"
- **Causa:** Il bridge non è in esecuzione
- **Soluzione:** Verifica che SiaeBridge.exe e libSIAE.dll siano nella stessa cartella

### "Bridge non trovato"
- **Causa:** SiaeBridge.exe non esiste
- **Soluzione:** Esegui `dotnet build -c Release` nella cartella SiaeBridge

### "DLL non trovata"
- **Causa:** libSIAE.dll non è nella cartella del bridge
- **Soluzione:** Copia libSIAE.dll in `bin/Release/net472/`

### Log del bridge
Il log del bridge si trova in:
```
%APPDATA%\event-four-you-siae-lettore\siae-bridge.log
```

---

## 📋 WORKFLOW.yml (copia questo su GitHub)

```yaml
name: Build SIAE Lettore

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '6.0.x'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build SiaeBridge (32-bit)
        working-directory: desktop-app/SiaeBridge
        run: |
          dotnet restore
          dotnet build -c Release
          dir bin\Release\net472\

      - name: Copy libSIAE.dll
        shell: pwsh
        run: |
          $src = "attached_assets/libSIAE.dll"
          $dst = "desktop-app/SiaeBridge/bin/Release/net472/libSIAE.dll"
          if (Test-Path $src) {
            Copy-Item $src $dst -Force
            Write-Host "✓ libSIAE.dll copiata"
          } else {
            Write-Host "✗ libSIAE.dll non trovata in attached_assets!"
            exit 1
          }

      - name: Verify bridge files
        shell: pwsh
        run: |
          $dir = "desktop-app/SiaeBridge/bin/Release/net472"
          $files = @("SiaeBridge.exe", "libSIAE.dll")
          foreach ($f in $files) {
            $path = Join-Path $dir $f
            if (Test-Path $path) {
              Write-Host "✓ $f"
            } else {
              Write-Host "✗ MANCA: $f"
              exit 1
            }
          }

      - name: Install Node dependencies
        working-directory: desktop-app
        run: npm install

      - name: Build Electron app
        working-directory: desktop-app
        run: npm run build

      - name: Upload installer
        uses: actions/upload-artifact@v4
        with:
          name: SIAE-Lettore-Installer
          path: desktop-app/dist/*.exe

      - name: Upload portable
        uses: actions/upload-artifact@v4
        with:
          name: SIAE-Lettore-Portable
          path: desktop-app/dist/win-unpacked/
```
