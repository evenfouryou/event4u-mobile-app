/**
 * Event4U Smart Card Reader Server
 * Server WebSocket per la comunicazione con il lettore MiniLector EVO V3
 * 
 * Questo server:
 * 1. Si connette al lettore smart card via PC/SC
 * 2. Espone un WebSocket su localhost:18765
 * 3. Permette all'applicazione web di verificare la presenza della smart card
 */

const WebSocket = require('ws');
const http = require('http');

// Configurazione
const PORT = 18765;
const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://localhost:5000',
  'https://127.0.0.1:5000'
];

// Aggiungi domini Replit
const REPLIT_PATTERN = /^https?:\/\/.*\.replit\.(dev|app|co)$/;

// Stato del sistema
let systemState = {
  readerConnected: false,
  cardInserted: false,
  cardATR: null,
  lastError: null,
  simulationMode: true // Inizia in modalità simulazione se pcsclite non è disponibile
};

// Prova a caricare pcsclite
let pcsclite = null;
let pcsc = null;

try {
  pcsclite = require('pcsclite');
  pcsc = pcsclite();
  systemState.simulationMode = false;
  console.log('[OK] Libreria PC/SC caricata');
  
  pcsc.on('reader', (reader) => {
    console.log(`[+] Lettore trovato: ${reader.name}`);
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
      console.error(`[!] Errore lettore: ${err.message}`);
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
    console.error(`[!] Errore PC/SC: ${err.message}`);
    systemState.lastError = err.message;
    systemState.simulationMode = true;
  });

} catch (err) {
  console.log('[!] PC/SC non disponibile - Modalità simulazione attiva');
  console.log('    Per usare il lettore fisico, installa i driver MiniLector');
  systemState.simulationMode = true;
  
  // In simulazione, simula un lettore connesso con carta
  systemState.readerConnected = true;
  systemState.readerName = 'MiniLector EVO V3 (Simulato)';
  systemState.cardInserted = true;
  systemState.cardATR = 'SIMULATION_MODE_ATR';
}

// Lista client WebSocket connessi
const clients = new Set();

// Broadcast stato a tutti i client
function broadcastStatus() {
  const message = JSON.stringify({
    type: 'status',
    data: systemState
  });
  
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Verifica origine
function isAllowedOrigin(origin) {
  if (!origin) return true; // Permetti connessioni senza origine (es. da Node.js)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (REPLIT_PATTERN.test(origin)) return true;
  return false;
}

// Crea server HTTP per health check
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

// Crea server WebSocket
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  
  if (!isAllowedOrigin(origin)) {
    console.log(`[!] Connessione rifiutata da: ${origin}`);
    ws.close(4003, 'Origin not allowed');
    return;
  }
  
  console.log(`[+] Client connesso da: ${origin || 'locale'}`);
  clients.add(ws);
  
  // Invia stato iniziale
  ws.send(JSON.stringify({
    type: 'status',
    data: systemState
  }));
  
  // Gestisci messaggi
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
          // Richiesta sigillo fiscale
          if (!systemState.cardInserted && !systemState.simulationMode) {
            ws.send(JSON.stringify({
              type: 'sealResponse',
              success: false,
              error: 'Smart card non inserita'
            }));
          } else {
            // Genera sigillo (in produzione, questo leggerebbe dalla carta)
            const seal = generateFiscalSeal(msg.data);
            ws.send(JSON.stringify({
              type: 'sealResponse',
              success: true,
              seal: seal
            }));
          }
          break;
          
        default:
          console.log(`[?] Messaggio sconosciuto: ${msg.type}`);
      }
    } catch (err) {
      console.error(`[!] Errore parsing messaggio: ${err.message}`);
    }
  });
  
  ws.on('close', () => {
    console.log('[-] Client disconnesso');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error(`[!] Errore WebSocket: ${err.message}`);
    clients.delete(ws);
  });
});

// Genera sigillo fiscale (placeholder - in produzione usa la smart card)
function generateFiscalSeal(data) {
  const timestamp = new Date().toISOString();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  return {
    sealNumber: `SEAL-${Date.now()}-${random}`,
    timestamp: timestamp,
    eventId: data?.eventId,
    ticketId: data?.ticketId,
    signature: systemState.simulationMode ? 'SIMULATED_SIGNATURE' : 'REAL_SIGNATURE',
    simulationMode: systemState.simulationMode
  };
}

// Avvia server
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('========================================');
  console.log('  Event4U Smart Card Reader');
  console.log('========================================');
  console.log('');
  console.log(`  Server WebSocket: ws://127.0.0.1:${PORT}`);
  console.log(`  Health check:     http://127.0.0.1:${PORT}/health`);
  console.log('');
  
  if (systemState.simulationMode) {
    console.log('  [!] MODALITA SIMULAZIONE ATTIVA');
    console.log('      I sigilli NON sono validi fiscalmente');
    console.log('');
  }
  
  console.log('  Stato:');
  console.log(`    - Lettore: ${systemState.readerConnected ? 'Connesso' : 'Non trovato'}`);
  console.log(`    - Carta:   ${systemState.cardInserted ? 'Inserita' : 'Non inserita'}`);
  console.log('');
  console.log('  NON CHIUDERE QUESTA FINESTRA');
  console.log('========================================');
  console.log('');
});

// Gestione chiusura
process.on('SIGINT', () => {
  console.log('\n[*] Chiusura server...');
  wss.close();
  httpServer.close();
  if (pcsc) pcsc.close();
  process.exit(0);
});
