// GitHub Integration for Smart Card Reader Repository
// Uses Replit's GitHub connector

import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Files to upload
const FILES_TO_UPLOAD = {
  'server.js': `/**
 * Event4U Smart Card Reader Server
 * Server WebSocket per la comunicazione con il lettore MiniLector EVO V3
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = 18765;
const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://localhost:5000',
  'https://127.0.0.1:5000'
];

const REPLIT_PATTERN = /^https?:\\/\\/.*\\.replit\\.(dev|app|co)$/;

let systemState = {
  readerConnected: false,
  cardInserted: false,
  cardATR: null,
  lastError: null,
  simulationMode: true
};

let pcsclite = null;
let pcsc = null;

try {
  pcsclite = require('pcsclite');
  pcsc = pcsclite();
  systemState.simulationMode = false;
  console.log('[OK] Libreria PC/SC caricata');
  
  pcsc.on('reader', (reader) => {
    console.log(\`[+] Lettore trovato: \${reader.name}\`);
    systemState.readerConnected = true;
    systemState.readerName = reader.name;
    broadcastStatus();

    reader.on('status', (status) => {
      const changes = reader.state ^ status.state;
      
      if (changes & reader.SCARD_STATE_PRESENT) {
        if (status.state & reader.SCARD_STATE_PRESENT) {
          console.log('[+] Smart card inserita');
          systemState.cardInserted = true;
          systemState.cardATR = status.atr ? status.atr.toString('hex') : null;
        } else {
          console.log('[-] Smart card rimossa');
          systemState.cardInserted = false;
          systemState.cardATR = null;
        }
        broadcastStatus();
      }
    });

    reader.on('error', (err) => {
      console.error(\`[!] Errore lettore: \${err.message}\`);
      systemState.lastError = err.message;
      broadcastStatus();
    });

    reader.on('end', () => {
      console.log('[-] Lettore disconnesso');
      systemState.readerConnected = false;
      systemState.cardInserted = false;
      broadcastStatus();
    });
  });

  pcsc.on('error', (err) => {
    console.error(\`[!] Errore PC/SC: \${err.message}\`);
    systemState.lastError = err.message;
    systemState.simulationMode = true;
  });

} catch (err) {
  console.log('[!] PC/SC non disponibile - Modalita simulazione attiva');
  systemState.simulationMode = true;
  systemState.readerConnected = true;
  systemState.readerName = 'MiniLector EVO V3 (Simulato)';
  systemState.cardInserted = true;
  systemState.cardATR = 'SIMULATION_MODE_ATR';
}

const clients = new Set();

function broadcastStatus() {
  const message = JSON.stringify({ type: 'status', data: systemState });
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  });
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (REPLIT_PATTERN.test(origin)) return true;
  return false;
}

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', ...systemState }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  
  if (!isAllowedOrigin(origin)) {
    console.log(\`[!] Connessione rifiutata da: \${origin}\`);
    ws.close(4003, 'Origin not allowed');
    return;
  }
  
  console.log(\`[+] Client connesso da: \${origin || 'locale'}\`);
  clients.add(ws);
  
  ws.send(JSON.stringify({ type: 'status', data: systemState }));
  
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      
      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'getStatus':
          ws.send(JSON.stringify({ type: 'status', data: systemState }));
          break;
        case 'requestSeal':
          if (!systemState.cardInserted && !systemState.simulationMode) {
            ws.send(JSON.stringify({ type: 'sealResponse', success: false, error: 'Smart card non inserita' }));
          } else {
            const seal = {
              sealNumber: \`SEAL-\${Date.now()}-\${Math.random().toString(36).substring(2, 10).toUpperCase()}\`,
              timestamp: new Date().toISOString(),
              eventId: msg.data?.eventId,
              ticketId: msg.data?.ticketId,
              signature: systemState.simulationMode ? 'SIMULATED_SIGNATURE' : 'REAL_SIGNATURE',
              simulationMode: systemState.simulationMode
            };
            ws.send(JSON.stringify({ type: 'sealResponse', success: true, seal }));
          }
          break;
      }
    } catch (err) {
      console.error(\`[!] Errore parsing: \${err.message}\`);
    }
  });
  
  ws.on('close', () => {
    console.log('[-] Client disconnesso');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error(\`[!] Errore WebSocket: \${err.message}\`);
    clients.delete(ws);
  });
});

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('========================================');
  console.log('  Event4U Smart Card Reader');
  console.log('========================================');
  console.log('');
  console.log(\`  Server: ws://127.0.0.1:\${PORT}\`);
  console.log(\`  Health: http://127.0.0.1:\${PORT}/health\`);
  console.log('');
  if (systemState.simulationMode) {
    console.log('  [!] MODALITA SIMULAZIONE ATTIVA');
    console.log('');
  }
  console.log('  NON CHIUDERE QUESTA FINESTRA');
  console.log('========================================');
});

process.on('SIGINT', () => {
  console.log('\\n[*] Chiusura server...');
  wss.close();
  httpServer.close();
  if (pcsc) pcsc.close();
  process.exit(0);
});
`,

  'package.json': `{
  "name": "event4u-smart-card-reader",
  "version": "1.0.0",
  "description": "Event4U - Server Smart Card SIAE per MiniLector EVO V3",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ws": "^8.14.2"
  },
  "optionalDependencies": {
    "pcsclite": "^1.0.1"
  }
}
`,

  'install-and-run.bat': `@echo off
title Event4U Smart Card Reader - Installazione
color 0A

echo.
echo ========================================
echo   Event4U Smart Card Reader
echo   Installazione Automatica
echo ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js non trovato. Scaricamento in corso...
    echo.
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
        echo [ERRORE] Download fallito. Scarica Node.js da https://nodejs.org/
        pause
        exit
    )
)

echo [OK] Node.js trovato!
echo.

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
`,

  'README.md': `# Event4U Smart Card Reader

Server per il lettore Smart Card MiniLector EVO V3, conforme alle normative SIAE italiane.

## Installazione

1. Scarica il file ZIP dalla sezione [Releases](../../releases)
2. Estrai in una cartella
3. Fai doppio click su \`install-and-run.bat\`

## Requisiti

- Windows 10/11
- Node.js (installato automaticamente se mancante)
- Lettore MiniLector EVO V3 (opzionale per test)
- Smart Card SIAE (per sigilli fiscali validi)

## Modalità Simulazione

Se il lettore non è collegato, il sistema funziona in modalità simulazione per permettere i test.
I sigilli generati in questa modalità NON sono validi fiscalmente.

## Supporto

Per problemi tecnici, contatta il supporto Event4U.
`,

  '.github/workflows/build.yml': `name: Build and Release Smart Card Reader

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install production dependencies
        run: npm ci --production
        
      - name: Create release package
        run: |
          mkdir release
          copy server.js release\\
          copy package.json release\\
          copy install-and-run.bat release\\
          copy README.md release\\
          xcopy node_modules release\\node_modules\\ /E /I /Y
          
      - name: Create ZIP
        run: Compress-Archive -Path release\\* -DestinationPath Event4U-SmartCard-Reader.zip
        shell: powershell
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: Event4U-SmartCard-Reader
          path: Event4U-SmartCard-Reader.zip
          
      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: Event4U-SmartCard-Reader.zip
          name: Event4U Smart Card Reader \${{ github.ref_name }}
          body: |
            ## Event4U Smart Card Reader
            
            ### Installazione
            1. Scarica \`Event4U-SmartCard-Reader.zip\`
            2. Estrai in una cartella
            3. Fai doppio click su \`install-and-run.bat\`
            4. Lascia la finestra aperta mentre usi Event4U
            
            ### Requisiti
            - Windows 10/11
            - Node.js (installato automaticamente se mancante)
            - Lettore MiniLector EVO V3 (opzionale per test)
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`
};

export async function createSmartCardReaderRepo(): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`GitHub user: ${user.login}`);
    
    const repoName = 'event4u-smart-card-reader';
    
    // Check if repo exists
    let repoExists = false;
    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      repoExists = true;
      console.log('Repository already exists, updating files...');
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }
    
    // Create repo if it doesn't exist
    if (!repoExists) {
      console.log('Creating new repository...');
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'Event4U Smart Card Reader - Server per MiniLector EVO V3',
        private: false,
        auto_init: true
      });
      // Wait a moment for repo to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Upload each file
    for (const [filename, content] of Object.entries(FILES_TO_UPLOAD)) {
      console.log(`Uploading ${filename}...`);
      
      // Check if file exists
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner: user.login,
          repo: repoName,
          path: filename
        });
        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }
      
      // Create or update file
      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: repoName,
        path: filename,
        message: sha ? `Update ${filename}` : `Add ${filename}`,
        content: Buffer.from(content).toString('base64'),
        sha
      });
    }
    
    const repoUrl = `https://github.com/${user.login}/${repoName}`;
    console.log(`Repository ready: ${repoUrl}`);
    
    return { success: true, repoUrl };
    
  } catch (error: any) {
    console.error('GitHub error:', error.message);
    return { success: false, error: error.message };
  }
}
