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

import type { EntityReference, RelatedEntities } from './common';

export interface AuditActor {
  type: AuditActorType
  id?: string
  label?: string
}

export type AuditTarget = EntityReference

export interface AuditChange {
  field: string
  before?: unknown
  after?: unknown
  redacted?: boolean
}

export type AuditRelatedEntities = RelatedEntities

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
