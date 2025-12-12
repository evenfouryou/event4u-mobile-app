import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { db } from './db';
import { sessions, printerAgents, printJobs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

interface PrintAgentConnection {
  ws: WebSocket;
  agentId: string;
  companyId: string;
  deviceName: string;
  connectedAt: Date;
  lastPing: Date;
}

interface WebClientConnection {
  ws: WebSocket;
  userId: string;
  companyId: string;
  connectedAt: Date;
}

const activeAgents = new Map<string, PrintAgentConnection>();
const activeClients = new Map<string, WebClientConnection[]>();

const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 120000; // 2 minutes - allows for background/minimized apps

export function setupPrintRelay(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    if (url.pathname === '/ws/print-agent') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('[PrintRelay] New WebSocket connection');
    
    let connectionType: 'agent' | 'client' | null = null;
    let connectionInfo: { agentId?: string; userId?: string; companyId?: string } = {};

    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies['connect.sid'];

    if (sessionId) {
      const session = await getSessionData(sessionId);
      if (session?.passport?.user) {
        connectionType = 'client';
        const user = session.passport.user;
        connectionInfo = {
          userId: user.id || user.claims?.sub,
          companyId: user.companyId
        };
        
        if (connectionInfo.companyId && connectionInfo.userId) {
          addClient(connectionInfo.companyId, connectionInfo.userId, ws);
          
          const companyAgents = Array.from(activeAgents.values())
            .filter(a => a.companyId === connectionInfo.companyId);
          
          ws.send(JSON.stringify({
            type: 'agents_status',
            agents: companyAgents.map(a => ({
              agentId: a.agentId,
              deviceName: a.deviceName,
              status: 'online'
            }))
          }));
        }
      }
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth' && !connectionType) {
          const result = await authenticateAgent(message.payload);
          if (result) {
            connectionType = 'agent';
            connectionInfo = {
              agentId: result.agentId,
              companyId: result.companyId
            };
            
            activeAgents.set(result.agentId, {
              ws,
              agentId: result.agentId,
              companyId: result.companyId,
              deviceName: message.payload.deviceName,
              connectedAt: new Date(),
              lastPing: new Date()
            });

            ws.send(JSON.stringify({ type: 'auth_success', agentId: result.agentId }));
            
            console.log(`[PrintRelay] Agent authenticated: ${result.agentId}`);
            
            broadcastToClients(result.companyId, {
              type: 'agent_online',
              agentId: result.agentId,
              deviceName: message.payload.deviceName
            });

            await updateAgentStatus(result.agentId, 'online');

            await sendPendingJobs(result.agentId, ws);
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', error: 'Authentication failed' }));
          }
          return;
        }

        if (connectionType === 'agent' && connectionInfo.agentId) {
          handleAgentMessage(connectionInfo.agentId, connectionInfo.companyId!, message);
        } else if (connectionType === 'client' && connectionInfo.companyId) {
          handleClientMessage(connectionInfo.companyId, connectionInfo.userId!, message);
        }
      } catch (error) {
        console.error('[PrintRelay] Message parse error:', error);
      }
    });

    ws.on('close', () => {
      if (connectionType === 'agent' && connectionInfo.agentId) {
        const agent = activeAgents.get(connectionInfo.agentId);
        if (agent) {
          activeAgents.delete(connectionInfo.agentId);
          
          broadcastToClients(agent.companyId, {
            type: 'agent_offline',
            agentId: agent.agentId
          });

          updateAgentStatus(agent.agentId, 'offline').catch(console.error);
        }
        console.log(`[PrintRelay] Agent disconnected: ${connectionInfo.agentId}`);
      } else if (connectionType === 'client' && connectionInfo.companyId && connectionInfo.userId) {
        removeClient(connectionInfo.companyId, connectionInfo.userId, ws);
      }
    });

    ws.on('pong', () => {
      if (connectionType === 'agent' && connectionInfo.agentId) {
        const agent = activeAgents.get(connectionInfo.agentId);
        if (agent) {
          agent.lastPing = new Date();
        }
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    
    activeAgents.forEach((agent, agentId) => {
      if (now - agent.lastPing.getTime() > CONNECTION_TIMEOUT) {
        console.log(`[PrintRelay] Agent timed out: ${agentId}`);
        agent.ws.terminate();
        activeAgents.delete(agentId);
        broadcastToClients(agent.companyId, {
          type: 'agent_offline',
          agentId
        });
        updateAgentStatus(agentId, 'offline').catch(console.error);
      } else {
        try {
          agent.ws.ping();
        } catch (e) {}
      }
    });
  }, HEARTBEAT_INTERVAL);

  console.log('[PrintRelay] WebSocket relay for print agents initialized');
}

async function getSessionData(sessionId: string): Promise<any> {
  try {
    const cleanId = sessionId.replace(/^s:/, '').split('.')[0];
    
    const result = await db.select().from(sessions).where(eq(sessions.sid, cleanId)).limit(1);
    
    if (result.length > 0 && result[0].sess) {
      return result[0].sess;
    }
    return null;
  } catch (error) {
    console.error('[PrintRelay] Session lookup error:', error);
    return null;
  }
}

async function authenticateAgent(payload: any): Promise<{ agentId: string; companyId: string } | null> {
  const { token } = payload;
  
  if (!token) return null;
  
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find agent by token only - companyId comes from database (trusted source)
    const agents = await db.select().from(printerAgents)
      .where(eq(printerAgents.authToken, hashedToken))
      .limit(1);
    
    if (agents.length > 0) {
      return {
        agentId: agents[0].id,
        companyId: agents[0].companyId
      };
    }
    
    return null;
  } catch (error) {
    console.error('[PrintRelay] Auth error:', error);
    return null;
  }
}

async function updateAgentStatus(agentId: string, status: string): Promise<void> {
  try {
    await db.update(printerAgents)
      .set({ 
        status, 
        lastHeartbeat: new Date(),
        updatedAt: new Date()
      })
      .where(eq(printerAgents.id, agentId));
  } catch (error) {
    console.error('[PrintRelay] Update status error:', error);
  }
}

async function sendPendingJobs(agentId: string, ws: WebSocket): Promise<void> {
  try {
    const jobs = await db.select().from(printJobs)
      .where(and(
        eq(printJobs.agentId, agentId),
        eq(printJobs.status, 'pending')
      ));
    
    for (const job of jobs) {
      ws.send(JSON.stringify({
        type: 'print_job',
        payload: {
          id: job.id,
          profileId: job.profileId,
          payload: job.payload
        }
      }));
    }
    
    if (jobs.length > 0) {
      console.log(`[PrintRelay] Sent ${jobs.length} pending jobs to agent ${agentId}`);
    }
  } catch (error) {
    console.error('[PrintRelay] Send pending jobs error:', error);
  }
}

function handleAgentMessage(agentId: string, companyId: string, message: any): void {
  switch (message.type) {
    case 'heartbeat':
      const agent = activeAgents.get(agentId);
      if (agent) {
        agent.lastPing = new Date();
      }
      updateAgentStatus(agentId, message.payload?.status || 'online').catch(console.error);
      break;

    case 'job_status':
      handleJobStatusUpdate(message.payload);
      broadcastToClients(companyId, {
        type: 'job_status',
        ...message.payload
      });
      break;

    case 'pong':
      break;

    default:
      console.log(`[PrintRelay] Unknown agent message: ${message.type}`);
  }
}

async function handleJobStatusUpdate(payload: any): Promise<void> {
  const { jobId, status, errorMessage } = payload;
  
  try {
    const updates: any = { status };
    if (status === 'completed') {
      updates.printedAt = new Date();
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
    
    await db.update(printJobs)
      .set(updates)
      .where(eq(printJobs.id, jobId));
  } catch (error) {
    console.error('[PrintRelay] Job status update error:', error);
  }
}

function handleClientMessage(companyId: string, userId: string, message: any): void {
  switch (message.type) {
    case 'print':
      const targetAgentId = message.agentId;
      const agent = activeAgents.get(targetAgentId);
      
      if (agent && agent.companyId === companyId) {
        agent.ws.send(JSON.stringify({
          type: 'print_job',
          payload: message.payload
        }));
      } else {
        console.log(`[PrintRelay] Agent not found or wrong company: ${targetAgentId}`);
      }
      break;

    default:
      console.log(`[PrintRelay] Unknown client message: ${message.type}`);
  }
}

function addClient(companyId: string, userId: string, ws: WebSocket): void {
  const clients = activeClients.get(companyId) || [];
  clients.push({
    ws,
    userId,
    companyId,
    connectedAt: new Date()
  });
  activeClients.set(companyId, clients);
  console.log(`[PrintRelay] Client added: company=${companyId}, userId=${userId}`);
}

function removeClient(companyId: string, userId: string, ws: WebSocket): void {
  const clients = activeClients.get(companyId) || [];
  const filtered = clients.filter(c => c.ws !== ws);
  activeClients.set(companyId, filtered);
  console.log(`[PrintRelay] Client removed: company=${companyId}, userId=${userId}`);
}

function broadcastToClients(companyId: string, message: any): void {
  const clients = activeClients.get(companyId) || [];
  const json = JSON.stringify(message);
  
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(json);
      } catch (e) {}
    }
  });
}

export function sendPrintJobToAgent(agentId: string, job: any): boolean {
  const agent = activeAgents.get(agentId);
  if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    agent.ws.send(JSON.stringify({
      type: 'print_job',
      payload: job
    }));
    return true;
  } catch (error) {
    console.error('[PrintRelay] Send job error:', error);
    return false;
  }
}

export function getConnectedAgents(companyId: string): Array<{ agentId: string; deviceName: string }> {
  return Array.from(activeAgents.values())
    .filter(a => a.companyId === companyId)
    .map(a => ({
      agentId: a.agentId,
      deviceName: a.deviceName
    }));
}
