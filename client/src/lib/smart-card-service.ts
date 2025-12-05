/**
 * Smart Card Service per MiniLector EVO V3 (Bit4id)
 * Gestisce la comunicazione con l'app desktop Event4U via WebSocket
 * ws://localhost:18765
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
  
  private readonly WS_URL = 'ws://localhost:18765';
  private readonly WS_RECONNECT_DELAY = 5000;

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
      error: 'App Event4U Smart Card Reader non in esecuzione',
      bridgeConnected: false,
      canEmitRealSeals: false,
      demoMode: false
    };
  }

  public static getInstance(): SmartCardService {
    if (!SmartCardService.instance) {
      SmartCardService.instance = new SmartCardService();
    }
    return SmartCardService.instance;
  }

  public startPolling(): void {
    if (this.ws) return;
    this.tryWebSocketConnection();
  }

  private tryWebSocketConnection(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    
    try {
      this.ws = new WebSocket(this.WS_URL);
      
      this.ws.onopen = () => {
        console.log('Smart Card: Connesso all\'app Event4U');
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
        this.ws?.send(JSON.stringify({ type: 'get_status' }));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && typeof msg.type === 'string') {
            if (msg.type === 'status' && msg.data) {
              this.handleWebSocketStatus(msg.data);
            } else if (msg.type === 'pong') {
              // Heartbeat response
            }
          }
        } catch (e) {
          console.error('Smart Card: Errore parsing messaggio:', e);
        }
      };
      
      this.ws.onerror = () => {
        console.log('Smart Card: App Event4U non disponibile');
        this.ws = null;
        this.updateStatus({
          ...this.status,
          connected: false,
          readerDetected: false,
          cardInserted: false,
          error: 'App Event4U Smart Card Reader non in esecuzione. Avviare l\'applicazione desktop.',
          lastCheck: new Date()
        });
        this.scheduleWebSocketReconnect();
      };
      
      this.ws.onclose = () => {
        this.ws = null;
        this.updateStatus({
          ...this.status,
          connected: false,
          error: 'Connessione persa con Event4U Smart Card Reader',
          lastCheck: new Date()
        });
        this.scheduleWebSocketReconnect();
      };
      
    } catch {
      this.scheduleWebSocketReconnect();
    }
  }

  private handleWebSocketStatus(data: any): void {
    this.updateStatus({
      connected: true,
      readerDetected: data.readerDetected ?? data.readerConnected ?? false,
      cardInserted: data.cardInserted ?? false,
      readerName: data.readerName || null,
      cardAtr: data.cardAtr || data.cardATR || null,
      cardSerial: data.cardSerial || null,
      cardType: data.cardInserted ? 'Smart Card SIAE' : null,
      lastCheck: new Date(),
      error: this.getErrorMessage(data),
      bridgeConnected: data.bridgeConnected ?? data.initialized ?? false,
      canEmitRealSeals: data.canEmitTickets ?? false,
      demoMode: data.demoMode ?? data.simulationMode ?? false
    });
  }

  private getErrorMessage(data: any): string | null {
    if (data.demoMode || data.simulationMode) {
      return null;
    }
    if (!data.readerDetected && !data.readerConnected) {
      return 'Lettore Smart Card non rilevato. Collegare il MiniLector EVO.';
    }
    if (!data.cardInserted) {
      return 'Smart Card SIAE non inserita. Inserire la carta sigilli.';
    }
    return null;
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
      throw new Error('App Event4U Smart Card Reader non connessa');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout generazione sigillo'));
      }, 10000);

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
    } else {
      this.updateStatus({
        connected: true,
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
