import type { SkillDto } from '../dto/skill.dto';
import type {
  SkillProjection,
  SkillRegistrationState,
  SkillInstallationState,
  SkillHealthState,
  SkillExecutionState,
} from '@/types/skill';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_REGISTRATION: readonly SkillRegistrationState[] = ['REGISTERED', 'UNREGISTERED'];
const ALLOWED_INSTALLATION: readonly SkillInstallationState[] = ['INSTALLED', 'MISSING', 'UNKNOWN'];
const ALLOWED_HEALTH: readonly SkillHealthState[] = ['HEALTHY', 'DEGRADED', 'MISSING', 'UNKNOWN'];
const ALLOWED_EXECUTION: readonly SkillExecutionState[] = [
  'NOT_OBSERVED',
  'REQUESTED',
  'EXECUTION_UNKNOWN',
  'OBSERVED_ACTIVE',
  'COMPLETED',
  'FAILED',
];

export function mapSkillDtoToDomain(dto: SkillDto): SkillProjection {
  return {
    id: dto.id,
    name: dto.name,
    version: dto.version ?? undefined,
    description: dto.description ?? undefined,
    category: dto.category,
    provider: dto.provider ?? undefined,

    registration: mapUnknownEnum(dto.registration, ALLOWED_REGISTRATION, 'UNREGISTERED'),
    installation: mapUnknownEnum(dto.installation, ALLOWED_INSTALLATION, 'UNKNOWN'),
    health: mapUnknownEnum(dto.health, ALLOWED_HEALTH, 'UNKNOWN'),
    execution: mapUnknownEnum(dto.execution, ALLOWED_EXECUTION, 'EXECUTION_UNKNOWN'),

    boundProfiles: dto.bound_profiles ?? undefined,
    profiles: dto.profiles
      ? dto.profiles.map((p) => ({
          profileId: p.profile_id,
          profileName: p.profile_name,
          bindingState: mapUnknownEnum(p.binding_state, ['allowed', 'configured', 'requested', 'observed'] as const, 'allowed'),
          configuration: p.configuration ?? undefined,
        }))
      : undefined,

    dependencies: dto.dependencies
      ? dto.dependencies.map((d) => ({
          name: d.name,
          type: d.type,
          state: mapUnknownEnum(d.state, ['available', 'missing', 'degraded', 'unknown'] as const, 'unknown'),
          reason: d.reason ?? undefined,
        }))
      : undefined,

    runtimeEvidence: dto.runtime_evidence
      ? dto.runtime_evidence.map((e) => ({
          id: e.id,
          type: mapUnknownEnum(e.type, ['requested', 'invocation_observed', 'completed', 'failed'] as const, 'requested'),
          observedAt: e.observed_at,
          sessionId: e.session_id ?? undefined,
          agentId: e.agent_id ?? undefined,
          agentName: e.agent_name ?? undefined,
          confidence: mapUnknownEnum(e.confidence, ['confirmed', 'inferred', 'unknown'] as const, 'unknown'),
          result: e.result ? mapUnknownEnum(e.result, ['success', 'failure', 'pending', 'unknown'] as const, 'unknown') : undefined,
          details: e.details ?? undefined,
        }))
      : undefined,

    invocationsCount: preserveNumber(dto.invocations_count),
    lastUsedTimestamp: dto.last_used_timestamp ?? undefined,
  };
}
