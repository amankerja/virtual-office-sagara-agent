import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeClient } from './realtime-client';
import { useRealtimeStore } from './realtime-store';

let globalClient: RealtimeClient | null = null;

export function getGlobalRealtimeClient(): RealtimeClient | null {
  return globalClient;
}

export function useRealtime(options?: { enabled?: boolean; baseUrl?: string }) {
  const queryClient = useQueryClient();
  const status = useRealtimeStore((s) => s.status);
  const reconnectAttempts = useRealtimeStore((s) => s.reconnectAttempts);
  const clientRef = useRef<RealtimeClient | null>(null);

  const enabled = options?.enabled ?? true;
  const baseUrl = options?.baseUrl;

  useEffect(() => {
    if (!enabled) return;

    if (!globalClient) {
      globalClient = new RealtimeClient({
        queryClient,
        baseUrl,
        enabled,
      });
    }

    clientRef.current = globalClient;
    globalClient.connect();

    return () => {
      // In development HMR or unmount, we retain the client unless explicitly torn down
    };
  }, [queryClient, enabled, baseUrl]);

  return {
    status,
    reconnectAttempts,
    reconnect: () => globalClient?.connect(),
    disconnect: () => globalClient?.disconnect(),
  };
}
