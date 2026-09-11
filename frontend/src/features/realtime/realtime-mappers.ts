import type { AgentDto } from '@/api/dto/agent.dto';
import type { DelegationDto } from '@/api/dto/runtime.dto';
import type { AttentionItemDto } from '@/api/dto/mission-control.dto';
import type { AgentProjection } from '@/types/agent';
import type { DelegationProjection, GatewayState, GatewayTelemetry, RuntimeOverview } from '@/types/runtime';
import type { AttentionItem } from '@/types/mission-control';

import { mapAgentDtoToDomain } from '@/api/mappers/agent.mapper';
import { mapDelegationDtoToDomain } from '@/api/mappers/runtime.mapper';
import { mapAttentionItemDtoToDomain } from '@/api/mappers/mission-control.mapper';
import type { RealtimeGatewayDto, RealtimeRuntimeSummaryDto } from './realtime-protocol';

export function mapRealtimeAgent(dto: AgentDto): AgentProjection {
  return mapAgentDtoToDomain(dto);
}

export function mapRealtimeGateway(dto?: RealtimeGatewayDto | null): GatewayTelemetry {
  const rawState = (dto?.status || dto?.state || 'UNKNOWN') as GatewayState;
  const allowedStates: GatewayState[] = ['HEALTHY', 'STALE', 'DEGRADED', 'OFFLINE', 'UNKNOWN'];
  const state: GatewayState = allowedStates.includes(rawState) ? rawState : 'UNKNOWN';
  const heartbeat = dto?.last_heartbeat_at;

  return {
    state,
    backendId: dto?.backend_id || 'unknown-backend',
    pid: dto?.pid ?? undefined,
    host: dto?.host || 'localhost',
    lastHeartbeat: heartbeat,
    lastHeartbeatAt: heartbeat,
    heartbeatAgeSeconds: dto?.heartbeat_age_seconds ?? undefined,
    restartCount: dto?.restart_count ?? undefined,
  };
}

export function mapRealtimeRuntimeOverview(dto?: RealtimeRuntimeSummaryDto | null): RuntimeOverview {
  const gw = mapRealtimeGateway(dto?.gateway);
  const status = (dto?.status || 'HEALTHY') as any;

  return {
    health: {
      gateway: ['HEALTHY', 'STALE', 'DEGRADED', 'OFFLINE', 'UNKNOWN'].includes(status) ? status : 'HEALTHY',
      runtimeData: 'HEALTHY',
      sessions: 'HEALTHY',
      delegations: 'HEALTHY',
      usage: 'HEALTHY',
    },
    gateway: gw,
    activeSessionsCount: dto?.active_sessions_count ?? 0,
    runningDelegationsCount: dto?.active_workers_count ?? 0,
    systemLoad: undefined,
    recentEvents: [],
  };
}

export function mapRealtimeDelegation(dto: DelegationDto): DelegationProjection {
  return mapDelegationDtoToDomain(dto);
}

export function mapRealtimeAttentionItem(dto: AttentionItemDto): AttentionItem {
  return mapAttentionItemDtoToDomain(dto);
}
