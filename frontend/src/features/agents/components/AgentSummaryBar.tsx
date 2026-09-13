import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { Bot, CheckCircle2, Activity, AlertTriangle } from 'lucide-react'

interface AgentSummaryBarProps {
  agents: AgentProjection[];
}

export const AgentSummaryBar: React.FC<AgentSummaryBarProps> = ({ agents }) => {
  const registered = agents.length
  const enabled = agents.filter((a) => a.definition.enabled).length
  const active = agents.filter((a) => a.runtime.state === 'ACTIVE').length
  const needsAttention = agents.filter(
    (a) =>
      a.runtime.state === 'AWAITING_APPROVAL' ||
      a.runtime.state === 'DEGRADED' ||
      a.runtime.state === 'ERROR' ||
      a.definition.configurationState === 'INCOMPLETE'
  ).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-border bg-surface text-xs">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-surface-subtle border border-border flex items-center justify-center text-text-muted">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Registered</span>
          <span className="font-semibold text-text-primary text-sm">{registered}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-surface-subtle border border-border flex items-center justify-center text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Enabled</span>
          <span className="font-semibold text-text-primary text-sm">{enabled}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-surface-subtle border border-border flex items-center justify-center text-interactive">
          <Activity className="h-3.5 w-3.5" />
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Active</span>
          <span className="font-semibold text-text-primary text-sm">{active}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-surface-subtle border border-border flex items-center justify-center text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Needs attention</span>
          <span className="font-semibold text-text-primary text-sm">{needsAttention}</span>
        </div>
      </div>
    </div>
  )
}
