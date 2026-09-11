import React from 'react';
import { RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import { useRealtimeStore } from './realtime-store';

export const RealtimeStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const status = useRealtimeStore((s) => s.status);
  const reconnectAttempts = useRealtimeStore((s) => s.reconnectAttempts);
  const lastMessageAt = useRealtimeStore((s) => s.lastMessageAt);

  if (status === 'CONNECTED') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface border border-border text-[11px] font-mono-tech text-text-secondary select-none ${className}`}
        title={`Realtime Connected${lastMessageAt ? ` (last update: ${new Date(lastMessageAt).toLocaleTimeString()})` : ''}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="hidden sm:inline text-text-muted">Realtime</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
      </div>
    );
  }

  if (status === 'RECONNECTING' || status === 'CONNECTING') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono-tech text-amber-600 dark:text-amber-400 select-none ${className}`}
        title={`Reconnecting... (attempt ${reconnectAttempts})`}
      >
        <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
        <span className="hidden sm:inline">Realtime</span>
        <span className="font-medium">
          {status === 'RECONNECTING' ? `Reconnecting${reconnectAttempts > 1 ? ` (${reconnectAttempts})` : '...'}` : 'Connecting...'}
        </span>
      </div>
    );
  }

  if (status === 'DEGRADED') {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono-tech text-amber-600 dark:text-amber-400 select-none ${className}`}
        title="Realtime degraded (version mismatch or protocol issue)"
      >
        <AlertCircle className="h-3 w-3 text-amber-500" />
        <span className="hidden sm:inline">Realtime</span>
        <span className="font-medium">Degraded</span>
      </div>
    );
  }

  // DISCONNECTED (HTTP Fallback active)
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-subtle border border-border text-[11px] font-mono-tech text-text-muted select-none ${className}`}
      title="Realtime disconnected (HTTP fallback active)"
    >
      <WifiOff className="h-3 w-3 text-text-muted" />
      <span className="hidden sm:inline">Realtime</span>
      <span className="font-medium text-text-muted">HTTP Fallback</span>
    </div>
  );
};
