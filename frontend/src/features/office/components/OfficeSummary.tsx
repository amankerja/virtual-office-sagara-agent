import React from 'react'
import { Users, Activity, AlertTriangle, Cpu, Radio } from 'lucide-react'
import type { OfficeSceneProjection } from '@/features/office/types/office'

interface OfficeSummaryProps {
  scene: OfficeSceneProjection
}

export const OfficeSummary: React.FC<OfficeSummaryProps> = ({ scene }) => {
  const { desks, workers, approvalSummary, runtimeSummary } = scene

  const totalAgents = desks.length
  const activeAgents = desks.filter((d) => d.agent.runtime.state === 'ACTIVE').length
  const attentionAgents = desks.filter(
    (d) =>
      d.agent.runtime.state === 'AWAITING_APPROVAL' ||
      d.agent.runtime.state === 'DEGRADED' ||
      d.agent.runtime.state === 'ERROR'
  ).length
  const pendingApprovals = approvalSummary.pendingCount
  const totalWorkers = workers.length
  const gatewayState = runtimeSummary.gatewayState

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 bg-surface border border-border rounded-xl">
      {/* Total Agents */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle">
        <Users className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-text-muted uppercase">Fleet</div>
          <div className="text-sm font-semibold text-text-primary">{totalAgents} Agents</div>
        </div>
      </div>

      {/* Active Agents */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle">
        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-text-muted uppercase">Active</div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {activeAgents} Running
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle">
        <AlertTriangle
          className={`h-4 w-4 shrink-0 ${
            attentionAgents > 0 || pendingApprovals > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-text-muted'
          }`}
        />
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-text-muted uppercase">Attention</div>
          <div
            className={`text-sm font-semibold ${
              attentionAgents > 0 || pendingApprovals > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-text-primary'
            }`}
          >
            {attentionAgents + pendingApprovals} Items
          </div>
        </div>
      </div>

      {/* Temporary Workers */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle">
        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-text-muted uppercase">Workers</div>
          <div className="text-sm font-semibold text-text-primary">{totalWorkers} Active</div>
        </div>
      </div>

      {/* Gateway State */}
      <div className="col-span-2 sm:col-span-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle">
        <Radio
          className={`h-4 w-4 shrink-0 ${
            gatewayState === 'HEALTHY'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        />
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-text-muted uppercase">Gateway</div>
          <div
            className={`text-sm font-semibold uppercase ${
              gatewayState === 'HEALTHY'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {gatewayState}
          </div>
        </div>
      </div>
    </div>
  )
}
