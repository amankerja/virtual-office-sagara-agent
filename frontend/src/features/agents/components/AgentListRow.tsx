import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Clock, Coins, GitFork, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentListRowProps {
  agent: AgentProjection;
  onSelect: (id: string) => void;
  className?: string;
}

export const AgentListRow: React.FC<AgentListRowProps> = ({ agent, onSelect, className }) => {
  const { definition, runtime, capabilities, usage } = agent

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
        'group p-3 sm:px-4 sm:py-3 rounded-lg border border-border bg-surface hover:border-interactive/60 hover:bg-surface-hover transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-interactive',
        className
      )}
    >
      {/* Left: Name, Role, Status */}
      <div className="flex items-center gap-3 min-w-0 sm:w-1/3">
        <div className="h-8 w-8 rounded bg-surface-raised border border-border flex items-center justify-center text-text-muted font-mono-tech font-bold text-xs shrink-0 group-hover:text-interactive transition-colors">
          {definition.name[0]}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary text-xs truncate group-hover:text-interactive transition-colors">
              {definition.name}
            </span>
          </div>
          <span className="text-[11px] text-text-muted truncate block">
            {definition.role || 'Specialist Profile'}
          </span>
        </div>
      </div>

      {/* Middle: State Badge & Capabilities */}
      <div className="flex items-center gap-3 sm:w-1/4">
        <StatusBadge status={runtime.state} />
        <span className="hidden md:flex items-center gap-1 font-mono-tech text-[11px] text-text-muted">
          <Cpu className="h-3 w-3" />
          {capabilities.healthy ?? 0} healthy
        </span>
      </div>

      {/* Right: Metrics (Delegations, Cost, Last Active) */}
      <div className="flex items-center justify-between sm:justify-end gap-4 font-mono-tech text-[11px] text-text-muted sm:w-5/12">
        <span className="flex items-center gap-1">
          <GitFork className="h-3 w-3 text-text-muted" />
          {runtime.activeDelegations ?? 0} del
        </span>

        <span className="flex items-center gap-1">
          <Coins className="h-3 w-3 text-text-muted" />
          ${(usage?.estimatedCostUsd ?? 0).toFixed(2)}
        </span>

        <span className="flex items-center gap-1 text-text-muted">
          <Clock className="h-3 w-3 text-text-muted" />
          {runtime.lastActivityAt
            ? new Date(runtime.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      </div>
    </div>
  )
}
