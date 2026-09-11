import React from 'react'
import { Users, Activity, Clock, PowerOff, ShieldCheck, AlertCircle } from 'lucide-react'
import type { OfficeSceneProjection } from '@/features/office/types/office'

interface OfficeMobileSummaryProps {
  scene: OfficeSceneProjection
  onSelectAgent?: (agentId: string) => void
}

export const OfficeMobileSummary: React.FC<OfficeMobileSummaryProps> = ({ scene }) => {
  const { desks, runtimeSummary } = scene

  const totalAgents = desks.length
  const activeCount = desks.filter((d) => d.agent.runtime.state === 'ACTIVE').length
  const waitingApprovalCount = desks.filter(
    (d) => d.agent.runtime.state === 'AWAITING_APPROVAL' || d.currentTask?.state === 'AWAITING_APPROVAL'
  ).length
  const offlineCount = desks.filter((d) => d.agent.runtime.state === 'OFFLINE').length
  const isHealthy = runtimeSummary.gatewayState === 'HEALTHY'

  return (
    <div
      data-office-mobile-summary
      className="block sm:hidden p-3 bg-surface border border-border rounded-xl space-y-2.5 shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <span className="text-[10px] font-mono-tech font-bold uppercase tracking-wider text-text-muted">
          Fleet Health & Telemetry
        </span>
        <span
          className={`text-[9px] font-mono-tech font-bold uppercase flex items-center gap-1 ${
            isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {isHealthy ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {runtimeSummary.gatewayState}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {/* Total Agents */}
        <div className="p-2 rounded-lg bg-surface-subtle">
          <Users className="h-3.5 w-3.5 mx-auto text-text-muted mb-1" />
          <div className="text-sm font-bold text-text-primary">{totalAgents}</div>
          <div className="text-[9px] font-mono-tech text-text-muted uppercase">Agents</div>
        </div>

        {/* Active Agents */}
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Activity className="h-3.5 w-3.5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          <div className="text-[9px] font-mono-tech text-emerald-700 dark:text-emerald-400 uppercase">Active</div>
        </div>

        {/* Waiting Approval */}
        <div
          className={`p-2 rounded-lg ${
            waitingApprovalCount > 0
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-surface-subtle'
          }`}
        >
          <Clock
            className={`h-3.5 w-3.5 mx-auto mb-1 ${
              waitingApprovalCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted'
            }`}
          />
          <div
            className={`text-sm font-bold ${
              waitingApprovalCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'
            }`}
          >
            {waitingApprovalCount}
          </div>
          <div className="text-[9px] font-mono-tech text-text-muted uppercase">Wait Appr</div>
        </div>

        {/* Offline Agents */}
        <div className="p-2 rounded-lg bg-surface-subtle">
          <PowerOff className="h-3.5 w-3.5 mx-auto text-text-muted mb-1" />
          <div className="text-sm font-bold text-text-muted">{offlineCount}</div>
          <div className="text-[9px] font-mono-tech text-text-muted uppercase">Offline</div>
        </div>
      </div>
    </div>
  )
}
