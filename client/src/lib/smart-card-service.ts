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
  cardCounter: number | null;      // Contatore progressivo sigilli
  cardBalance: number | null;      // Saldo carta
  cardKeyId: number | null;        // Codice Sistema / KeyID
  cardType: string | null;
  lastCheck: Date;
  error: string | null;
  bridgeConnected: boolean;
  canEmitRealSeals: boolean;
  demoMode: boolean;
  relayConnected: boolean;
  pinRetriesLeft: number | null;   // Tentativi PIN rimasti (null se non disponibile)
  pukRetriesLeft: number | null;   // Tentativi PUK rimasti (null se non disponibile)
  pinVerified: boolean;            // Se il PIN è stato verificato nella sessione corrente
  pinBlocked: boolean;             // Se il PIN è bloccato
}

export interface PinVerifyResult {
  success: boolean;
  retriesLeft: number;
  blocked: boolean;
  error?: string;
}

export interface PinChangeResult {
  success: boolean;
  error?: string;
}

export interface PukUnlockResult {
  success: boolean;
  error?: string;
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
      cardCounter: null,
      cardBalance: null,
      cardKeyId: null,
      cardType: null,
      lastCheck: new Date(),
      pinRetriesLeft: null,
      pukRetriesLeft: null,
      pinVerified: false,
      pinBlocked: false,
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
    
    // Fetch status immediately via HTTP (instant, no waiting for WebSocket)
    this.fetchInitialStatusViaHttp();
    
    // Then establish WebSocket for real-time updates
    this.tryWebSocketConnection();
  }
  
  private async fetchInitialStatusViaHttp(): Promise<void> {
    try {
      console.log('[DEBUG SC] Fetching initial status via HTTP...');
      const response = await fetch('/api/bridge/status', { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG SC] HTTP status received:', JSON.stringify(data, null, 2));
        console.log('[DEBUG SC] HTTP - cardSerial:', data.cardSerial);
        console.log('[DEBUG SC] HTTP - cardCounter:', data.cardCounter);
        console.log('[DEBUG SC] HTTP - cardBalance:', data.cardBalance);
        console.log('[DEBUG SC] HTTP - cardKeyId:', data.cardKeyId);
        console.log('[DEBUG SC] HTTP - cardInserted:', data.cardInserted);
        
        // Update status immediately with cached data from server
        this.updateStatus({
          connected: data.bridgeConnected ?? false,
          relayConnected: true,
          readerDetected: data.readerConnected ?? false,
          cardInserted: data.cardInserted ?? false,
          readerName: data.readerName ?? null,
          cardAtr: data.cardAtr ?? null,
          cardSerial: data.cardSerial ?? null,
          cardCounter: data.cardCounter ?? null,
          cardBalance: data.cardBalance ?? null,
          cardKeyId: data.cardKeyId ?? null,
          cardType: data.cardInserted ? 'Smart Card SIAE' : null,
          lastCheck: new Date(),
          error: this.getErrorFromData(data),
          bridgeConnected: data.bridgeConnected ?? false,
          canEmitRealSeals: data.bridgeConnected && data.readerConnected && data.cardInserted,
          demoMode: false
        });
      }
    } catch (err) {
      console.error('[DEBUG SC] HTTP fetch failed:', err);
      // Continue anyway - WebSocket will provide updates
    }
  }
  
  private getErrorFromData(data: any): string | null {
    if (!data.bridgeConnected) {
      return 'App desktop Event4U non connessa. Avviare l\'applicazione sul PC.';
    }
    if (!data.readerConnected) {
      return 'Lettore Smart Card non rilevato. Collegare il MiniLector EVO.';
    }
    if (!data.cardInserted) {
      return 'Smart Card SIAE non inserita. Inserire la carta sigilli.';
    }
    return null;
  }

  private tryWebSocketConnection(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    
    const wsUrl = this.getRelayUrl();
    console.log('[DEBUG SC] ====== SMART CARD CONNECTION START ======');
    console.log('[DEBUG SC] URL:', wsUrl);
    console.log('[DEBUG SC] Cookies present:', document.cookie ? 'YES' : 'NO');
    console.log('[DEBUG SC] Cookie value:', document.cookie.substring(0, 50) + '...');
    
    try {
      this.ws = new WebSocket(wsUrl);
      console.log('[DEBUG SC] WebSocket created, state:', this.ws.readyState);
      
      this.ws.onopen = () => {
        console.log('[DEBUG SC] WebSocket OPEN! State:', this.ws?.readyState);
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
        
        console.log('[DEBUG SC] Sending get_status request...');
        this.ws?.send(JSON.stringify({ type: 'get_status' }));
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        console.log('[DEBUG SC] MESSAGE RECEIVED:', event.data.substring(0, 200));
        try {
          const msg = JSON.parse(event.data);
          console.log('[DEBUG SC] Parsed message type:', msg.type);
          
          if (msg && typeof msg.type === 'string') {
            if (msg.type === 'status' && (msg.data || msg.payload)) {
              console.log('[DEBUG SC] Handling status message');
              this.handleWebSocketStatus(msg.data || msg.payload);
            } else if (msg.type === 'bridge_status' || msg.type === 'connection_status') {
              console.log('[DEBUG SC] Handling bridge/connection status:', msg.type, msg);
              this.handleBridgeStatus(msg);
            } else if (msg.type === 'pong') {
              console.log('[DEBUG SC] Pong received');
            } else if (msg.type === 'ping') {
              console.log('[DEBUG SC] Ping received, sending pong');
              this.ws?.send(JSON.stringify({ type: 'pong' }));
            } else if (msg.type === 'sealResponse') {
              console.log('[DEBUG SC] Seal response received');
            } else if (msg.type === 'cardData') {
              console.log('[DEBUG SC] Card data received');
            } else if (msg.type === 'error') {
              console.error('[DEBUG SC] ERROR from server:', msg.error || msg.message);
            } else {
              console.log('[DEBUG SC] Unknown message type:', msg.type);
            }
          }
        } catch (e) {
          console.error('[DEBUG SC] Parse error:', e, 'Raw:', event.data);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[DEBUG SC] WebSocket ERROR:', error);
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
      
      this.ws.onclose = (event) => {
        console.log('[DEBUG SC] WebSocket CLOSED:', event.code, event.reason);
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
      
    } catch (err) {
      console.error('[DEBUG SC] Exception creating WebSocket:', err);
      this.stopHeartbeat();
      this.scheduleWebSocketReconnect();
    }
  }

  private handleBridgeStatus(msg: any): void {
    // Handle both 'connected' (from bridge_status) and 'bridgeConnected' (from connection_status)
    const isConnected = msg.connected ?? msg.bridgeConnected ?? false;
    
    console.log('[DEBUG SC] ====== BRIDGE STATUS UPDATE ======');
    console.log('[DEBUG SC] Message type:', msg.type);
    console.log('[DEBUG SC] msg.connected:', msg.connected);
    console.log('[DEBUG SC] msg.bridgeConnected:', msg.bridgeConnected);
    console.log('[DEBUG SC] isConnected (final):', isConnected);
    console.log('[DEBUG SC] Full message:', JSON.stringify(msg));
    
    if (isConnected) {
      console.log('[DEBUG SC] Bridge IS connected - updating status to CONNECTED');
      this.updateStatus({
        ...this.status,
        connected: true,
        bridgeConnected: true,
        error: null,
        lastCheck: new Date()
      });
    } else {
      console.log('[DEBUG SC] Bridge NOT connected - updating status to DISCONNECTED');
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
    console.log('[DEBUG SC] Status after update:', JSON.stringify(this.status));
  }

  private handleWebSocketStatus(data: any): void {
    console.log('[DEBUG SC] ====== CARD STATUS DATA RECEIVED ======');
    console.log('[DEBUG SC] Full data object:', JSON.stringify(data, null, 2));
    console.log('[DEBUG SC] data.cardSerial:', data.cardSerial);
    console.log('[DEBUG SC] data.cardCounter:', data.cardCounter);
    console.log('[DEBUG SC] data.cardBalance:', data.cardBalance);
    console.log('[DEBUG SC] data.cardKeyId:', data.cardKeyId);
    console.log('[DEBUG SC] data.cardInserted:', data.cardInserted);
    console.log('[DEBUG SC] data.readerDetected:', data.readerDetected);
    console.log('[DEBUG SC] data.readerConnected:', data.readerConnected);
    
    const bridgeConnected = data.bridgeConnected ?? data.initialized ?? false;
    const readerDetected = data.readerDetected ?? data.readerConnected ?? false;
    const cardInserted = data.cardInserted ?? false;
    
    this.updateStatus({
      connected: true,
      relayConnected: true,
      readerDetected,
      cardInserted,
      readerName: data.readerName ?? null,
      cardAtr: data.cardAtr ?? data.cardATR ?? null,
      cardSerial: data.cardSerial ?? null,
      cardCounter: data.cardCounter ?? null,
      cardBalance: data.cardBalance ?? null,
      cardKeyId: data.cardKeyId ?? null,
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

  public async requestFiscalSeal(priceInCents: number): Promise<{
    sealCode: string;
    sealNumber: string;
    serialNumber: string;
    counter: number;
    mac: string;
    dateTime: string;
  }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile. Verificare la connessione.');
    }

    if (!this.status.connected || !this.status.bridgeConnected) {
      throw new Error('App desktop Event4U non connessa. Avviare l\'applicazione sul PC.');
    }

    if (!this.status.readerDetected) {
      throw new Error('Lettore Smart Card non rilevato. Collegare il MiniLector EVO.');
    }

    if (!this.status.cardInserted) {
      throw new Error('Smart Card SIAE non inserita. Inserire la carta sigilli.');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('Timeout generazione sigillo fiscale (15s). Riprovare.'));
      }, 15000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sealResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            if (msg.success && msg.seal) {
              resolve({
                sealCode: msg.seal.sealCode || msg.seal.mac,
                sealNumber: msg.seal.sealNumber,
                serialNumber: msg.seal.serialNumber,
                counter: msg.seal.counter,
                mac: msg.seal.mac,
                dateTime: msg.seal.dateTime
              });
            } else {
              reject(new Error(msg.error || 'Errore generazione sigillo fiscale'));
            }
          }
        } catch (e) {
          console.error('Error parsing seal response:', e);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'requestSeal',
        data: { 
          price: priceInCents / 100,
          timestamp: new Date().toISOString() 
        }
      }));
    });
  }

  public isReadyForEmission(): { ready: boolean; error: string | null } {
    if (!this.status.connected || !this.status.bridgeConnected) {
      return { ready: false, error: 'App desktop Event4U non connessa' };
    }
    if (!this.status.readerDetected) {
      return { ready: false, error: 'Lettore Smart Card non rilevato' };
    }
    if (!this.status.cardInserted) {
      return { ready: false, error: 'Smart Card SIAE non inserita' };
    }
    return { ready: true, error: null };
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
      cardCounter: 12345,
      cardBalance: 100000,
      cardKeyId: 1,
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

  /**
   * Verifica il PIN della smart card
   * @param pin Il PIN a 4-8 cifre da verificare
   * @returns Risultato della verifica con tentativi rimasti
   */
  public async verifyPin(pin: string): Promise<PinVerifyResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile');
    }

    if (!this.status.cardInserted) {
      throw new Error('Smart Card non inserita');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('Timeout verifica PIN (15s)'));
      }, 15000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pinVerifyResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            const result: PinVerifyResult = {
              success: msg.success ?? false,
              retriesLeft: msg.retriesLeft ?? 0,
              blocked: msg.blocked ?? false,
              error: msg.error
            };

            // Update status with retry info
            this.updateStatus({
              ...this.status,
              pinRetriesLeft: result.retriesLeft,
              pinVerified: result.success,
              pinBlocked: result.blocked
            });

            resolve(result);
          }
        } catch (e) {
          console.error('Error parsing PIN verify response:', e);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'verifyPin',
        data: { pin }
      }));
    });
  }

  /**
   * Cambia il PIN della smart card
   * @param oldPin Il PIN corrente
   * @param newPin Il nuovo PIN (4-8 cifre)
   * @returns Risultato del cambio PIN
   */
  public async changePin(oldPin: string, newPin: string): Promise<PinChangeResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile');
    }

    if (!this.status.cardInserted) {
      throw new Error('Smart Card non inserita');
    }

    if (this.status.pinBlocked) {
      throw new Error('PIN bloccato. Usare il PUK per sbloccare.');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('Timeout cambio PIN (15s)'));
      }, 15000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pinChangeResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            const result: PinChangeResult = {
              success: msg.success ?? false,
              error: msg.error
            };

            if (result.success) {
              this.updateStatus({
                ...this.status,
                pinVerified: true,
                pinBlocked: false
              });
            }

            resolve(result);
          }
        } catch (e) {
          console.error('Error parsing PIN change response:', e);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'changePin',
        data: { oldPin, newPin }
      }));
    });
  }

  /**
   * Sblocca il PIN usando il PUK
   * @param puk Il PUK a 8 cifre
   * @param newPin Il nuovo PIN da impostare (4-8 cifre)
   * @returns Risultato dello sblocco
   */
  public async unlockWithPuk(puk: string, newPin: string): Promise<PukUnlockResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile');
    }

    if (!this.status.cardInserted) {
      throw new Error('Smart Card non inserita');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('Timeout sblocco PUK (15s)'));
      }, 15000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pukUnlockResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            const result: PukUnlockResult = {
              success: msg.success ?? false,
              error: msg.error
            };

            if (result.success) {
              this.updateStatus({
                ...this.status,
                pinVerified: true,
                pinBlocked: false,
                pinRetriesLeft: 3, // Reset to default after successful PUK unlock
                pukRetriesLeft: msg.pukRetriesLeft ?? this.status.pukRetriesLeft
              });
            } else {
              this.updateStatus({
                ...this.status,
                pukRetriesLeft: msg.pukRetriesLeft ?? this.status.pukRetriesLeft
              });
            }

            resolve(result);
          }
        } catch (e) {
          console.error('Error parsing PUK unlock response:', e);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'unlockWithPuk',
        data: { puk, newPin }
      }));
    });
  }

  /**
   * Richiede i tentativi rimasti per PIN e PUK
   * @returns Aggiorna lo status con i tentativi rimasti
   */
  public async getRetriesStatus(): Promise<{ pinRetries: number | null; pukRetries: number | null }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connessione al server non disponibile');
    }

    if (!this.status.cardInserted) {
      throw new Error('Smart Card non inserita');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('Timeout lettura tentativi (10s)'));
      }, 10000);

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'retriesStatusResponse') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            
            const pinRetries = msg.pinRetries ?? null;
            const pukRetries = msg.pukRetries ?? null;

            this.updateStatus({
              ...this.status,
              pinRetriesLeft: pinRetries,
              pukRetriesLeft: pukRetries,
              pinBlocked: pinRetries === 0
            });

            resolve({ pinRetries, pukRetries });
          }
        } catch (e) {
          console.error('Error parsing retries status response:', e);
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({
        type: 'getRetriesStatus'
      }));
    });
  }

  /**
   * Resetta lo stato di verifica PIN (quando la carta viene rimossa)
   */
  public resetPinState(): void {
    this.updateStatus({
      ...this.status,
      pinVerified: false,
      pinRetriesLeft: null,
      pukRetriesLeft: null,
      pinBlocked: false
    });
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
