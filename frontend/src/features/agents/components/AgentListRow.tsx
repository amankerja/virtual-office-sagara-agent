import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Clock, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimestampRelative } from '@/lib/formatters'

interface AgentListRowProps {
  agent: AgentProjection;
  onSelect: (id: string) => void;
  className?: string;
}

export const AgentListRow: React.FC<AgentListRowProps> = ({ agent, onSelect, className }) => {
  const { definition, runtime, capabilities } = agent

  // 1. Runtime State
  const runtimeState = runtime.state

  // 2. Targetability
  const isTargetable =
    definition.enabled &&
    runtimeState !== 'OFFLINE' &&
    runtimeState !== 'ERROR' &&
    runtimeState !== 'CONFIGURATION_INCOMPLETE'

  // 3. Policy Eligibility (Policy V3: sagara-lab and it-support are LIMITED, all others DISABLED)
  const isPolicyLimited =
    agent.id === 'agent-lead-architect' ||
    agent.id === 'sagara-lab' ||
    agent.id.includes('architect') ||
    agent.id.includes('support')

  // 4. Configuration Health
  const hasMissing = (capabilities.missing ?? 0) > 0
  const hasDegraded = (capabilities.degraded ?? 0) > 0
  const configHealth = hasMissing ? 'MISSING' : hasDegraded ? 'DEGRADED' : 'HEALTHY'

  // 5. Last Observed
  const lastObservedStr = runtime.lastActivityAt
    ? formatTimestampRelative(runtime.lastActivityAt)
    : 'Never'
  const confidence = runtime.confidence || 'UNKNOWN'

  return (
    <div
      onClick={() => onSelect(agent.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(agent.id)
        }
      }}
      className={cn(
        'group p-3.5 sm:px-4 sm:py-3 rounded-lg border border-border bg-surface hover:border-interactive/60 hover:bg-surface-hover transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-interactive',
        className
      )}
    >
      {/* Col 1: Identity (Avatar, Name, Role) */}
      <div className="flex items-center gap-3 min-w-0 lg:w-3/12">
        <div className="h-8 w-8 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-muted font-bold text-xs shrink-0 group-hover:text-interactive group-hover:border-interactive/40 transition-colors">
          {definition.name[0]}
        </div>

        <div className="min-w-0">
          <div className="font-semibold text-text-primary text-xs truncate group-hover:text-interactive transition-colors">
            {definition.name}
          </div>
          <span className="text-[11px] text-text-muted truncate block">
            {definition.role || 'Specialist Profile'}
          </span>
        </div>
      </div>

      {/* Col 2: Runtime State (Dimension 1) */}
      <div className="flex items-center gap-2 lg:w-2/12">
        <StatusBadge status={runtimeState} size="sm" />
      </div>

      {/* Col 3: Targetability (Dimension 2) */}
      <div className="flex items-center gap-1.5 lg:w-2/12">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border',
            isTargetable
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
          )}
        >
          <span className={cn('h-1 w-1 rounded-full', isTargetable ? 'bg-emerald-500' : 'bg-slate-400')} />
          {isTargetable ? 'Targetable' : 'Non-Targetable'}
        </span>
      </div>

      {/* Col 4: Policy Eligibility (Dimension 3) */}
      <div className="flex items-center gap-1.5 lg:w-2/12">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border',
            isPolicyLimited
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25'
              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
          )}
        >
          {isPolicyLimited ? 'LIMITED (V3)' : 'DISABLED'}
        </span>
      </div>

      {/* Col 5: Configuration Health (Dimension 4) */}
      <div className="flex items-center gap-1.5 lg:w-1.5/12 text-[11px]">
        <Cpu className="h-3 w-3 text-text-muted shrink-0" />
        <span className={cn(
          'font-medium text-[11px]',
          configHealth === 'HEALTHY' ? 'text-text-secondary' : 'text-amber-600 dark:text-amber-400'
        )}>
          {capabilities.healthy ?? 0}/{capabilities.total ?? 0} caps
        </span>
      </div>

      {/* Col 6: Last Observed (Dimension 5) */}
      <div className="flex items-center justify-between lg:justify-end gap-2 text-[11px] text-text-muted lg:w-2/12">
        <span className="flex items-center gap-1 font-sans">
          <Clock className="h-3 w-3 text-text-muted" />
          <span>{lastObservedStr}</span>
        </span>
        <span className="text-[10px] font-mono-tech text-text-muted/80 px-1 py-0.5 rounded bg-surface-subtle border border-border/50">
          {confidence}
        </span>
      </div>
    </div>
  )
}
