/**
 * Sagara Governance & Usage API DTO (snake_case)
 * Conforms to Prompt 07 Section 30, 32.
 */

export interface UsageMetricDto {
  input_tokens?: number | null;
  output_tokens?: number | null;
  reasoning_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_write_tokens?: number | null;
  api_calls?: number | null;
  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
}

export interface UsageBreakdownDto {
  id: string;
  label: string;
  type: string;
  usage: UsageMetricDto;
  percentage?: number | null;
}

export interface BudgetConfigDto {
  period: string;
  limit_usd?: number | null;
  consumed_usd?: number | null;
  remaining_usd?: number | null;
  status?: string | null;
}

export interface TaskCostAttributionDto {
  task_id: string;
  task_title: string;
  agent_id?: string | null;
  agent_name?: string | null;
  session_count?: number | null;
  tokens: {
    input?: number | null;
    output?: number | null;
    reasoning?: number | null;
    total?: number | null;
  };
  cost: {
    estimated_usd?: number | null;
    actual_usd?: number | null;
    confidence: string;
  };
}

export interface GovernanceSignalDto {
  id: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  detected_at: string;
  related_entity?: {
    type: string;
    id: string;
    label: string;
  } | null;
}

export interface GovernanceSnapshotDto {
  total_usage: UsageMetricDto;
  budget?: BudgetConfigDto | null;
  breakdowns: {
    agents?: UsageBreakdownDto[] | null;
    models?: UsageBreakdownDto[] | null;
    providers?: UsageBreakdownDto[] | null;
    tasks?: UsageBreakdownDto[] | null;
  };
  task_attributions?: TaskCostAttributionDto[] | null;
  signals?: GovernanceSignalDto[] | null;
}
