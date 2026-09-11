import React from 'react'
import type { ApprovalProjection, ApprovalRisk } from '@/types/approval'
import type { AgentProjection } from '@/types/agent'
import type { TaskProjection } from '@/types/task'
import { ApprovalRiskBadge } from '@/components/shared/ApprovalRiskBadge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  ArrowRight,
  Bot,
  CheckSquare,
  AlertTriangle,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalQueueProps {
  approvals: ApprovalProjection[]
  agents: AgentProjection[]
  tasks: TaskProjection[]
  onSelectApproval: (approval: ApprovalProjection) => void
  isLoading?: boolean
}

const RISK_WEIGHT: Record<ApprovalRisk, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

// Deterministic reference timestamp aligned with 2026-09-09 mock fixtures
const REFERENCE_TIME_MS = new Date('2026-09-09T05:00:00Z').getTime()

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  agents,
  tasks,
  onSelectApproval,
  isLoading = false,
}) => {
  const agentMap = new Map(agents.map((a) => [a.id, a]))
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Filter pending approvals only
  const pendingItems = approvals.filter((a) => a.state === 'PENDING')

  // Sort strictly by: CRITICAL > HIGH > MEDIUM > LOW, then expiration, then request age
  const sortedPending = [...pendingItems].sort((a, b) => {
    const riskDiff = (RISK_WEIGHT[b.risk] || 0) - (RISK_WEIGHT[a.risk] || 0)
    if (riskDiff !== 0) return riskDiff

    // Expiration comparison (earliest expiration first)
    if (a.expiresAt && b.expiresAt) {
      const expDiff = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      if (expDiff !== 0) return expDiff
    } else if (a.expiresAt && !b.expiresAt) {
      return -1
    } else if (!a.expiresAt && b.expiresAt) {
      return 1
    }

    // Request age (oldest request first)
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-surface border border-border animate-pulse p-4" />
        ))}
      </div>
    )
  }

  if (sortedPending.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs space-y-1">
        <div className="font-semibold text-text-primary">No pending approvals</div>
        <p className="text-text-muted">All action boundary checkpoints have been resolved.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedPending.map((appr) => {
        const agent = appr.agentId ? agentMap.get(appr.agentId) : null
        const task = appr.taskId ? taskMap.get(appr.taskId) : null

        const isCriticalOrHigh = appr.risk === 'CRITICAL' || appr.risk === 'HIGH'
        const expiresSoon =
          appr.expiresAt &&
          new Date(appr.expiresAt).getTime() - REFERENCE_TIME_MS < 60 * 60 * 1000

        return (
          <div
            key={appr.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectApproval(appr)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectApproval(appr)
              }
            }}
            className={cn(
              'group relative flex flex-col p-4 rounded-xl border bg-surface transition-all text-left cursor-pointer',
              'hover:border-border-strong hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-interactive/40',
              isCriticalOrHigh
                ? appr.risk === 'CRITICAL'
                  ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
                  : 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
                : 'border-border'
            )}
            aria-label={`Approval ${appr.id}: ${appr.title}, Risk ${appr.risk}`}
          >
            {/* Header: Risk + Action Type + Requested Age */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ApprovalRiskBadge risk={appr.risk} />
                <span className="font-mono-tech text-[10px] px-2 py-0.5 rounded-full border border-border bg-surface text-text-muted uppercase">
                  {appr.actionType.replace(/_/g, ' ')}
                </span>
                <span className="font-mono-tech text-[10px] text-text-muted">{appr.id}</span>
              </div>

              <div className="flex items-center gap-2 font-mono-tech text-[11px]">
                {expiresSoon && (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-600/30">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Expiring Soon
                  </span>
                )}
                <span className="text-text-muted flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(appr.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="mt-2.5">
              <h4 className="text-sm font-semibold text-text-primary group-hover:text-interactive transition-colors">
                {appr.title}
              </h4>
              {appr.description && (
                <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                  {appr.description}
                </p>
              )}
            </div>

            {/* Target Specifier */}
            {appr.target && (
              <div className="mt-2.5 p-2 rounded-md bg-surface-subtle border border-border/80 flex items-center gap-2 text-xs font-mono-tech">
                <Globe className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="text-text-muted text-[10px] uppercase">
                  {appr.target.type || 'Target'}:
                </span>
                <span className="text-text-primary font-medium truncate">
                  {appr.target.label}
                </span>
              </div>
            )}

            {/* Footer: Related Agent & Task Link & Review CTA */}
            <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2 text-xs font-mono-tech">
              <div className="flex items-center gap-3 min-w-0 truncate text-text-muted">
                {agent && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Bot className="h-3 w-3 text-interactive shrink-0" />
                    <span className="text-text-primary font-medium">{agent.definition.name}</span>
                  </span>
                )}

                {task && (
                  <span className="hidden sm:inline-flex items-center gap-1 truncate">
                    <CheckSquare className="h-3 w-3 text-text-muted shrink-0" />
                    <span className="truncate">{task.id}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-8 px-3 text-xs font-mono-tech border-border bg-surface-subtle group-hover:border-interactive/40 group-hover:text-interactive"
                >
                  Review Request
                  <ArrowRight className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
