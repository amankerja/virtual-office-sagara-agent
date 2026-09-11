import type {
  GovernanceSnapshotDto,
  UsageMetricDto,
  BudgetConfigDto,
} from '../dto/governance.dto';
import type {
  GovernanceSnapshot,
  UsageMetric,
  BudgetConfig,
  BudgetStatus,
  BudgetPeriod,
  CostConfidence,
  BreakdownType,
} from '@/types/governance';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

export function mapUsageMetricDtoToDomain(dto?: UsageMetricDto | null): UsageMetric {
  if (!dto) return {};
  return {
    inputTokens: preserveNumber(dto.input_tokens),
    outputTokens: preserveNumber(dto.output_tokens),
    reasoningTokens: preserveNumber(dto.reasoning_tokens),
    cacheReadTokens: preserveNumber(dto.cache_read_tokens),
    cacheWriteTokens: preserveNumber(dto.cache_write_tokens),
    apiCalls: preserveNumber(dto.api_calls),
    estimatedCostUsd: preserveNumber(dto.estimated_cost_usd),
    actualCostUsd: preserveNumber(dto.actual_cost_usd),
  };
}

export function mapBudgetConfigDtoToDomain(dto?: BudgetConfigDto | null): BudgetConfig | undefined {
  if (!dto) return undefined;
  return {
    period: mapUnknownEnum(dto.period, ['DAILY', 'WEEKLY', 'MONTHLY'] as const, 'MONTHLY' as BudgetPeriod),
    limitUsd: preserveNumber(dto.limit_usd),
    consumedUsd: preserveNumber(dto.consumed_usd),
    remainingUsd: preserveNumber(dto.remaining_usd),
    status: dto.status ? mapUnknownEnum(dto.status, ['NORMAL', 'WARNING', 'CRITICAL', 'UNKNOWN'] as const, 'UNKNOWN' as BudgetStatus) : undefined,
  };
}

export function mapGovernanceSnapshotDtoToDomain(dto: GovernanceSnapshotDto): GovernanceSnapshot {
  return {
    totalUsage: mapUsageMetricDtoToDomain(dto.total_usage),
    budget: mapBudgetConfigDtoToDomain(dto.budget),
    breakdowns: {
      agents: dto.breakdowns?.agents?.map((b) => ({
        id: b.id,
        label: b.label,
        type: mapUnknownEnum(b.type, ['AGENT', 'MODEL', 'PROVIDER', 'TASK'] as const, 'AGENT' as BreakdownType),
        usage: mapUsageMetricDtoToDomain(b.usage),
        percentage: preserveNumber(b.percentage),
      })),
      models: dto.breakdowns?.models?.map((b) => ({
        id: b.id,
        label: b.label,
        type: mapUnknownEnum(b.type, ['AGENT', 'MODEL', 'PROVIDER', 'TASK'] as const, 'MODEL' as BreakdownType),
        usage: mapUsageMetricDtoToDomain(b.usage),
        percentage: preserveNumber(b.percentage),
      })),
      providers: dto.breakdowns?.providers?.map((b) => ({
        id: b.id,
        label: b.label,
        type: mapUnknownEnum(b.type, ['AGENT', 'MODEL', 'PROVIDER', 'TASK'] as const, 'PROVIDER' as BreakdownType),
        usage: mapUsageMetricDtoToDomain(b.usage),
        percentage: preserveNumber(b.percentage),
      })),
      tasks: dto.breakdowns?.tasks?.map((b) => ({
        id: b.id,
        label: b.label,
        type: mapUnknownEnum(b.type, ['AGENT', 'MODEL', 'PROVIDER', 'TASK'] as const, 'TASK' as BreakdownType),
        usage: mapUsageMetricDtoToDomain(b.usage),
        percentage: preserveNumber(b.percentage),
      })),
    },
    taskAttributions: dto.task_attributions?.map((t) => ({
      taskId: t.task_id,
      taskTitle: t.task_title,
      agentId: t.agent_id ?? undefined,
      agentName: t.agent_name ?? undefined,
      sessionCount: preserveNumber(t.session_count),
      tokens: {
        input: preserveNumber(t.tokens.input),
        output: preserveNumber(t.tokens.output),
        reasoning: preserveNumber(t.tokens.reasoning),
        total: preserveNumber(t.tokens.total),
      },
      cost: {
        estimatedUsd: preserveNumber(t.cost.estimated_usd),
        actualUsd: preserveNumber(t.cost.actual_usd),
        confidence: mapUnknownEnum(t.cost.confidence, ['ESTIMATED', 'ACTUAL', 'PARTIAL', 'UNKNOWN'] as const, 'ESTIMATED' as CostConfidence),
      },
    })),
    signals: dto.signals?.map((s) => ({
      id: s.id,
      severity: mapUnknownEnum(s.severity, ['INFO', 'WARNING', 'CRITICAL'] as const, 'INFO'),
      type: s.type as any,
      title: s.title,
      description: s.description,
      detectedAt: s.detected_at,
      relatedEntity: s.related_entity ?? undefined,
    })),
  };
}
