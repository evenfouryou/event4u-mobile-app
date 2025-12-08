// Event Four You - SIAE Lettore Renderer

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnConnect = document.getElementById('btn-connect');
  const btnCheckReader = document.getElementById('btn-check-reader');
  const btnReadCard = document.getElementById('btn-read-card');
  const btnToggleLogs = document.getElementById('btn-toggle-logs');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const btnExportLogs = document.getElementById('btn-export-logs');
  
  // Relay elements (auto-connect - no user input needed)
  const statusRelay = document.getElementById('status-relay');
  
  const statusBridge = document.getElementById('status-bridge');
  const statusReader = document.getElementById('status-reader');
  const statusCard = document.getElementById('status-card');
  
  const cardPanel = document.getElementById('card-panel');
  const sigilloPanel = document.getElementById('sigillo-panel');
  const logPanel = document.getElementById('log-panel');
  const logContent = document.getElementById('log-content');
  
  const sigilloForm = document.getElementById('sigillo-form');
  const sigilloResult = document.getElementById('sigillo-result');

  // State
  let bridgeConnected = false;
  let readerConnected = false;
  let cardPresent = false;
  let relayConnected = false;
  let checkInterval = null;
  let pinDialogVisible = false;

  // Initialize
  init();
  
  // Listen for PIN required event (SIAE compliance)
  window.siaeAPI.onPinRequired((data) => {
    showPinDialog(data.reason);
  });

  async function init() {
    addLog('info', 'Applicazione avviata');
    
    // Set current datetime for sigillo form
    const now = new Date();
    const dateInput = document.getElementById('input-datetime');
    dateInput.value = now.toISOString().slice(0, 16);
    
    // Check initial bridge status
    const status = await window.siaeAPI.getBridgeStatus();
    addLog('info', `Bridge path: ${status.bridgePath || 'Non trovato'}`);
    
    // Load relay config
    await loadRelayConfig();
    
    // Setup live log listener
    window.siaeAPI.onLogEntry((entry) => {
      addLogEntry(entry);
    });
    
    // Setup status update listener
    window.siaeAPI.onStatusUpdate((status) => {
      updateRelayStatusUI(status.relayConnected);
    });
  }
  
  // Relay functions - auto-connect (no user input needed)
  async function loadRelayConfig() {
    try {
      const config = await window.siaeAPI.getRelayConfig();
      if (config) {
        updateRelayStatusUI(config.connected);
        
        if (config.connected) {
          addLog('info', '✓ Connesso al server Event4U');
        } else {
          addLog('info', 'Connessione automatica in corso...');
          // Wait for auto-connect
          setTimeout(async () => {
            const newConfig = await window.siaeAPI.getRelayConfig();
            updateRelayStatusUI(newConfig?.connected || false);
          }, 3000);
        }
      }
    } catch (e) {
      addLog('error', `Errore connessione: ${e.message}`);
    }
  }
  
  function updateRelayStatusUI(connected) {
    relayConnected = connected;
    if (connected) {
      updateStatus(statusRelay, 'connected', 'Connesso a manage.eventfouryou.com');
    } else {
      updateStatus(statusRelay, 'warning', 'Connessione in corso...');
    }
  }

  // Event Handlers
  btnConnect.addEventListener('click', async () => {
    if (bridgeConnected) {
      await disconnectBridge();
    } else {
      await connectBridge();
    }
  });

  btnCheckReader.addEventListener('click', async () => {
    await checkReader();
  });

  btnReadCard.addEventListener('click', async () => {
    await readCard();
  });

  btnToggleLogs.addEventListener('click', () => {
    logPanel.classList.toggle('collapsed');
  });

  btnClearLogs.addEventListener('click', () => {
    logContent.innerHTML = '';
    addLog('info', 'Log cancellati');
  });

  btnExportLogs.addEventListener('click', async () => {
    const logs = await window.siaeAPI.getFullLogs();
    downloadText('siae-log.txt', logs);
  });

  sigilloForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await computeSigillo();
  });

  // Functions
  async function connectBridge() {
    btnConnect.disabled = true;
    btnConnect.innerHTML = '<span class="btn-icon">⏳</span> Connessione...';
    addLog('info', 'Connessione al bridge...');

    try {
      const result = await window.siaeAPI.startBridge();
      
      if (result.success) {
        bridgeConnected = true;
        updateStatus(statusBridge, 'connected', 'Connesso');
        btnConnect.innerHTML = '<span class="btn-icon">🔌</span> Disconnetti';
        btnCheckReader.disabled = false;
        addLog('info', '✓ Bridge connesso');
        
        // Start periodic check
        startPeriodicCheck();
        
        // Check reader immediately
        await checkReader();
      } else {
        throw new Error(result.error || 'Connessione fallita');
      }
    } catch (err) {
      addLog('error', `Errore connessione: ${err.message}`);
      updateStatus(statusBridge, 'error', 'Errore');
      btnConnect.innerHTML = '<span class="btn-icon">🔌</span> Riprova';
    }
    
    btnConnect.disabled = false;
  }

  async function disconnectBridge() {
    stopPeriodicCheck();
    
    await window.siaeAPI.stopBridge();
    bridgeConnected = false;
    readerConnected = false;
    cardPresent = false;
    
    updateStatus(statusBridge, '', 'Non connesso');
    updateStatus(statusReader, '', 'Non rilevato');
    updateStatus(statusCard, '', 'Non inserita');
    
    btnConnect.innerHTML = '<span class="btn-icon">🔌</span> Connetti Bridge';
    btnCheckReader.disabled = true;
    cardPanel.style.display = 'none';
    sigilloPanel.style.display = 'none';
    
    addLog('info', 'Bridge disconnesso');
  }

  async function checkReader() {
    if (!bridgeConnected) return;
    
    try {
      const result = await window.siaeAPI.checkReader();
      
      if (result.success) {
        readerConnected = result.readerConnected;
        cardPresent = result.cardPresent;
        
        if (readerConnected) {
          updateStatus(statusReader, 'connected', 'Connesso');
        } else {
          updateStatus(statusReader, 'error', 'Non rilevato');
        }
        
        if (cardPresent) {
          updateStatus(statusCard, 'connected', 'Carta inserita');
          cardPanel.style.display = 'block';
          sigilloPanel.style.display = 'block';
          addLog('info', `✓ Carta rilevata (slot ${result.slot})`);
        } else {
          updateStatus(statusCard, 'warning', 'Non inserita');
          cardPanel.style.display = 'none';
          sigilloPanel.style.display = 'none';
        }
      } else {
        if (result.error && result.error.includes('libSIAE')) {
          updateStatus(statusReader, 'error', 'DLL mancante');
          addLog('error', 'libSIAE.dll non trovata!');
        } else {
          updateStatus(statusReader, 'error', 'Errore');
          addLog('error', result.error);
        }
      }
    } catch (err) {
      addLog('error', `Errore check: ${err.message}`);
    }
  }

  async function readCard() {
    if (!cardPresent) {
      addLog('warn', 'Nessuna carta presente');
      return;
    }

    btnReadCard.disabled = true;
    btnReadCard.innerHTML = '<span class="btn-icon">⏳</span> Lettura...';
    addLog('info', 'Lettura carta in corso...');

    try {
      const result = await window.siaeAPI.readCard();
      
      if (result.success) {
        document.getElementById('card-serial').textContent = result.serialNumber;
        document.getElementById('card-counter').textContent = result.counter;
        document.getElementById('card-balance').textContent = result.balance;
        document.getElementById('card-keyid').textContent = result.keyId;
        
        addLog('info', `✓ Carta letta - SN: ${result.serialNumber}`);
      } else {
        addLog('error', `Errore lettura: ${result.error}`);
        // Card might have been removed
        await checkReader();
      }
    } catch (err) {
      addLog('error', `Errore: ${err.message}`);
    }

    btnReadCard.disabled = false;
    btnReadCard.innerHTML = '<span class="btn-icon">📖</span> Leggi Carta';
  }

  async function computeSigillo() {
    if (!cardPresent) {
      addLog('warn', 'Inserire la carta per generare il sigillo');
      return;
    }

    const priceInput = document.getElementById('input-price');
    const dateInput = document.getElementById('input-datetime');
    
    const price = parseFloat(priceInput.value) || 0;
    const dateTime = dateInput.value ? new Date(dateInput.value) : new Date();
    
    addLog('info', `Generazione sigillo: €${price.toFixed(2)}...`);
    
    try {
      const result = await window.siaeAPI.computeSigillo({
        price: price,
        dateTime: dateTime.toISOString()
      });
      
      if (result.success) {
        document.getElementById('sigillo-mac').textContent = result.sigillo.mac;
        document.getElementById('sigillo-serial').textContent = result.sigillo.serialNumber;
        document.getElementById('sigillo-counter').textContent = result.sigillo.counter;
        sigilloResult.style.display = 'block';
        
        addLog('info', `✓ Sigillo generato - MAC: ${result.sigillo.mac}`);
      } else {
        addLog('error', `Errore sigillo: ${result.error}`);
        sigilloResult.style.display = 'none';
      }
    } catch (err) {
      addLog('error', `Errore: ${err.message}`);
    }
  }

  function startPeriodicCheck() {
    stopPeriodicCheck();
    checkInterval = setInterval(async () => {
      if (bridgeConnected) {
        await checkReader();
      }
    }, 3000);
  }

  function stopPeriodicCheck() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  function updateStatus(element, status, text) {
    element.className = 'status-item ' + status;
    element.querySelector('.status-value').textContent = text;
  }

  function addLog(level, message) {
    addLogEntry({
      timestamp: new Date().toISOString(),
      level: level,
      message: message
    });
  }

  function addLogEntry(entry) {
    const div = document.createElement('div');
    div.className = `log-entry log-${entry.level}`;
    
    const time = new Date(entry.timestamp);
    const timeStr = time.toLocaleTimeString('it-IT');
    
    div.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-message">${escapeHtml(entry.message)}</span>
    `;
    
    logContent.appendChild(div);
    logContent.scrollTop = logContent.scrollHeight;
    
    // Keep only last 200 entries
    while (logContent.children.length > 200) {
      logContent.removeChild(logContent.firstChild);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ============================================
  // PIN Dialog (SIAE Compliance)
  // ============================================
  
  function showPinDialog(reason) {
    if (pinDialogVisible) return;
    pinDialogVisible = true;
    
    addLog('warn', '⚠️ SIAE: Richiesta verifica PIN');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'pin-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: linear-gradient(145deg, #2d2d3a, #1e1e28);
      border-radius: 16px;
      padding: 32px;
      width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
    `;
    
    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
        <h2 style="color: #ff9800; margin: 0 0 8px 0; font-size: 20px;">Verifica PIN SIAE</h2>
        <p style="color: #999; margin: 0; font-size: 14px;">${reason || 'Inserire il PIN per continuare'}</p>
      </div>
      <div style="margin-bottom: 24px;">
        <input type="password" id="pin-input" maxlength="6" 
          style="width: 100%; padding: 16px; font-size: 24px; text-align: center; 
          letter-spacing: 8px; background: #1a1a24; border: 2px solid #444;
          border-radius: 8px; color: white; box-sizing: border-box;"
          placeholder="••••" autofocus>
        <p id="pin-error" style="color: #f44336; margin: 8px 0 0 0; font-size: 13px; display: none;">
          PIN errato. Riprova.
        </p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="pin-cancel" style="flex: 1; padding: 14px; background: #444; 
          border: none; border-radius: 8px; color: white; font-size: 15px; cursor: pointer;">
          Annulla
        </button>
        <button id="pin-submit" style="flex: 1; padding: 14px; 
          background: linear-gradient(135deg, #4caf50, #388e3c);
          border: none; border-radius: 8px; color: white; font-size: 15px; 
          cursor: pointer; font-weight: 600;">
          Conferma
        </button>
      </div>
      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 16px;">
        Inserisci il PIN della tua carta SIAE
      </p>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');
    const pinSubmit = document.getElementById('pin-submit');
    const pinCancel = document.getElementById('pin-cancel');
    
    pinInput.focus();
    
    async function verifyPin() {
      const pin = pinInput.value;
      if (!pin) return;
      
      const result = await window.siaeAPI.verifyPin(pin);
      
      if (result.success) {
        addLog('info', '✓ PIN verificato correttamente');
        closePinDialog();
      } else {
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
        addLog('error', 'PIN errato');
      }
    }
    
    function closePinDialog() {
      overlay.remove();
      pinDialogVisible = false;
    }
    
    pinSubmit.addEventListener('click', verifyPin);
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyPin();
    });
    pinCancel.addEventListener('click', () => {
      addLog('warn', 'Verifica PIN annullata - operazioni bloccate');
      closePinDialog();
    });
  }
});
