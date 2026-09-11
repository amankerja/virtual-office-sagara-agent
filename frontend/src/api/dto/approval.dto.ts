/**
 * Sagara Approval API DTO (snake_case)
 * Conforms to Prompt 07 Section 11, 23, 26, 30, 32.
 */

export interface ApprovalTargetDto {
  type?: string | null;
  label?: string | null;
}

export interface ApprovalPreviewDto {
  summary?: string | null;
  fields?: Record<string, string> | null;
  sensitive_fields?: string[] | null;
}

export interface ApprovalDecisionDto {
  decided_at?: string | null;
  decision_maker?: string | null;
  reason?: string | null;
}

export interface ApprovalAuditEntryDto {
  stage: string;
  timestamp: string;
  actor?: string | null;
  note?: string | null;
}

export interface ApprovalDto {
  id: string;
  state: string;
  risk: string;
  action_type: string;
  title: string;
  description?: string | null;
  reason_required?: boolean | string | null;
  task_id?: string | null;
  agent_id?: string | null;
  session_id?: string | null;
  requested_at: string;
  expires_at?: string | null;
  target?: ApprovalTargetDto | null;
  preview?: ApprovalPreviewDto | null;
  decision?: ApprovalDecisionDto | null;
  audit?: ApprovalAuditEntryDto[] | null;
  revision?: number | null;
  version?: number | null;
}

export interface ApprovalDecisionInputDto {
  reason?: string | null;
}
