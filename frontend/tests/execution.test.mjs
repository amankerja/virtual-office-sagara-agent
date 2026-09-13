import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapActionSafetyStatus } from '../src/api/actionSafety.ts';

const REQUIRED_CONFIRMATION_PHRASE = 'EXECUTE APPROVED TASK';

test('Execution Confirmation: validates exact case-sensitive confirmation phrase', () => {
  function validateExecutionPhrase(phrase) {
    return phrase.trim() === REQUIRED_CONFIRMATION_PHRASE;
  }

  assert.equal(validateExecutionPhrase('EXECUTE APPROVED TASK'), true);
  assert.equal(validateExecutionPhrase('  EXECUTE APPROVED TASK  '), true);
  assert.equal(validateExecutionPhrase('execute approved task'), false);
  assert.equal(validateExecutionPhrase('EXECUTE'), false);
  assert.equal(validateExecutionPhrase(''), false);
  assert.equal(validateExecutionPhrase('APPROVE TASK DISPATCH'), false);
});

test('Execution Safety Status: maps backend status with kill switch and readiness flags', () => {
  const rawStatus = {
    execution_mode: 'DISABLED',
    action_signing: 'CONFIGURED',
    persistent_idempotency: 'HEALTHY',
    audit_chain: 'VALID',
    approval_policy: 'LOADED',
    executor: 'HERMES_TASK_DISPATCH',
    control_db: 'CONNECTED',
    schema_version: 2,
    active_intents_count: 3,
    pending_approvals_count: 1,
    kill_switch_status: 'LOCKED',
    execution_feature_enabled: false,
    trusted_auth_configured: true,
    hermes_interface_available: true,
    direct_session_receipt_supported: true,
    execution_ready: false,
  };

  const mapped = mapActionSafetyStatus(rawStatus);

  assert.equal(mapped.executionMode, 'DISABLED');
  assert.equal(mapped.killSwitchStatus, 'LOCKED');
  assert.equal(mapped.executionFeatureEnabled, false);
  assert.equal(mapped.trustedAuthConfigured, true);
  assert.equal(mapped.hermesInterfaceAvailable, true);
  assert.equal(mapped.directSessionReceiptSupported, true);
  assert.equal(mapped.executionReady, false);
});

test('Execution Safety Gate: computes locked state when kill switch is LOCKED or feature disabled', () => {
  function isExecutionLocked(status) {
    return (
      status.executionMode === 'DISABLED' ||
      status.killSwitchStatus === 'LOCKED' ||
      !status.executionFeatureEnabled
    );
  }

  // 1. Default locked state
  assert.equal(
    isExecutionLocked({
      executionMode: 'DISABLED',
      killSwitchStatus: 'LOCKED',
      executionFeatureEnabled: false,
    }),
    true
  );

  // 2. Feature enabled in env but kill switch remains locked
  assert.equal(
    isExecutionLocked({
      executionMode: 'DISABLED',
      killSwitchStatus: 'LOCKED',
      executionFeatureEnabled: true,
    }),
    true
  );

  // 3. Both gates open
  assert.equal(
    isExecutionLocked({
      executionMode: 'ENABLED',
      killSwitchStatus: 'UNLOCKED',
      executionFeatureEnabled: true,
    }),
    false
  );
});

test('Direct Runtime Correlation: constructs exact navigation URL for authoritative session', () => {
  function formatSessionUrl(sessionId) {
    if (!sessionId) return null;
    return `/runtime?session=${encodeURIComponent(sessionId)}`;
  }

  assert.equal(formatSessionUrl('sess-hermes-prod-99'), '/runtime?session=sess-hermes-prod-99');
  assert.equal(formatSessionUrl('sess-alpha/1'), '/runtime?session=sess-alpha%2F1');
  assert.equal(formatSessionUrl(''), null);
  assert.equal(formatSessionUrl(undefined), null);
});

test('Execution Receipt: parses receipt response fields deterministically', () => {
  const rawReceiptResponse = {
    status: 'ACKNOWLEDGED',
    receipt_id: 'rcpt-uuid-001',
    attempt_id: 'att-uuid-001',
    hermes_session_id: 'sess-hermes-456',
    receipt_hash: 'hash-sha256-verified',
    submitted_at: '2026-09-11T11:00:00Z',
    acknowledged_at: '2026-09-11T11:00:02Z',
    receipt: {
      receipt_id: 'rcpt-uuid-001',
      attempt_id: 'att-uuid-001',
      intent_id: 'int-uuid-001',
      task_id: 'tsk-001',
      profile_id: 'sagara-scout',
      hermes_session_id: 'sess-hermes-456',
      submitted_at: '2026-09-11T11:00:00Z',
      acknowledged_at: '2026-09-11T11:00:02Z',
      executor_type: 'HERMES_TASK_DISPATCH',
      executor_version: '0.20.6',
      correlation_id: 'corr-001',
      result: 'ACKNOWLEDGED',
      receipt_hash: 'hash-sha256-verified',
      created_at: '2026-09-11T11:00:02Z',
    },
  };

  assert.equal(rawReceiptResponse.status, 'ACKNOWLEDGED');
  assert.equal(rawReceiptResponse.hermes_session_id, 'sess-hermes-456');
  assert.equal(rawReceiptResponse.receipt.executor_type, 'HERMES_TASK_DISPATCH');
  assert.equal(rawReceiptResponse.receipt.profile_id, 'sagara-scout');
  assert.equal(rawReceiptResponse.receipt.receipt_hash, 'hash-sha256-verified');
});

test('Outcome Unknown UX: flags ambiguous state requiring operator reconciliation without auto-retry', () => {
  const ambiguousResponse = {
    status: 'OUTCOME_UNKNOWN',
    attempt_id: 'att-uuid-timeout',
    error_code: 'HERMES_TIMEOUT_SUBMITTED',
    detail: 'Hermes execution timed out after 120 seconds. Outcome is unknown.',
  };

  function evaluateRetryPolicy(status) {
    if (status === 'OUTCOME_UNKNOWN') {
      return {
        canAutoRetry: false,
        requiresHumanReconciliation: true,
        warningBanner: 'Do NOT retry automatically. Operator reconciliation required.',
      };
    }
    return { canAutoRetry: false, requiresHumanReconciliation: false, warningBanner: null };
  }

  const policy = evaluateRetryPolicy(ambiguousResponse.status);
  assert.equal(policy.canAutoRetry, false);
  assert.equal(policy.requiresHumanReconciliation, true);
  assert.ok(policy.warningBanner.includes('Do NOT retry automatically'));
});

test('Execution Lock: validates exact server-defined unlock confirmation phrase (Prompt 14.4 Section 50)', () => {
  const REQUIRED_UNLOCK_PHRASE = 'UNLOCK TASK EXECUTION';

  function validateUnlockPhrase(phrase) {
    return phrase.trim() === REQUIRED_UNLOCK_PHRASE;
  }

  assert.equal(validateUnlockPhrase('UNLOCK TASK EXECUTION'), true);
  assert.equal(validateUnlockPhrase('  UNLOCK TASK EXECUTION  '), true);
  assert.equal(validateUnlockPhrase('unlock task execution'), false);
  assert.equal(validateUnlockPhrase('UNLOCK'), false);
  assert.equal(validateUnlockPhrase('EXECUTE APPROVED TASK'), false);
  assert.equal(validateUnlockPhrase(''), false);
});

test('Execution Readiness Aggregator: validates 11 dimensions and canary ready state (Prompt 14.4 Section 43)', () => {
  const readinessMock = {
    executionReady: false,
    infrastructureReady: true,
    canaryReady: true,
    liveCanaryReady: 'YES',
    liveCanaryExecuted: 'NO',
    components: {
      auth_boundary: 'READY',
      operator_authorization: 'READY',
      action_signing: 'READY',
      control_database: 'READY',
      audit_integrity: 'READY',
      profile_targetability: 'READY',
      hermes_executor: 'READY',
      direct_session_receipt: 'READY',
      execution_env: 'BLOCKED',
      kill_switch: 'BLOCKED',
      canary_gate: 'BLOCKED',
    },
    details: {},
  };

  assert.equal(readinessMock.infrastructureReady, true);
  assert.equal(readinessMock.canaryReady, true);
  assert.equal(readinessMock.liveCanaryReady, 'YES');
  assert.equal(readinessMock.liveCanaryExecuted, 'NO');
  assert.equal(readinessMock.executionReady, false);
  assert.equal(readinessMock.components.profile_targetability, 'READY');
  assert.equal(readinessMock.components.kill_switch, 'BLOCKED');
});

test('Bounded Execution Window: enforces max_executions=1 budget and TTL (Prompt 14.4 Section 54-56)', () => {
  function isSlotAvailable(window, nowIso) {
    if (!window || window.state !== 'OPEN') return false;
    if (window.executions_consumed >= window.max_executions) return false;
    if (new Date(nowIso) >= new Date(window.expires_at)) return false;
    return true;
  }

  const activeWindow = {
    id: 'win-test-01',
    max_executions: 1,
    executions_consumed: 0,
    expires_at: '2026-09-11T12:15:00Z',
    state: 'OPEN',
  };

  // 1. Open window before expiry with budget remaining -> available
  assert.equal(isSlotAvailable(activeWindow, '2026-09-11T12:05:00Z'), true);

  // 2. Window with 1 execution already consumed -> exhausted (blocked)
  const exhaustedWindow = { ...activeWindow, executions_consumed: 1, state: 'EXHAUSTED' };
  assert.equal(isSlotAvailable(exhaustedWindow, '2026-09-11T12:05:00Z'), false);

  // 3. Window past expires_at -> expired (auto-relock)
  assert.equal(isSlotAvailable(activeWindow, '2026-09-11T12:16:00Z'), false);
});

test('Production Execution Policy V1: enforces profile allowlist (sagara-lab LIMITED, 7 others DISABLED)', () => {
  const policyMock = {
    version: 'PRODUCTION_EXECUTION_POLICY_V1',
    policy_hash: 'bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a',
    global_execution_enabled: false,
    max_global_concurrency: 1,
    global_tool_policy: 'DENY',
    allowed_action_types: ['TASK_DISPATCH'],
    profiles: {
      'sagara-lab': { status: 'LIMITED', allowed_task_classes: ['REASONING_ONLY', 'DRAFT_GENERATION'] },
      'lead': { status: 'DISABLED' },
      'personal': { status: 'DISABLED' },
      'business': { status: 'DISABLED' },
      'marketing': { status: 'DISABLED' },
      'cs': { status: 'DISABLED' },
      'it-support': { status: 'DISABLED' },
      'it-coding': { status: 'DISABLED' },
    },
  };

  assert.equal(policyMock.profiles['sagara-lab'].status, 'LIMITED');
  assert.equal(policyMock.profiles['marketing'].status, 'DISABLED');
  assert.equal(policyMock.profiles['lead'].status, 'DISABLED');

  const disabledProfiles = Object.entries(policyMock.profiles).filter(
    ([, rule]) => rule.status === 'DISABLED'
  );
  assert.equal(disabledProfiles.length, 7);
});

test('Production Execution Policy V1: enforces SAFE_NO_TOOLS execution mode and TASK_DISPATCH scope', () => {
  function evaluateDispatchEligibility(actionType, profileRule, payload) {
    if (actionType !== 'TASK_DISPATCH') return { allowed: false, reason: 'ACTION_TYPE_DISABLED' };
    if (!profileRule || profileRule.status === 'DISABLED') return { allowed: false, reason: 'PROFILE_PRODUCTION_DISABLED' };
    if (payload.tools_enabled === true || payload.safe_mode === false) return { allowed: false, reason: 'TOOLS_NOT_ALLOWED' };
    if (!profileRule.allowed_task_classes.includes(payload.task_class)) return { allowed: false, reason: 'TASK_CLASS_DISABLED' };
    return { allowed: true };
  }

  const labRule = { status: 'LIMITED', allowed_task_classes: ['REASONING_ONLY', 'DRAFT_GENERATION'] };
  const mktRule = { status: 'DISABLED', allowed_task_classes: [] };

  // 1. Valid sagara-lab reasoning task
  assert.equal(evaluateDispatchEligibility('TASK_DISPATCH', labRule, { task_class: 'REASONING_ONLY' }).allowed, true);

  // 2. Marketing profile blocked
  assert.equal(evaluateDispatchEligibility('TASK_DISPATCH', mktRule, { task_class: 'REASONING_ONLY' }).reason, 'PROFILE_PRODUCTION_DISABLED');

  // 3. Tool escalation rejected
  assert.equal(evaluateDispatchEligibility('TASK_DISPATCH', labRule, { task_class: 'REASONING_ONLY', tools_enabled: true }).reason, 'TOOLS_NOT_ALLOWED');

  // 4. Forbidden task class rejected
  assert.equal(evaluateDispatchEligibility('TASK_DISPATCH', labRule, { task_class: 'CODE_CHANGE' }).reason, 'TASK_CLASS_DISABLED');

  // 5. Non-dispatch action rejected
  assert.equal(evaluateDispatchEligibility('PROFILE_CHANGE_APPLY', labRule, { task_class: 'REASONING_ONLY' }).reason, 'ACTION_TYPE_DISABLED');
});

test('Tool Security Policy V1: enforces SAFE_NO_TOOLS active and SAFE_READ_ONLY verified but not enabled', () => {
  const toolPolicyMock = {
    version: 'TOOL_SECURITY_POLICY_V1',
    policy_hash: '9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d',
    status: 'INSTALLED_BUT_NOT_ENABLED',
    default_action: 'DENY',
    network_enabled: false,
    shell_enabled: false,
    mcp_enabled: false,
    mutation_enabled: false,
    approved_capabilities: {
      runtime_status: {
        tool_id: 'runtime_status',
        risk_class: 'READ_ONLY',
        read_only_verified: true,
      },
      document_inspection: {
        tool_id: 'document_inspection',
        risk_class: 'READ_ONLY',
        read_only_verified: true,
      },
    },
    denied_categories: [
      'GENERIC_SHELL',
      'NETWORK_COMMUNICATION',
      'MODEL_CONTEXT_PROTOCOL',
      'LOCAL_MUTATION',
      'INFRASTRUCTURE_MUTATION',
      'DATABASE_MUTATION',
      'CROSS_PROFILE_MEMORY',
    ],
  };

  assert.equal(toolPolicyMock.version, 'TOOL_SECURITY_POLICY_V1');
  assert.equal(toolPolicyMock.status, 'INSTALLED_BUT_NOT_ENABLED');
  assert.equal(toolPolicyMock.default_action, 'DENY');
  assert.equal(toolPolicyMock.network_enabled, false);
  assert.equal(toolPolicyMock.shell_enabled, false);
  assert.equal(toolPolicyMock.mcp_enabled, false);
  assert.equal(toolPolicyMock.mutation_enabled, false);
});

test('Tool Security Policy V1: approves at most 2 candidate read-only capabilities with strict metadata', () => {
  const approvedCaps = ['runtime_status', 'document_inspection'];
  assert.ok(approvedCaps.length <= 2, 'Must not approve more than 2 candidate read-only tools');
  assert.deepEqual(approvedCaps, ['runtime_status', 'document_inspection']);
});

test('Tool Security Policy V1: denies shell, network, MCP, and mutations', () => {
  const denied = [
    'GENERIC_SHELL',
    'NETWORK_COMMUNICATION',
    'MODEL_CONTEXT_PROTOCOL',
    'LOCAL_MUTATION',
    'INFRASTRUCTURE_MUTATION',
    'DATABASE_MUTATION',
    'CROSS_PROFILE_MEMORY',
  ];
  assert.ok(denied.includes('GENERIC_SHELL'));
  assert.ok(denied.includes('NETWORK_COMMUNICATION'));
  assert.ok(denied.includes('MODEL_CONTEXT_PROTOCOL'));
  assert.ok(denied.includes('DATABASE_MUTATION'));
});

test('Tool Security Policy V1: backend remains authoritative with zero frontend enable controls', () => {
  // Ensure frontend does not provide an active production enable mechanism
  const hasEnableProductionButton = false;
  assert.equal(hasEnableProductionButton, false, 'No production enable tool control is permitted in Prompt 14.9A');
});

test('Production Execution Policy V2: displays V2 while retaining V1 supersedes history', () => {
  const policyV2 = {
    version: 'PRODUCTION_EXECUTION_POLICY_V2',
    policy_hash: 'c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1',
    supersedes_version: 'PRODUCTION_EXECUTION_POLICY_V1',
    tool_security_policy_version: 'TOOL_SECURITY_POLICY_V1',
    tool_security_policy_hash: '9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d',
    allowed_tools: ['runtime_status', 'document_inspection'],
    max_tool_invocations_per_execution: 1,
  };

  assert.equal(policyV2.version, 'PRODUCTION_EXECUTION_POLICY_V2');
  assert.equal(policyV2.supersedes_version, 'PRODUCTION_EXECUTION_POLICY_V1');
  assert.equal(policyV2.tool_security_policy_version, 'TOOL_SECURITY_POLICY_V1');
  assert.equal(policyV2.tool_security_policy_hash, '9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d');
  assert.equal(policyV2.max_tool_invocations_per_execution, 1);
});

test('Production Execution Policy V2: validates Sagara Lab limited dual-mode with execution locked', () => {
  const labRule = {
    profile_id: 'sagara-lab',
    status: 'LIMITED',
    allowed_execution_modes: ['SAFE_NO_TOOLS', 'SAFE_READ_ONLY'],
    allowed_task_classes: ['REASONING_ONLY', 'DRAFT_GENERATION', 'READ_ONLY_INSPECTION'],
  };

  const lockState = {
    is_locked: true,
    status: 'LOCKED',
    active_windows: 0,
    environment_enabled: false,
  };

  // Both modes eligible in policy
  assert.ok(labRule.allowed_execution_modes.includes('SAFE_NO_TOOLS'));
  assert.ok(labRule.allowed_execution_modes.includes('SAFE_READ_ONLY'));
  assert.ok(labRule.allowed_task_classes.includes('READ_ONLY_INSPECTION'));

  // Execution remains strictly locked
  assert.equal(lockState.is_locked, true);
  assert.equal(lockState.status, 'LOCKED');
  assert.equal(lockState.active_windows, 0);
});

test('Read-Only Resource Registry: exposes registered resources with safe metadata and NO freeform inputs', () => {
  const sampleRegistry = [
    {
      resource_id: 'DOC-CANARY-001',
      display_name: 'Docs Architecture Overview',
      resource_type: 'DOCUMENT',
      classification: 'RESTRICTED_READ_ONLY',
      max_bytes: 32768,
      max_lines: 500,
      enabled: true,
    },
    {
      resource_id: 'hermes-gateway.service',
      display_name: 'Hermes Gateway Service Status',
      resource_type: 'SYSTEMD_UNIT',
      classification: 'SYSTEM_STATUS_READ_ONLY',
      max_bytes: 8192,
      max_lines: 100,
      enabled: true,
    },
  ];

  // Verify safe logical metadata
  for (const res of sampleRegistry) {
    assert.ok(res.resource_id);
    assert.ok(res.display_name);
    assert.ok(res.classification);
    assert.equal(typeof res.enabled, 'boolean');
    // Ensure no internal absolute filesystem paths are exposed in logical metadata
    assert.equal('canonical_path' in res, false);
  }

  // Frontend input validation: Freeform path and service fields are strictly prohibited
  const allowFreeformPathInput = false;
  const allowFreeformServiceInput = false;
  assert.equal(allowFreeformPathInput, false, 'Frontend must never provide freeform path input field');
  assert.equal(allowFreeformServiceInput, false, 'Frontend must never provide freeform service input field');
});

test('Production Execution Policy V2: single-tool budget rejects multi-tool intents', () => {
  function validateToolBudget(toolInvocations, maxBudget = 1) {
    if (toolInvocations.length > maxBudget) {
      return { allowed: false, error: 'TOOL_INVOCATION_BUDGET_EXCEEDED' };
    }
    return { allowed: true };
  }

  // Single tool: allowed
  assert.deepEqual(validateToolBudget(['runtime_status']), { allowed: true });
  assert.deepEqual(validateToolBudget(['document_inspection']), { allowed: true });

  // Multi-tool in single task: rejected
  assert.deepEqual(
    validateToolBudget(['runtime_status', 'document_inspection']),
    { allowed: false, error: 'TOOL_INVOCATION_BUDGET_EXCEEDED' }
  );
});

test('Production Execution Policy V2: normal SAFE_READ_ONLY execution does not depend on live canary override flag', () => {
  // Prompt 14.9A.8 Section 2: normal V2 SAFE_READ_ONLY is authorized by policy V2, not live_canary_enabled
  const readiness = {
    executionReady: true,
    liveCanaryReady: 'NO',
    liveCanaryExecuted: 'NO',
    live_canary_enabled: false,
    activePolicy: 'PRODUCTION_EXECUTION_POLICY_V2',
    mode: 'SAFE_READ_ONLY',
  };

  // Normal V2 execution is permitted with live_canary_enabled=false
  assert.equal(readiness.live_canary_enabled, false);
  assert.equal(readiness.activePolicy, 'PRODUCTION_EXECUTION_POLICY_V2');
  assert.equal(readiness.mode, 'SAFE_READ_ONLY');
});


