/**
 * Sagara Mission Control Snapshot API DTO (snake_case)
 * Conforms to Prompt 07 Section 36, 37.
 */

export interface AttentionItemDto {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  created_at: string;
  timestamp?: string | null;
  action_label?: string | null;
  target_url?: string | null;
  related_entity_ids?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
}

export interface SystemPulseDto {
  gateway: {
    status: string;
    detail: string;
  };
  profiles: {
    registered: number;
    enabled: number;
    incomplete: number;
  };
  active_agents: {
    active: number;
    enabled_total: number;
  };
  sessions: {
    active: number;
    total_agents: number;
  };
  skills: {
    healthy: number;
    degraded: number;
    missing: number;
  };
  attention: {
    count: number;
    critical_count: number;
    high_count: number;
  };
}

export interface MissionControlSnapshotDto {
  generated_at: string;
  pulse?: SystemPulseDto | null;
  attention_queue?: AttentionItemDto[] | null;
  attention?: AttentionItemDto[] | null;
  recent_activity?: unknown[] | null;
  is_mock?: boolean | null;
}
