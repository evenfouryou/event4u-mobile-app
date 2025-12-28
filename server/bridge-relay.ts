import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { db } from './db';
import { companies, sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface BridgeConnection {
  ws: WebSocket;
  connectedAt: Date;
  lastPing: Date;
}

// Master token from environment - used by the single Event Four You desktop app
const MASTER_TOKEN = process.env.SIAE_MASTER_TOKEN || '';

// Single global bridge (Event Four You's desktop app)
let globalBridge: BridgeConnection | null = null;

// Cached status from bridge - sent immediately to new clients
let cachedBridgeStatus: any = null;
let cachedBridgeStatusTimestamp: Date | null = null;

// Pending status request promise for synchronous status fetching
let pendingStatusRequest: {
  resolve: (status: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
} | null = null;

const STATUS_REQUEST_TIMEOUT = 3000; // 3 seconds timeout for status request
const STATUS_MAX_AGE = 30000; // 30 seconds - consider status stale after this

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  companyId: string;
  connectedAt: Date;
  lastPing: Date;
}

interface BridgeMessage {
  type: string;
  token?: string;
  companyId?: string;
  toCompanyId?: string;
  fromCompanyId?: string;
  fromUserId?: string;
  payload?: any;
  requestId?: string;
}

// Keep track of clients by company for routing responses
const activeClients = new Map<string, ClientConnection[]>();

const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 35000;

export function setupBridgeRelay(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    // Only handle /ws/bridge - let other handlers manage their paths
    if (url.pathname === '/ws/bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Don't destroy socket for other paths - they may be handled by other WebSocket servers
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('[Bridge] New WebSocket connection');
    
    let connectionType: 'bridge' | 'client' | null = null;
    let connectionInfo: { userId?: string; companyId?: string; effectiveCompanyId?: string } = {};

    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies['connect.sid'];
    
    console.log(`[Bridge] Raw cookie header: ${request.headers.cookie ? request.headers.cookie.substring(0, 100) + '...' : 'NONE'}`);
    console.log(`[Bridge] Cookie received: ${sessionId ? 'yes (connect.sid present)' : 'no cookie'}`);
    
    if (!sessionId) {
      console.log(`[Bridge] WARNING: No session cookie! WebSocket connection without authentication.`);
      console.log(`[Bridge] This could mean: 1) User not logged in, 2) Cookie not being sent, 3) CORS/SameSite issue`);
    }

    if (sessionId) {
      const session = await getSessionData(sessionId);
      console.log(`[Bridge] Session lookup result: ${session ? 'found' : 'not found'}`);
      console.log(`[Bridge] Session passport.user: ${session?.passport?.user ? 'present' : 'missing'}`);
      
      if (session?.passport?.user) {
        connectionType = 'client';
        // User ID can be in different locations depending on auth method:
        // - Classic login: session.passport.user.id
        // - Replit OAuth: session.passport.user.claims.sub
        const user = session.passport.user;
        const userId = user.id || user.claims?.sub || 'unknown';
        const companyId = user.companyId;
        
        connectionInfo = {
          userId,
          companyId,
        };
        // Super admin doesn't have companyId, but should still receive bridge status
        // Use a special "super_admin" company key for routing
        const effectiveCompanyId = connectionInfo.companyId || (user.role === 'super_admin' ? 'super_admin' : null);
        connectionInfo.effectiveCompanyId = effectiveCompanyId || undefined;
        
        console.log(`[Bridge] Client connected: userId=${connectionInfo.userId}, companyId=${connectionInfo.companyId}, effectiveCompanyId=${effectiveCompanyId}, role=${user.role}`);
        
        if (effectiveCompanyId && connectionInfo.userId) {
          addClient(effectiveCompanyId, connectionInfo.userId, ws);
          
          // Check if global bridge is connected (single Event Four You app)
          const bridgeConnected = globalBridge !== null && globalBridge.ws.readyState === WebSocket.OPEN;
          console.log(`[Bridge] Sending connection_status to client: bridgeConnected=${bridgeConnected}`);
          ws.send(JSON.stringify({
            type: 'connection_status',
            bridgeConnected,
            connected: bridgeConnected, // Also send as 'connected' for compatibility
            message: bridgeConnected ? 'Bridge desktop app is connected' : 'Bridge desktop app is not connected',
          }));
          
          // Send cached status immediately if available (no waiting for polling)
          if (cachedBridgeStatus && bridgeConnected) {
            console.log(`[Bridge] Sending cached status to new client immediately`);
            ws.send(JSON.stringify(cachedBridgeStatus));
          }
        } else {
          console.log(`[Bridge] WARNING: Cannot add client - missing effectiveCompanyId or userId`);
          // Still send connection status even if we can't track the client
          const bridgeConnected = globalBridge !== null && globalBridge.ws.readyState === WebSocket.OPEN;
          ws.send(JSON.stringify({
            type: 'connection_status',
            bridgeConnected,
            connected: bridgeConnected,
            message: bridgeConnected ? 'Bridge desktop app is connected' : 'Bridge desktop app is not connected',
          }));
        }
      }
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message: BridgeMessage = JSON.parse(data.toString());
        console.log(`[Bridge] Message received: type=${message.type}`);

        if (message.type === 'bridge_register') {
          const result = await handleBridgeRegistration(ws, message);
          if (result.success) {
            connectionType = 'bridge';
            console.log(`[Bridge] Global bridge registered successfully`);
          }
          return;
        }

        // Respond to ping with pong (critical for keeping bridge connection alive)
        if (message.type === 'ping') {
          try {
            ws.send(JSON.stringify({ type: 'pong' }));
          } catch (e) {
            // Ignore send errors
          }
          return;
        }

        if (message.type === 'pong') {
          if (connectionType === 'bridge' && globalBridge) {
            globalBridge.lastPing = new Date();
          } else if (connectionType === 'client' && connectionInfo.effectiveCompanyId && connectionInfo.userId) {
            // Use effectiveCompanyId (handles super_admin case)
            const clients = activeClients.get(connectionInfo.effectiveCompanyId);
            if (clients) {
              const client = clients.find(c => c.userId === connectionInfo.userId);
              if (client) {
                client.lastPing = new Date();
                console.log(`[Bridge] Pong received from userId=${connectionInfo.userId}, lastPing updated`);
              }
            }
          }
          return;
        }

        if (connectionType === 'client' && connectionInfo.effectiveCompanyId) {
          // Forward to global bridge with company info for routing response
          forwardToBridge(connectionInfo.effectiveCompanyId, message, connectionInfo.userId);
        } else if (connectionType === 'bridge') {
          // Messages from the bridge
          if (message.type === 'status') {
            // Cache the status for new clients with timestamp
            cachedBridgeStatus = message;
            cachedBridgeStatusTimestamp = new Date();
            
            // Resolve any pending status request
            if (pendingStatusRequest) {
              clearTimeout(pendingStatusRequest.timeout);
              pendingStatusRequest.resolve(message);
              pendingStatusRequest = null;
              console.log(`[Bridge] Resolved pending status request`);
            }
            
            // Bridge status update - broadcast to ALL clients
            console.log(`[Bridge] Broadcasting status update to all clients:`, JSON.stringify(message).substring(0, 500));
            console.log(`[Bridge] Status payload details:`, JSON.stringify(message.payload, null, 2));
            broadcastToAllClients(message);
          } else if (message.type === 'STATUS_RESPONSE') {
            // Handle fresh status response from desktop app (for payment verification)
            console.log(`[Bridge] STATUS_RESPONSE received: requestId=${message.requestId}`);
            console.log(`[Bridge] STATUS_RESPONSE payload:`, JSON.stringify(message.payload, null, 2));
            
            const payload = message.payload || {};
            const isSuccess = payload.success === true;
            const hasError = !!payload.error || !isSuccess;
            
            // Only update cached status with fresh data if response is successful
            // This prevents transient errors from corrupting known-good state
            if (isSuccess) {
              cachedBridgeStatus = {
                type: 'status',
                data: {
                  bridgeConnected: payload.bridgeConnected ?? false,
                  readerConnected: payload.readerConnected ?? false,
                  cardInserted: payload.cardInserted ?? false,
                  pinVerified: payload.pinVerified ?? false,
                  demoMode: payload.demoMode ?? false,
                  timestamp: payload.timestamp || Date.now()
                },
                payload: payload
              };
              cachedBridgeStatusTimestamp = new Date();
              console.log(`[Bridge] Cached status updated from successful STATUS_RESPONSE`);
            } else {
              console.log(`[Bridge] STATUS_RESPONSE indicates failure, preserving previous cached status`);
            }
            
            // Handle pending status request - reject on failure, resolve on success
            if (pendingStatusRequest) {
              clearTimeout(pendingStatusRequest.timeout);
              if (hasError) {
                const errorMsg = payload.error || 'Status request failed';
                console.log(`[Bridge] Rejecting pending status request: ${errorMsg}`);
                pendingStatusRequest.reject(new Error(errorMsg));
              } else {
                pendingStatusRequest.resolve({
                  type: 'status',
                  data: cachedBridgeStatus?.data || payload,
                  payload: payload
                });
                console.log(`[Bridge] Resolved pending status request from STATUS_RESPONSE`);
              }
              pendingStatusRequest = null;
            }
          } else if (message.type === 'SEAL_RESPONSE') {
            // Handle seal response from desktop app (for server-side seal requests)
            console.log(`[Bridge] Seal response received: requestId=${message.requestId}`);
            console.log(`[Bridge] Seal payload: ${JSON.stringify(message.payload)}`);
            console.log(`[Bridge] Seal data: ${JSON.stringify(message.payload?.seal)}`);
            handleSealResponse(
              message.requestId || '',
              message.payload?.success ?? false,
              message.payload?.seal,
              message.payload?.error
            );
            // Also forward to clients if there's a toCompanyId
            if (message.toCompanyId) {
              forwardToClients(message.toCompanyId as string, message);
            }
          } else if (message.type === 'SIGNATURE_RESPONSE') {
            // Handle XML signature response from desktop app (for digital signing)
            console.log(`[Bridge] XML Signature response received: requestId=${message.requestId}`);
            handleSignatureResponse(
              message.requestId || '',
              message.payload?.success ?? false,
              message.payload?.signatureData,
              message.payload?.error
            );
            // Also forward to clients if there's a toCompanyId
            if (message.toCompanyId) {
              forwardToClients(message.toCompanyId as string, message);
            }
          } else if (message.toCompanyId) {
            // Response to specific client request
            forwardToClients(message.toCompanyId as string, message);
          }
        }

      } catch (error) {
        console.error('[Bridge] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }));
      }
    });

    ws.on('close', () => {
      console.log(`[Bridge] Connection closed: type=${connectionType}`);
      
      if (connectionType === 'bridge') {
        globalBridge = null;
        cachedBridgeStatus = null; // Clear cached status when bridge disconnects
        cachedBridgeStatusTimestamp = null;
        
        // Reject any pending status request
        if (pendingStatusRequest) {
          clearTimeout(pendingStatusRequest.timeout);
          pendingStatusRequest.reject(new Error('Bridge disconnected'));
          pendingStatusRequest = null;
        }
        
        // Notify ALL clients that bridge disconnected
        notifyAllClientsOfBridgeStatus(false);
        console.log(`[Bridge] Global bridge disconnected`);
      } else if (connectionType === 'client' && connectionInfo.effectiveCompanyId && connectionInfo.userId) {
        // Use effectiveCompanyId for cleanup (handles super_admin case)
        removeClient(connectionInfo.effectiveCompanyId, connectionInfo.userId);
        console.log(`[Bridge] Client disconnected: userId=${connectionInfo.userId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('[Bridge] WebSocket error:', error);
    });
  });

  setInterval(() => {
    const now = new Date();

    // Check global bridge timeout
    if (globalBridge) {
      if (now.getTime() - globalBridge.lastPing.getTime() > CONNECTION_TIMEOUT) {
        console.log(`[Bridge] Global bridge timeout`);
        globalBridge.ws.terminate();
        globalBridge = null;
        notifyAllClientsOfBridgeStatus(false);
      } else {
        globalBridge.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }

    activeClients.forEach((clients, companyId) => {
      clients.forEach((client, index) => {
        if (now.getTime() - client.lastPing.getTime() > CONNECTION_TIMEOUT) {
          console.log(`[Bridge] Client timeout: userId=${client.userId}`);
          client.ws.terminate();
          clients.splice(index, 1);
        } else {
          client.ws.send(JSON.stringify({ type: 'ping' }));
        }
      });
      
      if (clients.length === 0) {
        activeClients.delete(companyId);
      }
    });
  }, HEARTBEAT_INTERVAL);

  console.log('[Bridge] WebSocket relay bridge initialized');
}

async function getSessionData(sessionId: string): Promise<any | null> {
  try {
    // Log the raw session ID from cookie
    console.log(`[Bridge] Raw session ID from cookie: ${sessionId?.substring(0, 30)}...`);
    
    // URL-decode the session ID first (browser sends it URL-encoded)
    const decodedSessionId = decodeURIComponent(sessionId);
    console.log(`[Bridge] URL-decoded session ID: ${decodedSessionId?.substring(0, 30)}...`);
    
    // Remove 's:' prefix and signature
    const cleanSessionId = decodedSessionId.replace(/^s:/, '').split('.')[0];
    console.log(`[Bridge] Clean session ID for DB lookup: ${cleanSessionId}`);
    
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, cleanSessionId))
      .limit(1);

    console.log(`[Bridge] DB lookup returned ${result.length} rows`);
    
    if (result.length > 0 && result[0].sess) {
      const sess = result[0].sess as any;
      console.log(`[Bridge] Session data: role=${sess?.passport?.user?.role}, companyId=${sess?.passport?.user?.companyId}, hasClaimsSub=${!!sess?.passport?.user?.claims?.sub}`);
      return sess;
    }
    return null;
  } catch (error) {
    console.error('[Bridge] Error fetching session:', error);
    return null;
  }
}

async function handleBridgeRegistration(
  ws: WebSocket,
  message: BridgeMessage
): Promise<{ success: boolean; error?: string }> {
  const { token } = message;

  if (!token) {
    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: false,
      error: 'Token is required',
    }));
    return { success: false, error: 'Token is required' };
  }

  // Validate against master token from environment
  if (!MASTER_TOKEN) {
    console.error('[Bridge] SIAE_MASTER_TOKEN not configured on server');
    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: false,
      error: 'Server not configured',
    }));
    return { success: false, error: 'Server not configured' };
  }

  console.log(`[Bridge] Registration attempt with master token: ${token?.substring(0, 8)}...`);
  
  if (token !== MASTER_TOKEN) {
    console.log(`[Bridge] Registration failed: Invalid master token`);
    ws.send(JSON.stringify({
      type: 'bridge_register_response',
      success: false,
      error: 'Invalid token',
    }));
    return { success: false, error: 'Invalid token' };
  }

  // Close existing bridge if any
  if (globalBridge) {
    console.log(`[Bridge] Replacing existing global bridge`);
    globalBridge.ws.terminate();
  }

  // Set as global bridge
  globalBridge = {
    ws,
    connectedAt: new Date(),
    lastPing: new Date(),
  };

  ws.send(JSON.stringify({
    type: 'bridge_register_response',
    success: true,
    message: 'Bridge registered successfully',
  }));

  // Notify all clients that bridge is now connected
  notifyAllClientsOfBridgeStatus(true);

  console.log(`[Bridge] Global bridge registered successfully`);
  return { success: true };
}

function addClient(companyId: string, userId: string, ws: WebSocket): void {
  if (!activeClients.has(companyId)) {
    activeClients.set(companyId, []);
  }
  
  const clients = activeClients.get(companyId)!;
  const existingIndex = clients.findIndex(c => c.userId === userId);
  
  if (existingIndex >= 0) {
    clients[existingIndex].ws.terminate();
    clients.splice(existingIndex, 1);
  }
  
  clients.push({
    ws,
    userId,
    companyId,
    connectedAt: new Date(),
    lastPing: new Date(),
  });
}

function removeClient(companyId: string, userId: string): void {
  const clients = activeClients.get(companyId);
  if (clients) {
    const index = clients.findIndex(c => c.userId === userId);
    if (index >= 0) {
      clients.splice(index, 1);
    }
    if (clients.length === 0) {
      activeClients.delete(companyId);
    }
  }
}

function notifyAllClientsOfBridgeStatus(connected: boolean): void {
  const message = JSON.stringify({
    type: 'bridge_status',
    connected,
    message: connected ? 'Bridge desktop app connected' : 'Bridge desktop app disconnected',
  });
  
  // Notify ALL clients across all companies
  activeClients.forEach((clients) => {
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  });
}

function broadcastToAllClients(message: BridgeMessage): void {
  const messageStr = JSON.stringify(message);
  let clientCount = 0;
  
  // Broadcast to ALL clients across all companies
  activeClients.forEach((clients) => {
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          clientCount++;
        } catch (e) {
          console.error('[Bridge] Error broadcasting to client:', e);
        }
      }
    });
  });
  
  console.log(`[Bridge] Broadcasted message type=${message.type} to ${clientCount} clients`);
}

function forwardToBridge(companyId: string, message: BridgeMessage, userId?: string): void {
  if (globalBridge && globalBridge.ws.readyState === WebSocket.OPEN) {
    // Include company info so bridge knows where to route response
    globalBridge.ws.send(JSON.stringify({
      ...message,
      fromUserId: userId,
      fromCompanyId: companyId,
    }));
  } else {
    console.log(`[Bridge] Global bridge not connected`);
  }
}

function forwardToClients(companyId: string, message: BridgeMessage): void {
  const clients = activeClients.get(companyId);
  if (clients) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
}

export function isBridgeConnected(): boolean {
  return globalBridge !== null && globalBridge.ws.readyState === WebSocket.OPEN;
}

export function getCachedBridgeStatus(): any {
  const connected = isBridgeConnected();
  if (!connected) {
    return {
      bridgeConnected: false,
      readerConnected: false,
      cardInserted: false,
      readerName: null,
      cardSerial: null
    };
  }
  
  // Return cached status or default if no status received yet
  if (cachedBridgeStatus) {
    // Desktop app sends { type: 'status', data: {...} }
    const statusData = cachedBridgeStatus.data || cachedBridgeStatus.payload || {};
    return {
      ...statusData,
      bridgeConnected: true, // Always true when bridge is connected - must come AFTER spread to prevent override
    };
  }
  
  return {
    bridgeConnected: true,
    readerConnected: false,
    cardInserted: false,
    readerName: null,
    cardSerial: null
  };
}

export function getActiveBridgesCount(): number {
  return globalBridge ? 1 : 0;
}

export function getActiveClientsCount(): number {
  let count = 0;
  activeClients.forEach(clients => {
    count += clients.length;
  });
  return count;
}

// ==================== SEAL REQUEST BROKER ====================
// Pending seal requests waiting for response from desktop bridge
interface PendingSealRequest {
  resolve: (seal: FiscalSealData) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

export interface FiscalSealData {
  sealCode: string;
  sealNumber: string;
  serialNumber: string;
  counter: number;
  mac: string;
  dateTime: string;
}

const pendingSealRequests = new Map<string, PendingSealRequest>();

const SEAL_REQUEST_TIMEOUT = 15000; // 15 seconds

// Generate UUID for request tracking
function generateRequestId(): string {
  return `seal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Request a fresh status from the desktop bridge
async function requestFreshStatus(): Promise<any> {
  console.log(`[Bridge] Requesting fresh status from desktop bridge`);
  
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    throw new Error('Bridge not connected');
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingStatusRequest) {
        pendingStatusRequest = null;
        console.log(`[Bridge] Status request timeout`);
        reject(new Error('Status request timeout'));
      }
    }, STATUS_REQUEST_TIMEOUT);
    
    pendingStatusRequest = { resolve, reject, timeout };
    
    // Send status request to bridge
    const requestId = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      globalBridge!.ws.send(JSON.stringify({
        type: 'STATUS_REQUEST',
        requestId,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Bridge] Sent STATUS_REQUEST to desktop bridge, requestId=${requestId}`);
    } catch (error) {
      clearTimeout(timeout);
      pendingStatusRequest = null;
      reject(error);
    }
  });
}

// Check if cached status is fresh enough
function isStatusFresh(): boolean {
  if (!cachedBridgeStatusTimestamp) return false;
  const age = Date.now() - cachedBridgeStatusTimestamp.getTime();
  return age < STATUS_MAX_AGE;
}

// Ensure we have fresh status before checking card readiness (async version)
export async function ensureCardReadyForSeals(): Promise<{ ready: boolean; error: string | null }> {
  console.log(`[Bridge] ensureCardReadyForSeals called`);
  
  // If no bridge connected, fail fast
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] Bridge not connected`);
    return { ready: false, error: 'App desktop Event4U non connessa' };
  }
  
  // If status is stale or missing, request a fresh one
  if (!cachedBridgeStatus || !isStatusFresh()) {
    console.log(`[Bridge] Status is stale or missing, requesting fresh status`);
    try {
      await requestFreshStatus();
      console.log(`[Bridge] Got fresh status`);
    } catch (error: any) {
      // Distinguish between transport errors and reader/card errors
      const errorMessage = error?.message || String(error);
      console.log(`[Bridge] Failed to get fresh status: ${errorMessage}`);
      
      // If this is a timeout, we can try with cached status as a fallback
      // But for definitive reader/card errors, we must fail fast
      if (errorMessage.includes('timeout') && cachedBridgeStatus) {
        console.log(`[Bridge] Timeout getting fresh status, using cached status as fallback`);
        // Continue to check cached status
      } else {
        // This is a definitive error from the desktop app - propagate it
        return { ready: false, error: errorMessage || 'Impossibile verificare stato Smart Card' };
      }
    }
  }
  
  // Now check the status
  return isCardReadyForSeals();
}

// Check if card is ready for seal emission (sync version - uses cached status)
export function isCardReadyForSeals(): { ready: boolean; error: string | null } {
  console.log(`[Bridge] isCardReadyForSeals called`);
  console.log(`[Bridge] globalBridge exists: ${!!globalBridge}`);
  console.log(`[Bridge] cachedBridgeStatus: ${JSON.stringify(cachedBridgeStatus)}`);
  
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] Bridge not connected`);
    return { ready: false, error: 'App desktop Event4U non connessa' };
  }
  
  // Desktop app sends { type: 'status', data: {...} } or { type: 'status', payload: {...} }
  // Handle multiple nesting levels
  const status = cachedBridgeStatus?.data?.payload || 
                 cachedBridgeStatus?.payload?.data ||
                 cachedBridgeStatus?.data || 
                 cachedBridgeStatus?.payload || 
                 cachedBridgeStatus;
  console.log(`[Bridge] Extracted status: ${JSON.stringify(status)}`);
  
  if (!status) {
    console.log(`[Bridge] No status available`);
    return { ready: false, error: 'Stato lettore sconosciuto' };
  }
  
  // Handle different field naming conventions from desktop app
  const readerConnected = status.readerConnected ?? status.isReaderConnected ?? status.reader_connected ?? status.readerDetected ?? false;
  const cardInserted = status.cardInserted ?? status.isCardInserted ?? status.card_inserted ?? status.cardPresent ?? false;
  
  console.log(`[Bridge] Normalized values: readerConnected=${readerConnected}, cardInserted=${cardInserted}`);
  
  if (!readerConnected) {
    console.log(`[Bridge] Reader not connected`);
    return { ready: false, error: 'Lettore Smart Card non rilevato' };
  }
  
  if (!cardInserted) {
    console.log(`[Bridge] Card not inserted`);
    return { ready: false, error: 'Smart Card SIAE non inserita' };
  }
  
  console.log(`[Bridge] Card ready for seals!`);
  return { ready: true, error: null };
}

// Request a fiscal seal from the desktop bridge
export async function requestFiscalSeal(priceInCents: number): Promise<FiscalSealData> {
  console.log(`[Bridge] requestFiscalSeal called with priceInCents=${priceInCents}`);
  console.log(`[Bridge] globalBridge exists: ${!!globalBridge}`);
  if (globalBridge) {
    console.log(`[Bridge] globalBridge.ws.readyState: ${globalBridge.ws.readyState} (OPEN=1)`);
  }
  
  // Check if bridge is connected
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] ERROR: Bridge not connected or not open`);
    throw new Error('SEAL_BRIDGE_OFFLINE: App desktop Event4U non connessa. Impossibile generare sigillo fiscale.');
  }
  
  // Check if card is ready
  const cardReady = isCardReadyForSeals();
  console.log(`[Bridge] Card ready check: ${JSON.stringify(cardReady)}`);
  if (!cardReady.ready) {
    throw new Error(`SEAL_CARD_NOT_READY: ${cardReady.error}`);
  }
  
  const requestId = generateRequestId();
  const price = priceInCents / 100;
  
  console.log(`[Bridge] Requesting fiscal seal: requestId=${requestId}, price=${price}, sending to bridge...`);
  
  return new Promise<FiscalSealData>((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      pendingSealRequests.delete(requestId);
      console.log(`[Bridge] Seal request timeout: requestId=${requestId}`);
      reject(new Error('SEAL_TIMEOUT: Timeout generazione sigillo fiscale. Riprovare.'));
    }, SEAL_REQUEST_TIMEOUT);
    
    // Store pending request
    pendingSealRequests.set(requestId, {
      resolve,
      reject,
      timeout,
      createdAt: new Date()
    });
    
    // Send request to bridge
    try {
      const sealMessage = {
        type: 'REQUEST_FISCAL_SEAL',
        requestId,
        payload: {
          price,
          timestamp: new Date().toISOString()
        }
      };
      console.log(`[Bridge] Sending seal request to bridge: ${JSON.stringify(sealMessage)}`);
      globalBridge!.ws.send(JSON.stringify(sealMessage));
      console.log(`[Bridge] Seal request sent successfully, waiting for response...`);
    } catch (sendError: any) {
      console.log(`[Bridge] ERROR sending seal request: ${sendError.message}`);
      clearTimeout(timeout);
      pendingSealRequests.delete(requestId);
      reject(new Error('SEAL_SEND_ERROR: Errore invio richiesta sigillo'));
    }
  });
}

// Handle seal response from bridge (called when bridge sends SEAL_RESPONSE)
export function handleSealResponse(requestId: string, success: boolean, seal?: any, error?: string): void {
  const pending = pendingSealRequests.get(requestId);
  if (!pending) {
    console.log(`[Bridge] No pending request for seal response: requestId=${requestId}`);
    return;
  }
  
  clearTimeout(pending.timeout);
  pendingSealRequests.delete(requestId);
  
  if (success && seal) {
    console.log(`[Bridge] Seal request completed: requestId=${requestId}, counter=${seal.counter}`);
    
    // Get serialNumber from seal response, with fallback to cached cardSerial
    // The C# bridge may return "0000000000000000" instead of actual serial
    let serialNumber = seal.serialNumber;
    const isInvalidSerial = !serialNumber || serialNumber === '0000000000000000' || serialNumber.match(/^0+$/);
    
    if (isInvalidSerial) {
      // Try to get cardSerial from cached bridge status
      const status = cachedBridgeStatus?.data?.payload || 
                     cachedBridgeStatus?.payload?.data ||
                     cachedBridgeStatus?.data || 
                     cachedBridgeStatus?.payload || 
                     cachedBridgeStatus;
      const cachedSerial = status?.cardSerial;
      
      if (cachedSerial && cachedSerial !== '0000000000000000') {
        console.log(`[Bridge] Using cached cardSerial as fallback: ${cachedSerial} (original was: ${serialNumber})`);
        serialNumber = cachedSerial;
      } else {
        console.log(`[Bridge] WARNING: Invalid serialNumber and no valid cached cardSerial available`);
      }
    }
    
    pending.resolve({
      sealCode: seal.sealCode || seal.mac,
      sealNumber: seal.sealNumber || `${serialNumber}-${seal.counter}`,
      serialNumber: serialNumber,
      counter: seal.counter,
      mac: seal.mac,
      dateTime: seal.dateTime
    });
  } else {
    console.log(`[Bridge] Seal request failed: requestId=${requestId}, error=${error}`);
    pending.reject(new Error(`SEAL_ERROR: ${error || 'Errore generazione sigillo'}`));
  }
}

// Get pending seal requests count (for monitoring)
export function getPendingSealRequestsCount(): number {
  return pendingSealRequests.size;
}

// ==================== XML SIGNATURE BROKER ====================
// Pending XML signature requests waiting for response from desktop bridge
interface PendingSignatureRequest {
  resolve: (signedXml: XmlSignatureData) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

export interface XmlSignatureData {
  signedXml: string;
  signatureValue: string;
  certificateData: string;
  signedAt: string;
}

const pendingSignatureRequests = new Map<string, PendingSignatureRequest>();

const SIGNATURE_REQUEST_TIMEOUT = 30000; // 30 seconds for XML signature

// Generate UUID for signature request tracking
function generateSignatureRequestId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Request XML digital signature from the desktop bridge (SIAE smart card)
export async function requestXmlSignature(xmlContent: string): Promise<XmlSignatureData> {
  console.log(`[Bridge] requestXmlSignature called, XML length=${xmlContent.length}`);
  
  // Check if bridge is connected
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] ERROR: Bridge not connected for XML signature`);
    throw new Error('SIGNATURE_BRIDGE_OFFLINE: App desktop Event4U non connessa. Impossibile firmare XML.');
  }
  
  // Check if card is ready
  const cardReady = isCardReadyForSeals();
  console.log(`[Bridge] Card ready check for signature: ${JSON.stringify(cardReady)}`);
  if (!cardReady.ready) {
    throw new Error(`SIGNATURE_CARD_NOT_READY: ${cardReady.error}`);
  }
  
  const requestId = generateSignatureRequestId();
  
  console.log(`[Bridge] Requesting XML signature: requestId=${requestId}`);
  
  return new Promise<XmlSignatureData>((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      pendingSignatureRequests.delete(requestId);
      console.log(`[Bridge] XML signature request timeout: requestId=${requestId}`);
      reject(new Error('SIGNATURE_TIMEOUT: Timeout firma digitale XML. Riprovare.'));
    }, SIGNATURE_REQUEST_TIMEOUT);
    
    // Store pending request
    pendingSignatureRequests.set(requestId, {
      resolve,
      reject,
      timeout,
      createdAt: new Date()
    });
    
    // Send request to bridge
    try {
      const signatureMessage = {
        type: 'REQUEST_XML_SIGNATURE',
        requestId,
        payload: {
          xmlContent,
          timestamp: new Date().toISOString()
        }
      };
      console.log(`[Bridge] Sending XML signature request to bridge: requestId=${requestId}`);
      globalBridge!.ws.send(JSON.stringify(signatureMessage));
      console.log(`[Bridge] XML signature request sent successfully, waiting for response...`);
    } catch (sendError: any) {
      console.log(`[Bridge] ERROR sending XML signature request: ${sendError.message}`);
      clearTimeout(timeout);
      pendingSignatureRequests.delete(requestId);
      reject(new Error('SIGNATURE_SEND_ERROR: Errore invio richiesta firma'));
    }
  });
}

// Handle signature response from bridge (called when bridge sends SIGNATURE_RESPONSE)
export function handleSignatureResponse(requestId: string, success: boolean, signatureData?: any, error?: string): void {
  const pending = pendingSignatureRequests.get(requestId);
  if (!pending) {
    console.log(`[Bridge] No pending request for signature response: requestId=${requestId}`);
    return;
  }
  
  clearTimeout(pending.timeout);
  pendingSignatureRequests.delete(requestId);
  
  if (success && signatureData) {
    console.log(`[Bridge] XML signature request completed: requestId=${requestId}`);
    pending.resolve({
      signedXml: signatureData.signedXml,
      signatureValue: signatureData.signatureValue || '',
      certificateData: signatureData.certificateData || '',
      signedAt: signatureData.signedAt || new Date().toISOString()
    });
  } else {
    console.log(`[Bridge] XML signature request failed: requestId=${requestId}, error=${error}`);
    pending.reject(new Error(`SIGNATURE_ERROR: ${error || 'Errore firma digitale XML'}`));
  }
}

// Get pending signature requests count (for monitoring)
export function getPendingSignatureRequestsCount(): number {
  return pendingSignatureRequests.size;
}
