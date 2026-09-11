/**
 * Sagara Agent API DTO (snake_case)
 * Conforms to Prompt 07 Section 6, 30, 32.
 */

export interface AgentDefinitionDto {
  name: string;
  role?: string | null;
  description?: string | null;
  enabled: boolean;
  memory_namespace?: string | null;
  configuration_state?: string | null;
}

export interface AgentRuntimeDto {
  state: string;
  confidence: string;
  last_activity_at?: string | null;
  session_count?: number | null;
  active_delegations?: number | null;
  current_session_id?: string | null;
  current_task_id?: string | null;
  model?: string | null;
  current_activity?: string | null;
}

export interface AgentCapabilitiesDto {
  total?: number | null;
  healthy?: number | null;
  degraded?: number | null;
  missing?: number | null;
}

export interface AgentUsageDto {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_write_tokens?: number | null;
  reasoning_tokens?: number | null;
  api_calls?: number | null;
  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
}

export interface AgentSkillEvidenceDto {
  id: string;
  name: string;
  category: string;
  health: string;
  evidence: string;
  description?: string | null;
}

export interface AgentSessionItemDto {
  id: string;
  source: string;
  model: string;
  started_at: string;
  last_activity_at: string;
  message_count: number;
  status: string;
}

export interface AgentDelegationItemDto {
  id: string;
  task_title: string;
  worker_pid?: string | null;
  state: string;
  started_at: string;
  completed_at?: string | null;
  summary?: string | null;
}

export interface AgentDto {
  id: string;
  definition: AgentDefinitionDto;
  runtime: AgentRuntimeDto;
  capabilities: AgentCapabilitiesDto;
  usage?: AgentUsageDto | null;
  skills?: AgentSkillEvidenceDto[] | null;
  sessions?: AgentSessionItemDto[] | null;
  delegations?: AgentDelegationItemDto[] | null;
}
