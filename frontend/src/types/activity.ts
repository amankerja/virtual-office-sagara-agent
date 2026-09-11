export type ActivityCategory =
  | 'TASK'
  | 'AGENT'
  | 'APPROVAL'
  | 'SESSION'
  | 'DELEGATION'
  | 'SKILL'
  | 'GATEWAY'
  | 'SYSTEM'

import type { EntityReference, RelatedEntities } from './common';

export type ActivitySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export type ActivityActor = EntityReference
export type ActivityEntity = EntityReference
export type ActivityRelatedEntities = RelatedEntities

export interface ActivityProjection {
  id: string
  timestamp: string

  category: ActivityCategory
  severity: ActivitySeverity

  title: string
  description?: string

  actor?: ActivityActor
  entity?: ActivityEntity

  correlationId?: string

  related?: ActivityRelatedEntities
}

export interface ActivityQuery {
  search?: string
  category?: ActivityCategory | 'ALL'
  severity?: ActivitySeverity | 'ALL'
  timeRange?: '1h' | '24h' | '7d' | 'ALL'
  correlationId?: string
}
