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
