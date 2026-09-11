/**
 * Sagara Capability and Skill Domain Contracts
 * Conforms to Prompt 07 Section 9.
 *
 * Four strictly independent dimensions:
 * 1. Registration (Profile config knowledge)
 * 2. Installation (Filesystem / runtime availability)
 * 3. Health (Dependency & configuration readiness)
 * 4. Execution (Live runtime telemetry)
 */

export type SkillRegistrationState =
  | 'REGISTERED'
  | 'UNREGISTERED'
  | 'registered'
  | 'unregistered';

export type SkillInstallationState =
  | 'INSTALLED'
  | 'MISSING'
  | 'UNKNOWN'
  | 'installed'
  | 'missing'
  | 'unknown';

export type SkillHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'MISSING'
  | 'UNKNOWN'
  | 'healthy'
  | 'degraded'
  | 'missing'
  | 'unknown';

export type SkillExecutionState =
  | 'NOT_OBSERVED'
  | 'REQUESTED'
  | 'EXECUTION_UNKNOWN'
  | 'OBSERVED_ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'not_observed'
  | 'requested'
  | 'execution_unknown'
  | 'observed_active'
  | 'completed'
  | 'failed';

export interface SkillDependencySummary {
  name: string;
  type: 'cli' | 'system' | 'runtime' | 'integration' | 'python_module' | string;
  state: 'available' | 'missing' | 'degraded' | 'unknown';
  reason?: string;
}

export interface SkillRuntimeEvidence {
  id: string;
  type: 'requested' | 'invocation_observed' | 'completed' | 'failed';
  observedAt: string;
  sessionId?: string;
  agentId?: string;
  agentName?: string;
  confidence: 'confirmed' | 'inferred' | 'unknown';
  result?: 'success' | 'failure' | 'pending' | 'unknown';
  details?: string;
}

export interface SkillProfileBinding {
  profileId: string;
  profileName: string;
  bindingState: 'allowed' | 'configured' | 'requested' | 'observed';
  configuration?: string;
}

export interface SkillProjection {
  id: string;
  name: string;
  version?: string;
  description?: string;
  category: string;
  provider?: string;

  registration: SkillRegistrationState;
  installation: SkillInstallationState;
  health: SkillHealthState;
  execution: SkillExecutionState;

  boundProfiles?: string[];
  profiles?: SkillProfileBinding[];
  dependencies?: SkillDependencySummary[];
  runtimeEvidence?: SkillRuntimeEvidence[];

  invocationsCount?: number;
  lastUsedTimestamp?: string;
}

// Backward-compatibility aliases
export type SkillDefinition = SkillProjection;
export type SkillStatus = 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'UNAVAILABLE';
