/**
 * Smart Card Service per MiniLector EVO V3 (Bit4id)
 * Gestisce la comunicazione con l'app desktop Event4U via WebSocket Relay
 * Connessione tramite server relay su wss://manage.eventfouryou.com/ws/bridge
 */

import { useState, useEffect } from 'react';

export interface SmartCardStatus {
  connected: boolean;
  readerDetected: boolean;
  cardInserted: boolean;
  readerName: string | null;
  cardAtr: string | null;
  cardSerial: string | null;
  cardType: string | null;
  lastCheck: Date;
  error: string | null;
  bridgeConnected: boolean;
  canEmitRealSeals: boolean;
  demoMode: boolean;
  relayConnected: boolean;
}

export interface FiscalSeal {
  sealNumber: string;
  timestamp: Date;
  valid: boolean;
}

type StatusChangeCallback = (status: SmartCardStatus) => void;

class SmartCardService {
  private static instance: SmartCardService;
  private status: SmartCardStatus;
  private listeners: Set<StatusChangeCallback> = new Set();
  private ws: WebSocket | null = null;
  private wsReconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  private readonly WS_RECONNECT_DELAY = 5000;
  private readonly HEARTBEAT_INTERVAL = 30000;

  private constructor() {
    this.status = {
      connected: false,
      readerDetected: false,
      cardInserted: false,
      readerName: null,
      cardAtr: null,
      cardSerial: null,
      cardType: null,
      lastCheck: new Date(),
      error: 'Lettore Smart Card non connesso',
      bridgeConnected: false,
      canEmitRealSeals: false,
      demoMode: false,
      relayConnected: false
    };
  }

  public static getInstance(): SmartCardService {
    if (!SmartCardService.instance) {
      SmartCardService.instance = new SmartCardService();
    }
    return SmartCardService.instance;
  }

  private getRelayUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/bridge`;
  }

  public startPolling(): void {
    if (this.ws) return;
    this.tryWebSocketConnection();
  }

  private tryWebSocketConnection(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    
    const wsUrl = this.getRelayUrl();
    console.log('Smart Card: Connessione a relay:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Smart Card: Connesso al relay');
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
        
        this.updateStatus({
          ...this.status,
          relayConnected: true,
          error: 'In attesa del bridge desktop...',
          lastCheck: new Date()
        });
        
        this.ws?.send(JSON.stringify({ type: 'get_status' }));
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && typeof msg.type === 'string') {
            if (msg.type === 'status' && msg.data) {
              this.handleWebSocketStatus(msg.data);
            } else if (msg.type === 'bridge_status' || msg.type === 'connection_status') {
              // Handle both bridge_status (updates) and connection_status (initial state)
              this.handleBridgeStatus(msg);
            } else if (msg.type === 'pong') {
              // Heartbeat response
            } else if (msg.type === 'sealResponse') {
              // Handled by generateSealForTicket promise
            } else if (msg.type === 'cardData') {
              // Card data response
            } else if (msg.type === 'error') {
              console.error('Smart Card: Errore dal server:', msg.error);
            }
          }
        } catch (e) {
          console.error('Smart Card: Errore parsing messaggio:', e);
        }
      };
      
      this.ws.onerror = () => {
        console.log('Smart Card: Errore connessione relay');
        this.stopHeartbeat();
        this.ws = null;
        this.updateStatus({
          ...this.status,
          connected: false,
          relayConnected: false,
          readerDetected: false,
          cardInserted: false,
          error: 'Impossibile connettersi al server. Riprova tra qualche secondo.',
          lastCheck: new Date()
        });
        this.scheduleWebSocketReconnect();
      };
      
      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        this.updateStatus({
          ...this.status,
          connected: false,
          relayConnected: false,
          error: 'Connessione al server persa',
          lastCheck: new Date()
        });
        this.scheduleWebSocketReconnect();
      };
      
    } catch {
      this.stopHeartbeat();
      this.scheduleWebSocketReconnect();
    }
  }

  private handleBridgeStatus(msg: any): void {
    // Handle both 'connected' (from bridge_status) and 'bridgeConnected' (from connection_status)
    const isConnected = msg.connected ?? msg.bridgeConnected ?? false;
    
    console.log('Smart Card: Bridge status update:', { type: msg.type, isConnected });
    
    if (isConnected) {
      this.updateStatus({
        ...this.status,
        connected: true,
        bridgeConnected: true,
        error: null,
        lastCheck: new Date()
      });
    } else {
      this.updateStatus({
        ...this.status,
        connected: false,
        bridgeConnected: false,
        readerDetected: false,
        cardInserted: false,
        error: 'App desktop Event4U non connessa. Avviare l\'applicazione sul PC.',
        lastCheck: new Date()
      });
    }
  }

  private handleWebSocketStatus(data: any): void {
    const bridgeConnected = data.bridgeConnected ?? data.initialized ?? false;
    const readerDetected = data.readerDetected ?? data.readerConnected ?? false;
    const cardInserted = data.cardInserted ?? false;
    
    this.updateStatus({
      connected: true,
      relayConnected: true,
      readerDetected,
      cardInserted,
      readerName: data.readerName || null,
      cardAtr: data.cardAtr || data.cardATR || null,
      cardSerial: data.cardSerial || null,
      cardType: cardInserted ? 'Smart Card SIAE' : null,
      lastCheck: new Date(),
      error: this.getErrorMessage(data, bridgeConnected, readerDetected, cardInserted),
      bridgeConnected,
      canEmitRealSeals: data.canEmitTickets ?? (bridgeConnected && readerDetected && cardInserted),
      demoMode: data.demoMode ?? data.simulationMode ?? false
    });
  }

  private getErrorMessage(data: any, bridgeConnected: boolean, readerDetected: boolean, cardInserted: boolean): string | null {
    if (data.demoMode || data.simulationMode) {
      return null;
    }
    if (!bridgeConnected) {
      return 'Bridge .NET non avviato. Clicca "Connetti Bridge" nell\'app desktop.';
    }
    if (!readerDetected) {
      return 'Lettore Smart Card non rilevato. Collegare il MiniLector EVO.';
    }
    if (!cardInserted) {
      return 'Smart Card SIAE non inserita. Inserire la carta sigilli.';
    }
    return null;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.error('Heartbeat send error:', e);
          this.stopHeartbeat();
        }
      } else {
        this.stopHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleWebSocketReconnect(): void {
    if (this.wsReconnectTimer) return;
    
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      if (!this.ws) {
        this.tryWebSocketConnection();
      }
    }, this.WS_RECONNECT_DELAY);
  }

  public stopPolling(): void {
    this.stopHeartbeat();
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public subscribe(callback: StatusChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.status);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): SmartCardStatus {
    return { ...this.status };
  }

  public canEmitTickets(): boolean {
    return this.status.connected && 
           this.status.readerDetected && 
           this.status.cardInserted;
  }

  public async generateSealForTicket(ticketId: number): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile');
    }

    if (!this.status.connected) {
      throw new Error('App desktop Event4U non connessa');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout generazione sigillo'));
      }, 15000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sealResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            if (msg.success && msg.seal) {
              resolve(msg.seal.sealCode || msg.seal.sealNumber);
            } else {
              reject(new Error(msg.error || 'Errore generazione sigillo'));
            }
          }
        } catch {}
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'requestSeal',
        data: { ticketId, timestamp: new Date().toISOString() }
      }));
    });
  }

  public sendCommand(type: string, data?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  private updateStatus(newStatus: SmartCardStatus): void {
    const hasChanged = JSON.stringify(this.status) !== JSON.stringify(newStatus);
    
    if (hasChanged) {
      this.status = newStatus;
      this.listeners.forEach(callback => {
        try {
          callback(newStatus);
        } catch (e) {
          console.error('Error in smart card status listener:', e);
        }
      });
    }
  }

  public enableDemoMode(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'enableDemo' }));
    }
    
    this.updateStatus({
      connected: true,
      relayConnected: true,
      readerDetected: true,
      cardInserted: true,
      readerName: 'Bit4id MiniLector EVO V3 (DEMO)',
      cardAtr: '3B9813400AA503010101AD1311',
      cardSerial: 'DEMO-12345678',
      cardType: 'SIAE Fiscal Card (Demo)',
      lastCheck: new Date(),
      error: null,
      bridgeConnected: true,
      canEmitRealSeals: false,
      demoMode: true
    });
  }

  public disableDemoMode(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'disableDemo' }));
    }
  }
}

export const smartCardService = SmartCardService.getInstance();

export function useSmartCardStatus(): SmartCardStatus {
  const [status, setStatus] = useState<SmartCardStatus>(smartCardService.getStatus());

  useEffect(() => {
    smartCardService.startPolling();
    const unsubscribe = smartCardService.subscribe(setStatus);
    
    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
