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

export interface OperatorPrincipal {
  id: string;
  displayName?: string;
  roles: string[];
  permissions: string[];
  authenticationStrength: string;
  source: string;
}

export interface ExecutionReadiness {
  executionReady: boolean;
  infrastructureReady: boolean;
  executionArmed?: boolean;
  canaryReady: boolean;
  liveCanaryReady: 'YES' | 'NO';
  liveCanaryExecuted: 'NO';
  components: Record<string, 'READY' | 'BLOCKED' | 'DEGRADED' | 'UNKNOWN'>;
  details: Record<string, string>;
  policyDiagnostics?: {
    activePolicyVersion?: string;
    policyHash?: string;
    toolPolicyVersion?: string;
    toolPolicyHash?: string;
    resourceRegistryVersion?: string;
  };
  driftDiagnostics?: Record<string, string>;
  toolBrokerHealth?: Record<string, unknown>;
  resourceRegistryHealth?: Record<string, unknown>;
  rateLimitState?: Record<string, unknown>;
  concurrencyState?: Record<string, unknown>;
  executionWindowDiagnostics?: Record<string, unknown>;
  lastExecutionSummary?: {
    outcome?: string;
    profile?: string;
    taskClass?: string;
    executionMode?: string;
    toolId?: string;
    timestamp?: string;
    directReceiptPresent?: boolean;
    correlationStatus?: 'CONFIRMED' | 'INFERRED' | 'UNKNOWN';
  };
  telemetry?: Record<string, unknown>;
  reasonCode?: string;
}

export interface ExecutionWindowDto {
  id: string;
  lock_name?: string;
  opened_by?: string;
  opened_at?: string;
  expires_at?: string;
  max_executions?: number;
  executions_consumed?: number;
  reason?: string;
  state?: 'OPEN' | 'EXHAUSTED' | 'EXPIRED' | 'CLOSED';
}

export interface ExecutionLockInfo {
  is_locked: boolean;
  status: 'LOCKED' | 'UNLOCKED' | string;
  persistent_lock_status?: string;
  reason: string;
  active_window?: ExecutionWindowDto | null;
  environment_enabled: boolean;
  live_canary_enabled: boolean;
}

export interface ProfileExecutionRule {
  profile_id: string;
  status: 'DISABLED' | 'LIMITED' | 'ENABLED';
  allowed_action_types: string[];
  allowed_task_classes: string[];
  allowed_execution_modes: string[];
  allowed_risk_tiers: string[];
  require_independent_approval: boolean;
  require_safe_mode: boolean;
  max_concurrency: number;
  max_executions_per_hour: number;
  timeout_seconds: number;
  external_side_effects_allowed: boolean;
  disabled_reason?: string | null;
}

export interface ProductionExecutionPolicy {
  version: string;
  policy_hash: string;
  global_execution_enabled: boolean;
  max_global_concurrency: number;
  global_tool_policy: 'DENY' | 'ALLOWLIST';
  allowed_action_types: string[];
  profiles: Record<string, ProfileExecutionRule>;
  created_at: string;
  description: string;
  supersedes_version?: string | null;
  tool_security_policy_version?: string | null;
  tool_security_policy_hash?: string | null;
  allowed_tools?: string[];
  max_tool_invocations_per_execution?: number;
}

export interface ReadOnlyResourceDto {
  resource_id: string;
  display_name: string;
  resource_type: string;
  classification: string;
  max_bytes: number;
  max_lines: number;
  enabled: boolean;
  allow_redaction: boolean;
  owner_policy: string;
}

export interface ToolOperationPolicyDto {
  operation_id: string;
  description: string;
  read_only_verified: boolean;
  argument_schema: Record<string, unknown>;
  max_result_bytes: number;
  max_result_lines: number;
  timeout_seconds: number;
}

export interface ResourceScopeDto {
  scope_type: string;
  allowed_roots: string[];
  denied_patterns: string[];
  allow_hidden: boolean;
  allow_symlinks: boolean;
  allowed_units: string[];
  allowed_properties: string[];
  allowed_tables: string[];
  allowed_profiles: string[];
}

export interface ToolCapabilityDto {
  tool_id: string;
  tool_version: string;
  implementation_fingerprint: string;
  description: string;
  risk_class: string;
  read_only_verified: boolean;
  resource_scope: ResourceScopeDto;
  operations: Record<string, ToolOperationPolicyDto>;
  network_policy: string;
  filesystem_policy: string;
  redaction_policy: string;
  audit_policy: string;
  enabled_profiles: string[];
}

export interface ToolSecurityPolicyDto {
  version: string;
  policy_hash: string;
  status: 'INSTALLED_BUT_NOT_ENABLED' | 'PROPOSED' | 'ACTIVE' | string;
  default_action: string;
  network_enabled: boolean;
  shell_enabled: boolean;
  mcp_enabled: boolean;
  arbitrary_sql_enabled: boolean;
  mutation_enabled: boolean;
  approved_capabilities: Record<string, ToolCapabilityDto>;
  denied_categories: string[];
  created_at: string;
  description: string;
}

