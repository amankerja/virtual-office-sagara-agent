/**
 * Sagara Audit API DTO (snake_case)
 * Conforms to Prompt 07 Section 38, 39. Read-only, immutable, supports explicit redaction.
 */

export interface AuditActorDto {
  type: string;
  id?: string | null;
  label?: string | null;
}

export interface AuditTargetDto {
  type?: string | null;
  id?: string | null;
  label?: string | null;
}

export interface AuditChangeDto {
  field: string;
  before?: unknown;
  after?: unknown;
  redacted?: boolean | null;
}

export interface AuditRelatedEntitiesDto {
  task_id?: string | null;
  approval_id?: string | null;
  session_id?: string | null;
  delegation_id?: string | null;
  agent_id?: string | null;
  skill_id?: string | null;
}

export interface AuditRecordDto {
  id: string;
  timestamp: string;
  actor: AuditActorDto;
  action: string;
  target?: AuditTargetDto | null;
  outcome: string;
  reason?: string | null;
  correlation_id?: string | null;
  changes?: AuditChangeDto[] | null;
  related?: AuditRelatedEntitiesDto | null;
}
