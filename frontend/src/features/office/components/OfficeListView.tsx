import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Layers,
  Cpu,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OfficeSceneProjection } from '@/features/office/types/office'

interface OfficeListViewProps {
  scene: OfficeSceneProjection
  onSelectAgent: (agentId: string) => void
}

export const OfficeListView: React.FC<OfficeListViewProps> = ({
  scene,
  onSelectAgent,
}) => {
  const navigate = useNavigate()
  const { desks, approvalSummary, runtimeSummary } = scene

  return (
    <div className="space-y-4">
      {/* Accessible Table / Card List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle/50">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Workstation Spatial Registry
            </h3>
            <p className="text-xs text-text-muted">
              Operational state, spatial zones, assigned workloads, and active delegated worker threads.
            </p>
          </div>
          <Badge variant="outline" className="font-mono-tech text-[10px]">
            {desks.length} WORKSTATIONS
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/30 font-mono-tech text-[10px] text-text-muted uppercase">
                <th className="py-2.5 px-4 font-medium">Zone</th>
                <th className="py-2.5 px-4 font-medium">Agent Profile</th>
                <th className="py-2.5 px-4 font-medium">State</th>
                <th className="py-2.5 px-4 font-medium">Current Work</th>
                <th className="py-2.5 px-4 font-medium">Workers</th>
                <th className="py-2.5 px-4 font-medium">Attention</th>
                <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {desks.map((desk) => {
                const { agent, zone, currentTask, activeDelegations } = desk
                const hasCapabilityWarning =
                  (agent.capabilities?.degraded ?? 0) > 0 || (agent.capabilities?.missing ?? 0) > 0

                return (
                  <tr
                    key={desk.agentId}
                    className="hover:bg-surface-subtle/50 transition-colors cursor-pointer group"
                    onClick={() => onSelectAgent(desk.agentId)}
                  >
                    {/* Zone */}
                    <td className="py-3 px-4 font-mono-tech text-[11px] font-semibold text-text-secondary">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-subtle border border-border">
                        <Layers className="h-3 w-3 text-text-muted" />
                        {zone.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Agent Profile */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {agent.definition.name}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {agent.definition.role || 'Autonomous Worker'}
                      </div>
                    </td>

                    {/* State */}
                    <td className="py-3 px-4">
                      <StatusBadge status={agent.runtime.state} />
                    </td>

                    {/* Current Work */}
                    <td className="py-3 px-4 max-w-xs">
                      {currentTask ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/tasks?task=${currentTask.id}`)
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          <div className="font-medium text-text-primary truncate">
                            {currentTask.title}
                          </div>
                          <div className="text-[10px] font-mono-tech text-text-muted flex items-center gap-1.5">
                            <span className="font-bold text-primary">[{currentTask.state}]</span>
                            {currentTask.progress && (
                              <span>
                                {currentTask.progress.completed}/{currentTask.progress.total}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted font-mono-tech text-[11px]">Standing by</span>
                      )}
                    </td>

                    {/* Workers */}
                    <td className="py-3 px-4">
                      {activeDelegations.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-mono-tech font-bold text-[10px]">
                          <Cpu className="h-3 w-3" />
                          <span>{activeDelegations.length} Active</span>
                        </div>
                      ) : (
                        <span className="text-text-muted font-mono-tech text-[10px]">—</span>
                      )}
                    </td>

                    {/* Attention */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {agent.runtime.state === 'AWAITING_APPROVAL' && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px] h-5">
                            Approval Req.
                          </Badge>
                        )}
                        {hasCapabilityWarning && (
                          <Badge variant="outline" className="border-orange-500/40 text-orange-700 dark:text-orange-400 text-[10px] h-5">
                            Degraded Skill
                          </Badge>
                        )}
                        {agent.runtime.state === 'ERROR' && (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-400 text-[10px] h-5">
                            Error
                          </Badge>
                        )}
                        {agent.runtime.state === 'OFFLINE' && (
                          <span className="text-text-muted text-[11px] font-mono-tech">Node Offline</span>
                        )}
                        {agent.runtime.state !== 'AWAITING_APPROVAL' &&
                          !hasCapabilityWarning &&
                          agent.runtime.state !== 'ERROR' &&
                          agent.runtime.state !== 'OFFLINE' && (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-mono-tech">
                              Normal
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectAgent(desk.agentId)
                        }}
                        className="h-7 px-2 text-xs text-text-secondary hover:text-primary gap-1"
                      >
                        <span>Drawer</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facilities Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Approval Pod Card */}
        <div
          onClick={() => navigate('/approvals')}
          className="p-3.5 bg-surface border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Approval Pod
            </span>
            <Badge variant="outline" className="text-[10px] font-mono-tech">
              {approvalSummary.pendingCount} PENDING
            </Badge>
          </div>
          <p className="text-xs text-text-muted mb-2">
            {approvalSummary.oldestPending
              ? `Oldest: ${approvalSummary.oldestPending.title}`
              : 'All autonomous action boundaries nominal.'}
          </p>
          <div className="text-[10px] font-mono-tech text-primary font-medium flex items-center gap-1">
            <span>Manage Approvals</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Runtime Room Card */}
        <div
          onClick={() => navigate('/runtime')}
          className="p-3.5 bg-surface border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Server / Runtime Room
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono-tech ${
                runtimeSummary.gatewayState === 'HEALTHY'
                  ? 'text-emerald-600 border-emerald-500/30'
                  : 'text-amber-600 border-amber-500/30'
              }`}
            >
              {runtimeSummary.gatewayState}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mb-2">
            {runtimeSummary.activeSessions} active sessions, {runtimeSummary.activeDelegations} background delegations on {runtimeSummary.host}.
          </p>
          <div className="text-[10px] font-mono-tech text-primary font-medium flex items-center gap-1">
            <span>Runtime Telemetry</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Artifact Vault Card */}
        <div
          onClick={() => navigate('/tasks?state=COMPLETED')}
          className="p-3.5 bg-surface border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              Artifact Vault
            </span>
            <Badge variant="outline" className="text-[10px] font-mono-tech">
              {scene.vaultSummary.totalArtifacts} OUTPUTS
            </Badge>
          </div>
          <p className="text-xs text-text-muted mb-2">
            {scene.vaultSummary.completedTasksWithArtifacts.length} completed tasks produced verified deliverables.
          </p>
          <div className="text-[10px] font-mono-tech text-primary font-medium flex items-center gap-1">
            <span>Inspect Outputs</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
