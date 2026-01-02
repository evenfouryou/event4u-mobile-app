# Event Four You SIAE Lettore - Build Instructions v3.14

## Requisiti
- Windows 10/11 (64-bit)
- .NET 8 SDK (x86 e x64): https://dotnet.microsoft.com/download/dotnet/8.0
- Node.js 20+: https://nodejs.org/
- Git (opzionale): https://git-scm.com/

---

## Build Installer Completo

Apri PowerShell come Amministratore e esegui:

```powershell
# 1. Scarica il repository
git clone https://github.com/evenfouryou/event-four-you-siae-lettore.git
cd event-four-you-siae-lettore

# 2. Vai nella cartella desktop-app
cd desktop-app

# 3. Compila SiaeBridge .NET (32-bit per smart card)
cd SiaeBridge
dotnet restore
dotnet publish -c Release -r win-x86 --self-contained true -o ../resources
cd ..

# 4. Verifica che i file siano nella cartella resources
dir resources

# 5. Installa dipendenze Node.js
npm install

# 6. Crea l'installer
npm run build

# 7. L'installer si trova in:
dir dist
```

L'installer `.exe` sara nella cartella `dist`.

---

## Aggiornamento Rapido (Solo SiaeBridge)

Se vuoi solo aggiornare il bridge senza ricreare l'installer:

```powershell
# Clona o aggiorna il repository
git clone https://github.com/evenfouryou/event-four-you-siae-lettore.git
# oppure: git pull origin main

# Compila SiaeBridge
cd event-four-you-siae-lettore\desktop-app\SiaeBridge
dotnet restore
dotnet publish -c Release -r win-x86 --self-contained true

# Copia i file nella tua installazione esistente
$source = "bin\Release\net8.0-windows\win-x86\publish\*"
$dest = "$env:LOCALAPPDATA\Programs\Event Four You SIAE Lettore\resources\SiaeBridge"
Copy-Item -Path $source -Destination $dest -Recurse -Force

Write-Host "Bridge aggiornato in: $dest"
```

---

## Struttura Cartelle

```
desktop-app/
  SiaeBridge/           # Progetto .NET per comunicazione smart card
    Program.cs          # Logica principale con firma CAdES-BES
    LibSiae.cs          # Wrapper libSIAE.dll
    SIAEReader.cs       # Interfaccia lettore
    SiaeBridge.csproj   # Progetto .NET 8
    libSIAEp7.dll       # DLL ufficiale SIAE (legacy fallback)
    prebuilt/
      libSIAE.dll       # DLL SIAE per smart card
      Newtonsoft.Json.dll
  resources/            # Output della build SiaeBridge
  main.js               # Electron main process
  preload.js            # Electron preload
  renderer.js           # Frontend
  index.html            # UI
  styles.css            # Stili
  package.json          # Configurazione Electron
```

---

## Versione 3.14 - Novita

### Firma CAdES-BES con SHA-256
- Conforme ETSI EN 319 122-1
- Attributo SigningCertificateV2 (OID 1.2.840.113549.1.9.16.2.47)
- BouncyCastle.Cryptography v2.5.0
- NO XMLDSig (deprecato e rifiutato da SIAE 2025)

### Struttura P7M Generata
Il file `.xsi.p7m` contiene:
1. **ContentType** (OID 1.2.840.113549.1.9.3): data
2. **SigningTime** (OID 1.2.840.113549.1.9.5): timestamp UTC
3. **MessageDigest** (OID 1.2.840.113549.1.9.4): hash SHA-256 del contenuto
4. **SigningCertificateV2** (OID 1.2.840.113549.1.9.16.2.47): certificato firmante

### Algoritmi
- Digest: SHA-256 (2.16.840.1.101.3.4.2.1)
- Firma: RSA con SHA-256 (1.2.840.113549.1.1.11)

---

## Funzionalita

- **Lettura Smart Card SIAE** - Seriale, counter, balance, keyId
- **Verifica PIN** - Autenticazione sulla carta
- **Cambio PIN** - Modifica PIN utente
- **Sigilli Fiscali** - Generazione automatica per biglietti
- **Firma Digitale CAdES-BES** - Con SHA-256 per report C1
- **Connessione Server** - WebSocket a manage.eventfouryou.com

---

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Bridge non trovato | Esegui `dotnet publish -c Release` |
| DLL non trovata | Verifica che resources/ contenga libSIAE.dll |
| PIN bloccato | Usa PUK per sbloccare |
| Firma fallisce | Verifica che libSIAEp7.dll sia nella cartella resources |
| File P7M ancora XMLDSig | Ricompila con `dotnet publish` e riavvia |

---

## Verifica File P7M

Per verificare che il file sia CAdES-BES valido:

```bash
# Con OpenSSL
openssl pkcs7 -inform DER -in file.xsi.p7m -print_certs -text

# Se mostra "pkcs7-signedData" con SHA256, e corretto
# Se mostra errore o XML dentro, e ancora XMLDSig (versione vecchia)
```

---

## Log

Il log del bridge si trova in:
- `%APPDATA%\event-four-you-siae-lettore\event4u-siae.log`
- `SiaeBridge\bridge.log` (nella cartella dell'exe)
