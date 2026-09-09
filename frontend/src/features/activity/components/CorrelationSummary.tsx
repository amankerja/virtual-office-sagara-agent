import React from 'react'
import { Link } from 'react-router-dom'
import {
  GitFork,
  ArrowDown,
  CheckSquare,
  Terminal,
  GitBranch,
  ShieldCheck,
  Bot,
  ExternalLink,
} from 'lucide-react'

interface CorrelationSummaryProps {
  correlationId: string
  related?: {
    taskId?: string
    sessionId?: string
    delegationId?: string
    approvalId?: string
    agentId?: string
    skillId?: string
  }
  onFilterCorrelation?: (correlationId: string) => void
}

export const CorrelationSummary: React.FC<CorrelationSummaryProps> = ({
  correlationId,
  related,
  onFilterCorrelation,
}) => {
  const steps = [
    related?.taskId && {
      type: 'Task',
      id: related.taskId,
      href: `/tasks?task=${related.taskId}`,
      icon: CheckSquare,
      color: 'text-blue-500',
    },
    related?.agentId && {
      type: 'Agent',
      id: related.agentId,
      href: `/agents?agent=${related.agentId}`,
      icon: Bot,
      color: 'text-emerald-500',
    },
    related?.sessionId && {
      type: 'Session',
      id: related.sessionId,
      href: `/runtime?tab=sessions&session=${related.sessionId}`,
      icon: Terminal,
      color: 'text-cyan-500',
    },
    related?.delegationId && {
      type: 'Delegation',
      id: related.delegationId,
      href: `/runtime?tab=delegations&delegation=${related.delegationId}`,
      icon: GitBranch,
      color: 'text-indigo-500',
    },
    related?.approvalId && {
      type: 'Approval',
      id: related.approvalId,
      href: `/approvals?approval=${related.approvalId}`,
      icon: ShieldCheck,
      color: 'text-purple-500',
    },
  ].filter(Boolean) as Array<{
    type: string
    id: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }>

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitFork className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-text-primary">
            Correlation Chain
          </span>
        </div>
        {onFilterCorrelation && (
          <button
            type="button"
            onClick={() => onFilterCorrelation(correlationId)}
            className="text-[11px] font-mono-tech text-primary hover:underline flex items-center gap-1"
          >
            <span>Filter events</span>
          </button>
        )}
      </div>

      <div className="p-2 rounded bg-surface-subtle border border-border/80 font-mono-tech text-xs text-text-primary break-all">
        {correlationId}
      </div>

      {/* Semantic Pipeline Tree */}
      {steps.length > 0 ? (
        <div className="pt-2 space-y-1">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isLast = idx === steps.length - 1

            return (
              <div key={step.type} className="flex flex-col">
                <div className="flex items-center justify-between p-2 rounded-md bg-surface-subtle/60 hover:bg-surface-subtle border border-border/60 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${step.color}`} />
                    <span className="text-[11px] font-medium text-text-secondary">
                      {step.type}:
                    </span>
                    <span className="text-xs font-mono-tech text-text-primary truncate">
                      {step.id}
                    </span>
                  </div>
                  <Link
                    to={step.href}
                    className="p-1 text-text-muted hover:text-primary transition-colors"
                    title={`View ${step.type}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {!isLast && (
                  <div className="flex justify-center my-0.5">
                    <ArrowDown className="h-3 w-3 text-text-muted" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] text-text-muted italic">
          No secondary entities directly mapped in this telemetry record.
        </p>
      )}
    </div>
  )
}
