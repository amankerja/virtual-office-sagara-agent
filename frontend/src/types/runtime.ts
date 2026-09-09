/**
 * Runtime and Hermes telemetry schemas.
 * Frontend displays telemetry via Mission Control API without calling Hermes directly.
 */
export type GatewayStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'UNKNOWN';

export interface RuntimePulse {
  gatewayStatus: GatewayStatus;
  profilesCount: number | null;
  activeAgentsCount: number | null;
  totalSessionsCount: number | null;
  skillHealthRatio: string | null;
  needsAttentionCount: number | null;
  uptimeSeconds?: number | null;
  lastTelemetryHeartbeat?: string | null;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}
