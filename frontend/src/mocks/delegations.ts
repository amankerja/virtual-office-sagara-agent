import type { DelegationProjection } from '@/types/runtime'

export const MOCK_DELEGATIONS: DelegationProjection[] = [
  {
    id: 'del-01',
    taskTitle: 'AST Memory Benchmark Profile',
    taskDescription: 'Execute memory profiling pass on AST analyzer using large synthetic TypeScript repositories (50,000 LOC).',
    originAgentId: 'agent-alpha',
    originAgentName: 'Lead Systems Architect',
    originSessionId: 'sess-alpha-01',
    parentSessionId: 'sess-alpha-01',
    state: 'RUNNING',
    ownerPid: 42180, // confirmed PID
    deliveryState: 'PENDING',
    startedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    resultSummary: 'Worker processing pass 2 of 3; heap consumption stable at 214MB',
    timeline: [
      {
        stage: 'Queued',
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        details: 'Enqueued by Lead Systems Architect in priority queue',
      },
      {
        stage: 'Claimed',
        timestamp: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
        details: 'Claimed by worker worker-node-04',
      },
      {
        stage: 'Started',
        timestamp: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
        details: 'Worker spawned process PID 42180',
      },
      {
        stage: 'Updated',
        timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        details: 'Intermediate memory profile checkpoint received',
      },
    ],
  },
  {
    id: 'del-02',
    taskTitle: 'Outbound Security Audit Verification',
    taskDescription: 'Verify that newly generated Git commits do not contain staged tokens or invalid cryptographic keys.',
    originAgentId: 'agent-alpha',
    originAgentName: 'Lead Systems Architect',
    originSessionId: 'sess-alpha-01',
    state: 'COMPLETED',
    ownerPid: 42095,
    deliveryState: 'DELIVERED',
    startedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    resultSummary: 'Audit completed successfully with zero violations found across 14 modified files.',
    timeline: [
      {
        stage: 'Queued',
        timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
      {
        stage: 'Claimed',
        timestamp: new Date(Date.now() - 1000 * 60 * 39).toISOString(),
        details: 'Claimed by Security Compliance Agent',
      },
      {
        stage: 'Started',
        timestamp: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
        details: 'Worker PID 42095 initialized',
      },
      {
        stage: 'Completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        details: 'Verification payload signed',
      },
      {
        stage: 'Delivered',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        details: 'Result delivered to parent session sess-alpha-01',
      },
    ],
  },
  {
    id: 'del-03',
    taskTitle: 'Hourly Regression Test Suite',
    taskDescription: 'Run Vitest unit and integration test suite across frontend and shared contracts.',
    originAgentId: 'agent-gamma',
    originAgentName: 'QA & Compliance Auditor',
    originSessionId: 'sess-gamma-01',
    state: 'FAILED',
    ownerPid: undefined, // PID terminated
    deliveryState: 'FAILED',
    startedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    resultSummary: 'Worker process terminated unexpectedly (Exit code 137, OOM).',
    timeline: [
      {
        stage: 'Queued',
        timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      },
      {
        stage: 'Claimed',
        timestamp: new Date(Date.now() - 1000 * 60 * 49).toISOString(),
      },
      {
        stage: 'Started',
        timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
      },
      {
        stage: 'Updated',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: 'Process SIGKILL received',
      },
      {
        stage: 'Completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: 'Marked as FAILED due to abnormal worker exit',
      },
    ],
  },
  {
    id: 'del-04',
    taskTitle: 'Ephemeral Sandbox Container Provisioning',
    taskDescription: 'Provision temporary Docker test environment on port 5432 for schema validation.',
    originAgentId: 'agent-beta',
    originAgentName: 'Repository Engineer',
    originSessionId: 'sess-beta-02',
    state: 'QUEUED',
    ownerPid: undefined, // unassigned
    deliveryState: 'PENDING',
    startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    resultSummary: 'Awaiting available infrastructure worker thread',
    timeline: [
      {
        stage: 'Queued',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        details: 'Enqueued in infrastructure pool',
      },
    ],
  },
  {
    id: 'del-05',
    taskTitle: 'Webhook Ingress Stream Binding',
    taskDescription: 'Bind reverse proxy port 8443 for external GitHub pull request event ingest.',
    originAgentId: 'agent-delta',
    originAgentName: 'Integration Bridge Specialist',
    originSessionId: 'sess-delta-01',
    state: 'UNKNOWN',
    ownerPid: undefined,
    deliveryState: 'UNKNOWN',
    startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resultSummary: 'Worker status unverifiable due to missing telemetry heartbeat',
    timeline: [
      {
        stage: 'Queued',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        stage: 'Started',
        timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      },
    ],
  },
]
