export type AuditActorType =
  | 'USER'
  | 'AGENT'
  | 'SYSTEM'
  | 'RUNTIME'
  | 'UNKNOWN'

export type AuditOutcome =
  | 'SUCCESS'
  | 'FAILED'
  | 'DENIED'
  | 'CANCELLED'
  | 'UNKNOWN'

export interface AuditActor {
  type: AuditActorType
  id?: string
  label?: string
}

export interface AuditTarget {
  type?: string
  id?: string
  label?: string
}

export interface AuditChange {
  field: string
  before?: unknown
  after?: unknown
  redacted?: boolean
}

export interface AuditRelatedEntities {
  taskId?: string
  approvalId?: string
  sessionId?: string
  delegationId?: string
  agentId?: string
  skillId?: string
}

export interface AuditRecord {
  id: string
  timestamp: string

  actor: AuditActor
  action: string
  target?: AuditTarget

  outcome: AuditOutcome
  reason?: string

  correlationId?: string

  changes?: AuditChange[]
  related?: AuditRelatedEntities
}

export interface AuditQuery {
  search?: string
  actorType?: AuditActorType | 'ALL'
  outcome?: AuditOutcome | 'ALL'
  timeRange?: '1h' | '24h' | '7d' | 'ALL'
  correlationId?: string
}
