import type { MissionControlSnapshot, AttentionItem } from '@/types/mission-control'
import { MOCK_ACTIVITY_EVENTS } from './activity'

export const MOCK_ATTENTION_QUEUE: AttentionItem[] = [
  {
    id: 'att-01',
    type: 'APPROVAL',
    severity: 'critical',
    title: 'Outbound Port 8080 Authorization Required',
    description: 'Security Gatekeeper staged firewall rule modification (TCP 8080) for external service bridge.',
    entityId: 'appr-01',
    entityName: 'Approval: appr-01',
    createdAt: '2026-09-09T04:47:00Z',
    actionLabel: 'Review Approval',
  },
  {
    id: 'att-02',
    type: 'CONFIGURATION',
    severity: 'high',
    title: 'Profile Definition Incomplete',
    description: 'Growth Scout profile lacks required LLM model assignment and verified tool permissions.',
    entityId: 'agent-eta',
    entityName: 'Eta — Growth Scout',
    createdAt: '2026-09-09T04:10:00Z',
    actionLabel: 'Configure Profile',
  },
  {
    id: 'att-03',
    type: 'ERROR',
    severity: 'high',
    title: 'Vitest Integration Test Pipeline Failed',
    description: 'Subprocess exited with code 143 (timeout after 300s) during integration test run.',
    entityId: 'tsk-08',
    entityName: 'Task: tsk-08',
    createdAt: '2026-09-09T03:30:00Z',
    actionLabel: 'Review Failed Task',
  },
  {
    id: 'att-04',
    type: 'DEPENDENCY',
    severity: 'medium',
    title: 'Cluster Ingress Provisioning Blocked',
    description: 'Waiting for required capability: cluster-admin-token not registered in security policy.',
    entityId: 'tsk-07',
    entityName: 'Task: tsk-07',
    createdAt: '2026-09-09T04:25:00Z',
    actionLabel: 'Review Blocked Task',
  },
]

export const MOCK_MISSION_CONTROL_SNAPSHOT: MissionControlSnapshot = {
  isMock: true,
  timestamp: new Date().toISOString(),
  pulse: {
    gateway: {
      status: 'HEALTHY',
      detail: 'Local runtime gateway connected',
    },
    profiles: {
      registered: 8,
      enabled: 7,
      incomplete: 1,
    },
    activeAgents: {
      active: 3,
      enabledTotal: 7,
    },
    sessions: {
      active: 24,
      totalAgents: 5,
    },
    skills: {
      healthy: 18,
      degraded: 1,
      missing: 1,
    },
    attention: {
      count: 4,
      criticalCount: 1,
      highCount: 1,
    },
  },
  attentionQueue: MOCK_ATTENTION_QUEUE,
  recentActivity: MOCK_ACTIVITY_EVENTS,
}
