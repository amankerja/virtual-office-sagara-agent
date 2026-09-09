import type { MissionControlSnapshot, AttentionItem } from '@/types/mission-control'
import { MOCK_ACTIVITY_EVENTS } from './activity'

export const MOCK_ATTENTION_QUEUE: AttentionItem[] = [
  {
    id: 'att-01',
    type: 'APPROVAL',
    severity: 'critical',
    title: 'Outbound Port Authorization Required',
    description: 'Security Gatekeeper staged firewall rule modification (TCP 8080) for external service bridge.',
    entityId: 'agent-gamma',
    entityName: 'Gamma — Gatekeeper',
    createdAt: '2026-09-09T04:47:00Z',
    actionLabel: 'Review Authorization',
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
    type: 'CAPABILITY',
    severity: 'medium',
    title: 'Capability Missing Dependency',
    description: 'Network Relay requested webhook_listener tool which is not registered in the capability manifest.',
    entityId: 'agent-zeta',
    entityName: 'Zeta — Network Relay',
    createdAt: '2026-09-09T04:38:00Z',
    actionLabel: 'Inspect Capability',
  },
  {
    id: 'att-04',
    type: 'DEPENDENCY',
    severity: 'low',
    title: 'Test Runner Capability Degraded',
    description: 'Vitest test supervisor reported intermittent subprocess exit code 143 on last execution.',
    entityId: 'agent-alpha',
    entityName: 'Alpha — Core Engineer',
    createdAt: '2026-09-09T03:30:00Z',
    actionLabel: 'View Diagnostics',
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
