/**
 * Event Four You SIAE Lettore - Applicazione Electron
 * Lettore Smart Card SIAE per MiniLector EVO V3
 * Integra il bridge .NET per comunicare con libSIAE.dll
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// Configurazione
const PORT = 18765;
const BRIDGE_PORT = 18766;
const POLLING_INTERVAL = 2500;

// Stato globale
let mainWindow = null;
let tray = null;
let httpServer = null;
let wss = null;
let pollingTimer = null;
let bridgeProcess = null;
let bridgeWs = null;
let bridgeConnected = false;

let systemState = {
  readerConnected: false,
  cardInserted: false,
  cardATR: null,
  cardSerial: null,
  readerName: null,
  lastError: null,
  simulationMode: false,
  clientsConnected: 0,
  bridgeConnected: false,
  canEmitRealSeals: false
};

// Client WebSocket connessi
const wsClients = new Set();

// Origini permesse
const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://localhost:5000',
  'https://127.0.0.1:5000'
];
const REPLIT_PATTERN = /^https?:\/\/.*\.replit\.(dev|app|co)$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (REPLIT_PATTERN.test(origin)) return true;
  return false;
}

// Rileva lettore smart card tramite certutil (metodo più affidabile)
function detectSmartCardReader() {
  return new Promise((resolve) => {
    // Usa certutil -scinfo che funziona sempre su Windows
    exec('certutil -scinfo', { timeout: 15000, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        resolve({ found: false, name: null, error: error.message });
        return;
      }
      
      const output = stdout || '';
      
      // Cerca "Lettore:" o "Reader:" nel output
      const readerMatch = output.match(/(?:Lettore|Reader):\s*(.+?)(?:\r?\n|$)/i);
      if (readerMatch) {
        const readerName = readerMatch[1].trim();
        // Verifica che non sia un messaggio di errore
        if (readerName && !readerName.includes('Nessun') && !readerName.includes('No ')) {
          resolve({ found: true, name: readerName, error: null });
          return;
        }
      }
      
      // Cerca pattern alternativi (BIT4ID, MiniLector, Smart Card Reader)
      const bit4idMatch = output.match(/(BIT4ID[^\r\n]+|miniLector[^\r\n]+|Smart Card Reader[^\r\n]+)/i);
      if (bit4idMatch) {
        resolve({ found: true, name: bit4idMatch[1].trim(), error: null });
        return;
      }
      
      // Cerca "Lettori:" seguito da numero > 0
      const countMatch = output.match(/(?:Lettori|Readers):\s*(\d+)/i);
      if (countMatch && parseInt(countMatch[1]) > 0) {
        resolve({ found: true, name: 'Smart Card Reader', error: null });
        return;
      }
      
      resolve({ found: false, name: null, error: null });
    });
  });
}

// Rileva smart card inserita tramite certutil
function detectSmartCard() {
  return new Promise((resolve) => {
    exec('certutil -scinfo', { timeout: 8000, encoding: 'utf8' }, (error, stdout, stderr) => {
      const output = stdout || '';
      const outputLower = output.toLowerCase();
      const errorOutput = (stderr || '').toLowerCase();
      
      // Debug log
      console.log('certutil output:', output.substring(0, 500));
      
      // Cerca ATR (indica che una carta è inserita)
      const atrMatch = output.match(/(?:Card ATR|ATR):\s*([0-9A-Fa-f\s]+)/i);
      if (atrMatch) {
        const atr = atrMatch[1].replace(/\s/g, '').trim();
        if (atr.length >= 8) {
          console.log('Carta rilevata, ATR:', atr);
          resolve({ inserted: true, atr: atr });
          return;
        }
      }
      
      // Cerca "Provider:" o "CSP" che indica una carta con certificato
      if (outputLower.includes('provider:') || outputLower.includes('csp name:') || outputLower.includes('microsoft base smart card')) {
        console.log('Carta con CSP rilevata');
        resolve({ inserted: true, atr: 'CSP_CARD_DETECTED' });
        return;
      }
      
      // Cerca pattern "Card:" seguito da testo (non "No card")
      const cardMatch = output.match(/Card:\s*([^\r\n]+)/i);
      if (cardMatch && !cardMatch[1].toLowerCase().includes('no card') && !cardMatch[1].toLowerCase().includes('nessuna')) {
        console.log('Carta rilevata:', cardMatch[1]);
        resolve({ inserted: true, atr: 'CARD_DETECTED' });
        return;
      }
      
      // Cerca indicatori negativi
      if (outputLower.includes('no card') || 
          outputLower.includes('nessuna carta') || 
          outputLower.includes('no smart card') ||
          errorOutput.includes('no card') ||
          errorOutput.includes('0x8010002e')) { // SCARD_E_NO_SMARTCARD
        console.log('Nessuna carta inserita');
        resolve({ inserted: false, atr: null });
        return;
      }
      
      // Se c'è un errore di timeout o connessione, considera carta non inserita
      if (error) {
        console.log('Errore certutil:', error.message);
        resolve({ inserted: false, atr: null });
        return;
      }
      
      // Default: se troviamo "Lettore" ma non carta, non è inserita
      resolve({ inserted: false, atr: null });
    });
  });
}

// Polling stato lettore
async function pollReaderStatus() {
  if (systemState.simulationMode) {
    // In modalità demo, non fare polling
    return;
  }
  
  try {
    const readerResult = await detectSmartCardReader();
    
    if (readerResult.found) {
      systemState.readerConnected = true;
      systemState.readerName = readerResult.name;
      
      const cardResult = await detectSmartCard();
      systemState.cardInserted = cardResult.inserted;
      systemState.cardATR = cardResult.atr;
    } else {
      systemState.readerConnected = false;
      systemState.readerName = null;
      systemState.cardInserted = false;
      systemState.cardATR = null;
    }
    
    systemState.lastError = readerResult.error;
  } catch (err) {
    systemState.lastError = err.message;
  }
  
  updateUI();
  broadcastStatus();
  updateTrayTooltip();
}

function broadcastStatus() {
  systemState.clientsConnected = wsClients.size;
  
  const message = JSON.stringify({
    type: 'status',
    data: getStatusForBroadcast()
  });
  
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function getStatusForBroadcast() {
  return {
    connected: true,
    readerDetected: systemState.readerConnected,
    readerConnected: systemState.readerConnected,
    cardInserted: systemState.cardInserted,
    readerName: systemState.readerName,
    cardAtr: systemState.cardATR,
    cardATR: systemState.cardATR,
    cardSerial: systemState.cardSerial,
    cardType: systemState.cardInserted ? 'Smart Card SIAE' : null,
    canEmitTickets: systemState.readerConnected && systemState.cardInserted,
    canEmitRealSeals: systemState.canEmitRealSeals,
    bridgeConnected: systemState.bridgeConnected,
    middlewareAvailable: true,
    simulationMode: systemState.simulationMode,
    demoMode: systemState.simulationMode,
    lastError: systemState.lastError,
    timestamp: new Date().toISOString()
  };
}

function updateUI() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', {
      ...getStatusForBroadcast(),
      clientsConnected: wsClients.size,
      wsPort: PORT
    });
  }
}

function updateTrayTooltip() {
  if (!tray) return;
  
  let tooltip = 'Event4U Smart Card Reader\n';
  if (systemState.simulationMode) {
    tooltip += 'MODALITA DEMO ATTIVA\n';
  }
  if (systemState.readerConnected) {
    tooltip += `Lettore: ${systemState.readerName}\n`;
    tooltip += systemState.cardInserted ? 'Carta: Inserita' : 'Carta: Non inserita';
  } else {
    tooltip += 'Lettore: Non rilevato';
  }
  
  tray.setToolTip(tooltip);
}

// Avvia il bridge .NET per libSIAE.dll
function startBridge() {
  const bridgePaths = [
    // Packaged app paths
    path.join(process.resourcesPath || '', 'SiaeBridge', 'net472', 'EventFourYouSiaeLettore.exe'),
    path.join(process.resourcesPath || '', 'SiaeBridge', 'EventFourYouSiaeLettore.exe'),
    // Development paths
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'net472', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'net472', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'EventFourYouSiaeLettore.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'EventFourYouSiaeLettore.exe')
  ];
  
  let bridgePath = null;
  for (const p of bridgePaths) {
    if (fs.existsSync(p)) {
      bridgePath = p;
      break;
    }
  }
  
  if (!bridgePath) {
    console.log('Bridge .NET non trovato, funzionalita sigilli SIAE limitata');
    systemState.bridgeConnected = false;
    systemState.canEmitRealSeals = false;
    return;
  }
  
  console.log('Avvio bridge .NET:', bridgePath);
  
  try {
    bridgeProcess = spawn(bridgePath, [], {
      cwd: path.dirname(bridgePath),
      stdio: 'ignore',
      detached: false,
      windowsHide: true
    });
    
    bridgeProcess.on('error', (err) => {
      console.error('Errore avvio bridge:', err.message);
      systemState.bridgeConnected = false;
    });
    
    bridgeProcess.on('exit', (code) => {
      console.log('Bridge terminato con codice:', code);
      systemState.bridgeConnected = false;
      bridgeProcess = null;
    });
    
    // Connetti al bridge dopo un breve delay
    setTimeout(connectToBridge, 2000);
    
  } catch (err) {
    console.error('Errore spawn bridge:', err.message);
  }
}

// Connetti al WebSocket del bridge .NET
function connectToBridge() {
  try {
    bridgeWs = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`);
    
    bridgeWs.on('open', () => {
      console.log('Connesso al bridge .NET');
      bridgeConnected = true;
      systemState.bridgeConnected = true;
      systemState.canEmitRealSeals = true;
      systemState.readerConnected = true;
      updateUI();
      broadcastStatus();
    });
    
    bridgeWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleBridgeMessage(msg);
      } catch (err) {
        console.error('Errore parsing messaggio bridge:', err.message);
      }
    });
    
    bridgeWs.on('close', () => {
      console.log('Disconnesso dal bridge .NET');
      bridgeConnected = false;
      systemState.bridgeConnected = false;
      systemState.canEmitRealSeals = false;
      bridgeWs = null;
      updateUI();
      broadcastStatus();
      
      // Riprova a connettersi
      setTimeout(connectToBridge, 5000);
    });
    
    bridgeWs.on('error', (err) => {
      console.error('Errore WebSocket bridge:', err.message);
      bridgeConnected = false;
      systemState.bridgeConnected = false;
      systemState.canEmitRealSeals = false;
      updateUI();
      broadcastStatus();
    });
    
  } catch (err) {
    console.error('Errore connessione bridge:', err.message);
    setTimeout(connectToBridge, 5000);
  }
}

// Gestisce messaggi dal bridge .NET
function handleBridgeMessage(msg) {
  if (msg.type === 'status' && msg.data) {
    // Aggiorna stato dal bridge
    systemState.readerConnected = msg.data.readerConnected || msg.data.initialized;
    systemState.readerName = msg.data.readerName;
    systemState.cardInserted = msg.data.cardInserted;
    systemState.cardSerial = msg.data.cardSerial;
    systemState.simulationMode = msg.data.demoMode || msg.data.simulationMode;
    systemState.canEmitRealSeals = msg.data.canEmitTickets;
    
    updateUI();
    broadcastStatus();
    updateTrayTooltip();
  }
}

// Invia comando al bridge .NET
function sendToBridge(command) {
  return new Promise((resolve, reject) => {
    if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
      reject(new Error('Bridge non connesso'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Timeout risposta bridge'));
    }, 10000);
    
    const handler = (data) => {
      clearTimeout(timeout);
      bridgeWs.removeListener('message', handler);
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      }
    };
    
    bridgeWs.on('message', handler);
    bridgeWs.send(JSON.stringify(command));
  });
}

// Genera sigillo fiscale (usa bridge se disponibile)
async function generateFiscalSeal(data) {
  const timestamp = new Date().toISOString();
  
  // Se bridge connesso, usa sigillo reale
  if (bridgeConnected && bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    try {
      const response = await sendToBridge({
        type: 'computeSigillo',
        data: {
          ticketData: JSON.stringify({
            eventId: data?.eventId,
            ticketId: data?.ticketId,
            timestamp: timestamp
          })
        }
      });
      
      if (response.success && response.seal) {
        return {
          sealNumber: response.seal.sealCode,
          timestamp: response.seal.timestamp || timestamp,
          eventId: data?.eventId,
          ticketId: data?.ticketId,
          signature: response.seal.sealCode,
          cardSerial: response.seal.cardSerial || systemState.cardSerial,
          cardATR: systemState.cardATR,
          simulationMode: false,
          realSeal: true
        };
      }
    } catch (err) {
      console.error('Errore generazione sigillo via bridge:', err.message);
    }
  }
  
  // Fallback: sigillo demo
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return {
    sealNumber: `DEMO-${Date.now()}-${random}`,
    timestamp: timestamp,
    eventId: data?.eventId,
    ticketId: data?.ticketId,
    signature: 'DEMO_SIGNATURE_' + random,
    cardATR: systemState.cardATR,
    simulationMode: true,
    realSeal: false
  };
}

// Crea server HTTP e WebSocket
function createServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'ok', 
        version: '1.0.0',
        ...getStatusForBroadcast()
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  wss = new WebSocket.Server({ server: httpServer });
  
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    
    if (!isAllowedOrigin(origin)) {
      console.log('Connessione rifiutata da:', origin);
      ws.close(4003, 'Origin not allowed');
      return;
    }
    
    console.log('Client connesso da:', origin || 'locale');
    wsClients.add(ws);
    updateUI();
    
    // Invia stato iniziale
    ws.send(JSON.stringify({
      type: 'status',
      data: getStatusForBroadcast()
    }));
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        
        switch (msg.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'getStatus':
          case 'get_status':
            ws.send(JSON.stringify({ type: 'status', data: getStatusForBroadcast() }));
            break;
            
          case 'requestSeal':
          case 'computeSigillo':
            if (!systemState.cardInserted && !systemState.simulationMode) {
              ws.send(JSON.stringify({
                type: 'sealResponse',
                success: false,
                error: 'Smart card non inserita'
              }));
            } else {
              generateFiscalSeal(msg.data).then(seal => {
                ws.send(JSON.stringify({
                  type: 'sealResponse',
                  success: true,
                  seal: seal
                }));
              }).catch(err => {
                ws.send(JSON.stringify({
                  type: 'sealResponse',
                  success: false,
                  error: err.message
                }));
              });
            }
            break;
            
          case 'enableDemo':
            enableDemoMode();
            break;
            
          case 'disableDemo':
            disableDemoMode();
            break;
        }
      } catch (err) {
        console.error('Errore parsing messaggio:', err.message);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnesso');
      wsClients.delete(ws);
      updateUI();
    });
    
    ws.on('error', () => {
      wsClients.delete(ws);
      updateUI();
    });
  });
  
  httpServer.listen(PORT, '127.0.0.1', () => {
    console.log(`Server WebSocket avviato su ws://127.0.0.1:${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/health`);
  });
}

function enableDemoMode() {
  systemState.simulationMode = true;
  systemState.readerConnected = true;
  systemState.readerName = 'MiniLector EVO V3 (DEMO)';
  systemState.cardInserted = true;
  systemState.cardATR = 'DEMO_MODE_ATR';
  systemState.lastError = null;
  updateUI();
  broadcastStatus();
  updateTrayTooltip();
}

function disableDemoMode() {
  systemState.simulationMode = false;
  pollReaderStatus();
}

// Crea finestra principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
  
  // Minimizza nella tray invece di chiudere
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Crea icona nella system tray
function createTray() {
  // Crea un'icona semplice programmaticamente (16x16 blu)
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = 66;      // R
    canvas[i * 4 + 1] = 133; // G
    canvas[i * 4 + 2] = 244; // B
    canvas[i * 4 + 3] = 255; // A
  }
  
  const icon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Apri Event4U Smart Card Reader', 
      click: () => {
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Attiva Modalita Demo',
      click: () => {
        enableDemoMode();
      }
    },
    {
      label: 'Disattiva Modalita Demo',
      click: () => {
        disableDemoMode();
      }
    },
    { type: 'separator' },
    { 
      label: 'Esci', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Event4U Smart Card Reader');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

// IPC handlers
ipcMain.handle('get-status', () => {
  return {
    ...getStatusForBroadcast(),
    clientsConnected: wsClients.size,
    wsPort: PORT
  };
});

ipcMain.handle('enable-demo', () => {
  enableDemoMode();
  return getStatusForBroadcast();
});

ipcMain.handle('disable-demo', () => {
  disableDemoMode();
  return getStatusForBroadcast();
});

ipcMain.handle('refresh-status', async () => {
  await pollReaderStatus();
  return getStatusForBroadcast();
});

// App ready
app.whenReady().then(() => {
  createWindow();
  createTray();
  createServer();
  
  // Avvia bridge .NET per libSIAE.dll
  startBridge();
  
  // Inizia polling (fallback se bridge non disponibile)
  pollReaderStatus();
  pollingTimer = setInterval(pollReaderStatus, POLLING_INTERVAL);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Gestione chiusura
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
  if (bridgeWs) {
    bridgeWs.close();
  }
  if (bridgeProcess) {
    try {
      bridgeProcess.kill();
    } catch (err) {
      console.error('Errore chiusura bridge:', err.message);
    }
  }
  if (wss) {
    wss.close();
  }
  if (httpServer) {
    httpServer.close();
  }
});
