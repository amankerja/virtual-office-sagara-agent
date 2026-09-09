export type ActivityCategory =
  | 'TASK'
  | 'AGENT'
  | 'APPROVAL'
  | 'SESSION'
  | 'DELEGATION'
  | 'SKILL'
  | 'GATEWAY'
  | 'SYSTEM'

export type ActivitySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface ActivityActor {
  type?: string
  id?: string
  label?: string
}

export interface ActivityEntity {
  type?: string
  id?: string
  label?: string
}

export interface ActivityRelatedEntities {
  taskId?: string
  agentId?: string
  sessionId?: string
  delegationId?: string
  approvalId?: string
  skillId?: string
}

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
