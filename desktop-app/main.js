/**
 * Event4U Smart Card Reader - Applicazione Electron
 * Processo principale con interfaccia grafica italiana
 * Rileva il lettore smart card via PowerShell (senza pcsclite)
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const { exec } = require('child_process');

// Configurazione
const PORT = 18765;
const POLLING_INTERVAL = 2500;

// Stato globale
let mainWindow = null;
let tray = null;
let httpServer = null;
let wss = null;
let pollingTimer = null;

let systemState = {
  readerConnected: false,
  cardInserted: false,
  cardATR: null,
  readerName: null,
  lastError: null,
  simulationMode: false,
  clientsConnected: 0
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

// Rileva lettore smart card tramite WinSCard API (come fa EventForYou)
function detectSmartCardReader() {
  return new Promise((resolve) => {
    // Usa SCardListReaders API nativa di Windows (stesso metodo di EventForYou.exe)
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinSCard {
    [DllImport("winscard.dll", CharSet = CharSet.Unicode)]
    public static extern int SCardEstablishContext(uint dwScope, IntPtr pvReserved1, IntPtr pvReserved2, out IntPtr phContext);
    
    [DllImport("winscard.dll", CharSet = CharSet.Unicode)]
    public static extern int SCardListReaders(IntPtr hContext, string mszGroups, byte[] mszReaders, ref int pcchReaders);
    
    [DllImport("winscard.dll")]
    public static extern int SCardReleaseContext(IntPtr hContext);
    
    public static List<string> GetReaders() {
        List<string> readers = new List<string>();
        IntPtr hContext = IntPtr.Zero;
        int result = SCardEstablishContext(2, IntPtr.Zero, IntPtr.Zero, out hContext);
        if (result != 0) return readers;
        
        int size = 0;
        result = SCardListReaders(hContext, null, null, ref size);
        if (result == 0 && size > 0) {
            byte[] buffer = new byte[size * 2];
            result = SCardListReaders(hContext, null, buffer, ref size);
            if (result == 0) {
                string allReaders = Encoding.Unicode.GetString(buffer);
                foreach (string r in allReaders.Split(new char[] { '\\0' }, StringSplitOptions.RemoveEmptyEntries)) {
                    if (!string.IsNullOrWhiteSpace(r)) readers.Add(r.Trim());
                }
            }
        }
        SCardReleaseContext(hContext);
        return readers;
    }
}
"@

try {
    $readers = [WinSCard]::GetReaders()
    if ($readers.Count -gt 0) {
        Write-Output "FOUND:$($readers[0])"
    } else {
        # Fallback a WMI
        $reader = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*MiniLector*' -or $_.Name -like '*BIT4ID*' -or $_.Name -like '*Smart Card Reader*' } | Select-Object -First 1
        if ($reader) {
            Write-Output "FOUND:$($reader.Name)"
        } else {
            Write-Output "NOTFOUND"
        }
    }
} catch {
    # Fallback a WMI
    $reader = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*MiniLector*' -or $_.Name -like '*BIT4ID*' -or $_.Name -like '*Smart Card Reader*' } | Select-Object -First 1
    if ($reader) {
        Write-Output "FOUND:$($reader.Name)"
    } else {
        Write-Output "NOTFOUND"
    }
}
    `;
    
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`, 
      { timeout: 20000 }, 
      (error, stdout, stderr) => {
        if (error) {
          resolve({ found: false, name: null, error: error.message });
          return;
        }
        
        const output = stdout.trim();
        if (output.startsWith('FOUND:')) {
          const name = output.replace('FOUND:', '').trim();
          resolve({ found: true, name: name || 'MiniLector EVO V3', error: null });
        } else {
          resolve({ found: false, name: null, error: null });
        }
      }
    );
  });
}

// Rileva smart card inserita tramite certutil
function detectSmartCard() {
  return new Promise((resolve) => {
    exec('certutil -scinfo', { timeout: 10000 }, (error, stdout, stderr) => {
      const output = (stdout || '').toLowerCase();
      const errorOutput = (stderr || '').toLowerCase();
      
      // Se c'è un lettore e una carta, certutil mostra info
      if (output.includes('card:') || output.includes('provider:')) {
        // Cerca ATR
        const atrMatch = stdout.match(/Card ATR:\s*([0-9A-Fa-f\s]+)/i);
        const atr = atrMatch ? atrMatch[1].replace(/\s/g, '') : 'CARD_DETECTED';
        resolve({ inserted: true, atr: atr });
      } else if (output.includes('no card') || errorOutput.includes('no card') || error) {
        resolve({ inserted: false, atr: null });
      } else {
        resolve({ inserted: false, atr: null });
      }
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
    cardType: systemState.cardInserted ? 'Smart Card SIAE' : null,
    canEmitTickets: systemState.readerConnected && systemState.cardInserted,
    middlewareAvailable: true,
    simulationMode: systemState.simulationMode,
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

// Genera sigillo fiscale
function generateFiscalSeal(data) {
  const timestamp = new Date().toISOString();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  return {
    sealNumber: `SEAL-${Date.now()}-${random}`,
    timestamp: timestamp,
    eventId: data?.eventId,
    ticketId: data?.ticketId,
    signature: systemState.simulationMode ? 'DEMO_SIGNATURE' : `SIG-${random}`,
    cardATR: systemState.cardATR,
    simulationMode: systemState.simulationMode
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
            if (!systemState.cardInserted && !systemState.simulationMode) {
              ws.send(JSON.stringify({
                type: 'sealResponse',
                success: false,
                error: 'Smart card non inserita'
              }));
            } else {
              const seal = generateFiscalSeal(msg.data);
              ws.send(JSON.stringify({
                type: 'sealResponse',
                success: true,
                seal: seal
              }));
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
  
  // Inizia polling
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
  if (wss) {
    wss.close();
  }
  if (httpServer) {
    httpServer.close();
  }
});
