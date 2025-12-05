const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');

// Setup logging
const log = require('electron-log');
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'event4u-siae.log');
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// ============================================
// SINGLE INSTANCE LOCK - Prevent multiple windows
// ============================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

log.info('='.repeat(60));
log.info('App starting at', new Date().toISOString());
log.info('App version:', app.getVersion());
log.info('Electron version:', process.versions.electron);
log.info('Node version:', process.versions.node);
log.info('Platform:', process.platform, process.arch);
log.info('User data path:', app.getPath('userData'));
log.info('='.repeat(60));

let mainWindow = null;
let bridgeProcess = null;
let bridgePath = null;
let wsServer = null;
let wsClients = new Set();

// Current status for WebSocket clients
let currentStatus = {
  bridgeConnected: false,
  readerConnected: false,
  cardInserted: false,
  readerName: null,
  cardSerial: null,
  cardAtr: null,
  demoMode: false,
  canEmitTickets: false
};

// Log buffer for live updates
let logBuffer = [];
const MAX_LOG_BUFFER = 500;

function addToLogBuffer(level, message) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
  // Send to renderer if window exists
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log:entry', entry);
  }
}

// Override log to capture entries
const originalInfo = log.info.bind(log);
const originalWarn = log.warn.bind(log);
const originalError = log.error.bind(log);

log.info = (...args) => {
  originalInfo(...args);
  addToLogBuffer('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};
log.warn = (...args) => {
  originalWarn(...args);
  addToLogBuffer('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};
log.error = (...args) => {
  originalError(...args);
  addToLogBuffer('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

function getBridgePath() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'SiaeBridge', 'SiaeBridge.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'net472', 'SiaeBridge.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'net472', 'SiaeBridge.exe'),
    path.join(__dirname, 'SiaeBridge', 'SiaeBridge.exe'),
  ];

  log.info('Searching for SiaeBridge.exe...');
  log.info('Resource path:', process.resourcesPath);

  for (const p of possiblePaths) {
    log.info(`  Checking: ${p}`);
    if (fs.existsSync(p)) {
      log.info(`  ✓ FOUND: ${p}`);
      return p;
    }
  }

  log.error('SiaeBridge.exe not found!');
  return null;
}

function listDirectory(dirPath, prefix = '') {
  try {
    if (!fs.existsSync(dirPath)) {
      log.info(`${prefix}Directory not found: ${dirPath}`);
      return;
    }
    const items = fs.readdirSync(dirPath);
    log.info(`${prefix}Contents of ${dirPath}:`);
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      log.info(`${prefix}  ${stat.isDirectory() ? '[DIR]' : '[FILE]'} ${item} ${stat.isDirectory() ? '' : `(${stat.size} bytes)`}`);
    });
  } catch (err) {
    log.error(`${prefix}Error listing ${dirPath}:`, err.message);
  }
}

function createWindow() {
  log.info('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'Event Four You - SIAE Lettore',
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Window shown');
  });

  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });

  // Debug directory structure
  log.info('--- Directory Structure ---');
  listDirectory(process.resourcesPath);
  listDirectory(path.join(process.resourcesPath, 'SiaeBridge'));
  log.info('--- End Directory Structure ---');

  bridgePath = getBridgePath();
  if (bridgePath) {
    const bridgeDir = path.dirname(bridgePath);
    const dllPath = path.join(bridgeDir, 'libSIAE.dll');
    if (fs.existsSync(dllPath)) {
      log.info('✓ libSIAE.dll found at', dllPath);
    } else {
      log.error('✗ libSIAE.dll NOT found at', dllPath);
    }
  }
}

function startBridge() {
  return new Promise((resolve, reject) => {
    if (!bridgePath) {
      bridgePath = getBridgePath();
    }

    if (!bridgePath) {
      const error = 'SiaeBridge.exe non trovato';
      log.error(error);
      reject(new Error(error));
      return;
    }

    if (bridgeProcess) {
      log.info('Bridge already running');
      resolve({ success: true, message: 'Bridge già avviato' });
      return;
    }

    log.info(`Starting bridge: ${bridgePath}`);
    const bridgeDir = path.dirname(bridgePath);

    try {
      bridgeProcess = spawn(bridgePath, [], {
        cwd: bridgeDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      let resolved = false;

      bridgeProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        log.info(`[Bridge] ${text}`);
        
        if (!resolved && text.includes('READY')) {
          resolved = true;
          log.info('Bridge READY');
          resolve({ success: true, message: 'Bridge avviato' });
        }
      });

      bridgeProcess.stderr.on('data', (data) => {
        log.error(`[Bridge ERROR] ${data.toString().trim()}`);
      });

      bridgeProcess.on('error', (err) => {
        log.error('Bridge spawn error:', err);
        bridgeProcess = null;
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      bridgeProcess.on('exit', (code) => {
        log.info(`Bridge exited with code ${code}`);
        bridgeProcess = null;
        if (!resolved) {
          resolved = true;
          reject(new Error(`Bridge exit code ${code}`));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (bridgeProcess) {
            resolve({ success: true, message: 'Bridge avviato (timeout)' });
          } else {
            reject(new Error('Timeout avvio bridge'));
          }
        }
      }, 5000);

    } catch (err) {
      log.error('Error spawning bridge:', err);
      reject(err);
    }
  });
}

function stopBridge() {
  return new Promise((resolve) => {
    if (bridgeProcess) {
      log.info('Stopping bridge...');
      bridgeProcess.stdin.write('EXIT\n');
      setTimeout(() => {
        if (bridgeProcess) {
          bridgeProcess.kill();
        }
        bridgeProcess = null;
        resolve({ success: true });
      }, 500);
    } else {
      resolve({ success: true });
    }
  });
}

function sendBridgeCommand(command) {
  return new Promise((resolve, reject) => {
    if (!bridgeProcess) {
      reject(new Error('Bridge non avviato'));
      return;
    }

    log.info(`>> Command: ${command}`);
    
    let response = '';
    let timeout;
    
    const onData = (data) => {
      const text = data.toString();
      response += text;
      
      // Check for complete JSON
      const lines = response.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            clearTimeout(timeout);
            bridgeProcess.stdout.removeListener('data', onData);
            log.info(`<< Response:`, parsed);
            resolve(parsed);
            return;
          } catch (e) {
            // Not valid JSON yet
          }
        }
      }
    };

    bridgeProcess.stdout.on('data', onData);
    bridgeProcess.stdin.write(command + '\n');

    timeout = setTimeout(() => {
      bridgeProcess.stdout.removeListener('data', onData);
      log.warn(`Timeout, partial: ${response}`);
      reject(new Error('Timeout risposta'));
    }, 15000);
  });
}

// ============================================
// WebSocket Server for Replit communication
// ============================================
const WS_PORT = 18765;

function startWebSocketServer() {
  if (wsServer) {
    log.info('WebSocket server already running');
    return;
  }

  try {
    wsServer = new WebSocket.Server({ port: WS_PORT });
    log.info(`WebSocket server started on port ${WS_PORT}`);

    wsServer.on('connection', (ws) => {
      log.info('WebSocket client connected');
      wsClients.add(ws);

      // Send current status immediately
      ws.send(JSON.stringify({ type: 'status', data: currentStatus }));

      ws.on('message', async (message) => {
        try {
          const msg = JSON.parse(message.toString());
          log.info('WS message received:', msg.type);
          await handleWebSocketMessage(ws, msg);
        } catch (e) {
          log.error('WS message error:', e.message);
        }
      });

      ws.on('close', () => {
        log.info('WebSocket client disconnected');
        wsClients.delete(ws);
      });

      ws.on('error', (err) => {
        log.error('WebSocket error:', err.message);
        wsClients.delete(ws);
      });
    });

    wsServer.on('error', (err) => {
      log.error('WebSocket server error:', err.message);
    });

  } catch (err) {
    log.error('Failed to start WebSocket server:', err.message);
  }
}

async function handleWebSocketMessage(ws, msg) {
  const sendResponse = (type, data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  };

  switch (msg.type) {
    case 'ping':
      sendResponse('pong', {});
      break;

    case 'get_status':
      sendResponse('status', { data: currentStatus });
      break;

    case 'connect':
      try {
        await startBridge();
        const result = await sendBridgeCommand('CHECK_READER');
        updateStatus({
          bridgeConnected: true,
          readerConnected: result.readerConnected || false,
          cardInserted: result.cardPresent || false,
          readerName: result.readerName || 'BIT4ID miniLector EVO',
          cardSerial: result.cardSerial || null
        });
        sendResponse('status', { data: currentStatus });
      } catch (err) {
        sendResponse('error', { error: err.message });
      }
      break;

    case 'checkReader':
      try {
        const result = await sendBridgeCommand('CHECK_READER');
        updateStatus({
          readerConnected: result.readerConnected || false,
          cardInserted: result.cardPresent || false,
          readerName: result.readerName || null
        });
        sendResponse('status', { data: currentStatus });
      } catch (err) {
        sendResponse('error', { error: err.message });
      }
      break;

    case 'readCard':
      try {
        const result = await sendBridgeCommand('READ_CARD');
        if (result.success) {
          updateStatus({
            cardSerial: result.serialNumber,
            cardInserted: true
          });
        }
        sendResponse('cardData', { success: true, data: result });
      } catch (err) {
        sendResponse('error', { error: err.message });
      }
      break;

    case 'requestSeal':
      try {
        const sealData = msg.data || {};
        const price = sealData.price || 0;
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify({ price })}`);
        if (result.success && result.sigillo) {
          sendResponse('sealResponse', {
            success: true,
            seal: {
              sealCode: result.sigillo.mac,
              sealNumber: `${result.sigillo.serialNumber}-${result.sigillo.counter}`,
              serialNumber: result.sigillo.serialNumber,
              counter: result.sigillo.counter,
              mac: result.sigillo.mac,
              dateTime: result.sigillo.dateTime
            }
          });
        } else {
          sendResponse('sealResponse', { success: false, error: result.error || 'Sigillo fallito' });
        }
      } catch (err) {
        sendResponse('sealResponse', { success: false, error: err.message });
      }
      break;

    case 'enableDemo':
      updateStatus({ demoMode: true, cardInserted: true, readerConnected: true });
      sendResponse('status', { data: currentStatus });
      break;

    case 'disableDemo':
      updateStatus({ demoMode: false });
      sendResponse('status', { data: currentStatus });
      break;

    default:
      log.warn('Unknown WS message type:', msg.type);
  }
}

function updateStatus(newData) {
  currentStatus = { ...currentStatus, ...newData };
  currentStatus.canEmitTickets = currentStatus.bridgeConnected && 
                                  currentStatus.readerConnected && 
                                  currentStatus.cardInserted;
  
  // Broadcast to all clients
  broadcastStatus();
  
  // Update renderer
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('status:update', currentStatus);
  }
}

function broadcastStatus() {
  const message = JSON.stringify({ type: 'status', data: currentStatus });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (e) {
        log.error('Error broadcasting:', e.message);
      }
    }
  });
}

// Periodic status check
let statusInterval = null;
function startStatusPolling() {
  if (statusInterval) return;
  
  statusInterval = setInterval(async () => {
    if (!bridgeProcess) return;
    
    try {
      const result = await sendBridgeCommand('CHECK_READER');
      updateStatus({
        readerConnected: result.readerConnected || false,
        cardInserted: result.cardPresent || false
      });
    } catch (e) {
      // Ignore errors during polling
    }
  }, 3000);
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

// IPC Handlers
ipcMain.handle('bridge:start', async () => {
  log.info('IPC: bridge:start');
  try {
    const result = await startBridge();
    updateStatus({ bridgeConnected: true });
    startStatusPolling();
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bridge:stop', async () => {
  log.info('IPC: bridge:stop');
  return await stopBridge();
});

ipcMain.handle('bridge:status', async () => {
  const status = {
    running: bridgeProcess !== null,
    bridgePath: bridgePath,
    bridgeFound: bridgePath !== null
  };
  return status;
});

ipcMain.handle('bridge:checkReader', async () => {
  log.info('IPC: checkReader');
  try {
    return await sendBridgeCommand('CHECK_READER');
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bridge:readCard', async () => {
  log.info('IPC: readCard');
  try {
    return await sendBridgeCommand('READ_CARD');
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bridge:computeSigillo', async (event, data) => {
  log.info('IPC: computeSigillo', data);
  try {
    const command = `COMPUTE_SIGILLO:${JSON.stringify(data)}`;
    return await sendBridgeCommand(command);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:getLogPath', () => {
  return log.transports.file.getFile().path;
});

ipcMain.handle('app:getLogs', async () => {
  return logBuffer;
});

ipcMain.handle('app:getFullLogs', async () => {
  try {
    const logPath = log.transports.file.getFile().path;
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n');
      return lines.slice(-300).join('\n');
    }
    return 'Log file non trovato';
  } catch (err) {
    return `Errore: ${err.message}`;
  }
});

// App lifecycle
app.whenReady().then(() => {
  log.info('App ready');
  createWindow();
  startWebSocketServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  stopStatusPolling();
  stopBridge();
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('Quitting...');
  stopBridge();
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});
