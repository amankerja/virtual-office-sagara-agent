import type { AgentDto } from '../dto/agent.dto';
import type { AgentProjection, AgentStatus, RuntimeConfidence, DelegationState } from '@/types/agent';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_AGENT_STATES: readonly AgentStatus[] = [
  'ACTIVE',
  'IDLE',
  'RECENTLY_ACTIVE',
  'AWAITING_APPROVAL',
  'DEGRADED',
  'ERROR',
  'OFFLINE',
  'UNKNOWN',
  'CONFIGURATION_INCOMPLETE',
];

const ALLOWED_CONFIDENCE: readonly RuntimeConfidence[] = [
  'CONFIRMED',
  'INFERRED',
  'UNKNOWN',
  'STALE',
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

export function mapAgentDtoToDomain(dto: AgentDto): AgentProjection {
  return {
    id: dto.id,

    definition: {
      id: (dto.definition as { id?: string | null })?.id || dto.id,
      name: dto.definition.name,
      role: dto.definition.role ?? undefined,
      description: dto.definition.description ?? undefined,
      enabled: Boolean(dto.definition.enabled),
      memoryNamespace: dto.definition.memory_namespace ?? undefined,
      configurationState: dto.definition.configuration_state
        ? mapUnknownEnum(dto.definition.configuration_state, ['COMPLETE', 'INCOMPLETE', 'DISABLED'] as const, 'COMPLETE')
        : undefined,
    },

    runtime: {
      state: mapUnknownEnum(dto.runtime.state, ALLOWED_AGENT_STATES, 'UNKNOWN'),
      confidence: mapUnknownEnum(dto.runtime.confidence, ALLOWED_CONFIDENCE, 'UNKNOWN'),
      lastActivityAt: dto.runtime.last_activity_at ?? undefined,
      sessionCount: preserveNumber(dto.runtime.session_count),
      activeDelegations: preserveNumber(dto.runtime.active_delegations),
      currentSessionId: dto.runtime.current_session_id ?? undefined,
      currentTaskId: dto.runtime.current_task_id ?? undefined,
      model: dto.runtime.model ?? undefined,
      currentActivity: dto.runtime.current_activity ?? undefined,
    },

    capabilities: {
      total: preserveNumber(dto.capabilities.total),
      healthy: preserveNumber(dto.capabilities.healthy),
      degraded: preserveNumber(dto.capabilities.degraded),
      missing: preserveNumber(dto.capabilities.missing),
    },

    usage: dto.usage
      ? {
          inputTokens: preserveNumber(dto.usage.input_tokens),
          outputTokens: preserveNumber(dto.usage.output_tokens),
          cacheReadTokens: preserveNumber(dto.usage.cache_read_tokens),
          cacheWriteTokens: preserveNumber(dto.usage.cache_write_tokens),
          reasoningTokens: preserveNumber(dto.usage.reasoning_tokens),
          apiCalls: preserveNumber(dto.usage.api_calls),
          estimatedCostUsd: preserveNumber(dto.usage.estimated_cost_usd),
          actualCostUsd: preserveNumber(dto.usage.actual_cost_usd),
        }
      : undefined,

    skills: dto.skills
      ? dto.skills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          health: mapUnknownEnum(s.health, ['HEALTHY', 'DEGRADED', 'MISSING', 'UNKNOWN'] as const, 'UNKNOWN'),
          evidence: (s.evidence as any) || 'Registered',
          description: s.description ?? undefined,
        }))
      : undefined,

    sessions: dto.sessions
      ? dto.sessions.map((s) => ({
          id: s.id,
          source: s.source,
          model: s.model,
          startedAt: s.started_at,
          lastActivityAt: s.last_activity_at,
          messageCount: s.message_count,
          status: mapUnknownEnum(s.status, ['active', 'completed', 'idle'] as const, 'active'),
        }))
      : undefined,

    delegations: dto.delegations
      ? dto.delegations.map((d) => ({
          id: d.id,
          taskTitle: d.task_title,
          workerPid: d.worker_pid ?? undefined,
          state: mapUnknownEnum(d.state, ALLOWED_DELEGATION_STATES, 'UNKNOWN'),
          startedAt: d.started_at,
          completedAt: d.completed_at ?? undefined,
          summary: d.summary ?? undefined,
        }))
      : undefined,
  };
}
