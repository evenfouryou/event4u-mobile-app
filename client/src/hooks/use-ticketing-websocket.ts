import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SeatStatusUpdate {
  eventId: string;
  sectorId?: string;
  zoneId?: string;
  seatId?: string;
  status: 'available' | 'held' | 'sold' | 'blocked';
  holdId?: string;
  expiresAt?: string;
  sessionId?: string;
  timestamp: string;
}

interface TicketingWebSocketState {
  isConnected: boolean;
  sessionId: string | null;
  lastUpdate: SeatStatusUpdate | null;
  error: string | null;
}

interface UseTicketingWebSocketOptions {
  eventId: string;
  onStatusUpdate?: (update: SeatStatusUpdate) => void;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  enabled?: boolean;
}

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECTS = 5;

export function useTicketingWebSocket(options: UseTicketingWebSocketOptions) {
  const { eventId, onStatusUpdate, onConnected, onDisconnected, enabled = true } = options;
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<TicketingWebSocketState>({
    isConnected: false,
    sessionId: null,
    lastUpdate: null,
    error: null,
  });

  const getClientId = useCallback(() => {
    let clientId = localStorage.getItem('ticketing_client_id');
    if (!clientId) {
      clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ticketing_client_id', clientId);
    }
    return clientId;
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !eventId) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ticketing?eventId=${eventId}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Ticketing WS] Connected to event:', eventId);
        reconnectCountRef.current = 0;
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              setState(prev => ({ ...prev, sessionId: message.sessionId }));
              onConnected?.(message.sessionId);
              break;

            case 'seat_status':
              const update: SeatStatusUpdate = message;
              setState(prev => ({ ...prev, lastUpdate: update }));
              onStatusUpdate?.(update);
              
              queryClient.invalidateQueries({ 
                queryKey: ['/api/events', eventId, 'seats', 'status'] 
              });
              break;

            case 'pong':
              break;

            case 'subscribed':
              console.log('[Ticketing WS] Subscribed to event:', message.eventId);
              break;

            default:
              console.log('[Ticketing WS] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[Ticketing WS] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[Ticketing WS] Disconnected:', event.code, event.reason);
        wsRef.current = null;
        setState(prev => ({ ...prev, isConnected: false }));
        onDisconnected?.();

        if (enabled && reconnectCountRef.current < WS_MAX_RECONNECTS) {
          reconnectCountRef.current++;
          console.log(`[Ticketing WS] Reconnecting in ${WS_RECONNECT_DELAY}ms... (attempt ${reconnectCountRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
        } else if (reconnectCountRef.current >= WS_MAX_RECONNECTS) {
          setState(prev => ({ 
            ...prev, 
            error: 'Connessione persa. Ricarica la pagina per riconnetterti.' 
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('[Ticketing WS] Error:', error);
        setState(prev => ({ ...prev, error: 'Errore di connessione' }));
      };
    } catch (error) {
      console.error('[Ticketing WS] Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, error: 'Impossibile connettersi al server' }));
    }
  }, [eventId, enabled, onStatusUpdate, onConnected, onDisconnected, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    if (enabled && eventId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [eventId, enabled, connect, disconnect]);

  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(sendPing, 25000);
    return () => clearInterval(pingInterval);
  }, [state.isConnected, sendPing]);

  return {
    ...state,
    connect,
    disconnect,
    sendPing,
    clientId: getClientId(),
  };
}

export function useSeatHolds(eventId: string) {
  const [seatStatuses, setSeatStatuses] = useState<Map<string, SeatStatusUpdate>>(new Map());

  const handleStatusUpdate = useCallback((update: SeatStatusUpdate) => {
    setSeatStatuses(prev => {
      const next = new Map(prev);
      const key = update.seatId || update.zoneId || '';
      if (key) {
        next.set(key, update);
      }
      return next;
    });
  }, []);

  const getSeatStatus = useCallback((seatId: string) => {
    return seatStatuses.get(seatId);
  }, [seatStatuses]);

  const getZoneStatus = useCallback((zoneId: string) => {
    return seatStatuses.get(zoneId);
  }, [seatStatuses]);

  const ws = useTicketingWebSocket({
    eventId,
    onStatusUpdate: handleStatusUpdate,
    enabled: !!eventId,
  });

  return {
    ...ws,
    seatStatuses,
    getSeatStatus,
    getZoneStatus,
  };
}
