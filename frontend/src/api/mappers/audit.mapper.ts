import type { AuditRecordDto } from '../dto/audit.dto';
import type { AuditRecord, AuditActorType, AuditOutcome } from '@/types/audit';
import { mapUnknownEnum } from './common.mapper';

const ALLOWED_ACTORS: readonly AuditActorType[] = ['USER', 'AGENT', 'SYSTEM', 'RUNTIME', 'UNKNOWN'];
const ALLOWED_OUTCOMES: readonly AuditOutcome[] = ['SUCCESS', 'FAILED', 'DENIED', 'CANCELLED', 'UNKNOWN'];

export function mapAuditRecordDtoToDomain(dto: AuditRecordDto): AuditRecord {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    actor: {
      type: mapUnknownEnum(dto.actor?.type, ALLOWED_ACTORS, 'UNKNOWN'),
      id: dto.actor?.id ?? undefined,
      label: dto.actor?.label ?? undefined,
    },
    action: dto.action,
    target: dto.target
      ? {
          type: dto.target.type ?? undefined,
          id: dto.target.id ?? undefined,
          label: dto.target.label ?? undefined,
        }
      : undefined,
    outcome: mapUnknownEnum(dto.outcome, ALLOWED_OUTCOMES, 'UNKNOWN'),
    reason: dto.reason ?? undefined,
    correlationId: dto.correlation_id ?? undefined,
    changes: dto.changes
      ? dto.changes.map((c) => ({
          field: c.field,
          before: c.before ?? undefined,
          after: c.after ?? undefined,
          redacted: c.redacted !== null && c.redacted !== undefined ? Boolean(c.redacted) : undefined,
        }))
      : undefined,
    related: dto.related
      ? {
          taskId: dto.related.task_id ?? undefined,
          approvalId: dto.related.approval_id ?? undefined,
          sessionId: dto.related.session_id ?? undefined,
          delegationId: dto.related.delegation_id ?? undefined,
          agentId: dto.related.agent_id ?? undefined,
          skillId: dto.related.skill_id ?? undefined,
        }
      : undefined,
  };
}
