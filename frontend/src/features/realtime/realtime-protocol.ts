import type { AgentDto } from '@/api/dto/agent.dto';
import type { DelegationDto } from '@/api/dto/runtime.dto';
import type { AttentionItemDto } from '@/api/dto/mission-control.dto';

export const PROTOCOL_VERSION = '1';

export type RealtimeMessageType = 'snapshot' | 'delta' | 'heartbeat' | 'resync_required' | 'error';

export interface RealtimeGatewayDto {
  status?: string;
  state?: string;
  connected?: boolean;
  latency_ms?: number;
  last_heartbeat_at?: string;
  host?: string;
  pid?: number | null;
  backend_id?: string;
  heartbeat_age_seconds?: number | null;
  restart_count?: number | null;
}

export interface RealtimeRuntimeSummaryDto {
  status?: string;
  uptime_seconds?: number;
  active_sessions_count?: number;
  active_workers_count?: number;
  confidence?: string;
  system_load?: Record<string, unknown>;
  health?: Record<string, string>;
  gateway?: RealtimeGatewayDto;
}

export interface EntityDeltaDto<T> {
  upsert?: T[];
  remove?: string[];
}

export interface RealtimeChangesDto {
  gateway?: RealtimeGatewayDto | null;
  runtime_summary?: RealtimeRuntimeSummaryDto | null;
  agents?: EntityDeltaDto<AgentDto> | null;
  task_summary?: Record<string, number> | null;
  approval_summary?: Record<string, number> | null;
  active_delegations?: EntityDeltaDto<DelegationDto> | null;
  attention?: EntityDeltaDto<AttentionItemDto> | null;
}

export interface RealtimeSnapshotPayloadDto {
  generated_at: string;
  revision: number;
  gateway: RealtimeGatewayDto;
  runtime_summary: RealtimeRuntimeSummaryDto;
  agents: AgentDto[];
  task_summary: Record<string, number>;
  approval_summary: Record<string, number>;
  active_delegations: DelegationDto[];
  attention: AttentionItemDto[];
}

export interface RealtimeDeltaPayloadDto {
  base_revision: number;
  revision: number;
  generated_at: string;
  changes: RealtimeChangesDto;
}

export interface RealtimeResyncPayloadDto {
  reason: string;
}

export interface RealtimeErrorPayloadDto {
  code: string;
  message: string;
}

export interface RealtimeEnvelopeDto<T = unknown> {
  protocol_version: string;
  type: RealtimeMessageType;
  sequence: number;
  generated_at: string;
  server_instance_id: string;
  payload: T;
}

/**
 * Lightweight runtime validation guard for incoming WebSocket envelopes.
 */
export function isValidRealtimeEnvelope(data: unknown): data is RealtimeEnvelopeDto {
  if (typeof data !== 'object' || data === null) return false;
  const env = data as Record<string, unknown>;
  return (
    typeof env.protocol_version === 'string' &&
    typeof env.type === 'string' &&
    typeof env.sequence === 'number' &&
    typeof env.generated_at === 'string' &&
    typeof env.server_instance_id === 'string' &&
    'payload' in env
  );
}
