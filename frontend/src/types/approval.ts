export type ApprovalState =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'

export type ApprovalRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ApprovalActionType =
  | 'SEND_EMAIL'
  | 'POST_CONTENT'
  | 'WRITE_EXTERNAL'
  | 'DELETE_EXTERNAL'
  | 'EXECUTE_CODE'
  | 'INFRASTRUCTURE_CHANGE'
  | 'FINANCIAL_ACTION'
  | 'OTHER'

export interface ApprovalTarget {
  type?: string
  label?: string
}

export interface ApprovalPreview {
  summary?: string
  fields?: Record<string, string>
  sensitiveFields?: string[]
}

export interface ApprovalDecision {
  decidedAt?: string
  decisionMaker?: string
  reason?: string
}

export interface ApprovalAuditEntry {
  stage: string
  timestamp: string
  actor?: string
  note?: string
}

export interface ApprovalProjection {
  id: string
  state: ApprovalState
  risk: ApprovalRisk
  actionType: ApprovalActionType

  title: string
  description?: string
  reasonRequired?: string

  taskId?: string
  agentId?: string
  sessionId?: string

  requestedAt: string
  expiresAt?: string

  target?: ApprovalTarget
  preview?: ApprovalPreview
  decision?: ApprovalDecision
  audit?: ApprovalAuditEntry[]
}

export interface ApprovalDecisionInput {
  reason?: string
}

export interface ApprovalQuery {
  risk?: ApprovalRisk | 'ALL'
  actionType?: ApprovalActionType | 'ALL'
  state?: ApprovalState | 'ALL'
  search?: string
}
