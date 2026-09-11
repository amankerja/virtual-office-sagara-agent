import type { QueryClient } from '@tanstack/react-query';
import {
  isValidRealtimeEnvelope,
  PROTOCOL_VERSION,
  type RealtimeDeltaPayloadDto,
  type RealtimeEnvelopeDto,
  type RealtimeSnapshotPayloadDto,
} from './realtime-protocol';
import { applyRealtimeDelta, applyRealtimeSnapshot } from './realtime-cache';
import { useRealtimeStore } from './realtime-store';

export interface RealtimeClientOptions {
  queryClient: QueryClient;
  baseUrl?: string;
  enabled?: boolean;
}

export class RealtimeClient {
  private queryClient: QueryClient;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private isExplicitlyClosed = false;
  private enabled = true;
  private configuredUrl?: string;

  private serverInstanceId: string | null = null;
  private lastSequence: number | null = null;

  constructor(options: RealtimeClientOptions) {
    this.queryClient = options.queryClient;
    this.configuredUrl = options.baseUrl;
    this.enabled = options.enabled ?? true;
  }

  public connect(): void {
    if (!this.enabled || typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const store = useRealtimeStore.getState();

    if (this.reconnectAttempt > 0) {
      store.setReconnecting(this.reconnectAttempt);
    } else {
      store.setStatus('CONNECTING');
    }

    const wsUrl = this.resolveWebSocketUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Connected at transport level; will confirm once snapshot/heartbeat handshake completes
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = () => {
        // Disconnection handler will manage reconnection
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          useRealtimeStore.getState().setDisconnected(event.reason || undefined);
          this.scheduleReconnect();
        } else {
          useRealtimeStore.getState().reset();
        }
      };
    } catch (err) {
      this.ws = null;
      useRealtimeStore.getState().setDisconnected(String(err));
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closed connection');
      } catch {
        // Ignore close exceptions
      }
      this.ws = null;
    }
    useRealtimeStore.getState().reset();
  }

  private resolveWebSocketUrl(): string {
    let base = this.configuredUrl;
    if (!base) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
      const port = '8000'; // Default backend port
      base = `${isHttps ? 'wss' : 'ws'}://${host}:${port}/api/v1/realtime/ws`;
    } else {
      base = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      if (!base.endsWith('/realtime/ws')) {
        base = `${base.replace(/\/$/, '')}/realtime/ws`;
      }
    }

    const params = new URLSearchParams();
    params.set('protocol_version', PROTOCOL_VERSION);

    if (this.serverInstanceId && this.lastSequence !== null) {
      params.set('server_instance_id', this.serverInstanceId);
      params.set('from_sequence', String(this.lastSequence));
    }

    return `${base}?${params.toString()}`;
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.reconnectAttempt += 1;
    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s with jitter
    const delay = Math.min(15000, 1000 * Math.pow(2, this.reconnectAttempt - 1)) + Math.random() * 500;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public handleMessage(rawText: string): void {
    try {
      const data = JSON.parse(rawText);
      if (!isValidRealtimeEnvelope(data)) return;

      const envelope = data as RealtimeEnvelopeDto;

      // Check protocol version
      if (envelope.protocol_version !== PROTOCOL_VERSION) {
        useRealtimeStore.getState().setStatus('DEGRADED');
        return;
      }

      // Detect server restart: server_instance_id changed
      if (this.serverInstanceId && this.serverInstanceId !== envelope.server_instance_id) {
        this.serverInstanceId = envelope.server_instance_id;
        this.lastSequence = null;
      }

      switch (envelope.type) {
        case 'snapshot': {
          const snapshotPayload = envelope.payload as RealtimeSnapshotPayloadDto;
          this.serverInstanceId = envelope.server_instance_id;
          this.lastSequence = envelope.sequence;
          this.reconnectAttempt = 0;

          applyRealtimeSnapshot(this.queryClient, snapshotPayload);
          useRealtimeStore.getState().setConnected(envelope.server_instance_id, envelope.sequence);
          break;
        }

        case 'delta': {
          // Verify sequence continuity
          if (this.lastSequence !== null) {
            if (envelope.sequence <= this.lastSequence) {
              // Ignore duplicate or older sequence
              return;
            }
            if (envelope.sequence > this.lastSequence + 1) {
              // Gap detected: sequence was dropped, request resync
              this.resync();
              return;
            }
          }

          const deltaPayload = envelope.payload as RealtimeDeltaPayloadDto;
          this.lastSequence = envelope.sequence;
          applyRealtimeDelta(this.queryClient, deltaPayload);
          useRealtimeStore.getState().recordMessage(envelope.sequence);
          break;
        }

        case 'heartbeat': {
          if (this.lastSequence !== null) {
            useRealtimeStore.getState().recordMessage(this.lastSequence);
          }
          break;
        }

        case 'resync_required': {
          this.resync();
          break;
        }

        case 'error': {
          // Log operational error without breaking application state
          break;
        }
      }
    } catch {
      // Ignore parse failure on malformed transport packets
    }
  }

  private resync(): void {
    // Sequence gap detected: reconnect for a full canonical snapshot
    if (this.ws) {
      this.lastSequence = null;
      try {
        this.ws.close(1000, 'Resync requested');
      } catch {
        // Ignore
      }
    }
  }
}
