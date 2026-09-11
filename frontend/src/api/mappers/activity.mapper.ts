import type { ActivityDto } from '../dto/activity.dto';
import type { ActivityProjection, ActivityCategory, ActivitySeverity } from '@/types/activity';
import { mapUnknownEnum } from './common.mapper';

const ALLOWED_CATEGORIES: readonly ActivityCategory[] = [
  'TASK',
  'AGENT',
  'APPROVAL',
  'SESSION',
  'DELEGATION',
  'SKILL',
  'GATEWAY',
  'SYSTEM',
];

const ALLOWED_SEVERITIES: readonly ActivitySeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

export function mapActivityDtoToDomain(dto: ActivityDto): ActivityProjection {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    category: mapUnknownEnum(dto.category, ALLOWED_CATEGORIES, 'SYSTEM'),
    severity: mapUnknownEnum(dto.severity, ALLOWED_SEVERITIES, 'INFO'),
    title: dto.title,
    description: dto.description ?? undefined,
    actor: dto.actor
      ? {
          type: dto.actor.type ?? undefined,
          id: dto.actor.id ?? undefined,
          label: dto.actor.label ?? undefined,
        }
      : undefined,
    entity: dto.entity
      ? {
          type: dto.entity.type ?? undefined,
          id: dto.entity.id ?? undefined,
          label: dto.entity.label ?? undefined,
        }
      : undefined,
    correlationId: dto.correlation_id ?? undefined,
    related: dto.related
      ? {
          taskId: dto.related.task_id ?? undefined,
          agentId: dto.related.agent_id ?? undefined,
          sessionId: dto.related.session_id ?? undefined,
          delegationId: dto.related.delegation_id ?? undefined,
          approvalId: dto.related.approval_id ?? undefined,
          skillId: dto.related.skill_id ?? undefined,
        }
      : undefined,
  };
}
