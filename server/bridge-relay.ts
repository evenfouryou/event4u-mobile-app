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
    
    if (url.pathname === '/ws/bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('[Bridge] New WebSocket connection');
    
    let connectionType: 'bridge' | 'client' | null = null;
    let connectionInfo: { userId?: string; companyId?: string } = {};

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
        console.log(`[Bridge] Client connected: userId=${connectionInfo.userId}, companyId=${connectionInfo.companyId}, role=${user.role}`);
        
        // Super admin doesn't have companyId, but should still receive bridge status
        // Use a special "super_admin" company key for routing
        const effectiveCompanyId = connectionInfo.companyId || (user.role === 'super_admin' ? 'super_admin' : null);
        
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

        if (message.type === 'pong') {
          if (connectionType === 'bridge' && globalBridge) {
            globalBridge.lastPing = new Date();
          } else if (connectionType === 'client' && connectionInfo.companyId && connectionInfo.userId) {
            const clients = activeClients.get(connectionInfo.companyId);
            if (clients) {
              const client = clients.find(c => c.userId === connectionInfo.userId);
              if (client) {
                client.lastPing = new Date();
              }
            }
          }
          return;
        }

        if (connectionType === 'client' && connectionInfo.companyId) {
          // Forward to global bridge with company info for routing response
          forwardToBridge(connectionInfo.companyId, message, connectionInfo.userId);
        } else if (connectionType === 'bridge') {
          // Bridge response - route to the client that made the request
          if (message.toCompanyId) {
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
        // Notify ALL clients that bridge disconnected
        notifyAllClientsOfBridgeStatus(false);
        console.log(`[Bridge] Global bridge disconnected`);
      } else if (connectionType === 'client' && connectionInfo.companyId && connectionInfo.userId) {
        removeClient(connectionInfo.companyId, connectionInfo.userId);
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
