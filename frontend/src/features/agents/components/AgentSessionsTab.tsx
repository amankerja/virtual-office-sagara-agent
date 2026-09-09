import React from 'react'
import type { AgentProjection, AgentSessionItem } from '@/types/agent'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageSquare, Terminal, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AgentSessionsTabProps {
  agent: AgentProjection;
}

export const AgentSessionsTab: React.FC<AgentSessionsTabProps> = ({ agent }) => {
  const sessions: AgentSessionItem[] = agent.sessions || []

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No Sessions Recorded"
        description="No active or historical interaction sessions have been tracked for this agent instance."
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono-tech px-1">
        <span>Recorded Sessions ({sessions.length})</span>
        <span>Latest Activity</span>
      </div>

      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-3 rounded-lg border border-border bg-surface hover:border-border-strong transition-colors space-y-2.5 font-mono-tech"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-text-muted" />
                <span className="font-semibold text-text-primary text-xs">{session.id}</span>
              </div>
              <Badge
                variant="outline"
                className={
                  session.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]'
                    : 'border-border bg-surface-subtle text-text-muted text-[10px]'
                }
              >
                {session.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-text-secondary pt-1 border-t border-border-subtle">
              <div>
                <span className="text-text-muted block text-[10px]">Source</span>
                <span className="truncate block">{session.source}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Model</span>
                <span className="truncate block">{session.model}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Messages</span>
                <span className="font-medium text-text-primary">{session.messageCount}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Last Active</span>
                <span className="flex items-center gap-1 text-text-muted">
                  <Clock className="h-3 w-3" />
                  {new Date(session.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
