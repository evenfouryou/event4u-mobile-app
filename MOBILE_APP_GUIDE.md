# Guida alla Creazione delle App Mobile Event4U

Questa guida spiega come creare le versioni iOS e Android dell'app Event4U usando Capacitor.

## Prerequisiti

### Per iOS
- **Mac con macOS** (obbligatorio per compilare app iOS)
- **Xcode** installato dall'App Store (versione 14 o superiore)
- **Account Apple Developer** ($99/anno) per pubblicare sull'App Store

### Per Android
- **Android Studio** (disponibile per Mac, Windows, Linux)
- **Account Google Play Developer** ($25 una tantum) per pubblicare sul Play Store

## Passaggi per Generare le App

### 1. Costruire l'App Web

Prima di tutto, devi creare la build di produzione dell'app web:

```bash
npm run build
```

Questo genera i file nella cartella `dist/public`.

### 2. Inizializzare i Progetti Nativi

#### Per iOS:
```bash
npx cap add ios
```

#### Per Android:
```bash
npx cap add android
```

### 3. Sincronizzare il Codice

Ogni volta che fai modifiche all'app web, devi sincronizzare:

```bash
npm run build
npx cap sync
```

### 4. Aprire i Progetti Nativi

#### Per iOS (richiede Mac):
```bash
npx cap open ios
```
Si aprirà Xcode con il progetto iOS.

#### Per Android:
```bash
npx cap open android
```
Si aprirà Android Studio con il progetto Android.

### 5. Testare l'App

#### iOS
- In Xcode, seleziona un simulatore o il tuo iPhone connesso
- Clicca il pulsante "Play" per avviare l'app

#### Android
- In Android Studio, seleziona un emulatore o il tuo dispositivo connesso
- Clicca "Run" per avviare l'app

## Personalizzazione

### Icona dell'App e Splash Screen

Per personalizzare icone e splash screen, puoi usare:

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

Prima, posiziona le tue immagini sorgente:
- `assets/icon.png` (1024x1024 px)
- `assets/splash.png` (2732x2732 px)

### Configurazione Aggiuntiva

Il file `capacitor.config.ts` contiene la configurazione principale:
- `appId`: Identificativo unico dell'app (es. com.event4u.app)
- `appName`: Nome visualizzato dell'app
- `plugins`: Configurazione plugin nativi

## Pubblicazione

### iOS - App Store

1. In Xcode, vai su **Product > Archive**
2. Una volta completato l'archivio, clicca **Distribute App**
3. Seleziona **App Store Connect** e segui le istruzioni
4. In [App Store Connect](https://appstoreconnect.apple.com), completa le informazioni e invia per la revisione

### Android - Google Play

1. In Android Studio, vai su **Build > Generate Signed Bundle / APK**
2. Seleziona **Android App Bundle** (consigliato) o APK
3. Crea o usa una keystore esistente per firmare l'app
4. Carica il file `.aab` su [Google Play Console](https://play.google.com/console)

## Plugin Utili

Puoi aggiungere funzionalità native con i plugin Capacitor:

```bash
# Notifiche push
npm install @capacitor/push-notifications

# Camera
npm install @capacitor/camera

# Geolocalizzazione (già integrata nell'app web)
npm install @capacitor/geolocation

# Condivisione
npm install @capacitor/share
```

Dopo l'installazione, sincronizza:
```bash
npx cap sync
```

## Risoluzione Problemi

### iOS Build Fallisce
- Assicurati di avere Xcode aggiornato
- Esegui `pod install` nella cartella `ios/App`
- Pulisci la build con **Product > Clean Build Folder**

### Android Build Fallisce
- Sincronizza Gradle: **File > Sync Project with Gradle Files**
- Invalida cache: **File > Invalidate Caches / Restart**

### L'app non si aggiorna
- Assicurati di eseguire `npm run build` prima di `npx cap sync`
- Verifica che `webDir` in `capacitor.config.ts` punti a `dist/public`

## Note Importanti

1. **Live Reload durante lo sviluppo**: Per testare più velocemente durante lo sviluppo:
   ```bash
   npx cap run ios --livereload --external
   npx cap run android --livereload --external
   ```

2. **Deep Links**: Se usi deep links, dovrai configurarli sia su iOS che Android.

3. **API Keys**: Alcune API (come Google Maps) potrebbero richiedere chiavi separate per le app native.
