# Event4U Smart Card Reader

Applicazione desktop per Windows che permette all'app web Event4U di comunicare con il lettore Smart Card MiniLector EVO V3 per l'emissione di biglietti fiscali SIAE.

## Download e Installazione

1. Vai alla pagina [Releases](../../releases)
2. Scarica l'ultimo file `.exe`
3. Esegui l'installer e segui le istruzioni
4. L'app apparirà nella system tray (icona vicino all'orologio)

## Requisiti

- Windows 10/11 (64-bit)
- Driver MiniLector EVO V3 installati
- Servizio Smart Card di Windows attivo

### Attivare il Servizio Smart Card

Apri PowerShell come Amministratore ed esegui:
```powershell
Start-Service SCardSvr
Set-Service SCardSvr -StartupType Automatic
```

## Come Funziona

1. L'applicazione avvia un server WebSocket sulla porta 18765
2. Rileva automaticamente il lettore Smart Card
3. Monitora lo stato della Smart Card in tempo reale
4. L'app web Event4U si connette automaticamente

## Modalità Demo

Se non hai il lettore fisico, puoi usare la "Modalità Demo" per testare:
1. Apri l'applicazione
2. Clicca "Attiva Demo"
3. L'app simulerà un lettore connesso con carta inserita

## Verifica Funzionamento

Apri nel browser: `http://127.0.0.1:18765/health`

Dovresti vedere:
```json
{
  "status": "ok",
  "readerConnected": true,
  "cardInserted": true
}
```

## Sviluppo

```bash
cd desktop-app
npm install
npm start
```

## Build

```bash
npm run build
```

L'installer verrà generato nella cartella `dist/`.

## Supporto

Per assistenza contattare il supporto Event4U.
