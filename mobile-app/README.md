# Event4U Mobile App

App mobile React Native con Expo per Event4U - Sistema di gestione eventi e biglietteria SIAE.

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app sul telefono (per testing)

### Installazione

```bash
cd mobile-app
npm install
```

### Avvio sviluppo

```bash
npm start
```

Scansiona il QR code con Expo Go sul telefono.

### Configurazione API

Crea un file `.env` copiando da `.env.example`:

```bash
cp .env.example .env
```

Modifica `EXPO_PUBLIC_API_URL` con l'URL del tuo backend.

## 📱 Schermate

### Cliente
- Home con eventi in evidenza
- Lista eventi con filtri
- Dettaglio evento e acquisto
- Carrello e checkout
- I miei biglietti con QR code
- Cambio nominativo
- Rivendita biglietti

### Scanner
- Dashboard scansioni
- Scansione QR con camera
- Storico scansioni
- Statistiche

### PR/Promoter
- Dashboard commissioni
- Gestione liste ospiti
- Prenotazioni tavoli
- Wallet e pagamenti

### Cassiere
- Emissione biglietti
- Dashboard vendite

### Gestione
- Dashboard gestore
- Gestione eventi
- Event Hub

## 🏗️ Build

### Con EAS Build (consigliato)

```bash
# Android APK
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

### Locale (richiede Android Studio / Xcode)

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

## 📦 Tecnologie

- **Expo SDK 52**
- **React Native 0.76**
- **React Navigation** - Navigazione
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **expo-camera** - Scansione QR
- **react-native-maps** - Mappe
- **react-native-qrcode-svg** - Generazione QR

## 🎨 Design

- Tema scuro nightclub
- Colori primari: Viola (#8B5CF6)
- Font: System default
- Cards con bordi arrotondati
- Animazioni fluide
