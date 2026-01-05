import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { db } from './db';
import { companies, sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { SiaeCardEfffData } from './siae-utils';

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

const HEARTBEAT_INTERVAL = 15000;  // 15 seconds (aligned with desktop app)
const CONNECTION_TIMEOUT = 20000;  // 20 seconds (15s + 5s grace period)

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
          } else if (message.type === 'SMIME_SIGNATURE_RESPONSE') {
            // Handle S/MIME signature response from desktop app (for SIAE email signing)
            console.log(`[Bridge] S/MIME Signature response received: requestId=${message.requestId}`);
            handleSmimeSignatureResponse(
              message.requestId || '',
              message.payload?.success ?? false,
              message.payload?.signatureData,
              message.payload?.error
            );
            // Also forward to clients if there's a toCompanyId
            if (message.toCompanyId) {
              forwardToClients(message.toCompanyId as string, message);
            }
          } else if (message.type === 'EFFF_RESPONSE') {
            // Handle EFFF read response from desktop app (Smart Card anagrafica data)
            console.log(`[Bridge] EFFF response received: requestId=${message.requestId}`);
            handleEfffResponse(
              message.requestId || '',
              message.payload?.success ?? false,
              message.payload?.efffData,
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
// Error codes for smart card / digital signature operations
// These are used for structured error handling and user-friendly messages
export enum SignatureErrorCode {
  // Bridge connection errors
  BRIDGE_OFFLINE = 'SIGNATURE_BRIDGE_OFFLINE',
  BRIDGE_SEND_ERROR = 'SIGNATURE_SEND_ERROR',
  BRIDGE_TIMEOUT = 'SIGNATURE_TIMEOUT',
  
  // Smart card errors
  CARD_NOT_READY = 'SIGNATURE_CARD_NOT_READY',
  CARD_NOT_FOUND = 'SIGNATURE_CARD_NOT_FOUND',
  CARD_DISCONNECTED = 'SIGNATURE_CARD_DISCONNECTED',
  CARD_READER_ERROR = 'SIGNATURE_CARD_READER_ERROR',
  
  // PIN errors
  PIN_REQUIRED = 'SIGNATURE_PIN_REQUIRED',
  PIN_INCORRECT = 'SIGNATURE_PIN_INCORRECT',
  PIN_LOCKED = 'SIGNATURE_PIN_LOCKED',
  PIN_CANCELLED = 'SIGNATURE_PIN_CANCELLED',
  
  // Certificate errors
  CERT_EXPIRED = 'SIGNATURE_CERT_EXPIRED',
  CERT_NOT_FOUND = 'SIGNATURE_CERT_NOT_FOUND',
  CERT_INVALID = 'SIGNATURE_CERT_INVALID',
  CERT_REVOKED = 'SIGNATURE_CERT_REVOKED',
  
  // Signature errors
  SIGNATURE_FAILED = 'SIGNATURE_FAILED',
  SIGNATURE_CANCELLED = 'SIGNATURE_CANCELLED',
  
  // Generic error
  UNKNOWN_ERROR = 'SIGNATURE_UNKNOWN_ERROR'
}

// Map bridge error messages to structured error codes
export function parseSignatureError(errorMessage: string): { code: SignatureErrorCode; message: string } {
  const errorLower = errorMessage.toLowerCase();
  
  // PIN errors
  if (errorLower.includes('pin') && (errorLower.includes('wrong') || errorLower.includes('incorrect') || errorLower.includes('errato'))) {
    return { code: SignatureErrorCode.PIN_INCORRECT, message: 'PIN errato. Verificare il PIN e riprovare.' };
  }
  if (errorLower.includes('pin') && (errorLower.includes('locked') || errorLower.includes('bloccato'))) {
    return { code: SignatureErrorCode.PIN_LOCKED, message: 'PIN bloccato. Contattare SIAE per sbloccare la carta.' };
  }
  if (errorLower.includes('pin') && (errorLower.includes('cancel') || errorLower.includes('annull'))) {
    return { code: SignatureErrorCode.PIN_CANCELLED, message: 'Inserimento PIN annullato dall\'utente.' };
  }
  if (errorLower.includes('pin') && errorLower.includes('requir')) {
    return { code: SignatureErrorCode.PIN_REQUIRED, message: 'Inserimento PIN richiesto per la firma.' };
  }
  
  // Card errors
  if (errorLower.includes('card') && (errorLower.includes('not found') || errorLower.includes('non trovata'))) {
    return { code: SignatureErrorCode.CARD_NOT_FOUND, message: 'Carta SIAE non trovata. Inserire la carta nel lettore.' };
  }
  if (errorLower.includes('card') && (errorLower.includes('disconnect') || errorLower.includes('removed') || errorLower.includes('rimossa'))) {
    return { code: SignatureErrorCode.CARD_DISCONNECTED, message: 'Carta SIAE scollegata durante l\'operazione. Reinserire la carta.' };
  }
  if (errorLower.includes('reader') || errorLower.includes('lettore')) {
    return { code: SignatureErrorCode.CARD_READER_ERROR, message: 'Errore lettore smart card. Verificare la connessione.' };
  }
  
  // Certificate errors
  if (errorLower.includes('certificate') && (errorLower.includes('expired') || errorLower.includes('scadut'))) {
    return { code: SignatureErrorCode.CERT_EXPIRED, message: 'Certificato SIAE scaduto. Richiedere nuova carta di attivazione.' };
  }
  if (errorLower.includes('certificate') && (errorLower.includes('not found') || errorLower.includes('non trovato'))) {
    return { code: SignatureErrorCode.CERT_NOT_FOUND, message: 'Certificato non trovato sulla carta SIAE.' };
  }
  if (errorLower.includes('certificate') && (errorLower.includes('invalid') || errorLower.includes('non valido'))) {
    return { code: SignatureErrorCode.CERT_INVALID, message: 'Certificato SIAE non valido.' };
  }
  if (errorLower.includes('certificate') && (errorLower.includes('revoked') || errorLower.includes('revocato'))) {
    return { code: SignatureErrorCode.CERT_REVOKED, message: 'Certificato SIAE revocato. Contattare SIAE.' };
  }
  
  // Signature specific
  if (errorLower.includes('cancel') || errorLower.includes('annull')) {
    return { code: SignatureErrorCode.SIGNATURE_CANCELLED, message: 'Operazione di firma annullata.' };
  }
  if (errorLower.includes('fail') || errorLower.includes('error') || errorLower.includes('errore')) {
    return { code: SignatureErrorCode.SIGNATURE_FAILED, message: 'Firma digitale fallita. Riprovare.' };
  }
  
  // Default
  return { code: SignatureErrorCode.UNKNOWN_ERROR, message: errorMessage || 'Errore sconosciuto durante la firma.' };
}

// Signature audit log entry type
export interface SignatureAuditEntry {
  requestId: string;
  operation: 'xml_signature' | 'smime_signature';
  status: 'requested' | 'completed' | 'failed' | 'timeout';
  errorCode?: SignatureErrorCode;
  errorMessage?: string;
  xmlLength?: number;
  certificateSerial?: string;
  signerEmail?: string;
  requestedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

// In-memory audit log (last 100 entries) - for debugging and monitoring
const signatureAuditLog: SignatureAuditEntry[] = [];
const MAX_AUDIT_LOG_ENTRIES = 100;

function addSignatureAuditEntry(entry: SignatureAuditEntry): void {
  signatureAuditLog.unshift(entry);
  if (signatureAuditLog.length > MAX_AUDIT_LOG_ENTRIES) {
    signatureAuditLog.pop();
  }
  console.log(`[Bridge-Audit] ${entry.operation}: ${entry.status} - requestId=${entry.requestId}${entry.errorCode ? ` error=${entry.errorCode}` : ''}`);
}

export function getSignatureAuditLog(): SignatureAuditEntry[] {
  return [...signatureAuditLog];
}

// Pending XML signature requests waiting for response from desktop bridge
interface PendingSignatureRequest {
  resolve: (signedXml: XmlSignatureData) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
  auditEntry: SignatureAuditEntry;
}

export interface XmlSignatureData {
  // CAdES-BES format (nuovo - conforme SIAE)
  p7mBase64?: string;           // File P7M firmato in Base64 (CAdES-BES)
  format?: string;              // "CAdES-BES" per firma conforme
  algorithm?: string;           // "SHA-256" per hash conforme
  xmlContent?: string;          // XML originale (per riferimento)
  
  // Legacy XMLDSig format (obsoleto - mantenuto per retrocompatibilità)
  signedXml?: string;           // XML con firma interna (XMLDSig)
  signatureValue?: string;
  certificateData?: string;
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
  
  const requestId = generateSignatureRequestId();
  const requestedAt = new Date();
  
  // Create audit entry
  const auditEntry: SignatureAuditEntry = {
    requestId,
    operation: 'xml_signature',
    status: 'requested',
    xmlLength: xmlContent.length,
    requestedAt
  };
  
  // Check if bridge is connected
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] ERROR: Bridge not connected for XML signature`);
    auditEntry.status = 'failed';
    auditEntry.errorCode = SignatureErrorCode.BRIDGE_OFFLINE;
    auditEntry.errorMessage = 'App desktop Event4U non connessa';
    auditEntry.completedAt = new Date();
    auditEntry.durationMs = auditEntry.completedAt.getTime() - requestedAt.getTime();
    addSignatureAuditEntry(auditEntry);
    throw new Error(`${SignatureErrorCode.BRIDGE_OFFLINE}: App desktop Event4U non connessa. Impossibile firmare XML.`);
  }
  
  // Check if card is ready
  const cardReady = isCardReadyForSeals();
  console.log(`[Bridge] Card ready check for signature: ${JSON.stringify(cardReady)}`);
  if (!cardReady.ready) {
    auditEntry.status = 'failed';
    auditEntry.errorCode = SignatureErrorCode.CARD_NOT_READY;
    auditEntry.errorMessage = cardReady.error;
    auditEntry.completedAt = new Date();
    auditEntry.durationMs = auditEntry.completedAt.getTime() - requestedAt.getTime();
    addSignatureAuditEntry(auditEntry);
    throw new Error(`${SignatureErrorCode.CARD_NOT_READY}: ${cardReady.error}`);
  }
  
  console.log(`[Bridge] Requesting XML signature: requestId=${requestId}`);
  addSignatureAuditEntry(auditEntry);
  
  return new Promise<XmlSignatureData>((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      const pending = pendingSignatureRequests.get(requestId);
      if (pending) {
        pending.auditEntry.status = 'timeout';
        pending.auditEntry.errorCode = SignatureErrorCode.BRIDGE_TIMEOUT;
        pending.auditEntry.errorMessage = 'Timeout firma digitale XML';
        pending.auditEntry.completedAt = new Date();
        pending.auditEntry.durationMs = pending.auditEntry.completedAt.getTime() - pending.auditEntry.requestedAt.getTime();
        addSignatureAuditEntry(pending.auditEntry);
      }
      pendingSignatureRequests.delete(requestId);
      console.log(`[Bridge] XML signature request timeout: requestId=${requestId}`);
      reject(new Error(`${SignatureErrorCode.BRIDGE_TIMEOUT}: Timeout firma digitale XML. Riprovare.`));
    }, SIGNATURE_REQUEST_TIMEOUT);
    
    // Store pending request with audit entry
    pendingSignatureRequests.set(requestId, {
      resolve,
      reject,
      timeout,
      createdAt: requestedAt,
      auditEntry: { ...auditEntry }
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
      const pending = pendingSignatureRequests.get(requestId);
      if (pending) {
        pending.auditEntry.status = 'failed';
        pending.auditEntry.errorCode = SignatureErrorCode.BRIDGE_SEND_ERROR;
        pending.auditEntry.errorMessage = sendError.message;
        pending.auditEntry.completedAt = new Date();
        pending.auditEntry.durationMs = pending.auditEntry.completedAt.getTime() - pending.auditEntry.requestedAt.getTime();
        addSignatureAuditEntry(pending.auditEntry);
      }
      clearTimeout(timeout);
      pendingSignatureRequests.delete(requestId);
      reject(new Error(`${SignatureErrorCode.BRIDGE_SEND_ERROR}: Errore invio richiesta firma`));
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
  
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - pending.createdAt.getTime();
  
  if (success && signatureData) {
    // Determina il formato della firma (CAdES-BES o legacy XMLDSig)
    const isCAdES = !!signatureData.p7mBase64;
    console.log(`[Bridge] XML signature request completed: requestId=${requestId}, format=${isCAdES ? 'CAdES-BES' : 'XMLDSig'}, duration=${durationMs}ms`);
    
    // Update audit entry for success
    pending.auditEntry.status = 'completed';
    pending.auditEntry.completedAt = completedAt;
    pending.auditEntry.durationMs = durationMs;
    pending.auditEntry.certificateSerial = signatureData.certificateSerial;
    addSignatureAuditEntry(pending.auditEntry);
    
    // Supporta sia CAdES-BES (nuovo) che XMLDSig (legacy)
    pending.resolve({
      // CAdES-BES fields (nuovo formato conforme SIAE)
      p7mBase64: signatureData.p7mBase64,
      format: signatureData.format || (isCAdES ? 'CAdES-BES' : 'XMLDSig'),
      algorithm: signatureData.algorithm || (isCAdES ? 'SHA-256' : 'SHA-1'),
      xmlContent: signatureData.xmlContent,
      
      // Legacy XMLDSig fields (per retrocompatibilità)
      signedXml: signatureData.signedXml,
      signatureValue: signatureData.signatureValue || '',
      certificateData: signatureData.certificateData || '',
      signedAt: signatureData.signedAt || new Date().toISOString()
    });
  } else {
    // Parse the error for structured handling
    const parsedError = parseSignatureError(error || 'Errore firma digitale XML');
    console.log(`[Bridge] XML signature request failed: requestId=${requestId}, code=${parsedError.code}, error=${parsedError.message}`);
    
    // Update audit entry for failure
    pending.auditEntry.status = 'failed';
    pending.auditEntry.errorCode = parsedError.code;
    pending.auditEntry.errorMessage = parsedError.message;
    pending.auditEntry.completedAt = completedAt;
    pending.auditEntry.durationMs = durationMs;
    addSignatureAuditEntry(pending.auditEntry);
    
    pending.reject(new Error(`${parsedError.code}: ${parsedError.message}`));
  }
}

// Get pending signature requests count (for monitoring)
export function getPendingSignatureRequestsCount(): number {
  return pendingSignatureRequests.size;
}

// ==================== S/MIME EMAIL SIGNATURE BROKER ====================
// Per Allegato C SIAE - Provvedimento Agenzia Entrate 04/03/2008, sezione 1.6.2
// L'email deve essere firmata S/MIME versione 2 con la carta di attivazione SIAE
// Il mittente dell'email DEVE corrispondere all'email nel certificato della carta

export interface SmimeSignatureData {
  signedMime: string;           // Complete S/MIME signed message ready to send
  signerEmail: string;          // Email address from the signing certificate
  signerName: string;           // Common Name from the signing certificate  
  certificateSerial: string;    // Serial number of the signing certificate
  signedAt: string;             // ISO timestamp of when signature was created
}

interface PendingSmimeRequest {
  resolve: (data: SmimeSignatureData) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
  auditEntry: SignatureAuditEntry;
}

const pendingSmimeRequests = new Map<string, PendingSmimeRequest>();
const SMIME_REQUEST_TIMEOUT = 60000; // 60 seconds for S/MIME signature (larger emails)

function generateSmimeRequestId(): string {
  return `smime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parametri per S/MIME firmato con SMIMESignML
 */
interface SmimeSignatureParams {
  from: string;           // Email mittente (deve corrispondere al certificato)
  to: string;             // Email destinatario
  subject: string;        // Oggetto email
  body: string;           // Corpo email (text/html ASCII-7bit)
  attachmentBase64?: string; // Allegato in base64 (opzionale)
  attachmentName?: string;   // Nome file allegato (opzionale)
}

/**
 * Request S/MIME signature from the desktop bridge (SIAE smart card)
 * Uses SMIMESignML API from libSIAEp7.dll for proper RFC822 S/MIME creation.
 * 
 * @param params - S/MIME parameters (from, to, subject, body, attachment)
 * @param recipientEmail - Email address of the recipient (for logging/validation)
 * @returns Promise resolving to signed MIME message and certificate info
 * 
 * Per SIAE Allegato C 1.6.1:
 * - a.1. Il mittente deve essere titolare con carta di attivazione
 * - a.2. L'email deve essere firmata mediante la carta di attivazione
 * - a.3. L'indirizzo email del mittente deve corrispondere a quello nel certificato
 */
export async function requestSmimeSignature(
  params: SmimeSignatureParams | string, 
  recipientEmail: string
): Promise<SmimeSignatureData> {
  // Supporta sia il nuovo formato (object) che il vecchio (mimeContent string) per compatibilità
  const isNewFormat = typeof params === 'object';
  const mimeContent = isNewFormat ? '' : params;
  
  console.log(`[Bridge] requestSmimeSignature called, format=${isNewFormat ? 'SMIMESignML' : 'legacy'}, recipient=${recipientEmail}`);
  
  const requestId = generateSmimeRequestId();
  const requestedAt = new Date();
  
  // Create audit entry for S/MIME signature
  const auditEntry: SignatureAuditEntry = {
    requestId,
    operation: 'smime_signature',
    status: 'requested',
    xmlLength: mimeContent.length,
    requestedAt
  };
  
  // Check if bridge is connected
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] ERROR: Bridge not connected for S/MIME signature`);
    auditEntry.status = 'failed';
    auditEntry.errorCode = SignatureErrorCode.BRIDGE_OFFLINE;
    auditEntry.errorMessage = 'App desktop Event4U non connessa';
    auditEntry.completedAt = new Date();
    auditEntry.durationMs = auditEntry.completedAt.getTime() - requestedAt.getTime();
    addSignatureAuditEntry(auditEntry);
    throw new Error(`${SignatureErrorCode.BRIDGE_OFFLINE}: App desktop Event4U non connessa. Impossibile firmare email S/MIME.`);
  }
  
  // Check if card is ready
  const cardReady = isCardReadyForSeals();
  console.log(`[Bridge] Card ready check for S/MIME: ${JSON.stringify(cardReady)}`);
  if (!cardReady.ready) {
    auditEntry.status = 'failed';
    auditEntry.errorCode = SignatureErrorCode.CARD_NOT_READY;
    auditEntry.errorMessage = cardReady.error;
    auditEntry.completedAt = new Date();
    auditEntry.durationMs = auditEntry.completedAt.getTime() - requestedAt.getTime();
    addSignatureAuditEntry(auditEntry);
    throw new Error(`${SignatureErrorCode.CARD_NOT_READY}: ${cardReady.error}`);
  }
  
  console.log(`[Bridge] Requesting S/MIME signature: requestId=${requestId}`);
  addSignatureAuditEntry(auditEntry);
  
  return new Promise<SmimeSignatureData>((resolve, reject) => {
    // Set timeout
    const timeout = setTimeout(() => {
      const pending = pendingSmimeRequests.get(requestId);
      if (pending) {
        pending.auditEntry.status = 'timeout';
        pending.auditEntry.errorCode = SignatureErrorCode.BRIDGE_TIMEOUT;
        pending.auditEntry.errorMessage = 'Timeout firma S/MIME email';
        pending.auditEntry.completedAt = new Date();
        pending.auditEntry.durationMs = pending.auditEntry.completedAt.getTime() - pending.auditEntry.requestedAt.getTime();
        addSignatureAuditEntry(pending.auditEntry);
      }
      pendingSmimeRequests.delete(requestId);
      console.log(`[Bridge] S/MIME signature request timeout: requestId=${requestId}`);
      reject(new Error(`${SignatureErrorCode.BRIDGE_TIMEOUT}: Timeout firma S/MIME email. Riprovare.`));
    }, SMIME_REQUEST_TIMEOUT);
    
    // Store pending request with audit entry
    pendingSmimeRequests.set(requestId, {
      resolve,
      reject,
      timeout,
      createdAt: requestedAt,
      auditEntry: { ...auditEntry }
    });
    
    // Send request to bridge
    try {
      let smimePayload: any;
      
      if (isNewFormat) {
        // Nuovo formato: SMIMESignML con parametri separati
        const p = params as SmimeSignatureParams;
        smimePayload = {
          from: p.from,
          to: p.to,
          subject: p.subject,
          body: p.body,
          attachmentBase64: p.attachmentBase64 || '',
          attachmentName: p.attachmentName || '',
          recipientEmail,
          timestamp: new Date().toISOString()
        };
        console.log(`[Bridge] Using SMIMESignML format: from=${p.from}, to=${p.to}, subject=${p.subject?.substring(0, 50)}...`);
      } else {
        // Vecchio formato: mimeContent (legacy, deprecato)
        smimePayload = {
          mimeContent,
          recipientEmail,
          timestamp: new Date().toISOString()
        };
        console.log(`[Bridge] WARNING: Using legacy mimeContent format - may cause SIAE errors`);
      }
      
      const smimeMessage = {
        type: 'REQUEST_SMIME_SIGNATURE',
        requestId,
        payload: smimePayload
      };
      console.log(`[Bridge] Sending S/MIME signature request to bridge: requestId=${requestId}`);
      globalBridge!.ws.send(JSON.stringify(smimeMessage));
      console.log(`[Bridge] S/MIME signature request sent successfully, waiting for response...`);
    } catch (sendError: any) {
      console.log(`[Bridge] ERROR sending S/MIME signature request: ${sendError.message}`);
      const pending = pendingSmimeRequests.get(requestId);
      if (pending) {
        pending.auditEntry.status = 'failed';
        pending.auditEntry.errorCode = SignatureErrorCode.BRIDGE_SEND_ERROR;
        pending.auditEntry.errorMessage = sendError.message;
        pending.auditEntry.completedAt = new Date();
        pending.auditEntry.durationMs = pending.auditEntry.completedAt.getTime() - pending.auditEntry.requestedAt.getTime();
        addSignatureAuditEntry(pending.auditEntry);
      }
      clearTimeout(timeout);
      pendingSmimeRequests.delete(requestId);
      reject(new Error(`${SignatureErrorCode.BRIDGE_SEND_ERROR}: Errore invio richiesta firma S/MIME`));
    }
  });
}

// Handle S/MIME signature response from bridge
export function handleSmimeSignatureResponse(
  requestId: string, 
  success: boolean, 
  signatureData?: any, 
  error?: string
): void {
  const pending = pendingSmimeRequests.get(requestId);
  if (!pending) {
    console.log(`[Bridge] No pending request for S/MIME signature response: requestId=${requestId}`);
    return;
  }
  
  clearTimeout(pending.timeout);
  pendingSmimeRequests.delete(requestId);
  
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - pending.createdAt.getTime();
  
  if (success && signatureData) {
    console.log(`[Bridge] S/MIME signature request completed: requestId=${requestId}, signerEmail=${signatureData.signerEmail}, duration=${durationMs}ms`);
    
    // Update audit entry for success
    pending.auditEntry.status = 'completed';
    pending.auditEntry.completedAt = completedAt;
    pending.auditEntry.durationMs = durationMs;
    pending.auditEntry.signerEmail = signatureData.signerEmail;
    pending.auditEntry.certificateSerial = signatureData.certificateSerial;
    addSignatureAuditEntry(pending.auditEntry);
    
    pending.resolve({
      signedMime: signatureData.signedMime,
      signerEmail: signatureData.signerEmail || '',
      signerName: signatureData.signerName || '',
      certificateSerial: signatureData.certificateSerial || '',
      signedAt: signatureData.signedAt || new Date().toISOString()
    });
  } else {
    // Parse the error for structured handling
    const parsedError = parseSignatureError(error || 'Errore firma S/MIME email');
    console.log(`[Bridge] S/MIME signature request failed: requestId=${requestId}, code=${parsedError.code}, error=${parsedError.message}`);
    
    // Update audit entry for failure
    pending.auditEntry.status = 'failed';
    pending.auditEntry.errorCode = parsedError.code;
    pending.auditEntry.errorMessage = parsedError.message;
    pending.auditEntry.completedAt = completedAt;
    pending.auditEntry.durationMs = durationMs;
    addSignatureAuditEntry(pending.auditEntry);
    
    pending.reject(new Error(`${parsedError.code}: ${parsedError.message}`));
  }
}

// Get pending S/MIME requests count (for monitoring)
export function getPendingSmimeRequestsCount(): number {
  return pendingSmimeRequests.size;
}

/**
 * Get the signer email from the activation card certificate (cached from bridge status)
 * Returns null if bridge is not connected or card not ready
 * 
 * NOTA: Il bridge desktop può inviare i dati in diversi formati:
 * - { type: 'status', data: { cardEmail: '...' } }
 * - { type: 'status', payload: { cardEmail: '...' } }
 * - { data: { payload: { cardEmail: '...' } } }
 */
export function getCardSignerEmail(): string | null {
  if (!cachedBridgeStatus) return null;
  
  // Cerca l'email del certificato in tutte le possibili posizioni
  // Il bridge desktop può inviare dati in formati diversi
  const sources = [
    cachedBridgeStatus.data?.payload,
    cachedBridgeStatus.payload?.data,
    cachedBridgeStatus.data,
    cachedBridgeStatus.payload,
    cachedBridgeStatus
  ];
  
  for (const source of sources) {
    if (source) {
      const email = source.cardEmail || source.certificateEmail || source.signerEmail || source.email;
      if (email && typeof email === 'string' && email.includes('@')) {
        console.log(`[Bridge] Found card signer email: ${email}`);
        return email;
      }
    }
  }
  
  console.log(`[Bridge] Card signer email not found in cachedBridgeStatus: ${JSON.stringify(cachedBridgeStatus)}`);
  return null;
}

// ==================== EFFF Card Data Request ====================
// Lettura file EFFF dalla Smart Card SIAE
// Conforme a Descrizione_contenuto_SmartCardTestxBA-V102.pdf

interface PendingEfffRequest {
  resolve: (data: SiaeCardEfffData) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

const pendingEfffRequests = new Map<string, PendingEfffRequest>();
const EFFF_REQUEST_TIMEOUT = 10000; // 10 seconds

function generateEfffRequestId(): string {
  return `efff_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Richiede la lettura del file EFFF dalla Smart Card tramite Desktop Bridge
 * Il file EFFF contiene 15 campi anagrafici incluso l'indirizzo email SIAE
 */
export async function requestCardEfffData(): Promise<SiaeCardEfffData> {
  console.log(`[Bridge] requestCardEfffData called`);
  
  // Check if bridge is connected
  if (!globalBridge || globalBridge.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Bridge] ERROR: Bridge not connected for EFFF read`);
    throw new Error('EFFF_BRIDGE_OFFLINE: App desktop Event4U non connessa. Impossibile leggere dati Smart Card.');
  }
  
  // Check if card is ready
  const cardReady = isCardReadyForSeals();
  console.log(`[Bridge] Card ready check for EFFF: ${JSON.stringify(cardReady)}`);
  if (!cardReady.ready) {
    throw new Error(`EFFF_CARD_NOT_READY: ${cardReady.error}`);
  }
  
  const requestId = generateEfffRequestId();
  
  console.log(`[Bridge] Requesting EFFF data: requestId=${requestId}`);
  
  return new Promise<SiaeCardEfffData>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingEfffRequests.delete(requestId);
      console.log(`[Bridge] EFFF request timeout: requestId=${requestId}`);
      reject(new Error('EFFF_TIMEOUT: Timeout lettura dati Smart Card. Riprovare.'));
    }, EFFF_REQUEST_TIMEOUT);
    
    pendingEfffRequests.set(requestId, {
      resolve,
      reject,
      timeout,
      createdAt: new Date()
    });
    
    try {
      globalBridge!.ws.send(JSON.stringify({
        type: 'READ_EFFF',
        requestId
      }));
      console.log(`[Bridge] EFFF request sent to bridge: requestId=${requestId}`);
    } catch (sendError: any) {
      clearTimeout(timeout);
      pendingEfffRequests.delete(requestId);
      reject(new Error(`EFFF_SEND_ERROR: Errore invio richiesta lettura EFFF: ${sendError.message}`));
    }
  });
}

/**
 * Gestisce la risposta EFFF dal Desktop Bridge
 */
export function handleEfffResponse(
  requestId: string,
  success: boolean,
  efffData?: Partial<SiaeCardEfffData>,
  error?: string
): void {
  const pending = pendingEfffRequests.get(requestId);
  if (!pending) {
    console.log(`[Bridge] No pending request for EFFF response: requestId=${requestId}`);
    return;
  }
  
  clearTimeout(pending.timeout);
  pendingEfffRequests.delete(requestId);
  
  const durationMs = Date.now() - pending.createdAt.getTime();
  
  if (success && efffData) {
    console.log(`[Bridge] EFFF read completed: requestId=${requestId}, systemId=${efffData.systemId}, duration=${durationMs}ms`);
    
    // Costruisci oggetto EFFF completo con valori default
    const fullEfffData: SiaeCardEfffData = {
      systemId: efffData.systemId || '',
      contactName: efffData.contactName || '',
      contactLastName: efffData.contactLastName || '',
      contactCodFis: efffData.contactCodFis || '',
      systemLocation: efffData.systemLocation || '',
      contactEmail: efffData.contactEmail || '',
      siaeEmail: efffData.siaeEmail || '',
      partnerName: efffData.partnerName || '',
      partnerCodFis: efffData.partnerCodFis || '',
      partnerRegistroImprese: efffData.partnerRegistroImprese || '',
      partnerNation: efffData.partnerNation || 'IT',
      systemApprCode: efffData.systemApprCode || '',
      systemApprDate: efffData.systemApprDate || '',
      contactRepresentationType: efffData.contactRepresentationType || 'I',
      userDataFileVersion: efffData.userDataFileVersion || '1.0.0'
    };
    
    pending.resolve(fullEfffData);
  } else {
    console.log(`[Bridge] EFFF read failed: requestId=${requestId}, error=${error}`);
    pending.reject(new Error(`EFFF_READ_ERROR: ${error || 'Errore lettura file EFFF dalla Smart Card'}`));
  }
}

/**
 * Restituisce i dati EFFF dalla cache del bridge status (se disponibili)
 * Più veloce di requestCardEfffData ma potrebbe essere stale
 */
export function getCachedEfffData(): Partial<SiaeCardEfffData> | null {
  if (!cachedBridgeStatus?.payload) return null;
  
  const payload = cachedBridgeStatus.payload;
  
  // Il Desktop Bridge può esporre i dati EFFF nel payload di status
  if (payload.efffData) {
    return payload.efffData;
  }
  
  // Fallback: costruisci da campi singoli se disponibili
  if (payload.systemId || payload.partnerName) {
    return {
      systemId: payload.systemId,
      partnerName: payload.partnerName,
      partnerCodFis: payload.partnerCodFis || payload.taxId,
      siaeEmail: payload.siaeEmail,
      contactEmail: payload.contactEmail || payload.cardEmail
    };
  }
  
  return null;
}

/**
 * Verifica se la Smart Card è di TEST analizzando il systemId
 */
export function isTestCardFromCache(): boolean | null {
  const efff = getCachedEfffData();
  if (!efff?.systemId) return null;
  return efff.systemId.toUpperCase().startsWith('P');
}

/**
 * Ottiene l'email SIAE dalla Smart Card (da cache o richiesta diretta)
 */
export async function getSiaeEmailFromCard(): Promise<string | null> {
  // Prima prova dalla cache
  const cached = getCachedEfffData();
  if (cached?.siaeEmail) {
    return cached.siaeEmail;
  }
  
  // Se non in cache, prova a leggere dalla carta
  try {
    const efff = await requestCardEfffData();
    return efff.siaeEmail || null;
  } catch (error) {
    console.log(`[Bridge] Failed to get SIAE email from card: ${error}`);
    return null;
  }
}
