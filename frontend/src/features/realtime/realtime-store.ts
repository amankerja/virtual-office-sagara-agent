import { create } from 'zustand';

export type RealtimeConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'DEGRADED';

interface RealtimeState {
  status: RealtimeConnectionStatus;
  serverInstanceId: string | null;
  lastSequence: number | null;
  lastConnectedAt: string | null;
  lastMessageAt: string | null;
  reconnectAttempts: number;
  lastError: string | null;

  setStatus: (status: RealtimeConnectionStatus) => void;
  setConnected: (serverInstanceId: string, initialSequence: number) => void;
  setDisconnected: (error?: string) => void;
  setReconnecting: (attempt: number) => void;
  recordMessage: (sequence: number) => void;
  reset: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'DISCONNECTED',
  serverInstanceId: null,
  lastSequence: null,
  lastConnectedAt: null,
  lastMessageAt: null,
  reconnectAttempts: 0,
  lastError: null,

  setStatus: (status) => set({ status }),

  setConnected: (serverInstanceId, initialSequence) =>
    set({
      status: 'CONNECTED',
      serverInstanceId,
      lastSequence: initialSequence,
      lastConnectedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      reconnectAttempts: 0,
      lastError: null,
    }),

  setDisconnected: (error) =>
    set({
      status: 'DISCONNECTED',
      lastError: error ?? null,
    }),

  setReconnecting: (attempt) =>
    set({
      status: 'RECONNECTING',
      reconnectAttempts: attempt,
    }),

  recordMessage: (sequence) =>
    set({
      lastSequence: sequence,
      lastMessageAt: new Date().toISOString(),
    }),

  reset: () =>
    set({
      status: 'DISCONNECTED',
      serverInstanceId: null,
      lastSequence: null,
      lastConnectedAt: null,
      lastMessageAt: null,
      reconnectAttempts: 0,
      lastError: null,
    }),
}));
