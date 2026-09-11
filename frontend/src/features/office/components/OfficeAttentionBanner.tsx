import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OfficeSceneProjection } from '@/features/office/types/office'

interface OfficeAttentionBannerProps {
  scene: OfficeSceneProjection
  onSelectAgent: (agentId: string) => void
}

export const OfficeAttentionBanner: React.FC<OfficeAttentionBannerProps> = ({
  scene,
  onSelectAgent,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const navigate = useNavigate()

  const pendingApprovals = scene.approvalSummary.items
  const degradedAgents = scene.desks.filter(
    (d) => d.agent.runtime.state === 'DEGRADED' || d.agent.runtime.state === 'ERROR'
  )
  const failedTasks = scene.desks
    .filter((d) => d.currentTask?.state === 'FAILED' || d.currentTask?.state === 'BLOCKED')
    .map((d) => d.currentTask!)

  const totalIssues = pendingApprovals.length + degradedAgents.length + failedTasks.length

  if (totalIssues === 0) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Operator Attention Required ({totalIssues} items)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-6 px-2 text-[11px] text-amber-800 dark:text-amber-300 hover:bg-amber-500/15"
        >
          {isOpen ? (
            <>
              Hide Details <ChevronUp className="h-3 w-3 ml-1" />
            </>
          ) : (
            <>
              View Items <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-2.5 pt-2 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="bg-surface/80 p-2 rounded-lg border border-border">
              <div className="font-mono-tech text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Approvals ({pendingApprovals.length})
                </span>
                <button
                  onClick={() => navigate('/approvals')}
                  className="text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-1">
                {pendingApprovals.slice(0, 2).map((appr) => (
                  <div
                    key={appr.id}
                    onClick={() => navigate(`/approvals?approval=${appr.id}`)}
                    className="cursor-pointer hover:bg-surface-subtle p-1 rounded transition-colors text-[11px] text-text-primary truncate"
                  >
                    <span className="font-mono-tech font-bold text-rose-600 dark:text-rose-400 mr-1">
                      [{appr.risk}]
                    </span>
                    {appr.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Degraded / Error Agents */}
          {degradedAgents.length > 0 && (
            <div className="bg-surface/80 p-2 rounded-lg border border-border">
              <div className="font-mono-tech text-[10px] font-bold text-orange-700 dark:text-orange-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Degraded Nodes ({degradedAgents.length})
                </span>
              </div>
              <div className="space-y-1">
                {degradedAgents.map((d) => (
                  <div
                    key={d.agentId}
                    onClick={() => onSelectAgent(d.agentId)}
                    className="cursor-pointer hover:bg-surface-subtle p-1 rounded transition-colors text-[11px] text-text-primary truncate flex items-center justify-between"
                  >
                    <span className="truncate">{d.agent.definition.name}</span>
                    <span className="font-mono-tech text-[9px] uppercase font-bold text-orange-600 ml-1">
                      {d.agent.runtime.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed / Blocked Tasks */}
          {failedTasks.length > 0 && (
            <div className="bg-surface/80 p-2 rounded-lg border border-border">
              <div className="font-mono-tech text-[10px] font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Blocked Tasks ({failedTasks.length})
                </span>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-primary hover:underline"
                >
                  View Tasks
                </button>
              </div>
              <div className="space-y-1">
                {failedTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks?task=${t.id}`)}
                    className="cursor-pointer hover:bg-surface-subtle p-1 rounded transition-colors text-[11px] text-text-primary truncate"
                  >
                    <span className="font-mono-tech font-bold text-rose-600 mr-1">[{t.state}]</span>
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
