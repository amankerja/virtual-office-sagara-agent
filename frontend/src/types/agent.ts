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

export type RuntimeConfidence =
  | 'CONFIRMED'
  | 'HIGH'
  | 'ESTIMATED'
  | 'UNCERTAIN'
  | 'UNKNOWN';

export type SkillHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'MISSING'
  | 'REQUESTED'
  | 'EXECUTION_UNKNOWN'
  | 'OBSERVED_ACTIVE';

export interface AgentSkillEvidence {
  id: string;
  name: string;
  category: string;
  health: SkillHealthState;
  evidence: 'Registered' | 'Installed' | 'Healthy' | 'Requested' | 'Observed active' | 'Execution unknown';
  description?: string;
}

export interface AgentSessionItem {
  id: string;
  source: string;
  model: string;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
  status: 'active' | 'completed' | 'idle';
}

export type DelegationState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';

export interface AgentDelegationItem {
  id: string;
  taskTitle: string;
  workerPid?: string;
  state: DelegationState;
  startedAt: string;
  completedAt?: string;
  summary?: string;
}

export interface AgentProjection {
  id: string;

  definition: {
    name: string;
    role?: string;
    description?: string;
    enabled: boolean;
    configurationState?: 'COMPLETE' | 'INCOMPLETE' | 'DISABLED';
  };

  runtime: {
    state: AgentStatus;
    confidence: RuntimeConfidence;
    lastActivityAt?: string;
    sessionCount?: number;
    activeDelegations?: number;
    model?: string;
    currentActivity?: string;
  };

  capabilities: {
    total?: number;
    healthy?: number;
    degraded?: number;
    missing?: number;
  };

  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    reasoningTokens?: number;
    estimatedCostUsd?: number;
  };

  skills?: AgentSkillEvidence[];
  sessions?: AgentSessionItem[];
  delegations?: AgentDelegationItem[];
}
