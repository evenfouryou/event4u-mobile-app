import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { db } from './db';
import { sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { setWebSocketBroadcast, type SeatStatusUpdate } from './hold-service';

interface TicketingClient {
  ws: WebSocket;
  eventId: string;
  sessionId: string;
  connectedAt: Date;
  lastPing: Date;
}

const eventSubscribers = new Map<string, TicketingClient[]>();

const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 35000;

export function setupTicketingWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    if (url.pathname === '/ws/ticketing') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    console.log('[Ticketing WS] New connection');
    
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const eventId = url.searchParams.get('eventId');
    
    if (!eventId) {
      console.log('[Ticketing WS] No eventId provided, closing connection');
      ws.close(1008, 'eventId required');
      return;
    }

    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionCookie = cookies['connect.sid'];
    let sessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (sessionCookie) {
      const cleanSessionId = decodeURIComponent(sessionCookie).replace(/^s:/, '').split('.')[0];
      sessionId = cleanSessionId;
    }

    const clientId = request.headers['x-client-id'] as string;
    if (clientId) {
      sessionId = clientId;
    }

    const client: TicketingClient = {
      ws,
      eventId,
      sessionId,
      connectedAt: new Date(),
      lastPing: new Date(),
    };

    addSubscriber(eventId, client);

    ws.send(JSON.stringify({
      type: 'connected',
      eventId,
      sessionId,
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(client, message);
      } catch (error) {
        console.error('[Ticketing WS] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[Ticketing WS] Client disconnected from event ${eventId}`);
      removeSubscriber(eventId, client);
    });

    ws.on('error', (error) => {
      console.error('[Ticketing WS] WebSocket error:', error);
      removeSubscriber(eventId, client);
    });

    ws.on('pong', () => {
      client.lastPing = new Date();
    });
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });

    eventSubscribers.forEach((clients, eventId) => {
      const now = Date.now();
      const activeClients = clients.filter((client) => {
        if (now - client.lastPing.getTime() > CONNECTION_TIMEOUT) {
          console.log(`[Ticketing WS] Removing stale client from event ${eventId}`);
          client.ws.terminate();
          return false;
        }
        return true;
      });
      
      if (activeClients.length === 0) {
        eventSubscribers.delete(eventId);
      } else {
        eventSubscribers.set(eventId, activeClients);
      }
    });
  }, HEARTBEAT_INTERVAL);

  setWebSocketBroadcast(broadcastSeatStatus);

  console.log('[Ticketing WS] WebSocket server initialized');
}

function addSubscriber(eventId: string, client: TicketingClient): void {
  const subscribers = eventSubscribers.get(eventId) || [];
  subscribers.push(client);
  eventSubscribers.set(eventId, subscribers);
  console.log(`[Ticketing WS] Client subscribed to event ${eventId} (total: ${subscribers.length})`);
}

function removeSubscriber(eventId: string, client: TicketingClient): void {
  const subscribers = eventSubscribers.get(eventId) || [];
  const index = subscribers.findIndex(c => c.ws === client.ws);
  if (index !== -1) {
    subscribers.splice(index, 1);
    if (subscribers.length === 0) {
      eventSubscribers.delete(eventId);
    } else {
      eventSubscribers.set(eventId, subscribers);
    }
    console.log(`[Ticketing WS] Client unsubscribed from event ${eventId} (remaining: ${subscribers.length})`);
  }
}

function handleMessage(client: TicketingClient, message: any): void {
  switch (message.type) {
    case 'ping':
      client.lastPing = new Date();
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    case 'subscribe':
      if (message.eventId && message.eventId !== client.eventId) {
        removeSubscriber(client.eventId, client);
        client.eventId = message.eventId;
        addSubscriber(message.eventId, client);
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          eventId: message.eventId,
          timestamp: new Date().toISOString(),
        }));
      }
      break;

    case 'request_status':
      client.ws.send(JSON.stringify({
        type: 'status_request_ack',
        eventId: client.eventId,
        message: 'Use HTTP GET /api/events/:eventId/seats/status for full status',
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      console.log(`[Ticketing WS] Unknown message type: ${message.type}`);
  }
}

export function broadcastSeatStatus(eventId: string, update: SeatStatusUpdate): void {
  const subscribers = eventSubscribers.get(eventId);
  
  if (!subscribers || subscribers.length === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'seat_status',
    ...update,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  subscribers.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      sentCount++;
    }
  });

  console.log(`[Ticketing WS] Broadcasted seat status to ${sentCount}/${subscribers.length} clients for event ${eventId}`);
}

export function broadcastToEvent(eventId: string, messageType: string, payload: any): void {
  const subscribers = eventSubscribers.get(eventId);
  
  if (!subscribers || subscribers.length === 0) {
    return;
  }

  const message = JSON.stringify({
    type: messageType,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  subscribers.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export function getEventSubscriberCount(eventId: string): number {
  return eventSubscribers.get(eventId)?.length || 0;
}

export function getAllStats(): { eventId: string; subscribers: number }[] {
  const stats: { eventId: string; subscribers: number }[] = [];
  eventSubscribers.forEach((clients, eventId) => {
    stats.push({ eventId, subscribers: clients.length });
  });
  return stats;
}
