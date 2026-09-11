/**
 * Sagara Skill API DTO (snake_case)
 * Conforms to Prompt 07 Section 9, 30, 32.
 */

export interface SkillDependencyDto {
  name: string;
  type: string;
  state: string;
  reason?: string | null;
}

export interface SkillRuntimeEvidenceDto {
  id: string;
  type: string;
  observed_at: string;
  session_id?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  confidence: string;
  result?: string | null;
  details?: string | null;
}

export interface SkillProfileBindingDto {
  profile_id: string;
  profile_name: string;
  binding_state: string;
  configuration?: string | null;
}

export interface SkillDto {
  id: string;
  name: string;
  version?: string | null;
  description?: string | null;
  category: string;
  provider?: string | null;

  registration: string;
  installation: string;
  health: string;
  execution: string;

  bound_profiles?: string[] | null;
  profiles?: SkillProfileBindingDto[] | null;
  dependencies?: SkillDependencyDto[] | null;
  runtime_evidence?: SkillRuntimeEvidenceDto[] | null;

  invocations_count?: number | null;
  last_used_timestamp?: string | null;
}
