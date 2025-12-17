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

// Remote relay connection
let relayWs = null;
let relayReconnectTimer = null;

// MASTER TOKEN - embedded in the app for Event Four You platform
// This authenticates the official desktop app - not individual companies
const MASTER_TOKEN = '61f12bc11ad07f8042ac953211cefe4127c900070cf51f66903988f90a31dfe4';

// Available servers for connection
const AVAILABLE_SERVERS = {
  production: 'wss://manage.eventfouryou.com',
  development: 'wss://1e140314-d94a-4320-bb5f-edbf06f7b556-00-3atrzxa6r3x8c.kirk.replit.dev'
};

let relayConfig = {
  serverUrl: AVAILABLE_SERVERS.production,
  token: MASTER_TOKEN,
  enabled: true,
  serverType: 'production' // 'production' or 'development'
};
const RELAY_RECONNECT_DELAY = 5000;
const RELAY_HEARTBEAT_INTERVAL = 30000;
let relayHeartbeatTimer = null;

// Periodic status check timer
const STATUS_CHECK_INTERVAL = 1000; // Check every 1 second (reduced from 500ms to prevent race conditions)
let statusCheckTimer = null;
let lastStatusJson = '';

// PIN verification state (SIAE compliance)
let pinVerified = false;
let cardWasInserted = false;
let pinLocked = true;  // Start locked - PIN required on first card insertion
let firstCardHandled = false;  // Track if first card insertion has been handled
// Note: PIN is now verified on the SIAE card itself, not hardcoded

// Debounce for card removal detection - prevents false positives from intermittent contact
let cardRemovalCounter = 0;
const CARD_REMOVAL_THRESHOLD = 3; // Card must be "removed" for 3 consecutive polls (1.5s) to trigger PIN lock

// Current status for WebSocket clients
let currentStatus = {
  bridgeConnected: false,
  readerConnected: false,
  cardInserted: false,
  readerName: null,
  cardSerial: null,
  cardCounter: null,
  cardBalance: null,
  cardKeyId: null,
  cardAtr: null,
  demoMode: false,
  canEmitTickets: false,
  relayConnected: false,
  pinLocked: false,
  pinRequired: false
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
    icon: path.join(__dirname, 'icon.png'),
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
          // Start automatic status polling when bridge is ready
          startStatusPolling();
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
        stopStatusPolling();
        if (!resolved) {
          resolved = true;
          reject(new Error(`Bridge exit code ${code}`));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (bridgeProcess) {
            // Start automatic status polling when bridge starts
            startStatusPolling();
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
    // Stop status polling first
    stopStatusPolling();
    
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

// Command queue to serialize bridge commands and prevent race conditions
let commandQueue = Promise.resolve();
let isCommandRunning = false;

function sendBridgeCommand(command) {
  // Queue this command to run after the previous one completes
  const execute = () => sendBridgeCommandInternal(command);
  commandQueue = commandQueue.then(execute, execute);
  return commandQueue;
}

function sendBridgeCommandInternal(command) {
  return new Promise((resolve, reject) => {
    if (!bridgeProcess) {
      reject(new Error('Bridge non avviato'));
      return;
    }

    // Wait if another command is running (extra safety)
    if (isCommandRunning) {
      log.debug(`Waiting for previous command to complete...`);
    }
    isCommandRunning = true;

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
            isCommandRunning = false;
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
      isCommandRunning = false;
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
  
  // Log status being broadcast for debugging
  log.info('Broadcasting status:', JSON.stringify({
    bridgeConnected: currentStatus.bridgeConnected,
    readerConnected: currentStatus.readerConnected,
    cardInserted: currentStatus.cardInserted,
    cardSerial: currentStatus.cardSerial,
    cardCounter: currentStatus.cardCounter,
    cardBalance: currentStatus.cardBalance,
    cardKeyId: currentStatus.cardKeyId,
    pinLocked: currentStatus.pinLocked
  }));
  
  // Broadcast to local WebSocket clients
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (e) {
        log.error('Error broadcasting:', e.message);
      }
    }
  });
  
  // Broadcast to remote relay
  if (relayWs && relayWs.readyState === WebSocket.OPEN) {
    try {
      relayWs.send(message);
      log.debug('Sent status to relay');
    } catch (e) {
      log.error('Error broadcasting to relay:', e.message);
    }
  }
}

// ============================================
// Remote Relay Connection to manage.eventfouryou.com
// ============================================

function connectToRelay() {
  if (!relayConfig.enabled || !relayConfig.token) {
    log.info('Relay not configured, skipping connection');
    return;
  }
  
  if (relayWs && relayWs.readyState === WebSocket.OPEN) {
    log.info('Relay already connected');
    return;
  }
  
  const relayUrl = `${relayConfig.serverUrl}/ws/bridge`;
  log.info(`Connecting to relay: ${relayUrl}`);
  
  try {
    relayWs = new WebSocket(relayUrl);
    
    relayWs.on('open', () => {
      log.info('Relay WebSocket connected');
      
      // Clear reconnect timer
      if (relayReconnectTimer) {
        clearTimeout(relayReconnectTimer);
        relayReconnectTimer = null;
      }
      
      // Register as global bridge with master token only
      const registerMsg = {
        type: 'bridge_register',
        token: relayConfig.token
      };
      relayWs.send(JSON.stringify(registerMsg));
      log.info('Sent bridge_register to relay');
      
      // Start heartbeat
      startRelayHeartbeat();
    });
    
    relayWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        log.info('Relay message received:', msg.type);
        
        if (msg.type === 'bridge_register_response') {
          if (msg.success) {
            log.info('✓ Registered with relay successfully');
            updateStatus({ relayConnected: true });
            
            // Send current status to relay
            broadcastStatus();
          } else {
            log.error('Relay registration failed:', msg.error);
            updateStatus({ relayConnected: false });
          }
        } else if (msg.type === 'ping') {
          relayWs.send(JSON.stringify({ type: 'pong' }));
        } else if (msg.type === 'pong') {
          // Heartbeat response, connection is alive
        } else {
          // Handle commands from web clients via relay
          await handleRelayCommand(msg);
        }
      } catch (e) {
        log.error('Relay message parse error:', e.message);
      }
    });
    
    relayWs.on('close', () => {
      log.info('Relay WebSocket disconnected');
      relayWs = null;
      updateStatus({ relayConnected: false });
      stopRelayHeartbeat();
      scheduleRelayReconnect();
    });
    
    relayWs.on('error', (err) => {
      log.error('Relay WebSocket error:', err.message);
      relayWs = null;
      updateStatus({ relayConnected: false });
      stopRelayHeartbeat();
      scheduleRelayReconnect();
    });
    
  } catch (err) {
    log.error('Failed to connect to relay:', err.message);
    scheduleRelayReconnect();
  }
}

function scheduleRelayReconnect() {
  if (relayReconnectTimer) return;
  if (!relayConfig.enabled) return;
  
  log.info(`Scheduling relay reconnect in ${RELAY_RECONNECT_DELAY}ms`);
  relayReconnectTimer = setTimeout(() => {
    relayReconnectTimer = null;
    connectToRelay();
  }, RELAY_RECONNECT_DELAY);
}

function startRelayHeartbeat() {
  stopRelayHeartbeat();
  relayHeartbeatTimer = setInterval(() => {
    if (relayWs && relayWs.readyState === WebSocket.OPEN) {
      try {
        relayWs.send(JSON.stringify({ type: 'ping' }));
      } catch (e) {
        log.error('Relay heartbeat error:', e.message);
      }
    }
  }, RELAY_HEARTBEAT_INTERVAL);
}

// ============================================
// Automatic Status Polling - checks reader/card every 0.5s
// ============================================

function startStatusPolling() {
  stopStatusPolling();
  log.info(`Starting automatic status polling every ${STATUS_CHECK_INTERVAL}ms`);
  
  statusCheckTimer = setInterval(async () => {
    if (!bridgeProcess) return;
    
    try {
      const result = await sendBridgeCommand('CHECK_READER');
      const cardCurrentlyInserted = result.cardPresent || false;
      
      // SIAE PIN verification: detect card removal with debounce
      // Card must be detected as removed for CARD_REMOVAL_THRESHOLD consecutive polls
      // This prevents false positives from intermittent reader contact
      if (cardWasInserted && !cardCurrentlyInserted && !pinLocked) {
        cardRemovalCounter++;
        log.debug(`SIAE: Card removal detected, counter=${cardRemovalCounter}/${CARD_REMOVAL_THRESHOLD}`);
        
        if (cardRemovalCounter >= CARD_REMOVAL_THRESHOLD) {
          log.info('SIAE: Carta rimossa (confermata) - PIN sarà richiesto al reinserimento');
          pinLocked = true;
          pinVerified = false;
          cardRemovalCounter = 0;
          // DON'T show PIN dialog here - the card is gone!
          // Dialog will be shown when card is reinserted (see below)
        }
      } else if (cardCurrentlyInserted) {
        // Reset removal counter when card is detected as present
        if (cardRemovalCounter > 0) {
          log.debug('SIAE: Card detected, resetting removal counter');
          cardRemovalCounter = 0;
        }
      }
      
      // When card is INSERTED (first time or re-inserted) and PIN is locked, show PIN dialog
      // Only trigger when card transitions from not-inserted to inserted while locked
      if (!cardWasInserted && cardCurrentlyInserted && pinLocked && !pinVerified) {
        const reason = firstCardHandled 
          ? 'Carta SIAE reinserita - inserire PIN per continuare'
          : 'Carta SIAE inserita - inserire PIN per abilitare le operazioni';
        
        log.info(`SIAE: ${reason}`);
        firstCardHandled = true;
        
        // Notify renderer to show PIN dialog
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('pin:required', { reason });
        }
      }
      
      // Update card state tracking
      cardWasInserted = cardCurrentlyInserted;
      
      // Auto-read card data when card is inserted AND PIN is verified
      let cardData = {};
      if (cardCurrentlyInserted && !pinLocked) {
        try {
          log.info('Auto-reading card data...');
          const readResult = await sendBridgeCommand('READ_CARD');
          log.info('READ_CARD result:', JSON.stringify(readResult));
          
          if (readResult.success) {
            cardData = {
              cardSerial: readResult.serialNumber,
              cardCounter: readResult.counter,
              cardBalance: readResult.balance,
              cardKeyId: readResult.keyId,  // Codice Sistema
              cardSlot: readResult.slot
            };
            log.info('Card data extracted:', JSON.stringify(cardData));
          } else {
            log.warn('READ_CARD returned success=false:', readResult.error);
          }
        } catch (e) {
          log.error('Card read failed:', e.message);
        }
      } else if (cardCurrentlyInserted && pinLocked) {
        log.debug('Card inserted but PIN locked - skipping data read');
      }
      
      const newStatus = {
        bridgeConnected: true,
        readerConnected: result.readerConnected || false,
        cardInserted: cardCurrentlyInserted,
        readerName: result.readerName || null,
        cardSerial: cardData.cardSerial || result.cardSerial || null,
        cardCounter: cardData.cardCounter || null,
        cardBalance: cardData.cardBalance || null,
        cardKeyId: cardData.cardKeyId || null,  // Codice Sistema dalla carta
        cardAtr: result.cardAtr || null,
        pinLocked: pinLocked,
        pinRequired: pinLocked && !pinVerified
      };
      
      // Only broadcast if status actually changed
      const newStatusJson = JSON.stringify(newStatus);
      if (newStatusJson !== lastStatusJson) {
        log.info('Status changed, broadcasting update');
        lastStatusJson = newStatusJson;
        updateStatus(newStatus);
      }
    } catch (err) {
      // Bridge command failed - don't spam logs
    }
  }, STATUS_CHECK_INTERVAL);
}

function stopStatusPolling() {
  if (statusCheckTimer) {
    clearInterval(statusCheckTimer);
    statusCheckTimer = null;
  }
}

function stopRelayHeartbeat() {
  if (relayHeartbeatTimer) {
    clearInterval(relayHeartbeatTimer);
    relayHeartbeatTimer = null;
  }
}

function disconnectRelay() {
  stopRelayHeartbeat();
  if (relayReconnectTimer) {
    clearTimeout(relayReconnectTimer);
    relayReconnectTimer = null;
  }
  if (relayWs) {
    relayWs.close();
    relayWs = null;
  }
  updateStatus({ relayConnected: false });
}

async function handleRelayCommand(msg) {
  // Commands from web clients via relay
  // msg.fromCompanyId tells us which company sent the request
  const fromCompanyId = msg.fromCompanyId;
  const fromUserId = msg.fromUserId;
  
  const sendRelayResponse = (type, data) => {
    if (relayWs && relayWs.readyState === WebSocket.OPEN) {
      // Include toCompanyId so server routes response to correct client
      relayWs.send(JSON.stringify({ 
        type, 
        toCompanyId: fromCompanyId,
        toUserId: fromUserId,
        ...data 
      }));
    }
  };
  
  switch (msg.type) {
    case 'get_status':
      sendRelayResponse('status', { data: currentStatus });
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
        sendRelayResponse('status', { data: currentStatus });
      } catch (err) {
        sendRelayResponse('error', { error: err.message });
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
        sendRelayResponse('status', { data: currentStatus });
      } catch (err) {
        sendRelayResponse('error', { error: err.message });
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
        sendRelayResponse('cardData', { success: true, data: result });
      } catch (err) {
        sendRelayResponse('error', { error: err.message });
      }
      break;
      
    case 'requestSeal':
      try {
        const sealData = msg.data || {};
        const price = sealData.price || 0;
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify({ price })}`);
        if (result.success && result.sigillo) {
          sendRelayResponse('sealResponse', {
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
          sendRelayResponse('sealResponse', { success: false, error: result.error || 'Sigillo fallito' });
        }
      } catch (err) {
        sendRelayResponse('sealResponse', { success: false, error: err.message });
      }
      break;
      
    case 'enableDemo':
      updateStatus({ demoMode: true, cardInserted: true, readerConnected: true });
      sendRelayResponse('status', { data: currentStatus });
      break;
      
    case 'disableDemo':
      updateStatus({ demoMode: false });
      sendRelayResponse('status', { data: currentStatus });
      break;
      
    case 'REQUEST_FISCAL_SEAL':
      // Server-side seal request for self-service online purchases
      // This is critical - without seal, no ticket can be created
      try {
        const requestId = msg.requestId;
        const payload = msg.payload || {};
        const price = payload.price || 0;
        
        log.info(`[SEAL] Server seal request: requestId=${requestId}, price=${price}`);
        
        // Check if bridge is ready
        if (!bridgeProcess || !currentStatus.readerConnected) {
          log.error(`[SEAL] Bridge not ready for seal: bridge=${!!bridgeProcess}, reader=${currentStatus.readerConnected}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SEAL_RESPONSE',
              requestId,
              payload: { 
                success: false, 
                error: 'Lettore Smart Card non disponibile' 
              }
            }));
          }
          return;
        }
        
        if (!currentStatus.cardInserted) {
          log.error(`[SEAL] No card inserted for seal request`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SEAL_RESPONSE',
              requestId,
              payload: { 
                success: false, 
                error: 'Smart Card SIAE non inserita' 
              }
            }));
          }
          return;
        }
        
        // Execute seal command
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify({ price })}`);
        
        if (result.success && result.sigillo) {
          log.info(`[SEAL] Seal generated successfully: counter=${result.sigillo.counter}`);
          
          // Notify renderer to update sigilli history
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sigillo:generated', {
              mac: result.sigillo.mac,
              serialNumber: result.sigillo.serialNumber,
              counter: result.sigillo.counter,
              dateTime: result.sigillo.dateTime,
              price: price,
              source: 'server' // Generated by server request
            });
          }
          
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SEAL_RESPONSE',
              requestId,
              payload: {
                success: true,
                seal: {
                  sealCode: result.sigillo.mac,
                  sealNumber: `${result.sigillo.serialNumber}-${result.sigillo.counter}`,
                  serialNumber: result.sigillo.serialNumber,
                  counter: result.sigillo.counter,
                  mac: result.sigillo.mac,
                  dateTime: result.sigillo.dateTime
                }
              }
            }));
          }
        } else {
          log.error(`[SEAL] Seal generation failed: ${result.error || 'Unknown error'}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SEAL_RESPONSE',
              requestId,
              payload: { 
                success: false, 
                error: result.error || 'Errore generazione sigillo' 
              }
            }));
          }
        }
      } catch (err) {
        log.error(`[SEAL] Exception in seal request: ${err.message}`);
        if (relayWs && relayWs.readyState === WebSocket.OPEN) {
          relayWs.send(JSON.stringify({
            type: 'SEAL_RESPONSE',
            requestId: msg.requestId,
            payload: { 
              success: false, 
              error: err.message 
            }
          }));
        }
      }
      break;
      
    default:
      log.warn('Unknown relay command:', msg.type);
  }
}

// Load relay config - token is embedded, server can be switched
function loadRelayConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'relay-config.json');
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const serverType = saved.serverType || 'production';
      const serverUrl = AVAILABLE_SERVERS[serverType] || AVAILABLE_SERVERS.production;
      
      relayConfig = {
        serverUrl: serverUrl,
        serverType: serverType,
        token: MASTER_TOKEN,
        enabled: true
      };
      
      log.info(`Relay config loaded - Server: ${serverType} (${serverUrl})`);
      return;
    }
  } catch (e) {
    log.warn('Could not load saved relay config:', e.message);
  }
  
  // Default config - production server
  relayConfig = {
    serverUrl: AVAILABLE_SERVERS.production,
    serverType: 'production',
    token: MASTER_TOKEN,
    enabled: true
  };
  
  log.info('Relay config initialized with default production server');
}

// Save relay config to file
function saveRelayConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'relay-config.json');
    fs.writeFileSync(configPath, JSON.stringify(relayConfig, null, 2));
    log.info('Relay config saved');
  } catch (e) {
    log.error('Failed to save relay config:', e.message);
  }
}

// Note: startStatusPolling is defined earlier with full PIN verification logic

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

// Relay configuration IPC handlers
ipcMain.handle('relay:getConfig', () => {
  return {
    serverUrl: relayConfig.serverUrl,
    companyId: relayConfig.companyId,
    enabled: relayConfig.enabled,
    hasToken: !!relayConfig.token,
    connected: currentStatus.relayConnected,
    serverType: relayConfig.serverType || 'production',
    availableServers: AVAILABLE_SERVERS
  };
});

// Switch between production and development servers
ipcMain.handle('relay:switchServer', async (event, serverType) => {
  log.info(`IPC: relay:switchServer to ${serverType}`);
  
  if (!AVAILABLE_SERVERS[serverType]) {
    return { success: false, error: 'Server type non valido' };
  }
  
  // Disconnect existing connection
  if (relayWs) {
    disconnectRelay();
  }
  
  // Update config
  relayConfig.serverType = serverType;
  relayConfig.serverUrl = AVAILABLE_SERVERS[serverType];
  
  log.info(`Server switched to: ${relayConfig.serverUrl}`);
  
  // Reconnect with new server
  setTimeout(() => {
    connectToRelay();
  }, 500);
  
  return { 
    success: true, 
    serverType,
    serverUrl: relayConfig.serverUrl 
  };
});

ipcMain.handle('relay:setConfig', (event, config) => {
  log.info('IPC: relay:setConfig', { 
    serverUrl: config.serverUrl, 
    companyId: config.companyId,
    enabled: config.enabled,
    hasToken: !!config.token
  });
  
  // Disconnect existing connection if config changes
  if (relayConfig.enabled && relayWs) {
    disconnectRelay();
  }
  
  relayConfig = {
    serverUrl: config.serverUrl || relayConfig.serverUrl,
    token: config.token || relayConfig.token,
    companyId: config.companyId || relayConfig.companyId,
    enabled: config.enabled !== undefined ? config.enabled : relayConfig.enabled
  };
  
  saveRelayConfig();
  
  // Connect if enabled
  if (relayConfig.enabled) {
    connectToRelay();
  }
  
  return { success: true };
});

ipcMain.handle('relay:connect', () => {
  log.info('IPC: relay:connect');
  if (!relayConfig.token || !relayConfig.companyId) {
    return { success: false, error: 'Token e Company ID richiesti' };
  }
  relayConfig.enabled = true;
  saveRelayConfig();
  connectToRelay();
  return { success: true };
});

ipcMain.handle('relay:disconnect', () => {
  log.info('IPC: relay:disconnect');
  relayConfig.enabled = false;
  saveRelayConfig();
  disconnectRelay();
  return { success: true };
});

ipcMain.handle('relay:status', () => {
  return {
    connected: currentStatus.relayConnected,
    enabled: relayConfig.enabled,
    serverUrl: relayConfig.serverUrl
  };
});

// ============================================
// PIN Verification (SIAE Compliance)
// ============================================

ipcMain.handle('pin:verify', async (event, enteredPin) => {
  log.info('IPC: pin:verify');
  
  // Verify PIN on the actual SIAE card via bridge
  try {
    const result = await sendBridgeCommand(`VERIFY_PIN:${enteredPin}`);
    log.info('PIN verification result:', result);
    
    if (result.verified) {
      log.info('SIAE: PIN verificato correttamente sulla carta');
      pinVerified = true;
      pinLocked = false;
      
      // Update and broadcast status
      const newStatus = {
        ...currentStatus,
        pinLocked: false,
        pinRequired: false
      };
      updateStatus(newStatus);
      
      return { success: true, message: 'PIN verificato sulla carta SIAE' };
    } else {
      log.warn('SIAE: PIN errato -', result.error || 'verifica fallita');
      return { success: false, error: result.error || 'PIN errato' };
    }
  } catch (err) {
    log.error('PIN verification error:', err.message);
    return { success: false, error: 'Errore verifica PIN: ' + err.message };
  }
});

ipcMain.handle('pin:status', () => {
  return {
    pinLocked,
    pinVerified,
    pinRequired: pinLocked && !pinVerified
  };
});

ipcMain.handle('pin:setPin', (event, newPin) => {
  log.info('IPC: pin:setPin');
  // Note: In production, this should be stored securely
  // For now, we just log the change
  log.info('SIAE: PIN aggiornato');
  return { success: true, message: 'PIN aggiornato' };
});

// App lifecycle
app.whenReady().then(() => {
  log.info('App ready');
  
  // Load relay config before creating window
  loadRelayConfig();
  
  createWindow();
  startWebSocketServer();
  
  // Connect to relay if configured
  if (relayConfig.enabled) {
    log.info('Auto-connecting to relay...');
    connectToRelay();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  stopStatusPolling();
  disconnectRelay();
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
  disconnectRelay();
  stopBridge();
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});
