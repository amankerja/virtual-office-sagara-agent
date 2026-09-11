export type ActionType =
  | 'TASK_DISPATCH'
  | 'TASK_CANCEL'
  | 'PROFILE_CHANGE_APPLY'
  | 'SKILL_ASSIGNMENT_CHANGE'
  | 'SCHEDULE_CREATE'
  | 'SCHEDULE_UPDATE'
  | 'SCHEDULE_PAUSE'
  | 'SCHEDULE_CANCEL'
  | 'SAFETY_GATE_SELF_TEST';

export type ActionIntentState =
  | 'DRAFT'
  | 'PREFLIGHTING'
  | 'PREFLIGHT_FAILED'
  | 'READY_FOR_APPROVAL'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'READY_TO_EXECUTE'
  | 'EXECUTION_DISABLED';

export type ActionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PreflightStatus = 'PASS' | 'FAIL' | 'REQUIRES_APPROVAL' | 'BLOCKED';

export interface PreflightResult {
  checkedAt: string;
  result: PreflightStatus;
  risk: ActionRisk;
  requirements: string[];
  warnings: string[];
  blockingReasons: string[];
  observedRevisions: Record<string, number>;
  runtimeEvidence: Record<string, unknown>;
  actionPlan?: {
    actionType: string;
    targetType: string;
    targetId: string;
    requiredCapabilities: string[];
    expectedRevisions: Record<string, number>;
    policyApprovalRequired: boolean;
    policyConfirmationPhrase?: string;
  };
}

export interface ActionIntent {
  id: string;
  actionType: ActionType | string;
  targetType: string;
  targetId: string;
  requestedBy: string;
  requestedAt: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  risk: ActionRisk;
  status: ActionIntentState;
  requiresApproval: boolean;
  preflightRevision: number;
  resourceRevision?: number;
  preflightResult?: PreflightResult;
  nonce: string;
  signature: string;
  expiresAt: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  executionAuthorizationId?: string;
}

export interface ActionSafetyStatus {
  executionMode: string;
  actionSigning: string;
  persistentIdempotency: string;
  auditChain: string;
  approvalPolicy: string;
  executor: string;
  controlDb: string;
  schemaVersion: number;
  activeIntentsCount: number;
  pendingApprovalsCount: number;
  killSwitchStatus?: 'LOCKED' | 'UNLOCKED' | string;
  executionFeatureEnabled?: boolean;
  trustedAuthConfigured?: boolean;
  hermesInterfaceAvailable?: boolean;
  directSessionReceiptSupported?: boolean;
  executionReady?: boolean;
}

export interface ExecutionReceiptDto {
  receipt_id: string;
  attempt_id: string;
  intent_id: string;
  task_id: string;
  profile_id: string;
  hermes_session_id: string;
  submitted_at: string;
  acknowledged_at: string;
  executor_type: string;
  executor_version: string;
  correlation_id: string;
  result: string;
  receipt_hash: string;
  created_at: string;
}

export interface ExecutionResponse {
  status: 'ACKNOWLEDGED' | 'FAILED_PRE_SUBMISSION' | 'OUTCOME_UNKNOWN' | string;
  receipt_id?: string;
  attempt_id?: string;
  hermes_session_id?: string;
  receipt_hash?: string;
  submitted_at?: string;
  acknowledged_at?: string;
  receipt?: ExecutionReceiptDto;
  error_code?: string;
  detail?: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  status: 'VALID' | 'TAMPER_DETECTED';
  detail: string;
  recordsChecked: number;
}
