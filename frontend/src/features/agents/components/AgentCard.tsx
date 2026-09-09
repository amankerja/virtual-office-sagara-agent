import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Clock, Cpu, GitFork, Bot, Coins, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: AgentProjection;
  onSelect: (id: string) => void;
  className?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, className }) => {
  const { definition, runtime, capabilities, usage } = agent

  const isIncomplete = definition.configurationState === 'INCOMPLETE'
  const isHealthySkills = (capabilities.degraded ?? 0) === 0 && (capabilities.missing ?? 0) === 0

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
        'group bg-surface border-border hover:border-interactive/60 hover:shadow-sm transition-all cursor-pointer select-none flex flex-col justify-between focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-interactive',
        className
      )}
    >
      <CardHeader className="p-4 sm:p-5 pb-3 space-y-3">
        {/* Top Header: Avatar/Icon + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-text-muted group-hover:text-interactive group-hover:border-interactive/40 transition-colors shrink-0 font-mono-tech font-bold text-xs">
              {definition.name[0] || <Bot className="h-4 w-4" />}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-sm tracking-tight truncate group-hover:text-interactive transition-colors">
                {definition.name}
              </h3>
              <p className="text-xs text-text-muted truncate">
                {definition.role || 'Unassigned Role'}
              </p>
            </div>
          </div>

          <StatusBadge status={runtime.state} />
        </div>

        {/* Short Activity or Description */}
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-9">
          {runtime.currentActivity || definition.description || 'No operational activity recorded.'}
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-3 font-mono-tech text-xs">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
          <div>
            <span className="text-[10px] text-text-muted block">Last Active</span>
            <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-text-muted" />
              {runtime.lastActivityAt
                ? new Date(runtime.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-text-muted block">Active Workload</span>
            <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
              <GitFork className="h-3 w-3 text-text-muted" />
              {runtime.activeDelegations ?? 0} delegations
            </span>
          </div>
        </div>

        {/* Capability & Token Cost Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px]">
          {isIncomplete ? (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              Config Incomplete
            </span>
          ) : (
            <span className="flex items-center gap-1 text-text-muted truncate">
              <Cpu className="h-3 w-3 text-text-muted" />
              {capabilities.healthy ?? 0} healthy
              {!isHealthySkills && (
                <span className="text-amber-500"> / {capabilities.degraded ?? 0} degraded</span>
              )}
            </span>
          )}

          <div className="flex items-center gap-1 text-text-muted shrink-0">
            <Coins className="h-3 w-3 text-text-muted" />
            <span>${(usage?.estimatedCostUsd ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
