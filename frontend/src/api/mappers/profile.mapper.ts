import type { ProfileDto } from '../dto/profile.dto';
import type { ProfileDefinition } from '@/types/profile';
import { preserveNumber } from './common.mapper';

export function mapProfileDtoToDomain(dto: ProfileDto): ProfileDefinition {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role ?? undefined,
    description: dto.description ?? undefined,
    enabled: Boolean(dto.enabled),
    memoryNamespace: dto.memory_namespace ?? undefined,
    allowedSkills: dto.allowed_skills ?? undefined,
    category: dto.category ?? undefined,
    assignedAgentsCount: preserveNumber(dto.assigned_agents_count),
    tags: dto.tags ?? undefined,
    isSystem: dto.is_system !== null && dto.is_system !== undefined ? Boolean(dto.is_system) : undefined,
  };
}
