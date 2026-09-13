import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Clock, Cpu, GitFork, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimestampRelative } from '@/lib/formatters'

interface AgentCardProps {
  agent: AgentProjection;
  onSelect: (id: string) => void;
  className?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, className }) => {
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
    <Card
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
        'group bg-surface border-border hover:border-interactive/60 hover:shadow-xs transition-all cursor-pointer select-none flex flex-col justify-between focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-interactive rounded-lg',
        className
      )}
    >
      <CardHeader className="p-4 pb-3 space-y-3">
        {/* Top Header: Avatar/Icon + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-surface-raised border border-border flex items-center justify-center text-text-muted group-hover:text-interactive group-hover:border-interactive/40 transition-colors shrink-0 font-bold text-xs">
              {definition.name[0] || <Bot className="h-4 w-4" />}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-xs tracking-tight truncate group-hover:text-interactive transition-colors">
                {definition.name}
              </h3>
              <p className="text-[11px] text-text-muted truncate">
                {definition.role || 'Specialist Profile'}
              </p>
            </div>
          </div>

          <StatusBadge status={runtimeState} size="sm" />
        </div>

        {/* Policy & Targetability Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
              isTargetable
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
            )}
          >
            <span className={cn('h-1 w-1 rounded-full', isTargetable ? 'bg-emerald-500' : 'bg-slate-400')} />
            {isTargetable ? 'Targetable' : 'Non-Targetable'}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border',
              isPolicyLimited
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            )}
          >
            {isPolicyLimited ? 'LIMITED (V3)' : 'DISABLED'}
          </span>
        </div>

        {/* Short Activity or Description */}
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-9">
          {runtime.currentActivity || definition.description || 'No operational activity recorded.'}
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-surface-subtle border border-border-subtle">
          <div>
            <span className="text-[10px] text-text-muted block">Last Observed</span>
            <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-text-muted" />
              <span>{lastObservedStr}</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-text-muted block">Active Delegations</span>
            <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
              <GitFork className="h-3 w-3 text-text-muted" />
              <span>{runtime.activeDelegations ?? 0}</span>
            </span>
          </div>
        </div>

        {/* Capability & Confidence Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px]">
          <span className={cn(
            'flex items-center gap-1 font-medium',
            configHealth === 'HEALTHY' ? 'text-text-secondary' : 'text-amber-600 dark:text-amber-400'
          )}>
            <Cpu className="h-3 w-3 text-text-muted" />
            <span>{capabilities.healthy ?? 0}/{capabilities.total ?? 0} caps</span>
          </span>

          <span className="text-[10px] font-mono-tech text-text-muted/80 px-1.5 py-0.5 rounded bg-surface-subtle border border-border/50">
            {confidence}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
