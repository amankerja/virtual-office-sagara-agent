import type {
  GatewayDto,
  SessionDto,
  DelegationDto,
  RuntimeEventDto,
  RuntimeOverviewDto,
} from '../dto/runtime.dto';
import type {
  GatewayTelemetry,
  GatewayState,
  SessionProjection,
  SessionState,
  DelegationProjection,
  DelegationState,
  RuntimeEvent,
  RuntimeOverview,
  SystemLoadMetrics,
  EventCategory,
  EventSeverity,
} from '@/types/runtime';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_GATEWAY_STATES: readonly GatewayState[] = [
  'HEALTHY',
  'STALE',
  'DEGRADED',
  'OFFLINE',
  'UNKNOWN',
];

const ALLOWED_SESSION_STATES: readonly SessionState[] = [
  'ACTIVE',
  'RECENT',
  'COMPLETED',
  'FAILED',
  'ARCHIVED',
  'UNKNOWN',
];

const ALLOWED_DELEGATION_STATES: readonly DelegationState[] = [
  'QUEUED',
  'CLAIMED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
];

const ALLOWED_CATEGORIES: readonly EventCategory[] = [
  'GATEWAY',
  'SESSION',
  'DELEGATION',
  'USAGE',
  'SKILL',
  'PROFILE',
  'SYSTEM',
];

const ALLOWED_SEVERITIES: readonly EventSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

export function mapGatewayDtoToDomain(dto?: GatewayDto | null): GatewayTelemetry {
  if (!dto) {
    return {
      state: 'UNKNOWN',
      backendId: 'unknown-backend',
      host: 'localhost',
      lastHeartbeat: undefined,
      lastHeartbeatAt: undefined,
    };
  }
  const heartbeat = dto.last_heartbeat_at || dto.last_heartbeat || undefined;
  return {
    state: mapUnknownEnum(dto.state, ALLOWED_GATEWAY_STATES, 'UNKNOWN'),
    backendId: dto.backend_id,
    pid: preserveNumber(dto.pid),
    host: dto.host,
    startedAt: dto.started_at ?? undefined,
    lastHeartbeat: heartbeat,
    lastHeartbeatAt: heartbeat,
    heartbeatAgeSeconds: preserveNumber(dto.heartbeat_age_seconds),
    restartCount: preserveNumber(dto.restart_count),
    statusMessage: dto.status_message ?? undefined,
  };
}

export function mapSessionDtoToDomain(dto: SessionDto): SessionProjection {
  const rawMsg = preserveNumber(dto.message_count ?? dto.messages_count);
  const rawTool = preserveNumber(dto.tool_call_count ?? dto.tools_count);
  return {
    id: dto.id,
    profileId: dto.profile_id ?? undefined,
    agentId: dto.agent_id || 'unknown-agent',
    agentName: dto.agent_name || 'Agent',
    source: dto.source || 'default',
    model: dto.model ?? undefined,
    provider: dto.provider ?? undefined,
    startedAt: dto.started_at || new Date().toISOString(),
    lastActivityAt: dto.last_activity_at || new Date().toISOString(),
    state: mapUnknownEnum(dto.state, ALLOWED_SESSION_STATES, 'ACTIVE'),
    messagesCount: rawMsg ?? 0,
    messageCount: rawMsg,
    toolsCount: rawTool ?? 0,
    toolCallCount: rawTool,
    parentSessionId: dto.parent_session_id ?? undefined,
    childSessionIds: dto.child_session_ids ?? undefined,
    delegationIds: dto.delegation_ids ?? undefined,
    endReason: dto.end_reason ?? undefined,
    usage: dto.usage
      ? {
          apiCalls: preserveNumber(dto.usage.api_calls),
          inputTokens: preserveNumber(dto.usage.input_tokens),
          outputTokens: preserveNumber(dto.usage.output_tokens),
          cacheReadTokens: preserveNumber(dto.usage.cache_read_tokens),
          cacheWriteTokens: preserveNumber(dto.usage.cache_write_tokens),
          reasoningTokens: preserveNumber(dto.usage.reasoning_tokens),
          estimatedCostUsd: preserveNumber(dto.usage.estimated_cost_usd),
          actualCostUsd: preserveNumber(dto.usage.actual_cost_usd),
          billingStatus: dto.usage.billing_status
            ? mapUnknownEnum(dto.usage.billing_status, ['estimated', 'settled', 'unknown'] as const, 'unknown')
            : undefined,
        }
      : undefined,
    messages: dto.messages
      ? dto.messages.map((m) => ({
          id: m.id,
          role: mapUnknownEnum(m.role, ['user', 'assistant', 'system', 'tool'] as const, 'user'),
          timestamp: m.timestamp,
          contentPreview: m.content_preview,
          isSensitive: m.is_sensitive ?? undefined,
          redactedReason: m.redacted_reason ?? undefined,
          toolAssociation: m.tool_association ?? undefined,
        }))
      : undefined,
    tools: dto.tools
      ? dto.tools.map((t) => ({
          id: t.id,
          toolName: t.tool_name,
          state: mapUnknownEnum(t.state, ['running', 'completed', 'failed', 'unknown'] as const, 'unknown'),
          startedAt: t.started_at,
          completedAt: t.completed_at ?? undefined,
          durationMs: preserveNumber(t.duration_ms),
          resultSummary: t.result_summary ?? undefined,
        }))
      : undefined,
  };
}

export function mapDelegationDtoToDomain(dto: DelegationDto): DelegationProjection {
  return {
    id: dto.id,
    taskTitle: dto.task_title,
    taskDescription: dto.task_description ?? undefined,
    originAgentId: dto.origin_agent_id,
    originAgentName: dto.origin_agent_name || 'Agent',
    originSessionId: dto.origin_session_id,
    parentSessionId: dto.parent_session_id ?? undefined,
    state: mapUnknownEnum(dto.state, ALLOWED_DELEGATION_STATES, 'UNKNOWN'),
    ownerPid: preserveNumber(dto.owner_pid),
    deliveryState: dto.delivery_state
      ? mapUnknownEnum(dto.delivery_state, ['PENDING', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED', 'UNKNOWN'] as const, 'UNKNOWN')
      : undefined,
    startedAt: dto.started_at,
    updatedAt: dto.updated_at,
    completedAt: dto.completed_at ?? undefined,
    resultSummary: dto.result_summary ?? undefined,
    timeline: (dto.timeline || []).map((t) => ({
      stage: (t.stage as any) || 'Started',
      timestamp: t.timestamp,
      details: t.details ?? undefined,
    })),
  };
}

export function mapRuntimeEventDtoToDomain(dto: RuntimeEventDto): RuntimeEvent {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    category: mapUnknownEnum(dto.category, ALLOWED_CATEGORIES, 'SYSTEM'),
    severity: mapUnknownEnum(dto.severity, ALLOWED_SEVERITIES, 'INFO'),
    entity: dto.entity,
    entityId: dto.entity_id ?? undefined,
    message: dto.message,
    correlationId: dto.correlation_id ?? undefined,
  };
}

export function mapVpsHealthDtoToDomain(dto: import('../dto/runtime.dto').VpsHealthDto): import('@/types/runtime').VpsHealth {
  return {
    hostname: dto.hostname,
    uptimeSeconds: dto.uptime_seconds,
    cpuPercent: preserveNumber(dto.cpu_percent),
    load1m: preserveNumber(dto.load_1m),
    load5m: preserveNumber(dto.load_5m),
    load15m: preserveNumber(dto.load_15m),
    ramTotalMb: preserveNumber(dto.ram_total_mb),
    ramUsedMb: preserveNumber(dto.ram_used_mb),
    ramPercent: preserveNumber(dto.ram_percent),
    swapTotalMb: preserveNumber(dto.swap_total_mb),
    swapUsedMb: preserveNumber(dto.swap_used_mb),
    diskTotalGb: preserveNumber(dto.disk_total_gb),
    diskUsedGb: preserveNumber(dto.disk_used_gb),
    diskFreeGb: preserveNumber(dto.disk_free_gb),
    diskPercent: preserveNumber(dto.disk_percent),
    observedAt: dto.observed_at,
    health: mapUnknownEnum(dto.health, ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'] as const, 'UNKNOWN'),
  };
}

export function mapServiceHealthDtoToDomain(dto: import('../dto/runtime.dto').ServiceHealthDto): import('@/types/runtime').ServiceHealth {
  return {
    name: dto.name,
    activeState: dto.active_state,
    subState: dto.sub_state,
    mainPid: preserveNumber(dto.main_pid),
    restartCount: preserveNumber(dto.restart_count),
    activeSince: dto.active_since ?? undefined,
    observedAt: dto.observed_at,
    health: mapUnknownEnum(dto.health, ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'] as const, 'UNKNOWN'),
  };
}

export function mapNineRouterHealthDtoToDomain(dto: import('../dto/runtime.dto').NineRouterHealthDto): import('@/types/runtime').NineRouterHealth {
  return {
    available: dto.available,
    endpoint: dto.endpoint,
    statusCode: preserveNumber(dto.status_code),
    modelsCount: preserveNumber(dto.models_count),
    activeState: dto.active_state ?? undefined,
    mainPid: preserveNumber(dto.main_pid),
    observedAt: dto.observed_at,
    health: mapUnknownEnum(dto.health, ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'] as const, 'UNKNOWN'),
  };
}

export function mapSourceDiscoveryStatusDtoToDomain(dto: import('../dto/runtime.dto').SourceDiscoveryStatusDto): import('@/types/runtime').SourceDiscoveryStatus {
  return {
    sagara: {
      configured: dto.sagara.configured,
      discovered: dto.sagara.discovered,
      sourceVersion: dto.sagara.source_version ?? undefined,
      commit: dto.sagara.commit ?? undefined,
      freezeCommit: dto.sagara.freeze_commit,
      profilesLoaded: dto.sagara.profiles_loaded,
      skillsLoaded: dto.sagara.skills_loaded,
      channelsLoaded: dto.sagara.channels_loaded,
      observedAt: dto.sagara.observed_at,
      health: mapUnknownEnum(dto.sagara.health, ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'] as const, 'UNKNOWN'),
    },
    hermes: {
      configured: dto.hermes.configured,
      discovered: dto.hermes.discovered,
      version: dto.hermes.version ?? undefined,
      gateway: dto.hermes.gateway ?? undefined,
      stateStore: dto.hermes.state_store ?? undefined,
      profileStores: dto.hermes.profile_stores,
      observedAt: dto.hermes.observed_at,
      health: mapUnknownEnum(dto.hermes.health, ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'] as const, 'UNKNOWN'),
    },
    runtimeContract: dto.runtime_contract,
    observedAt: dto.observed_at,
  };
}

export function mapReleaseMetadataDtoToDomain(dto: import('../dto/runtime.dto').ReleaseMetadataDto): import('@/types/runtime').ReleaseMetadata {
  return {
    platform: dto.platform,
    missionControlVersion: dto.mission_control_version,
    missionControlCommit: dto.mission_control_commit ?? undefined,
    sagaraDeployedCommit: dto.sagara_deployed_commit ?? undefined,
    sagaraFreezeCommit: dto.sagara_freeze_commit,
    hermesVersion: dto.hermes_version ?? undefined,
    runtimeContract: dto.runtime_contract,
    productionPolicy: dto.production_policy,
    policyHash: dto.policy_hash,
    observedAt: dto.observed_at,
  };
}

export function mapRuntimeOverviewDtoToDomain(dto: RuntimeOverviewDto): RuntimeOverview {
  const cpu = preserveNumber(dto.system_load?.cpu_percent);
  const memUsed = preserveNumber(dto.system_load?.memory_used_mb);
  const memTotal = preserveNumber(dto.system_load?.memory_total_mb);
  let memPercent = preserveNumber(dto.system_load?.memory_percent);
  if (memPercent === undefined && memUsed !== undefined && memTotal !== undefined && memTotal > 0) {
    memPercent = Math.round((memUsed / memTotal) * 1000) / 10;
  }
  const systemLoad: SystemLoadMetrics | undefined = dto.system_load
    ? {
        cpuPercent: cpu,
        memoryUsedMb: memUsed,
        memoryTotalMb: memTotal,
        memoryPercent: memPercent,
        swapUsedMb: preserveNumber(dto.system_load.swap_used_mb),
        swapTotalMb: preserveNumber(dto.system_load.swap_total_mb),
        diskUsedGb: preserveNumber(dto.system_load.disk_used_gb),
        diskTotalGb: preserveNumber(dto.system_load.disk_total_gb),
        diskFreeGb: preserveNumber(dto.system_load.disk_free_gb),
        diskPercent: preserveNumber(dto.system_load.disk_percent),
        load1m: preserveNumber(dto.system_load.load_1m),
        load5m: preserveNumber(dto.system_load.load_5m),
        load15m: preserveNumber(dto.system_load.load_15m),
        hostname: dto.system_load.hostname ?? undefined,
      }
    : undefined;

  return {
    health: {
      gateway: mapUnknownEnum(dto.health?.gateway, ALLOWED_GATEWAY_STATES, 'UNKNOWN'),
      runtimeData: mapUnknownEnum(dto.health?.runtime_data, ['HEALTHY', 'DEGRADED', 'UNKNOWN'] as const, 'UNKNOWN'),
      sessions: mapUnknownEnum(dto.health?.sessions, ['HEALTHY', 'DEGRADED', 'UNKNOWN'] as const, 'UNKNOWN'),
      delegations: mapUnknownEnum(dto.health?.delegations, ['HEALTHY', 'DEGRADED', 'UNKNOWN'] as const, 'UNKNOWN'),
      usage: mapUnknownEnum(dto.health?.usage, ['HEALTHY', 'DEGRADED', 'UNKNOWN'] as const, 'UNKNOWN'),
    },
    gateway: mapGatewayDtoToDomain(dto.gateway),
    activeSessionsCount: preserveNumber(dto.active_sessions_count),
    runningDelegationsCount: preserveNumber(dto.running_delegations_count),
    totalCostEstimateUsd: preserveNumber(dto.total_cost_estimate_usd),
    recentEvents: (dto.recent_events || []).map(mapRuntimeEventDtoToDomain),
    systemLoad,
    centralStoreSessions: preserveNumber(dto.central_store_sessions),
    profileLocalSessions: preserveNumber(dto.profile_local_sessions),
    aggregateDistinctSessions: preserveNumber(dto.aggregate_distinct_sessions),
    currentModel: dto.current_model ?? undefined,
    currentProvider: dto.current_provider ?? undefined,
    platforms: dto.platforms ?? undefined,
    vpsHealth: dto.vps_health ? mapVpsHealthDtoToDomain(dto.vps_health) : undefined,
    servicesHealth: dto.services_health ? dto.services_health.map(mapServiceHealthDtoToDomain) : undefined,
    routerHealth: dto.router_health ? mapNineRouterHealthDtoToDomain(dto.router_health) : undefined,
  };
}

