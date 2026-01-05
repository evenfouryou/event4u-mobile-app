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
// Reconnection with exponential backoff
const RELAY_RECONNECT_BASE_DELAY = 1000;  // Start with 1 second
const RELAY_RECONNECT_MAX_DELAY = 30000;  // Max 30 seconds
let currentReconnectDelay = RELAY_RECONNECT_BASE_DELAY;
const RELAY_HEARTBEAT_INTERVAL = 15000;   // Check every 15 seconds (faster detection)
const RELAY_HEARTBEAT_TIMEOUT = 5000;     // 5 second timeout for pong
let relayHeartbeatTimer = null;
let lastPongReceived = Date.now();
let heartbeatTimeoutTimer = null;

// Periodic status check timer
const STATUS_CHECK_INTERVAL = 1000; // Check every 1 second (reduced from 500ms to prevent race conditions)
let statusCheckTimer = null;
let lastStatusJson = '';

// PIN verification state (SIAE compliance)
let pinVerified = false;
let cardWasInserted = false;
let pinLocked = true;  // Start locked - PIN required on first card insertion
let firstCardHandled = false;  // Track if first card insertion has been handled
let lastVerifiedPin = null;  // Store PIN for re-authentication on each seal operation
// Note: PIN is now verified on the SIAE card itself, not hardcoded

// Debounce for card removal detection - prevents false positives from intermittent contact
let cardRemovalCounter = 0;
const CARD_REMOVAL_THRESHOLD = 1; // Card must be "removed" for 1 consecutive poll (1s) to trigger PIN lock - fast detection

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
  cardEmail: null,           // Email from X.509 certificate (SIAE response destination)
  cardCertificateCN: null,   // Common Name from certificate
  cardCertificateExpiry: null, // Certificate expiry date
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
        // Include PIN for re-authentication on each seal operation
        const localSealPayload = { price };
        if (lastVerifiedPin) {
          localSealPayload.pin = lastVerifiedPin;
        }
        log.info(`[UI-SEAL] Sending seal command with PIN: ${lastVerifiedPin ? 'yes' : 'no'}`);
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify(localSealPayload)}`);
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

    case 'verifyPin':
      try {
        const pin = msg.data?.pin || '';
        const result = await sendBridgeCommand(`VERIFY_PIN:${pin}`);
        if (result.verified) {
          pinVerified = true;
          pinLocked = false;
          lastVerifiedPin = pin;
          updateStatus({ pinLocked: false, pinRequired: false });
          sendResponse('pinVerifyResponse', { success: true, verified: true });
        } else {
          const errorCode = result.errorCode;
          let retriesRemaining = null;
          if (errorCode >= 0x63C0 && errorCode <= 0x63CF) {
            retriesRemaining = errorCode & 0x0F;
          }
          sendResponse('pinVerifyResponse', { success: true, verified: false, error: result.error, errorCode, retriesRemaining });
        }
      } catch (err) {
        sendResponse('pinVerifyResponse', { success: false, error: err.message });
      }
      break;

    case 'changePin':
      try {
        const oldPin = msg.data?.oldPin || '';
        const newPin = msg.data?.newPin || '';
        const result = await sendBridgeCommand(`CHANGE_PIN:${oldPin},${newPin}`);
        if (result.changed) {
          if (lastVerifiedPin === oldPin) lastVerifiedPin = newPin;
          sendResponse('pinChangeResponse', { success: true, changed: true, message: result.message });
        } else {
          sendResponse('pinChangeResponse', { success: true, changed: false, error: result.error, errorCode: result.errorCode });
        }
      } catch (err) {
        sendResponse('pinChangeResponse', { success: false, error: err.message });
      }
      break;

    case 'unlockWithPuk':
      try {
        const puk = msg.data?.puk || '';
        const newPin = msg.data?.newPin || '';
        const result = await sendBridgeCommand(`UNLOCK_PUK:${puk},${newPin}`);
        if (result.unlocked) {
          lastVerifiedPin = newPin;
          pinVerified = true;
          pinLocked = false;
          updateStatus({ pinLocked: false, pinRequired: false });
          sendResponse('pukUnlockResponse', { success: true, unlocked: true, message: result.message });
        } else {
          sendResponse('pukUnlockResponse', { success: true, unlocked: false, error: result.error, errorCode: result.errorCode });
        }
      } catch (err) {
        sendResponse('pukUnlockResponse', { success: false, error: err.message });
      }
      break;

    case 'getRetriesStatus':
      try {
        const result = await sendBridgeCommand('GET_RETRIES');
        if (result.success) {
          sendResponse('retriesStatusResponse', { success: true, pinRetries: result.pinRetries, pukRetries: result.pukRetries, message: result.message });
        } else {
          sendResponse('retriesStatusResponse', { success: false, error: result.error });
        }
      } catch (err) {
        sendResponse('retriesStatusResponse', { success: false, error: err.message });
      }
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
      
      // Reset exponential backoff on successful connection
      resetReconnectDelay();
      
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
          lastPongReceived = Date.now();
          if (heartbeatTimeoutTimer) {
            clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = null;
          }
          log.debug('Received pong, connection alive');
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
  
  log.info(`Scheduling relay reconnect in ${currentReconnectDelay}ms (exponential backoff)`);
  relayReconnectTimer = setTimeout(() => {
    relayReconnectTimer = null;
    connectToRelay();
  }, currentReconnectDelay);
  
  // Increase delay for next attempt (exponential backoff)
  currentReconnectDelay = Math.min(currentReconnectDelay * 2, RELAY_RECONNECT_MAX_DELAY);
}

function resetReconnectDelay() {
  currentReconnectDelay = RELAY_RECONNECT_BASE_DELAY;
}

function startRelayHeartbeat() {
  stopRelayHeartbeat();
  lastPongReceived = Date.now();
  
  relayHeartbeatTimer = setInterval(() => {
    if (relayWs && relayWs.readyState === WebSocket.OPEN) {
      try {
        // Check if last pong is too old (connection may be dead)
        const timeSinceLastPong = Date.now() - lastPongReceived;
        if (timeSinceLastPong > RELAY_HEARTBEAT_INTERVAL + RELAY_HEARTBEAT_TIMEOUT) {
          log.warn(`No pong received for ${timeSinceLastPong}ms, connection may be dead - forcing reconnection`);
          forceReconnect();
          return;
        }
        
        relayWs.send(JSON.stringify({ type: 'ping' }));
        
        // Set a timeout for pong response
        if (heartbeatTimeoutTimer) {
          clearTimeout(heartbeatTimeoutTimer);
        }
        heartbeatTimeoutTimer = setTimeout(() => {
          log.warn('Pong timeout - server may be unresponsive, forcing reconnection');
          forceReconnect();
        }, RELAY_HEARTBEAT_TIMEOUT);
        
      } catch (e) {
        log.error('Relay heartbeat error:', e.message);
        forceReconnect();
      }
    }
  }, RELAY_HEARTBEAT_INTERVAL);
}

function forceReconnect() {
  log.info('Force reconnecting to relay...');
  stopRelayHeartbeat();
  if (relayWs) {
    try {
      relayWs.terminate(); // Force close without waiting
    } catch (e) {
      // Ignore errors
    }
    relayWs = null;
  }
  updateStatus({ relayConnected: false });
  scheduleRelayReconnect();
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
          lastVerifiedPin = null;  // Clear stored PIN on card removal
          cardRemovalCounter = 0;
          // Clear certificate data to force fresh read on reinsertion
          currentStatus.cardEmail = null;
          currentStatus.cardCertificateCN = null;
          currentStatus.cardCertificateExpiry = null;
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
          
          // Also read certificate to get email (SIAE response destination)
          // Only read if we don't already have it cached
          if (!currentStatus.cardEmail) {
            try {
              log.info('Reading certificate for email...');
              const certResult = await sendBridgeCommand('GET_CERTIFICATE');
              log.info('GET_CERTIFICATE result:', JSON.stringify(certResult));
              
              if (certResult.success) {
                cardData.cardEmail = certResult.email || null;
                cardData.cardCertificateCN = certResult.commonName || null;
                cardData.cardCertificateExpiry = certResult.expiryDate || null;
                log.info(`Certificate email: ${certResult.email || '(not found)'}`);
              } else {
                log.warn('GET_CERTIFICATE failed:', certResult.error);
              }
            } catch (e) {
              log.error('Certificate read failed:', e.message);
            }
          } else {
            // Keep existing certificate data
            cardData.cardEmail = currentStatus.cardEmail;
            cardData.cardCertificateCN = currentStatus.cardCertificateCN;
            cardData.cardCertificateExpiry = currentStatus.cardCertificateExpiry;
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
        cardEmail: cardData.cardEmail || null,  // Email from certificate (SIAE response destination)
        cardCertificateCN: cardData.cardCertificateCN || null,
        cardCertificateExpiry: cardData.cardCertificateExpiry || null,
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
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
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
        // Include PIN for re-authentication on each seal operation
        const localSealPayload = { price };
        if (lastVerifiedPin) {
          localSealPayload.pin = lastVerifiedPin;
        }
        log.info(`[UI-SEAL] Sending seal command with PIN: ${lastVerifiedPin ? 'yes' : 'no'}`);
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify(localSealPayload)}`);
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
        
        // Execute seal command with PIN for re-authentication
        const sealPayload = { price };
        if (lastVerifiedPin) {
          sealPayload.pin = lastVerifiedPin;
        }
        log.info(`[SEAL] Sending seal command with PIN: ${lastVerifiedPin ? 'yes' : 'no'}`);
        const result = await sendBridgeCommand(`COMPUTE_SIGILLO:${JSON.stringify(sealPayload)}`);
        
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
    
    case 'STATUS_REQUEST':
      // Server requests fresh status - used before payment processing
      // to ensure we have up-to-date reader/card state
      try {
        const statusRequestId = msg.requestId;
        log.info(`[STATUS] Fresh status request received, requestId=${statusRequestId}`);
        
        // Perform fresh reader check
        if (bridgeProcess) {
          const result = await sendBridgeCommand('CHECK_READER');
          const wasInserted = currentStatus.cardInserted;
          
          updateStatus({
            readerConnected: result.readerConnected || false,
            cardInserted: result.cardPresent || false,
            readerName: result.readerName || null
          });
          
          // If card was removed and is now detected as not present, lock PIN
          if (wasInserted && !result.cardPresent) {
            log.info('[STATUS] Card detected as removed during status check');
            pinLocked = true;
            pinVerified = false;
          }
        }
        
        // Send fresh status response back to server
        if (relayWs && relayWs.readyState === WebSocket.OPEN) {
          relayWs.send(JSON.stringify({
            type: 'STATUS_RESPONSE',
            requestId: statusRequestId,
            payload: {
              success: true,
              bridgeConnected: !!bridgeProcess,
              readerConnected: currentStatus.readerConnected,
              cardInserted: currentStatus.cardInserted,
              pinVerified: pinVerified,
              demoMode: currentStatus.demoMode,
              timestamp: Date.now()
            }
          }));
          log.info(`[STATUS] Fresh status sent: reader=${currentStatus.readerConnected}, card=${currentStatus.cardInserted}, pin=${pinVerified}`);
        }
      } catch (err) {
        log.error(`[STATUS] Error processing status request: ${err.message}`);
        if (relayWs && relayWs.readyState === WebSocket.OPEN) {
          relayWs.send(JSON.stringify({
            type: 'STATUS_RESPONSE',
            requestId: msg.requestId,
            payload: {
              success: false,
              bridgeConnected: !!bridgeProcess,
              readerConnected: false,
              cardInserted: false,
              pinVerified: false,
              demoMode: false,
              error: err.message,
              timestamp: Date.now()
            }
          }));
        }
      }
      break;
    
    case 'verifyPin':
      // PIN verification from web client
      try {
        const pin = msg.data?.pin || '';
        log.info('[PIN] Verify PIN request from web');
        const result = await sendBridgeCommand(`VERIFY_PIN:${pin}`);
        
        if (result.verified) {
          pinVerified = true;
          pinLocked = false;
          lastVerifiedPin = pin;
          updateStatus({ pinLocked: false, pinRequired: false });
          sendRelayResponse('pinVerifyResponse', { success: true, verified: true });
        } else {
          // Extract retries from error code if available (0x63CX format)
          const errorCode = result.errorCode;
          let retriesRemaining = null;
          if (errorCode >= 0x63C0 && errorCode <= 0x63CF) {
            retriesRemaining = errorCode & 0x0F;
          }
          sendRelayResponse('pinVerifyResponse', { 
            success: true, 
            verified: false, 
            error: result.error,
            errorCode: errorCode,
            retriesRemaining: retriesRemaining
          });
        }
      } catch (err) {
        sendRelayResponse('pinVerifyResponse', { success: false, error: err.message });
      }
      break;
    
    case 'changePin':
      // Change PIN from web client
      try {
        const oldPin = msg.data?.oldPin || '';
        const newPin = msg.data?.newPin || '';
        log.info('[PIN] Change PIN request from web');
        const result = await sendBridgeCommand(`CHANGE_PIN:${oldPin},${newPin}`);
        
        if (result.changed) {
          // Update stored PIN
          if (lastVerifiedPin === oldPin) {
            lastVerifiedPin = newPin;
          }
          sendRelayResponse('pinChangeResponse', { success: true, changed: true, message: result.message });
        } else {
          sendRelayResponse('pinChangeResponse', { 
            success: true, 
            changed: false, 
            error: result.error,
            errorCode: result.errorCode
          });
        }
      } catch (err) {
        sendRelayResponse('pinChangeResponse', { success: false, error: err.message });
      }
      break;
    
    case 'unlockWithPuk':
      // Unlock with PUK from web client
      try {
        const puk = msg.data?.puk || '';
        const newPin = msg.data?.newPin || '';
        log.info('[PIN] Unlock with PUK request from web');
        const result = await sendBridgeCommand(`UNLOCK_PUK:${puk},${newPin}`);
        
        if (result.unlocked) {
          // Card is unlocked, PIN is now the new one
          lastVerifiedPin = newPin;
          pinVerified = true;
          pinLocked = false;
          updateStatus({ pinLocked: false, pinRequired: false });
          sendRelayResponse('pukUnlockResponse', { success: true, unlocked: true, message: result.message });
        } else {
          sendRelayResponse('pukUnlockResponse', { 
            success: true, 
            unlocked: false, 
            error: result.error,
            errorCode: result.errorCode
          });
        }
      } catch (err) {
        sendRelayResponse('pukUnlockResponse', { success: false, error: err.message });
      }
      break;
    
    case 'getRetriesStatus':
      // Get PIN/PUK retries from web client
      try {
        log.info('[PIN] Get retries status request from web');
        const result = await sendBridgeCommand('GET_RETRIES');
        
        if (result.success) {
          sendRelayResponse('retriesStatusResponse', { 
            success: true, 
            pinRetries: result.pinRetries,
            pukRetries: result.pukRetries,
            message: result.message
          });
        } else {
          sendRelayResponse('retriesStatusResponse', { success: false, error: result.error });
        }
      } catch (err) {
        sendRelayResponse('retriesStatusResponse', { success: false, error: err.message });
      }
      break;
    
    case 'REQUEST_XML_SIGNATURE':
      // Digital signature request for SIAE C1 reports
      // Uses the PKI functionality of the SIAE smart card
      try {
        const signRequestId = msg.requestId;
        const payload = msg.payload || {};
        const xmlContent = payload.xmlContent || '';
        
        log.info(`[SIGNATURE] XML signature request: requestId=${signRequestId}, xmlLength=${xmlContent.length}`);
        
        // Check if bridge is ready
        if (!bridgeProcess || !currentStatus.readerConnected) {
          log.error(`[SIGNATURE] Bridge not ready: bridge=${!!bridgeProcess}, reader=${currentStatus.readerConnected}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SIGNATURE_RESPONSE',
              requestId: signRequestId,
              payload: { 
                success: false, 
                error: 'App desktop Event4U non connessa o lettore non disponibile' 
              }
            }));
          }
          return;
        }
        
        if (!currentStatus.cardInserted) {
          log.error(`[SIGNATURE] No card inserted for signature request`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SIGNATURE_RESPONSE',
              requestId: signRequestId,
              payload: { 
                success: false, 
                error: 'Smart Card SIAE non inserita' 
              }
            }));
          }
          return;
        }
        
        // PIN must be verified for signature operations
        if (!pinVerified || !lastVerifiedPin) {
          log.error(`[SIGNATURE] PIN not verified for signature request`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SIGNATURE_RESPONSE',
              requestId: signRequestId,
              payload: { 
                success: false, 
                error: 'PIN non verificato. Inserire il PIN prima di firmare.' 
              }
            }));
          }
          return;
        }
        
        // Execute signature command
        const signPayload = { 
          xmlContent,
          pin: lastVerifiedPin 
        };
        log.info(`[SIGNATURE] Sending SIGN_XML command...`);
        const result = await sendBridgeCommand(`SIGN_XML:${JSON.stringify(signPayload)}`);
        
        if (result.success && result.signature) {
          log.info(`[SIGNATURE] XML signed successfully`);
          
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            // v3.16.2: SOLO CAdES-BES con SHA-256 è accettato
            // NO FALLBACK a XMLDSig/SHA-1 (deprecato e rifiutato da SIAE dal 2025)
            if (!result.signature.p7mBase64) {
              log.error(`[SIGNATURE] CRITICAL: No p7mBase64 in signature response - CAdES-BES failed`);
              log.error(`[SIGNATURE] SIAE 2025 richiede SHA-256, XMLDSig/SHA-1 NON accettato`);
              relayWs.send(JSON.stringify({
                type: 'SIGNATURE_RESPONSE',
                requestId: signRequestId,
                payload: { 
                  success: false, 
                  error: 'Firma CAdES-BES fallita: p7mBase64 mancante. SIAE richiede SHA-256, fallback XMLDSig disabilitato.' 
                }
              }));
              return;
            }
            
            const signatureData = {
              // Formato CAdES-BES (P7M) - UNICO FORMATO ACCETTATO DA SIAE 2025
              // NOTA: NON includere xmlContent - solo p7mBase64 è necessario
              p7mBase64: result.signature.p7mBase64,
              format: result.signature.format || 'CAdES-BES',
              algorithm: result.signature.algorithm || 'SHA-256',
              signedAt: result.signature.signedAt
            };
            
            log.info(`[SIGNATURE] Sending CAdES-BES P7M signature to relay (SHA-256, ${result.signature.p7mBase64.length} chars)`);
            
            relayWs.send(JSON.stringify({
              type: 'SIGNATURE_RESPONSE',
              requestId: signRequestId,
              payload: {
                success: true,
                signatureData
              }
            }));
          }
        } else {
          log.error(`[SIGNATURE] Signature failed: ${result.error || 'Unknown error'}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SIGNATURE_RESPONSE',
              requestId: signRequestId,
              payload: { 
                success: false, 
                error: result.error || 'Errore firma digitale' 
              }
            }));
          }
        }
      } catch (err) {
        log.error(`[SIGNATURE] Exception in signature request: ${err.message}`);
        if (relayWs && relayWs.readyState === WebSocket.OPEN) {
          relayWs.send(JSON.stringify({
            type: 'SIGNATURE_RESPONSE',
            requestId: msg.requestId,
            payload: { 
              success: false, 
              error: err.message 
            }
          }));
        }
      }
      break;
    
    case 'REQUEST_SMIME_SIGNATURE':
      // S/MIME signature request for SIAE email transmission (Allegato C)
      // Uses the PKI functionality of the SIAE smart card to sign emails
      try {
        const smimeRequestId = msg.requestId;
        const smimePayload = msg.payload || {};
        const mimeContent = smimePayload.mimeContent || '';
        
        log.info(`[S/MIME] Signature request: requestId=${smimeRequestId}, mimeLength=${mimeContent.length}`);
        
        // Check if bridge is ready
        if (!bridgeProcess || !currentStatus.readerConnected) {
          log.error(`[S/MIME] Bridge not ready: bridge=${!!bridgeProcess}, reader=${currentStatus.readerConnected}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SMIME_SIGNATURE_RESPONSE',
              requestId: smimeRequestId,
              payload: { 
                success: false, 
                error: 'App desktop Event4U non connessa o lettore non disponibile' 
              }
            }));
          }
          return;
        }
        
        if (!currentStatus.cardInserted) {
          log.error(`[S/MIME] No card inserted for S/MIME signature request`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SMIME_SIGNATURE_RESPONSE',
              requestId: smimeRequestId,
              payload: { 
                success: false, 
                error: 'Smart Card SIAE non inserita' 
              }
            }));
          }
          return;
        }
        
        // PIN check - use pinLocked status from card state
        // If pinLocked is false, the card is already unlocked and we can proceed
        // If we have a cached PIN, include it for extra safety
        if (currentStatus.pinLocked) {
          log.error(`[S/MIME] Card PIN is locked - need to verify PIN first`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SMIME_SIGNATURE_RESPONSE',
              requestId: smimeRequestId,
              payload: { 
                success: false, 
                error: 'PIN carta bloccato. Inserire il PIN prima di firmare.' 
              }
            }));
          }
          return;
        }
        
        // Execute S/MIME signature command
        // Pass PIN if available, otherwise let the bridge handle it (card already unlocked)
        const smimeSignPayload = { 
          mimeContent,
          pin: lastVerifiedPin || '' 
        };
        log.info(`[S/MIME] Sending SIGN_SMIME command...`);
        const smimeResult = await sendBridgeCommand(`SIGN_SMIME:${JSON.stringify(smimeSignPayload)}`);
        
        if (smimeResult.success && smimeResult.signature) {
          log.info(`[S/MIME] Email signed successfully by ${smimeResult.signature.signerEmail || 'unknown'}`);
          
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SMIME_SIGNATURE_RESPONSE',
              requestId: smimeRequestId,
              payload: {
                success: true,
                signatureData: {
                  signedMime: smimeResult.signature.signedMime,
                  signerEmail: smimeResult.signature.signerEmail,
                  signerName: smimeResult.signature.signerName,
                  certificateSerial: smimeResult.signature.certificateSerial,
                  signedAt: smimeResult.signature.signedAt
                }
              }
            }));
          }
        } else {
          log.error(`[S/MIME] Signature failed: ${smimeResult.error || 'Unknown error'}`);
          if (relayWs && relayWs.readyState === WebSocket.OPEN) {
            relayWs.send(JSON.stringify({
              type: 'SMIME_SIGNATURE_RESPONSE',
              requestId: smimeRequestId,
              payload: { 
                success: false, 
                error: smimeResult.error || 'Errore firma S/MIME' 
              }
            }));
          }
        }
      } catch (smimeErr) {
        log.error(`[S/MIME] Exception in S/MIME signature request: ${smimeErr.message}`);
        if (relayWs && relayWs.readyState === WebSocket.OPEN) {
          relayWs.send(JSON.stringify({
            type: 'SMIME_SIGNATURE_RESPONSE',
            requestId: msg.requestId,
            payload: { 
              success: false, 
              error: smimeErr.message 
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
      lastVerifiedPin = enteredPin;  // Store PIN for seal operations
      
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

ipcMain.handle('pin:changePin', async (event, { oldPin, newPin }) => {
  log.info('IPC: pin:changePin');
  try {
    const result = await sendBridgeCommand(`CHANGE_PIN:${oldPin},${newPin}`);
    log.info('PIN change result:', result);
    
    if (result.changed) {
      if (lastVerifiedPin === oldPin) {
        lastVerifiedPin = newPin;
      }
      return { success: true, changed: true, message: result.message };
    } else {
      return { success: false, changed: false, error: result.error, errorCode: result.errorCode };
    }
  } catch (err) {
    log.error('PIN change error:', err.message);
    return { success: false, error: 'Errore cambio PIN: ' + err.message };
  }
});

ipcMain.handle('pin:unlockWithPuk', async (event, { puk, newPin }) => {
  log.info('IPC: pin:unlockWithPuk');
  try {
    const result = await sendBridgeCommand(`UNLOCK_PUK:${puk},${newPin}`);
    log.info('PUK unlock result:', result);
    
    if (result.unlocked) {
      lastVerifiedPin = newPin;
      pinVerified = true;
      pinLocked = false;
      updateStatus({ pinLocked: false, pinRequired: false });
      return { success: true, unlocked: true, message: result.message };
    } else {
      return { success: false, unlocked: false, error: result.error, errorCode: result.errorCode };
    }
  } catch (err) {
    log.error('PUK unlock error:', err.message);
    return { success: false, error: 'Errore sblocco PUK: ' + err.message };
  }
});

ipcMain.handle('pin:getRetries', async () => {
  log.info('IPC: pin:getRetries');
  try {
    const result = await sendBridgeCommand('GET_RETRIES');
    log.info('Get retries result:', result);
    
    if (result.success) {
      return { success: true, pinRetries: result.pinRetries, pukRetries: result.pukRetries };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    log.error('Get retries error:', err.message);
    return { success: false, error: 'Errore lettura tentativi: ' + err.message };
  }
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
