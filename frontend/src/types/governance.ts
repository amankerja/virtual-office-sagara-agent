export interface UsageMetric {
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  apiCalls?: number

  estimatedCostUsd?: number
  actualCostUsd?: number
}

export type BreakdownType = 'AGENT' | 'MODEL' | 'PROVIDER' | 'TASK'

export interface UsageBreakdown {
  id: string
  label: string
  type: BreakdownType
  usage: UsageMetric
  percentage?: number
}

export type BudgetStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNKNOWN'
export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface BudgetConfig {
  period: BudgetPeriod
  limitUsd?: number
  consumedUsd?: number
  remainingUsd?: number
  status?: BudgetStatus
}

export type CostConfidence = 'ESTIMATED' | 'ACTUAL' | 'PARTIAL' | 'UNKNOWN'

export interface TaskCostAttributionRecord {
  taskId: string
  taskTitle: string
  agentId?: string
  agentName?: string
  sessionCount?: number
  tokens: {
    input?: number
    output?: number
    reasoning?: number
    total?: number
  }
  cost: {
    estimatedUsd?: number
    actualUsd?: number
    confidence: CostConfidence
  }
}

export type GovernanceSignalType =
  | 'HIGH_COST_TASK'
  | 'UNUSUAL_TOKEN_GROWTH'
  | 'UNKNOWN_BILLING_DATA'
  | 'HIGH_REASONING_USAGE'
  | 'BUDGET_APPROACHING_THRESHOLD'

export interface GovernanceSignal {
  id: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  type: GovernanceSignalType
  title: string
  description: string
  detectedAt: string
  relatedEntity?: {
    type: string
    id: string
    label: string
  }
}

export interface GovernanceSnapshot {
  totalUsage: UsageMetric
  budget?: BudgetConfig
  breakdowns: {
    agents?: UsageBreakdown[]
    models?: UsageBreakdown[]
    providers?: UsageBreakdown[]
    tasks?: UsageBreakdown[]
  }
  taskAttributions?: TaskCostAttributionRecord[]
  signals?: GovernanceSignal[]
}
