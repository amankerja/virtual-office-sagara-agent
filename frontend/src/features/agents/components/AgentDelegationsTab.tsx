import React from 'react'
import type { AgentProjection, AgentDelegationItem, DelegationState } from '@/types/agent'
import { EmptyState } from '@/components/shared/EmptyState'
import { GitFork, Clock, Cpu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AgentDelegationsTabProps {
  agent: AgentProjection;
}

const DELEGATION_CONFIG_MAP: Record<DelegationState, { label: string; badgeClass: string }> = {
  RUNNING: { label: 'Running', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25 animate-pulse' },
  QUEUED: { label: 'Queued', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25' },
  COMPLETED: { label: 'Completed', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25' },
  FAILED: { label: 'Failed', badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25' },
  UNKNOWN: { label: 'Unknown', badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-600/25' },
}

export const AgentDelegationsTab: React.FC<AgentDelegationsTabProps> = ({ agent }) => {
  const delegations: AgentDelegationItem[] = agent.delegations || []

  if (delegations.length === 0) {
    return (
      <EmptyState
        icon={GitFork}
        title="No Active Subtask Delegations"
        description="This agent has not spawned async background workers or subtask delegations in the current session."
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono-tech px-1">
        <span>Delegation Pipelines ({delegations.length})</span>
        <span>Worker State</span>
      </div>

      <div className="space-y-2">
        {delegations.map((del) => {
          const config = DELEGATION_CONFIG_MAP[del.state] || DELEGATION_CONFIG_MAP.UNKNOWN

          return (
            <div
              key={del.id}
              className="p-3 rounded-lg border border-border bg-surface hover:border-border-strong transition-colors space-y-2 font-mono-tech"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary text-xs">
                  {del.taskTitle}
                </span>
                <Badge variant="outline" className={`text-[10px] uppercase ${config.badgeClass}`}>
                  {config.label}
                </Badge>
              </div>

              {del.summary && (
                <p className="text-text-secondary text-xs font-sans leading-relaxed">
                  {del.summary}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  PID: {del.workerPid || 'Unassigned'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Started: {new Date(del.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
