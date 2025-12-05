const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Setup logging
const log = require('electron-log');
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'event4u-siae.log');
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

log.info('='.repeat(60));
log.info('App starting at', new Date().toISOString());
log.info('App version:', app.getVersion());
log.info('Electron version:', process.versions.electron);
log.info('Node version:', process.versions.node);
log.info('Platform:', process.platform, process.arch);
log.info('User data path:', app.getPath('userData'));
log.info('='.repeat(60));

let mainWindow;
let bridgeProcess = null;
let bridgePath = null;

function getBridgePath() {
  const possiblePaths = [
    // Production: inside resources
    path.join(process.resourcesPath, 'SiaeBridge', 'SiaeBridge.exe'),
    // Development: alongside app
    path.join(__dirname, 'SiaeBridge', 'bin', 'Release', 'net472', 'SiaeBridge.exe'),
    path.join(__dirname, 'SiaeBridge', 'bin', 'Debug', 'net472', 'SiaeBridge.exe'),
    path.join(__dirname, 'SiaeBridge', 'SiaeBridge.exe'),
  ];

  log.info('Searching for SiaeBridge.exe...');
  log.info('Resource path:', process.resourcesPath);
  log.info('__dirname:', __dirname);

  for (const p of possiblePaths) {
    log.info(`  Checking: ${p}`);
    if (fs.existsSync(p)) {
      log.info(`  ✓ FOUND: ${p}`);
      return p;
    }
    log.info(`  ✗ Not found`);
  }

  log.error('SiaeBridge.exe not found in any location!');
  return null;
}

function listDirectory(dirPath, prefix = '') {
  try {
    if (!fs.existsSync(dirPath)) {
      log.info(`${prefix}Directory does not exist: ${dirPath}`);
      return;
    }
    const items = fs.readdirSync(dirPath);
    log.info(`${prefix}Contents of ${dirPath}:`);
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        log.info(`${prefix}  [DIR] ${item}`);
      } else {
        log.info(`${prefix}  [FILE] ${item} (${stat.size} bytes)`);
      }
    });
  } catch (err) {
    log.error(`${prefix}Error listing ${dirPath}:`, err.message);
  }
}

function createWindow() {
  log.info('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'Event Four You - SIAE Lettore',
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });

  // Log directory structure for debugging
  log.info('--- Directory Structure Debug ---');
  listDirectory(process.resourcesPath);
  listDirectory(path.join(process.resourcesPath, 'SiaeBridge'));
  listDirectory(__dirname);
  log.info('--- End Directory Structure ---');

  // Find bridge path
  bridgePath = getBridgePath();
  if (bridgePath) {
    // Check for libSIAE.dll
    const bridgeDir = path.dirname(bridgePath);
    const dllPath = path.join(bridgeDir, 'libSIAE.dll');
    log.info(`Checking for libSIAE.dll at: ${dllPath}`);
    if (fs.existsSync(dllPath)) {
      log.info('✓ libSIAE.dll found');
    } else {
      log.warn('✗ libSIAE.dll NOT found - bridge will not work!');
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
    log.info(`Bridge working directory: ${bridgeDir}`);

    try {
      bridgeProcess = spawn(bridgePath, [], {
        cwd: bridgeDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      let startupOutput = '';
      let startupError = '';
      let resolved = false;

      bridgeProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        log.info(`[Bridge STDOUT] ${text}`);
        startupOutput += text + '\n';
        
        if (!resolved && text.includes('READY')) {
          resolved = true;
          log.info('Bridge reported READY');
          resolve({ success: true, message: 'Bridge avviato con successo' });
        }
      });

      bridgeProcess.stderr.on('data', (data) => {
        const text = data.toString().trim();
        log.error(`[Bridge STDERR] ${text}`);
        startupError += text + '\n';
      });

      bridgeProcess.on('error', (err) => {
        log.error('Bridge spawn error:', err);
        bridgeProcess = null;
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      bridgeProcess.on('exit', (code, signal) => {
        log.info(`Bridge exited with code ${code}, signal ${signal}`);
        bridgeProcess = null;
        if (!resolved) {
          resolved = true;
          reject(new Error(`Bridge terminato con codice ${code}`));
        }
      });

      // Timeout for startup
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (bridgeProcess) {
            log.warn('Bridge startup timeout, but process is running');
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
      bridgeProcess.kill();
      bridgeProcess = null;
    }
    resolve({ success: true });
  });
}

function sendBridgeCommand(command) {
  return new Promise((resolve, reject) => {
    if (!bridgeProcess) {
      reject(new Error('Bridge non avviato'));
      return;
    }

    log.info(`Sending command: ${command}`);
    
    let response = '';
    let timeout;
    
    const onData = (data) => {
      response += data.toString();
      // Check if we have a complete JSON response
      try {
        const parsed = JSON.parse(response.trim());
        clearTimeout(timeout);
        bridgeProcess.stdout.removeListener('data', onData);
        log.info(`Command response:`, parsed);
        resolve(parsed);
      } catch (e) {
        // Not complete yet, wait for more data
      }
    };

    bridgeProcess.stdout.on('data', onData);
    bridgeProcess.stdin.write(command + '\n');

    timeout = setTimeout(() => {
      bridgeProcess.stdout.removeListener('data', onData);
      log.warn(`Command timeout, partial response: ${response}`);
      reject(new Error('Timeout risposta bridge'));
    }, 10000);
  });
}

// IPC Handlers
ipcMain.handle('bridge:start', async () => {
  log.info('IPC: bridge:start');
  try {
    const result = await startBridge();
    return result;
  } catch (err) {
    log.error('bridge:start error:', err);
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
  log.info('IPC: bridge:status', status);
  return status;
});

ipcMain.handle('bridge:checkReader', async () => {
  log.info('IPC: bridge:checkReader');
  try {
    const result = await sendBridgeCommand('CHECK_READER');
    return result;
  } catch (err) {
    log.error('checkReader error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bridge:readCard', async () => {
  log.info('IPC: bridge:readCard');
  try {
    const result = await sendBridgeCommand('READ_CARD');
    return result;
  } catch (err) {
    log.error('readCard error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bridge:computeSigillo', async (event, data) => {
  log.info('IPC: bridge:computeSigillo', data);
  try {
    const command = `COMPUTE_SIGILLO:${JSON.stringify(data)}`;
    const result = await sendBridgeCommand(command);
    return result;
  } catch (err) {
    log.error('computeSigillo error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:getLogPath', () => {
  return log.transports.file.getFile().path;
});

ipcMain.handle('app:getLogs', async () => {
  try {
    const logPath = log.transports.file.getFile().path;
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      // Return last 200 lines
      const lines = content.split('\n');
      return lines.slice(-200).join('\n');
    }
    return 'Log file non trovato';
  } catch (err) {
    return `Errore lettura log: ${err.message}`;
  }
});

// App lifecycle
app.whenReady().then(() => {
  log.info('App ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  stopBridge();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('App quitting...');
  stopBridge();
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});
