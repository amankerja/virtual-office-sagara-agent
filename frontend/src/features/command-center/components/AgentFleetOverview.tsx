import React from 'react'
import { Link } from 'react-router-dom'
import type { AgentProjection } from '@/types/agent'
import { SectionCard } from '@/components/shared/SectionCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, Bot, Clock, GitFork } from 'lucide-react'

interface AgentFleetOverviewProps {
  agents: AgentProjection[];
  onSelectAgent: (id: string) => void;
  isLoading?: boolean;
}

export const AgentFleetOverview: React.FC<AgentFleetOverviewProps> = ({
  agents,
  onSelectAgent,
  isLoading = false,
}) => {
  // Show up to 5 agents for compact overview
  const displayedAgents = agents.slice(0, 5)

  return (
    <SectionCard
      title="Agent Fleet Overview"
      description="Real-time workload projections and active capability execution across specialist units."
      action={
        <Button variant="ghost" size="xs" asChild className="text-text-muted hover:text-text-primary">
          <Link to="/agents" className="flex items-center gap-1 font-mono-tech text-[11px]">
            Directory ({agents.length})
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      }
      contentClassName="p-3 sm:p-4"
    >
      {isLoading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-subtle animate-pulse border border-border" />
          ))}
        </div>
      ) : displayedAgents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No Active Agents Detected"
          description="Agents will populate once registered in the Sagara Mission Control runtime."
          className="py-12"
        />
      ) : (
        <div className="space-y-2">
          {displayedAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="p-3 rounded-lg border border-border bg-surface hover:border-interactive/60 hover:bg-surface-hover transition-all cursor-pointer space-y-2"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectAgent(agent.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded bg-surface-raised border border-border flex items-center justify-center text-text-muted shrink-0 font-mono-tech font-semibold text-xs">
                    {agent.definition.name[0]}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-text-primary text-xs truncate block">
                      {agent.definition.name}
                    </span>
                    <span className="text-[11px] text-text-muted truncate block">
                      {agent.definition.role || 'Specialist Profile'}
                    </span>
                  </div>
                </div>

                <StatusBadge status={agent.runtime.state} />
              </div>

              {/* Current Activity & Delegations */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono-tech text-text-muted pt-1 border-t border-border-subtle">
                <span className="text-text-secondary truncate max-w-sm">
                  {agent.runtime.currentActivity || 'No active activity reported.'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {agent.runtime.activeDelegations !== undefined && agent.runtime.activeDelegations > 0 && (
                    <Badge variant="outline" className="border-border bg-surface-subtle text-interactive text-[10px] gap-1 px-1.5 py-0">
                      <GitFork className="h-3 w-3" />
                      {agent.runtime.activeDelegations} delegations
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Clock className="h-3 w-3" />
                    {agent.runtime.lastActivityAt
                      ? new Date(agent.runtime.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
