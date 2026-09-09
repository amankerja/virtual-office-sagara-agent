import type { GatewayTelemetry, RuntimeOverview, RuntimeUsageOverview } from '@/types/runtime'
import { MOCK_RUNTIME_EVENTS } from './runtime-events'

export const MOCK_GATEWAY: GatewayTelemetry = {
  state: 'HEALTHY',
  backendId: 'hermes-core-01',
  pid: 18420,
  host: 'sagara-hermes-local',
  startedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  lastHeartbeat: new Date(Date.now() - 1000 * 8).toISOString(),
  heartbeatAgeSeconds: 8,
  restartCount: 0,
  statusMessage: 'Heartbeat observed 8 seconds ago. All runtime supervisors responding.',
}

export const MOCK_RUNTIME_USAGE: RuntimeUsageOverview = {
  totalApiCalls: 51,
  inputTokens: 215500,
  outputTokens: 22310,
  reasoningTokens: 2400,
  cacheTokens: 117400,
  estimatedCostUsd: 0.93,
  actualCostUsd: 0.904,
  byAgent: [
    {
      name: 'Lead Systems Architect',
      apiCalls: 19,
      inputTokens: 83400,
      outputTokens: 10400,
      reasoningTokens: 2400,
      cacheTokens: 40200,
      estimatedCostUsd: 0.66,
      actualCostUsd: 0.655,
    },
    {
      name: 'DevOps & Pipeline Operator',
      apiCalls: 22,
      inputTokens: 94000,
      outputTokens: 8600,
      reasoningTokens: undefined, // unknown
      cacheTokens: 64000,
      estimatedCostUsd: 0.08,
      actualCostUsd: 0.08,
    },
    {
      name: 'Repository Engineer',
      apiCalls: 5,
      inputTokens: 19500,
      outputTokens: 2100,
      reasoningTokens: undefined,
      cacheTokens: 9000,
      estimatedCostUsd: 0.14,
      actualCostUsd: undefined, // unknown
    },
    {
      name: 'Security Compliance Agent',
      apiCalls: 3,
      inputTokens: 12400,
      outputTokens: 890,
      cacheTokens: 4200,
      estimatedCostUsd: 0.03,
      actualCostUsd: 0.029,
    },
    {
      name: 'QA & Compliance Auditor',
      apiCalls: 2,
      inputTokens: 6200,
      outputTokens: 520,
      cacheTokens: 0,
      estimatedCostUsd: 0.02,
      actualCostUsd: 0.02,
    },
  ],
  byModel: [
    {
      name: 'claude-3-7-sonnet',
      apiCalls: 19,
      inputTokens: 83400,
      outputTokens: 10400,
      cacheTokens: 40200,
      estimatedCostUsd: 0.66,
    },
    {
      name: 'gemini-2.5-flash',
      apiCalls: 22,
      inputTokens: 94000,
      outputTokens: 8600,
      cacheTokens: 64000,
      estimatedCostUsd: 0.08,
    },
    {
      name: 'gpt-4o',
      apiCalls: 5,
      inputTokens: 19500,
      outputTokens: 2100,
      cacheTokens: 9000,
      estimatedCostUsd: 0.14,
    },
    {
      name: 'gpt-4o-mini',
      apiCalls: 3,
      inputTokens: 12400,
      outputTokens: 890,
      cacheTokens: 4200,
      estimatedCostUsd: 0.03,
    },
    {
      name: 'claude-3-5-haiku',
      apiCalls: 2,
      inputTokens: 6200,
      outputTokens: 520,
      cacheTokens: 0,
      estimatedCostUsd: 0.02,
    },
  ],
  byProvider: [
    {
      name: 'Anthropic',
      apiCalls: 21,
      inputTokens: 89600,
      outputTokens: 10920,
      estimatedCostUsd: 0.68,
    },
    {
      name: 'OpenAI',
      apiCalls: 8,
      inputTokens: 31900,
      outputTokens: 2990,
      estimatedCostUsd: 0.17,
    },
    {
      name: 'Google',
      apiCalls: 22,
      inputTokens: 94000,
      outputTokens: 8600,
      estimatedCostUsd: 0.08,
    },
  ],
}

export const MOCK_RUNTIME_OVERVIEW: RuntimeOverview = {
  health: {
    gateway: 'HEALTHY',
    runtimeData: 'HEALTHY',
    sessions: 'HEALTHY',
    delegations: 'HEALTHY',
    usage: 'HEALTHY',
  },
  gateway: MOCK_GATEWAY,
  activeSessionsCount: 3,
  runningDelegationsCount: 1,
  totalCostEstimateUsd: 0.93,
  recentEvents: MOCK_RUNTIME_EVENTS.slice(0, 5),
}
