import React from 'react'
import type { SessionProjection } from '@/types/runtime'
import { Hash, Bot, Radio, Cpu, Layers, Clock, AlertCircle } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface SessionOverviewTabProps {
  session: SessionProjection;
}

export const SessionOverviewTab: React.FC<SessionOverviewTabProps> = ({ session }) => {
  return (
    <div className="p-4 sm:p-5 space-y-5 text-xs font-mono-tech">
      {/* Session Metadata Grid */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Session Parameters
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Hash className="h-3 w-3" /> Session ID
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {session.id}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Bot className="h-3 w-3" /> Dispatched Agent
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate font-sans">
              {session.agentName}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Radio className="h-3 w-3" /> Source Origin
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {session.source}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Model Assignment
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {session.model || '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Layers className="h-3 w-3" /> Provider
            </span>
            <span className="font-medium text-text-primary mt-1 block capitalize">
              {session.provider || '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Started
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {formatTimestampRelative(session.startedAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last Activity
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {formatTimestampRelative(session.lastActivityAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> End Reason
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {session.endReason || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Message and Tool Counts */}
      <div className="p-3.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-around text-center">
        <div>
          <span className="text-[10px] uppercase text-text-muted block">Messages</span>
          <span className="text-base font-bold text-text-primary mt-0.5 block">
            {session.messagesCount}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <span className="text-[10px] uppercase text-text-muted block">Tool Invocations</span>
          <span className="text-base font-bold text-text-primary mt-0.5 block">
            {session.toolsCount}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <span className="text-[10px] uppercase text-text-muted block">Delegations</span>
          <span className="text-base font-bold text-text-primary mt-0.5 block">
            {session.delegationIds?.length ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}
