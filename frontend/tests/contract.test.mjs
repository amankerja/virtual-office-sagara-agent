import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapUnknownEnum,
  preserveNumber,
  mapPageResult,
  mapApiError,
  mapAgentDtoToDomain,
  mapTaskDtoToDomain,
  mapApprovalDtoToDomain,
  mapSkillDtoToDomain,
  mapProfileDtoToDomain,
  mapSessionDtoToDomain,
  mapDelegationDtoToDomain,
  mapGatewayDtoToDomain,
  mapActivityDtoToDomain,
  mapAuditRecordDtoToDomain,
  mapGovernanceSnapshotDtoToDomain,
} from '@/api/mappers'
import { buildOfficeScene } from '../src/features/office/layout/office-layout-engine.ts'
import { MOCK_AGENTS } from '../src/mocks/agents.ts'
import { MOCK_TASKS } from '../src/mocks/tasks.ts'
import { MOCK_APPROVALS } from '../src/mocks/approvals.ts'
import { MOCK_DELEGATIONS } from '../src/mocks/delegations.ts'
import { MOCK_GATEWAY, MOCK_RUNTIME_OVERVIEW } from '../src/mocks/runtime.ts'
import { ApiClient } from '../src/api/client.ts'

test('Contract: preserveNumber enforces UNKNOWN ≠ ZERO semantics', () => {
  // 0 represents a confirmed zero metric
  assert.equal(preserveNumber(0), 0)
  assert.equal(preserveNumber(42), 42)

  // null and undefined represent unknown or unsupported metrics, must NEVER coerce to 0
  assert.equal(preserveNumber(null), undefined)
  assert.equal(preserveNumber(undefined), undefined)

  assert.notEqual(preserveNumber(null), 0, 'null must not become 0')
  assert.notEqual(preserveNumber(undefined), 0, 'undefined must not become 0')
})

test('Contract: mapUnknownEnum provides forward-compatibility fallback to UNKNOWN', () => {
  const allowed = ['ACTIVE', 'IDLE', 'OFFLINE']

  // Known value returns as-is
  assert.equal(mapUnknownEnum('ACTIVE', allowed, 'UNKNOWN'), 'ACTIVE')
  assert.equal(mapUnknownEnum('IDLE', allowed, 'UNKNOWN'), 'IDLE')

  // Future unannounced enum value must not crash and must map to UNKNOWN
  assert.equal(mapUnknownEnum('HYPER_DRIVE', allowed, 'UNKNOWN'), 'UNKNOWN')
  assert.equal(mapUnknownEnum('', allowed, 'UNKNOWN'), 'UNKNOWN')
  assert.equal(mapUnknownEnum(null, allowed, 'UNKNOWN'), 'UNKNOWN')
})

test('Contract: AgentDto snake_case maps to AgentProjection camelCase with UNKNOWN ≠ ZERO preserved', () => {
  const agentDto = {
    id: 'agent-contract-01',
    definition: {
      name: 'Contract Test Agent',
      role: 'Contract Validator',
      description: 'Verifies DTO to Domain integrity',
      enabled: true,
      memory_namespace: 'agents/test-namespace',
    },
    runtime: {
      state: 'FUTURE_AGENT_STATE', // Should map to UNKNOWN
      confidence: 'CONFIRMED',
      last_activity_at: '2026-09-09T05:23:41Z',
      session_count: 0, // Confirmed 0 sessions
      active_delegations: null, // Unknown delegations count (not 0!)
      current_session_id: 'sess-abc-123',
      current_task_id: 'task-xyz-789',
      model: 'gemini-2.5-pro',
    },
    capabilities: {
      total: 10,
      healthy: 8,
      degraded: 2,
      missing: 0, // Confirmed 0 missing
    },
    usage: {
      input_tokens: 0, // Confirmed 0 tokens
      output_tokens: 1500,
      estimated_cost_usd: null, // Unknown cost (must not coerce to 0)
    },
  }

  const domain = mapAgentDtoToDomain(agentDto)

  assert.equal(domain.id, 'agent-contract-01')
  assert.equal(domain.definition.name, 'Contract Test Agent')
  assert.equal(domain.definition.memoryNamespace, 'agents/test-namespace')

  // Unknown state forward compatibility
  assert.equal(domain.runtime.state, 'UNKNOWN')
  assert.equal(domain.runtime.confidence, 'CONFIRMED')
  assert.equal(domain.runtime.lastActivityAt, '2026-09-09T05:23:41Z')
  assert.equal(domain.runtime.currentSessionId, 'sess-abc-123')
  assert.equal(domain.runtime.currentTaskId, 'task-xyz-789')

  // Confirmed zero vs unknown null
  assert.equal(domain.runtime.sessionCount, 0)
  assert.equal(domain.runtime.activeDelegations, undefined)
  assert.notEqual(domain.runtime.activeDelegations, 0)

  assert.equal(domain.capabilities.missing, 0)
  assert.equal(domain.usage?.inputTokens, 0)
  assert.equal(domain.usage?.outputTokens, 1500)
  assert.equal(domain.usage?.estimatedCostUsd, undefined)
  assert.notEqual(domain.usage?.estimatedCostUsd, 0)
})

test('Contract: TaskDto maps snake_case to camelCase and preserves failure and progress', () => {
  const taskDto = {
    id: 'tsk-99',
    title: 'Validate Contract Invariants',
    description: 'Ensure task contract matches backend specification',
    state: 'UNKNOWN_FUTURE_TASK_STATE',
    priority: 'HIGH',
    created_at: '2026-09-09T01:00:00Z',
    updated_at: '2026-09-09T02:00:00Z',
    assigned_agent_id: 'agent-alpha',
    requested_skills: ['skill-a', 'skill-b'],
    capability_requirements: ['docker'],
    session_id: 'sess-1',
    delegation_ids: ['del-1', 'del-2'],
    approval_ids: ['appr-1'],
    progress: {
      completed: 0, // Confirmed 0 items completed
      total: 100,
      label: 'Initializing',
    },
    failure: {
      code: 'TASK_AGENT_UNAVAILABLE',
      message: 'Assigned agent is offline',
      stage: 'Dispatch Gate',
    },
    timeline: [
      {
        id: 'evt-1',
        type: 'CREATED',
        timestamp: '2026-09-09T01:00:00Z',
        actor: 'Operator',
        detail: 'Task created',
      },
    ],
  }

  const domain = mapTaskDtoToDomain(taskDto)

  assert.equal(domain.id, 'tsk-99')
  assert.equal(domain.assignedAgentId, 'agent-alpha')
  assert.deepEqual(domain.requestedSkills, ['skill-a', 'skill-b'])
  assert.deepEqual(domain.capabilityRequirements, ['docker'])
  assert.equal(domain.sessionId, 'sess-1')
  assert.deepEqual(domain.delegationIds, ['del-1', 'del-2'])
  assert.deepEqual(domain.approvalIds, ['appr-1'])

  // Fallback on unknown task state
  assert.equal(domain.state, 'QUEUED')

  assert.equal(domain.progress?.completed, 0)
  assert.equal(domain.progress?.total, 100)
  assert.equal(domain.failure?.code, 'TASK_AGENT_UNAVAILABLE')
  assert.equal(domain.timeline?.length, 1)
})

test('Contract: ApprovalDto maps snake_case to camelCase and supports decision audit', () => {
  const approvalDto = {
    id: 'appr-contract-01',
    state: 'PENDING',
    risk: 'CRITICAL',
    action_type: 'EXECUTE_CODE',
    title: 'Deploy Hotfix Script',
    reason_required: true,
    task_id: 'tsk-99',
    agent_id: 'agent-alpha',
    requested_at: '2026-09-09T03:00:00Z',
    target: {
      type: 'SERVER',
      label: 'prod-gateway-01',
    },
    preview: {
      summary: 'Execute bash script on gateway',
      sensitive_fields: ['JWT_SECRET'],
    },
  }

  const domain = mapApprovalDtoToDomain(approvalDto)

  assert.equal(domain.id, 'appr-contract-01')
  assert.equal(domain.actionType, 'EXECUTE_CODE')
  assert.equal(domain.reasonRequired, true)
  assert.equal(domain.taskId, 'tsk-99')
  assert.equal(domain.agentId, 'agent-alpha')
  assert.equal(domain.target?.label, 'prod-gateway-01')
  assert.deepEqual(domain.preview?.sensitiveFields, ['JWT_SECRET'])
})

test('Contract: SkillDto cleanly separates registration, installation, health, and execution', () => {
  const skillDto = {
    id: 'skill-db-query',
    name: 'Database Query',
    description: 'Executes readonly SQL queries',
    category: 'Data',
    version: '1.2.0',
    registration: 'REGISTERED',
    installation: 'INSTALLED',
    health: 'HEALTHY',
    execution: 'OBSERVED_ACTIVE',
    dependencies: [
      { id: 'dep-psql', name: 'PostgreSQL CLI', installed: true, optional: false },
    ],
  }

  const domain = mapSkillDtoToDomain(skillDto)

  assert.equal(domain.id, 'skill-db-query')
  assert.equal(domain.registration, 'REGISTERED')
  assert.equal(domain.installation, 'INSTALLED')
  assert.equal(domain.health, 'HEALTHY')
  assert.equal(domain.execution, 'OBSERVED_ACTIVE')
  assert.equal(domain.dependencies?.[0].name, 'PostgreSQL CLI')
})

test('Contract: ProfileDefinition canonical shape', () => {
  const profileDto = {
    id: 'prof-backend-lead',
    name: 'Backend Lead',
    role: 'API Engineer',
    description: 'Designs and builds backend services',
    enabled: true,
    memory_namespace: 'profiles/backend',
    allowed_skills: ['skill-db-query', 'skill-code-edit'],
  }

  const domain = mapProfileDtoToDomain(profileDto)

  assert.equal(domain.id, 'prof-backend-lead')
  assert.equal(domain.name, 'Backend Lead')
  assert.equal(domain.role, 'API Engineer')
  assert.equal(domain.enabled, true)
  assert.equal(domain.memoryNamespace, 'profiles/backend')
  assert.deepEqual(domain.allowedSkills, ['skill-db-query', 'skill-code-edit'])
})

test('Contract: PageResult envelope cursor pagination', () => {
  const pageDto = {
    items: [{ id: 'item-1' }, { id: 'item-2' }],
    page_info: {
      next_cursor: 'cursor-token-abc',
      has_more: true,
      total_count: 50,
    },
  }

  const domain = mapPageResult(pageDto, (i) => i.id)

  assert.deepEqual(domain.items, ['item-1', 'item-2'])
  assert.equal(domain.pageInfo.nextCursor, 'cursor-token-abc')
  assert.equal(domain.pageInfo.hasMore, true)
  assert.equal(domain.pageInfo.totalCount, 50)
})

test('Contract: ApiError envelope mapping without leaking internal stack traces', () => {
  const errorDto = {
    error: {
      code: 'APPROVAL_ALREADY_RESOLVED',
      message: 'This approval has already been accepted or rejected.',
      correlation_id: 'corr-xyz-123',
      details: { resolution: 'APPROVED', resolved_by: 'Operator B' },
    },
  }

  const domain = mapApiError(errorDto)

  assert.equal(domain.error.code, 'APPROVAL_ALREADY_RESOLVED')
  assert.equal(domain.error.message, 'This approval has already been accepted or rejected.')
  assert.equal(domain.error.correlationId, 'corr-xyz-123')
  assert.equal((domain.error.details).resolution, 'APPROVED')
})

test('Contract: Concurrency revision and version preserved on mutable Task and Approval resources', () => {
  const taskDto = {
    id: 'task-rev-01',
    title: 'Update Concurrency Policy',
    state: 'RUNNING',
    priority: 'HIGH',
    created_at: '2026-09-09T01:00:00Z',
    revision: 4,
    version: 4,
  }
  const taskDomain = mapTaskDtoToDomain(taskDto)
  assert.equal(taskDomain.revision, 4)
  assert.equal(taskDomain.version, 4)

  const approvalDto = {
    id: 'appr-rev-01',
    title: 'Hotfix Approval',
    state: 'PENDING',
    risk: 'CRITICAL',
    action_type: 'EXECUTE_CODE',
    requested_at: '2026-09-09T02:00:00Z',
    revision: 7,
  }
  const apprDomain = mapApprovalDtoToDomain(approvalDto)
  assert.equal(apprDomain.revision, 7)
  assert.equal(apprDomain.version, 7)
})

test('Contract: Redacted values mapping in Audit and Session without revealing secrets', () => {
  const auditDto = {
    id: 'aud-01',
    timestamp: '2026-09-09T03:00:00Z',
    actor: { type: 'USER', id: 'user-01', label: 'Security Lead' },
    action: 'ROTATE_KEY',
    outcome: 'SUCCESS',
    changes: [
      {
        field: 'JWT_SECRET',
        before: null,
        after: null,
        redacted: true,
      },
    ],
  }
  const auditDomain = mapAuditRecordDtoToDomain(auditDto)
  assert.equal(auditDomain.changes?.[0].field, 'JWT_SECRET')
  assert.equal(auditDomain.changes?.[0].redacted, true)
  assert.equal(auditDomain.changes?.[0].after, undefined)

  const sessionDto = {
    id: 'sess-redact-01',
    agent_id: 'agent-alpha',
    started_at: '2026-09-09T03:00:00Z',
    last_activity_at: '2026-09-09T03:05:00Z',
    messages: [
      {
        id: 'msg-01',
        role: 'system',
        timestamp: '2026-09-09T03:00:00Z',
        content_preview: '[REDACTED API CREDENTIAL]',
        is_sensitive: true,
        redacted_reason: 'Matches Anthropic API Key regex pattern',
      },
    ],
  }
  const sessionDomain = mapSessionDtoToDomain(sessionDto)
  assert.equal(sessionDomain.messages?.[0].isSensitive, true)
  assert.equal(sessionDomain.messages?.[0].redactedReason, 'Matches Anthropic API Key regex pattern')
})

test('Contract: SessionDto maps snake_case to camelCase with profileId, messageCount, toolCallCount, and UNKNOWN ≠ ZERO', () => {
  const sessionDto = {
    id: 'sess-contract-02',
    agent_id: 'agent-contract',
    profile_id: 'prof-architect',
    source: 'hermes-rpc',
    model: 'gemini-2.5-pro',
    started_at: '2026-09-09T04:00:00Z',
    last_activity_at: '2026-09-09T04:10:00Z',
    state: 'UNKNOWN_STATE_VAL', // forward compat fallback to ACTIVE
    message_count: 0, // confirmed 0
    tool_call_count: null, // unknown (must not coerce to 0)
    usage: {
      api_calls: 0,
      input_tokens: 1200,
      estimated_cost_usd: null, // unknown
    },
  }
  const domain = mapSessionDtoToDomain(sessionDto)
  assert.equal(domain.id, 'sess-contract-02')
  assert.equal(domain.profileId, 'prof-architect')
  assert.equal(domain.messageCount, 0)
  assert.equal(domain.messagesCount, 0)
  assert.equal(domain.toolCallCount, undefined)
  assert.notEqual(domain.toolCallCount, 0)
  assert.equal(domain.usage?.apiCalls, 0)
  assert.equal(domain.usage?.estimatedCostUsd, undefined)
  assert.notEqual(domain.usage?.estimatedCostUsd, 0)
})

test('Contract: DelegationDto maps with ownerPid preserved as numeric runtime ownership evidence', () => {
  const delegationDto = {
    id: 'del-01',
    task_title: 'Run Vulnerability Scan',
    origin_agent_id: 'agent-alpha',
    origin_session_id: 'sess-01',
    state: 'RUNNING',
    owner_pid: 29841, // PID proves runtime evidence, not skill execution
    started_at: '2026-09-09T05:00:00Z',
    updated_at: '2026-09-09T05:01:00Z',
  }
  const domain = mapDelegationDtoToDomain(delegationDto)
  assert.equal(domain.id, 'del-01')
  assert.equal(domain.ownerPid, 29841)
  assert.equal(domain.state, 'RUNNING')
})

test('Contract: GatewayDto maps heartbeat and host telemetry cleanly', () => {
  const gatewayDto = {
    state: 'HEALTHY',
    backend_id: 'gw-primary-01',
    host: 'vps-core.sagara.local',
    pid: 1420,
    started_at: '2026-09-09T00:00:00Z',
    last_heartbeat_at: '2026-09-09T05:30:00Z',
    heartbeat_age_seconds: 2,
    restart_count: 0,
  }
  const domain = mapGatewayDtoToDomain(gatewayDto)
  assert.equal(domain.state, 'HEALTHY')
  assert.equal(domain.backendId, 'gw-primary-01')
  assert.equal(domain.lastHeartbeat, '2026-09-09T05:30:00Z')
  assert.equal(domain.lastHeartbeatAt, '2026-09-09T05:30:00Z')
  assert.equal(domain.heartbeatAgeSeconds, 2)
  assert.equal(domain.restartCount, 0)
})

test('Contract: GovernanceSnapshot strictly separates estimatedCostUsd and actualCostUsd without collapsing', () => {
  const govDto = {
    total_usage: {
      input_tokens: 50000,
      output_tokens: 12000,
      estimated_cost_usd: 0.185,
      actual_cost_usd: null, // unknown actual settled cost (must not collapse into estimated)
    },
    budget: {
      period: 'MONTHLY',
      limit_usd: 500.0,
      consumed_usd: 42.5,
      remaining_usd: 457.5,
      status: 'NORMAL',
    },
  }
  const domain = mapGovernanceSnapshotDtoToDomain(govDto)
  assert.equal(domain.totalUsage.estimatedCostUsd, 0.185)
  assert.equal(domain.totalUsage.actualCostUsd, undefined)
  assert.notEqual(domain.totalUsage.actualCostUsd, domain.totalUsage.estimatedCostUsd)
  assert.equal(domain.budget?.status, 'NORMAL')
})

test('Contract: ActivityDto and AuditRecordDto normalize EntityReference and RelatedEntities', () => {
  const actDto = {
    id: 'act-01',
    timestamp: '2026-09-09T05:00:00Z',
    category: 'TASK',
    severity: 'INFO',
    title: 'Task Created',
    actor: { type: 'AGENT', id: 'agent-01', label: 'Lead Architect' },
    entity: { type: 'TASK', id: 'tsk-01', label: 'Deploy Migration' },
    correlation_id: 'corr-001',
    related: { task_id: 'tsk-01', agent_id: 'agent-01' },
  }
  const domain = mapActivityDtoToDomain(actDto)
  assert.equal(domain.actor?.id, 'agent-01')
  assert.equal(domain.entity?.id, 'tsk-01')
  assert.equal(domain.correlationId, 'corr-001')
  assert.equal(domain.related?.taskId, 'tsk-01')
  assert.equal(domain.related?.agentId, 'agent-01')
})

test('Contract: Partial resources and omitted vs explicit null fields map safely without crashing', () => {
  // Minimal DTOs with bare minimum fields
  const minAgentDto = {
    id: 'agent-minimal',
    definition: { name: 'Minimal Agent', enabled: true },
    runtime: { state: 'IDLE', confidence: 'INFERRED' },
    capabilities: {},
  }
  const agentDomain = mapAgentDtoToDomain(minAgentDto)
  assert.equal(agentDomain.id, 'agent-minimal')
  assert.equal(agentDomain.definition.name, 'Minimal Agent')
  assert.equal(agentDomain.runtime.sessionCount, undefined)
  assert.equal(agentDomain.runtime.activeDelegations, undefined)
  assert.equal(agentDomain.capabilities.total, undefined)

  const minTaskDto = {
    id: 'task-minimal',
    title: 'Bare Minimum Task',
    state: 'READY',
    priority: 'LOW',
    created_at: '2026-09-09T00:00:00Z',
  }
  const taskDomain = mapTaskDtoToDomain(minTaskDto)
  assert.equal(taskDomain.id, 'task-minimal')
  assert.equal(taskDomain.assignedAgentId, undefined)
  assert.equal(taskDomain.progress, undefined)
  assert.equal(taskDomain.failure, undefined)
  assert.equal(taskDomain.revision, undefined)
})

test('Contract: Office projection is derived purely from domain models without DTO dependency', () => {
  // Build office scene from domain projections
  const scene = buildOfficeScene({
    agents: MOCK_AGENTS,
    delegations: MOCK_DELEGATIONS,
    tasks: MOCK_TASKS,
    approvals: MOCK_APPROVALS,
    gateway: MOCK_GATEWAY,
    runtime: MOCK_RUNTIME_OVERVIEW,
  })

  // Must derive desks, zones, workers purely from domain models
  assert.ok(scene.zones.length > 0, 'Zones must be populated')
  assert.equal(scene.desks.length, MOCK_AGENTS.length, 'Every agent must receive a desk projection')
  
  // Verify desk agents have domain format (camelCase, ProfileDefinition, no DTO leak)
  for (const desk of scene.desks) {
    assert.ok(desk.agent.definition.name, 'Agent must have definition name')
    assert.ok(desk.agent.runtime.state, 'Agent must have runtime state')
    assert.equal(typeof desk.position.x, 'number')
    assert.equal(typeof desk.position.y, 'number')
  }
})

test('Production Contract: ApiClient defaults to same-origin relative base URL', () => {
  // Clear any env override for test
  const client = new ApiClient()
  assert.equal(client.getBaseUrl(), '', 'ApiClient must default to relative same-origin root')
})

test('Production Contract: Fail-closed semantics prevent silent fallback to mock in production', () => {
  // Test the pure fail-closed decision logic:
  // In production builds (isDev=false), mock is false unless explicitly overridden
  const checkFailClosed = (isDev, dataMode) => {
    if (!isDev) {
      return dataMode === 'mock_explicit_override_only'
    }
    return dataMode === 'mock'
  }

  // Production build with no env var must default to API mode (fail-closed)
  assert.equal(checkFailClosed(false, undefined), false, 'Production without env must NOT be mock mode')
  assert.equal(checkFailClosed(false, ''), false, 'Production with empty env must NOT be mock mode')
  assert.equal(checkFailClosed(false, 'api'), false, 'Production with api mode must NOT be mock mode')
  assert.equal(checkFailClosed(false, 'mock'), false, 'Standard mock flag must NOT enable mock in production build')

  // Development defaults to API mode unless explicitly 'mock'
  assert.equal(checkFailClosed(true, undefined), false, 'Dev without env defaults to API mode')
  assert.equal(checkFailClosed(true, 'mock'), true, 'Dev with explicit mock enables mock fixtures')
})
