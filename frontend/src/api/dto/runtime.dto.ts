/**
 * Sagara Runtime API DTO (snake_case)
 * Conforms to Prompt 07 Section 12, 13, 14, 30, 32.
 */

export interface GatewayDto {
  state: string;
  backend_id: string;
  pid?: number | null;
  host: string;
  started_at?: string | null;
  last_heartbeat?: string | null;
  last_heartbeat_at?: string | null;
  heartbeat_age_seconds?: number | null;
  restart_count?: number | null;
  status_message?: string | null;
}

export interface SessionMessageDto {
  id: string;
  role: string;
  timestamp: string;
  content_preview: string;
  is_sensitive?: boolean | null;
  redacted_reason?: string | null;
  tool_association?: string | null;
}

export interface SessionToolActivityDto {
  id: string;
  tool_name: string;
  state: string;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  result_summary?: string | null;
}

export interface SessionUsageDto {
  api_calls?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_write_tokens?: number | null;
  reasoning_tokens?: number | null;
  estimated_cost_usd?: number | null;
  actual_cost_usd?: number | null;
  billing_status?: string | null;
}

export interface SessionDto {
  id: string;
  agent_id?: string | null;
  agent_name?: string | null;
  profile_id?: string | null;
  source?: string | null;
  model?: string | null;
  provider?: string | null;
  started_at?: string | null;
  last_activity_at?: string | null;
  state?: string | null;
  message_count?: number | null;
  messages_count?: number | null;
  tool_call_count?: number | null;
  tools_count?: number | null;
  parent_session_id?: string | null;
  child_session_ids?: string[] | null;
  delegation_ids?: string[] | null;
  end_reason?: string | null;
  usage?: SessionUsageDto | null;
  messages?: SessionMessageDto[] | null;
  tools?: SessionToolActivityDto[] | null;
}

export interface DelegationTimelineEventDto {
  stage: string;
  timestamp: string;
  details?: string | null;
}

export interface DelegationDto {
  id: string;
  task_title: string;
  task_description?: string | null;
  origin_agent_id: string;
  origin_agent_name?: string | null;
  origin_session_id: string;
  parent_session_id?: string | null;
  state: string;
  owner_pid?: number | null;
  delivery_state?: string | null;
  started_at: string;
  updated_at: string;
  completed_at?: string | null;
  result_summary?: string | null;
  timeline?: DelegationTimelineEventDto[] | null;
}

export interface RuntimeEventDto {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  entity: string;
  entity_id?: string | null;
  message: string;
  correlation_id?: string | null;
}

export interface SystemLoadDto {
  cpu_percent?: number | null;
  memory_used_mb?: number | null;
  memory_total_mb?: number | null;
  memory_percent?: number | null;
}

export interface RuntimeOverviewDto {
  health: {
    gateway: string;
    runtime_data: string;
    sessions: string;
    delegations: string;
    usage: string;
  };
  gateway: GatewayDto;
  active_sessions_count?: number | null;
  running_delegations_count?: number | null;
  total_cost_estimate_usd?: number | null;
  recent_events?: RuntimeEventDto[] | null;
  system_load?: SystemLoadDto | null;
}
