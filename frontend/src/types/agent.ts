import type { UsageMetric } from './governance';

/**
 * Status contract for Sagara Mission Control agents and runtime units.
 * Conforms to Prompt 07 Section 6 & 7.
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

// Canonical alias
export type AgentState = AgentStatus;

import type { ProfileDefinition } from './profile';

/**
 * Runtime Confidence Contract (Prompt 07 Section 11)
 */
export type RuntimeConfidence =
  | 'CONFIRMED'
  | 'INFERRED'
  | 'STALE'
  | 'UNKNOWN';

/**
 * Canonical Skill Health State
 */
export type SkillHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'MISSING'
  | 'UNKNOWN'
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

export type DelegationState =
  | 'QUEUED'
  | 'CLAIMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface AgentDelegationItem {
  id: string;
  taskTitle: string;
  workerPid?: string;
  state: DelegationState;
  startedAt: string;
  completedAt?: string;
  summary?: string;
}

/**
 * Canonical Agent Projection (Prompt 07 Section 6)
 */
export interface AgentProjection {
  id: string;

  definition: ProfileDefinition;

  runtime: {
    state: AgentStatus;
    confidence: RuntimeConfidence;
    lastActivityAt?: string;
    sessionCount?: number;
    activeDelegations?: number;
    currentSessionId?: string;
    currentTaskId?: string;
    model?: string;
    currentActivity?: string;
  };

  capabilities: {
    total?: number;
    healthy?: number;
    degraded?: number;
    missing?: number;
  };

  usage?: UsageMetric;

  skills?: AgentSkillEvidence[];
  sessions?: AgentSessionItem[];
  delegations?: AgentDelegationItem[];
}
