/**
 * Status contract for Sagara Mission Control agents and runtime units.
 * Every status requires: label, visual icon/shape, and semantic color.
 */
export type AgentStatus =
  | 'ACTIVE'
  | 'IDLE'
  | 'RECENTLY_ACTIVE'
  | 'AWAITING_APPROVAL'
  | 'DEGRADED'
  | 'ERROR'
  | 'OFFLINE'
  | 'UNKNOWN'
  | 'CONFIGURATION_INCOMPLETE';

export interface AgentMetrics {
  totalTasksCompleted?: number;
  activeSessionDurationSeconds?: number;
  lastActiveTimestamp?: string | null;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
}

export interface AgentProjection {
  id: string;
  name: string;
  role: string;
  profileId: string;
  status: AgentStatus;
  statusDetail?: string;
  modelIdentifier?: string;
  capabilities: string[];
  metrics?: AgentMetrics;
  lastHeartbeat?: string | null;
  createdAt: string;
  updatedAt: string;
}
