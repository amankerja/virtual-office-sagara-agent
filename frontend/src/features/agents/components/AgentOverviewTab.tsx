import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CheckCircle2, AlertTriangle, Shield, Cpu, Activity, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AgentOverviewTabProps {
  agent: AgentProjection;
}

export const AgentOverviewTab: React.FC<AgentOverviewTabProps> = ({ agent }) => {
  const { definition, runtime, capabilities } = agent

  return (
    <div className="space-y-5 text-xs">
      {/* Current Work Box */}
      <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono-tech text-text-muted">
          <span className="flex items-center gap-1.5 uppercase font-medium">
            <Activity className="h-3.5 w-3.5 text-interactive" />
            Current Workload
          </span>
          {runtime.activeDelegations !== undefined && runtime.activeDelegations > 0 && (
            <Badge variant="outline" className="border-border bg-surface text-interactive text-[10px]">
              {runtime.activeDelegations} Delegations
            </Badge>
          )}
        </div>
        <p className="text-text-primary text-xs leading-relaxed">
          {runtime.currentActivity || 'No active task execution reported.'}
        </p>
      </div>

      {/* Profile Metadata */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted font-mono-tech">
          Profile Specification
        </h4>
        <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border bg-surface font-mono-tech">
          <div>
            <span className="text-text-muted block text-[10px]">Identifier</span>
            <span className="text-text-primary font-medium">{agent.id}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">Specialist Role</span>
            <span className="text-text-primary">{definition.role || 'Unspecified'}</span>
          </div>
          <div className="col-span-2 pt-1 border-t border-border">
            <span className="text-text-muted block text-[10px]">Description</span>
            <span className="text-text-secondary font-sans text-xs">
              {definition.description || 'No profile description configured.'}
            </span>
          </div>
        </div>
      </div>

      {/* Runtime Telemetry */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted font-mono-tech">
          Runtime State & Telemetry
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-surface font-mono-tech">
          <div>
            <span className="text-text-muted block text-[10px]">Execution State</span>
            <StatusBadge status={runtime.state} className="mt-1" />
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">Confidence</span>
            <span className="text-text-primary font-medium mt-1 inline-block">
              {runtime.confidence}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">Assigned Model</span>
            <span className="text-text-primary mt-1 inline-block truncate max-w-full">
              {runtime.model || 'None assigned'}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-[10px]">Session Count</span>
            <span className="text-text-primary font-medium">{runtime.sessionCount ?? 0}</span>
          </div>
          <div className="col-span-2">
            <span className="text-text-muted block text-[10px]">Last Heartbeat / Activity</span>
            <span className="text-text-secondary flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-text-muted" />
              {runtime.lastActivityAt
                ? new Date(runtime.lastActivityAt).toLocaleTimeString()
                : 'Never active'}
            </span>
          </div>
        </div>
      </div>

      {/* Health & Capability Summary */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted font-mono-tech">
          Health & Boundaries
        </h4>
        <div className="space-y-1.5 p-3 rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between py-1 border-b border-border">
            <span className="text-text-secondary flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-text-muted" />
              Configuration Integrity
            </span>
            <span className="font-mono-tech font-medium text-xs">
              {definition.configurationState === 'INCOMPLETE' ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Incomplete
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Complete
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-border">
            <span className="text-text-secondary flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-text-muted" />
              Capability Health
            </span>
            <span className="font-mono-tech text-text-primary text-xs">
              {capabilities.healthy ?? 0} healthy
              {(capabilities.degraded ?? 0) > 0 && `, ${capabilities.degraded} degraded`}
              {(capabilities.missing ?? 0) > 0 && `, ${capabilities.missing} missing`}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-text-secondary">Execution Mode</span>
            <span className="font-mono-tech text-interactive font-medium">
              {definition.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
