import { apiClient } from './client';
import type {
  ActionIntent,
  ActionSafetyStatus,
  AuditVerificationResult,
  ExecutionResponse,
  PreflightResult,
  OperatorPrincipal,
  ExecutionReadiness,
  ExecutionLockInfo,
  ProductionExecutionPolicy,
} from '@/types/action-safety';


interface RawActionSafetyStatus {
  execution_mode: string;
  action_signing: string;
  persistent_idempotency: string;
  audit_chain: string;
  approval_policy: string;
  executor: string;
  control_db: string;
  schema_version: number;
  active_intents_count: number;
  pending_approvals_count: number;
  kill_switch_status?: string;
  execution_feature_enabled?: boolean;
  trusted_auth_configured?: boolean;
  hermes_interface_available?: boolean;
  direct_session_receipt_supported?: boolean;
  execution_ready?: boolean;
}

interface RawAuditVerificationResult {
  valid: boolean;
  status: 'VALID' | 'TAMPER_DETECTED';
  detail: string;
  records_checked: number;
}

interface RawPreflightResult {
  checked_at: string;
  result: 'PASS' | 'FAIL' | 'REQUIRES_APPROVAL' | 'BLOCKED';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requirements: string[];
  warnings: string[];
  blocking_reasons: string[];
  observed_revisions: Record<string, number>;
  runtime_evidence: Record<string, unknown>;
  action_plan?: {
    action_type: string;
    target_type: string;
    target_id: string;
    required_capabilities: string[];
    expected_revisions: Record<string, number>;
    policy_approval_required: boolean;
    policy_confirmation_phrase?: string;
  };
}

interface RawActionIntent {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  requested_by: string;
  requested_at: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: ActionIntent['status'];
  requires_approval: boolean;
  preflight_revision: number;
  resource_revision?: number;
  preflight_result?: RawPreflightResult;
  nonce: string;
  signature: string;
  expires_at: string;
  correlation_id: string;
  created_at: string;
  updated_at: string;
  execution_authorization_id?: string;
}

export function mapPreflightResult(raw: RawPreflightResult): PreflightResult {
  return {
    checkedAt: raw.checked_at,
    result: raw.result,
    risk: raw.risk,
    requirements: raw.requirements || [],
    warnings: raw.warnings || [],
    blockingReasons: raw.blocking_reasons || [],
    observedRevisions: raw.observed_revisions || {},
    runtimeEvidence: raw.runtime_evidence || {},
    actionPlan: raw.action_plan
      ? {
          actionType: raw.action_plan.action_type,
          targetType: raw.action_plan.target_type,
          targetId: raw.action_plan.target_id,
          requiredCapabilities: raw.action_plan.required_capabilities || [],
          expectedRevisions: raw.action_plan.expected_revisions || {},
          policyApprovalRequired: raw.action_plan.policy_approval_required,
          policyConfirmationPhrase: raw.action_plan.policy_confirmation_phrase,
        }
      : undefined,
  };
}

export function mapActionIntent(raw: RawActionIntent): ActionIntent {
  return {
    id: raw.id,
    actionType: raw.action_type,
    targetType: raw.target_type,
    targetId: raw.target_id,
    requestedBy: raw.requested_by,
    requestedAt: raw.requested_at,
    payload: raw.payload || {},
    payloadHash: raw.payload_hash,
    risk: raw.risk,
    status: raw.status,
    requiresApproval: raw.requires_approval,
    preflightRevision: raw.preflight_revision,
    resourceRevision: raw.resource_revision,
    preflightResult: raw.preflight_result ? mapPreflightResult(raw.preflight_result) : undefined,
    nonce: raw.nonce,
    signature: raw.signature,
    expiresAt: raw.expires_at,
    correlationId: raw.correlation_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    executionAuthorizationId: raw.execution_authorization_id,
  };
}

export function mapActionSafetyStatus(raw: RawActionSafetyStatus): ActionSafetyStatus {
  return {
    executionMode: raw.execution_mode,
    actionSigning: raw.action_signing,
    persistentIdempotency: raw.persistent_idempotency,
    auditChain: raw.audit_chain,
    approvalPolicy: raw.approval_policy,
    executor: raw.executor,
    controlDb: raw.control_db,
    schemaVersion: raw.schema_version,
    activeIntentsCount: raw.active_intents_count,
    pendingApprovalsCount: raw.pending_approvals_count,
    killSwitchStatus: raw.kill_switch_status,
    executionFeatureEnabled: raw.execution_feature_enabled,
    trustedAuthConfigured: raw.trusted_auth_configured,
    hermesInterfaceAvailable: raw.hermes_interface_available,
    directSessionReceiptSupported: raw.direct_session_receipt_supported,
    executionReady: raw.execution_ready,
  };
}

export async function fetchActionSafetyStatus(): Promise<ActionSafetyStatus> {
  const raw = await apiClient.get<RawActionSafetyStatus>('/api/v1/action-safety/status');
  return mapActionSafetyStatus(raw);
}

export async function verifyAuditLedger(): Promise<AuditVerificationResult> {
  const raw = await apiClient.post<RawAuditVerificationResult>('/api/v1/action-safety/audit/verify');
  return {
    valid: raw.valid,
    status: raw.status,
    detail: raw.detail,
    recordsChecked: raw.records_checked,
  };
}

export async function fetchActionIntents(filters?: {
  status?: string;
  risk?: string;
  action_type?: string;
  target_id?: string;
}): Promise<ActionIntent[]> {
  const rawList = await apiClient.get<RawActionIntent[]>('/api/v1/action-intents', {
    params: filters,
  });
  return (rawList || []).map(mapActionIntent);
}

export async function fetchActionIntent(id: string): Promise<ActionIntent> {
  const raw = await apiClient.get<RawActionIntent>(`/api/v1/action-intents/${id}`);
  return mapActionIntent(raw);
}

export async function createActionIntent(dto: {
  action_type: string;
  target_type: string;
  target_id: string;
  payload?: Record<string, unknown>;
  resource_revision?: number;
  reason?: string;
}): Promise<ActionIntent> {
  const raw = await apiClient.post<RawActionIntent>('/api/v1/action-intents', dto);
  return mapActionIntent(raw);
}

export async function evaluatePreflight(id: string, dryRun = false): Promise<PreflightResult> {
  const raw = await apiClient.post<RawPreflightResult>(
    `/api/v1/action-intents/${id}/preflight`,
    undefined,
    { params: { dry_run: dryRun } }
  );
  return mapPreflightResult(raw);
}

export async function requestIntentApproval(id: string): Promise<ActionIntent> {
  const raw = await apiClient.post<RawActionIntent>(`/api/v1/action-intents/${id}/request-approval`);
  return mapActionIntent(raw);
}

export async function approveActionIntent(
  id: string,
  payload?: { reason?: string; confirmation_phrase?: string },
  expectedRevision?: number
): Promise<ActionIntent> {
  const headers: Record<string, string> = {};
  if (expectedRevision !== undefined) {
    headers['If-Match'] = `"v${expectedRevision}"`;
  }
  const raw = await apiClient.post<RawActionIntent>(
    `/api/v1/action-intents/${id}/approve`,
    payload,
    { headers }
  );
  return mapActionIntent(raw);
}

export async function rejectActionIntent(
  id: string,
  reason: string,
  expectedRevision?: number
): Promise<ActionIntent> {
  const headers: Record<string, string> = {};
  if (expectedRevision !== undefined) {
    headers['If-Match'] = `"v${expectedRevision}"`;
  }
  const raw = await apiClient.post<RawActionIntent>(
    `/api/v1/action-intents/${id}/reject`,
    { reason },
    { headers }
  );
  return mapActionIntent(raw);
}

export async function executeActionIntent(
  id: string,
  idempotencyKey?: string,
  expectedRevision?: number
): Promise<ExecutionResponse> {
  const headers: Record<string, string> = {
    'Idempotency-Key': idempotencyKey || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
  if (expectedRevision !== undefined) {
    headers['If-Match'] = `"v${expectedRevision}"`;
  }
  return await apiClient.post<ExecutionResponse>(
    `/api/v1/action-intents/${id}/execute`,
    {},
    { headers }
  );
}

export async function getMyPrincipal(): Promise<OperatorPrincipal> {
  return await apiClient.get<OperatorPrincipal>('/api/v1/auth/me');
}

export async function getExecutionReadiness(): Promise<ExecutionReadiness> {
  return await apiClient.get<ExecutionReadiness>('/api/v1/execution-readiness');
}

export async function getExecutionLock(): Promise<ExecutionLockInfo> {
  return await apiClient.get<ExecutionLockInfo>('/api/v1/execution-lock');
}

export async function unlockExecution(payload: {
  confirmation_phrase: string;
  reason: string;
  ttl_minutes?: number;
  max_executions?: number;
}): Promise<unknown> {
  return await apiClient.post('/api/v1/execution-lock/unlock', payload);
}

export async function emergencyLockExecution(reason?: string): Promise<unknown> {
  return await apiClient.post('/api/v1/execution-lock/lock', {
    reason: reason || 'Operator emergency execution lock',
  });
}

export async function getExecutionPolicy(): Promise<ProductionExecutionPolicy> {
  return await apiClient.get<ProductionExecutionPolicy>('/api/v1/execution-policy');
}

export async function getToolSecurityPolicy(): Promise<import('@/types/action-safety').ToolSecurityPolicyDto> {
  return await apiClient.get<import('@/types/action-safety').ToolSecurityPolicyDto>('/api/v1/tool-security-policy');
}

export async function getReadOnlyResources(): Promise<import('@/types/action-safety').ReadOnlyResourceDto[]> {
  return await apiClient.get<import('@/types/action-safety').ReadOnlyResourceDto[]>('/api/v1/execution-policy/resources');
}

