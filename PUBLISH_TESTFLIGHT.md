# Guida Pubblicazione TestFlight - Event4U

## Requisiti

1. **Account Apple Developer** ($99/anno) - [developer.apple.com](https://developer.apple.com)
2. **Account Expo** gratuito - [expo.dev](https://expo.dev)
3. **Node.js** installato sul tuo computer

## Passaggi

### 1. Clona il progetto sul tuo computer

```bash
git clone https://github.com/TUO-USERNAME/event4u.git
cd event4u/mobile-app
```

### 2. Installa le dipendenze

```bash
npm install
npm install -g eas-cli
```

### 3. Accedi a Expo

```bash
eas login
```

### 4. Configura il progetto EAS

```bash
eas build:configure
```

Questo comando aggiornerà automaticamente `app.json` con il tuo `projectId`.

### 5. Modifica le configurazioni

Apri `app.json` e sostituisci:
- `YOUR_EAS_PROJECT_ID` → con l'ID generato da EAS
- `YOUR_EXPO_USERNAME` → con il tuo username Expo

Apri `eas.json` e sostituisci:
- `YOUR_APPLE_ID@email.com` → con la tua email Apple Developer
- `YOUR_APP_STORE_CONNECT_APP_ID` → (opzionale, EAS lo chiederà durante il submit)

### 6. Aggiungi le immagini

Crea nella cartella `assets/`:
- `icon.png` (1024x1024 px) - Icona dell'app
- `splash.png` (1284x2778 px) - Schermata di caricamento
- `adaptive-icon.png` (1024x1024 px) - Icona Android

### 7. Build e invio a TestFlight

**Metodo veloce (raccomandato):**
```bash
npx testflight
```

**Metodo manuale:**
```bash
# Crea il build iOS
eas build --platform ios --profile production

# Invia a TestFlight
eas submit --platform ios
```

### 8. Dopo l'invio

1. Vai su [App Store Connect](https://appstoreconnect.apple.com)
2. Seleziona la tua app → **TestFlight**
3. Attendi 5-10 minuti per l'elaborazione
4. Aggiungi i tester via email
5. Per tester esterni: invia per revisione beta

## Configurazione già pronta

Il file `eas.json` è già configurato con:
- **development**: Build di sviluppo con client Expo
- **preview**: Build di test interno
- **production**: Build per App Store/TestFlight

## Comandi utili

```bash
# Build iOS per TestFlight
eas build --platform ios --profile production --auto-submit

# Build Android per Play Store
eas build --platform android --profile production

# Verifica stato build
eas build:list

# Aggiorna l'app (OTA update)
eas update
```

## Troubleshooting

**"Distribution Certificate not validated"**
→ Esegui il primo build manualmente, EAS configura le credenziali

**Build non appare in TestFlight**
→ Attendi 5-10 minuti, controlla email per errori

**Errore di crittografia**
→ Già configurato: `ITSAppUsesNonExemptEncryption: false` in app.json

## Supporto

- [Documentazione EAS](https://docs.expo.dev/eas/)
- [Guida TestFlight](https://docs.expo.dev/submit/ios/)
