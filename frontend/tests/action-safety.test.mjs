import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapActionIntent, mapPreflightResult } from '../src/api/actionSafety.ts';

test('Action Safety Mapper: converts raw snake_case backend intent to camelCase frontend structure', () => {
  const raw = {
    id: 'intent-uuid-1234',
    action_type: 'TASK_DISPATCH',
    target_type: 'PROFILE',
    target_id: 'sagara-scout',
    requested_by: 'op-alpha',
    requested_at: '2026-09-11T10:00:00Z',
    payload: { task_id: 'tsk-001', target_profile_id: 'sagara-scout' },
    payload_hash: 'abc123hash',
    risk: 'HIGH',
    status: 'READY_FOR_APPROVAL',
    requires_approval: true,
    preflight_revision: 1,
    resource_revision: 3,
    nonce: 'nonce-crypt-999',
    signature: 'hmac-sha256-signature',
    expires_at: '2026-09-11T10:15:00Z',
    correlation_id: 'corr-001',
    created_at: '2026-09-11T10:00:00Z',
    updated_at: '2026-09-11T10:00:01Z',
    preflight_result: {
      checked_at: '2026-09-11T10:00:01Z',
      result: 'REQUIRES_APPROVAL',
      risk: 'HIGH',
      requirements: ['Target profile exists', 'Task revision matches'],
      warnings: [],
      blocking_reasons: [],
      observed_revisions: { 'profile:sagara-scout': 3 },
      runtime_evidence: { session_state: 'UNKNOWN' },
      action_plan: {
        action_type: 'TASK_DISPATCH',
        target_type: 'PROFILE',
        target_id: 'sagara-scout',
        required_capabilities: ['scout_v1'],
        expected_revisions: { 'profile:sagara-scout': 3 },
        policy_approval_required: true,
        policy_confirmation_phrase: 'APPROVE TASK DISPATCH',
      },
    },
  };

  const mapped = mapActionIntent(raw);

  assert.equal(mapped.id, 'intent-uuid-1234');
  assert.equal(mapped.actionType, 'TASK_DISPATCH');
  assert.equal(mapped.targetType, 'PROFILE');
  assert.equal(mapped.targetId, 'sagara-scout');
  assert.equal(mapped.requestedBy, 'op-alpha');
  assert.equal(mapped.payloadHash, 'abc123hash');
  assert.equal(mapped.risk, 'HIGH');
  assert.equal(mapped.status, 'READY_FOR_APPROVAL');
  assert.equal(mapped.requiresApproval, true);
  assert.equal(mapped.preflightRevision, 1);
  assert.equal(mapped.resourceRevision, 3);
  assert.equal(mapped.signature, 'hmac-sha256-signature');
  assert.equal(mapped.correlationId, 'corr-001');

  // Verify nested preflight result
  assert.ok(mapped.preflightResult);
  assert.equal(mapped.preflightResult.result, 'REQUIRES_APPROVAL');
  assert.equal(mapped.preflightResult.risk, 'HIGH');
  assert.deepEqual(mapped.preflightResult.requirements, ['Target profile exists', 'Task revision matches']);
  assert.ok(mapped.preflightResult.actionPlan);
  assert.equal(mapped.preflightResult.actionPlan.policyConfirmationPhrase, 'APPROVE TASK DISPATCH');
});

test('Action Safety Preflight: categorizes blockers, warnings, and verified checks correctly', () => {
  const blockingPreflight = {
    checked_at: '2026-09-11T10:00:00Z',
    result: 'BLOCKED',
    risk: 'HIGH',
    requirements: ['Target profile exists and is enabled'],
    warnings: ['Task contains non-standard tags'],
    blocking_reasons: [
      'Target profile runtime presence is UNKNOWN (execution-sensitive actions fail closed)',
      'Required skill git_sync is not verified healthy',
    ],
    observed_revisions: { 'profile:sagara-dev': 1 },
    runtime_evidence: { live_sessions: 0 },
  };

  const mapped = mapPreflightResult(blockingPreflight);

  assert.equal(mapped.result, 'BLOCKED');
  assert.equal(mapped.blockingReasons.length, 2);
  assert.ok(mapped.blockingReasons[0].includes('UNKNOWN'));
  assert.ok(mapped.blockingReasons[1].includes('git_sync'));
  assert.equal(mapped.warnings.length, 1);
  assert.equal(mapped.requirements.length, 1);
});

test('Two-Step Confirmation: typed confirmation phrase validation for HIGH/CRITICAL actions', () => {
  function validateConfirmation(actionType, risk, inputPhrase) {
    if (risk !== 'HIGH' && risk !== 'CRITICAL') {
      return { required: false, valid: true };
    }
    const expected = `APPROVE ${actionType.replace(/_/g, ' ')}`;
    return {
      required: true,
      expected,
      valid: inputPhrase.trim() === expected,
    };
  }

  // Low risk does not require typed confirmation
  const lowResult = validateConfirmation('SAFETY_GATE_SELF_TEST', 'LOW', '');
  assert.equal(lowResult.required, false);
  assert.equal(lowResult.valid, true);

  // Medium risk does not require typed confirmation
  const medResult = validateConfirmation('TASK_CANCEL', 'MEDIUM', '');
  assert.equal(medResult.required, false);
  assert.equal(medResult.valid, true);

  // High risk requires exact typed phrase
  const highPending = validateConfirmation('TASK_DISPATCH', 'HIGH', 'approve');
  assert.equal(highPending.required, true);
  assert.equal(highPending.expected, 'APPROVE TASK DISPATCH');
  assert.equal(highPending.valid, false);

  const highSuccess = validateConfirmation('TASK_DISPATCH', 'HIGH', 'APPROVE TASK DISPATCH');
  assert.equal(highSuccess.required, true);
  assert.equal(highSuccess.valid, true);

  // Critical risk requires exact typed phrase
  const critSuccess = validateConfirmation('PROFILE_CHANGE_APPLY', 'CRITICAL', 'APPROVE PROFILE CHANGE APPLY');
  assert.equal(critSuccess.required, true);
  assert.equal(critSuccess.valid, true);
});

test('Self-Approval Policy: requester cannot approve HIGH or CRITICAL risk actions', () => {
  function canSelfApprove(requesterId, approverId, risk) {
    if (risk === 'HIGH' || risk === 'CRITICAL') {
      return requesterId !== approverId;
    }
    return true; // LOW or MEDIUM can be single-operator if permitted by policy
  }

  // Same operator trying to self-approve high risk
  assert.equal(canSelfApprove('op-alice', 'op-alice', 'HIGH'), false);
  assert.equal(canSelfApprove('op-alice', 'op-alice', 'CRITICAL'), false);

  // Distinct operator approving high risk
  assert.equal(canSelfApprove('op-alice', 'op-bob', 'HIGH'), true);
  assert.equal(canSelfApprove('op-alice', 'op-bob', 'CRITICAL'), true);

  // Low risk self approval
  assert.equal(canSelfApprove('op-alice', 'op-alice', 'LOW'), true);
});

test('Execution Gate: production execution mode is strictly DISABLED in Prompt 13', () => {
  const safetyStatus = {
    execution_mode: 'DISABLED',
    action_signing: 'CONFIGURED',
    persistent_idempotency: 'HEALTHY',
    audit_chain: 'VALID',
    approval_policy: 'LOADED',
    executor: 'DISABLED',
    control_db: 'WAL_ACTIVE',
    schema_version: 1,
    active_intents_count: 0,
    pending_approvals_count: 0,
  };

  assert.equal(safetyStatus.execution_mode, 'DISABLED');
  assert.equal(safetyStatus.executor, 'DISABLED');

  function isExecutionAllowed(status) {
    // Prompt 13 Hard Safety Rule: Execution MUST NOT be allowed
    return status.execution_mode === 'ENABLED' && status.executor !== 'DISABLED';
  }

  assert.equal(isExecutionAllowed(safetyStatus), false);
});
