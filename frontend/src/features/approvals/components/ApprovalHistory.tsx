import React from 'react'
import type { ApprovalProjection } from '@/types/approval'
import type { AgentProjection } from '@/types/agent'
import type { TaskProjection } from '@/types/task'
import { ApprovalRiskBadge } from '@/components/shared/ApprovalRiskBadge'
import { ApprovalStateBadge } from '@/components/shared/ApprovalStateBadge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Bot, CheckSquare } from 'lucide-react'

interface ApprovalHistoryProps {
  approvals: ApprovalProjection[]
  agents: AgentProjection[]
  tasks: TaskProjection[]
  onSelectApproval: (approval: ApprovalProjection) => void
  isLoading?: boolean
}

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({
  approvals,
  agents,
  tasks,
  onSelectApproval,
  isLoading = false,
}) => {
  const agentMap = new Map(agents.map((a) => [a.id, a]))
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  // Filter non-pending approvals
  const historyItems = approvals.filter((a) => a.state !== 'PENDING')

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  if (historyItems.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
        No resolved approval history recorded yet.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/80 text-[11px] font-mono-tech uppercase tracking-wider text-text-muted">
              <th className="py-3 px-3.5 font-medium">Request</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-3 font-medium">Risk</th>
              <th className="py-3 px-3 font-medium">Decision Summary</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Agent / Task</th>
              <th className="py-3 px-3.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {historyItems.map((appr) => {
              const agent = appr.agentId ? agentMap.get(appr.agentId) : null
              const task = appr.taskId ? taskMap.get(appr.taskId) : null

              return (
                <tr
                  key={appr.id}
                  onClick={() => onSelectApproval(appr)}
                  className="hover:bg-surface-hover/80 transition-colors cursor-pointer group"
                >
                  {/* Title & Action Type */}
                  <td className="py-3 px-3.5 max-w-xs">
                    <div className="flex items-center gap-1.5 font-mono-tech text-[10px] text-text-muted">
                      <span>{appr.id}</span>
                      <span>•</span>
                      <span>{appr.actionType.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="font-semibold text-text-primary group-hover:text-interactive transition-colors mt-0.5 line-clamp-1">
                      {appr.title}
                    </div>
                  </td>

                  {/* State */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <ApprovalStateBadge state={appr.state} />
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <ApprovalRiskBadge risk={appr.risk} />
                  </td>

                  {/* Decision Reason */}
                  <td className="py-3 px-3 max-w-xs text-text-secondary text-[11px]">
                    {appr.decision?.reason ? (
                      <div>
                        <span className="line-clamp-1 font-medium text-text-primary">
                          "{appr.decision.reason}"
                        </span>
                        <span className="text-[10px] text-text-muted font-mono-tech block mt-0.5">
                          by {appr.decision.decisionMaker || 'System'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-muted italic">No decision note recorded</span>
                    )}
                  </td>

                  {/* Agent / Task */}
                  <td className="py-3 px-3 hidden md:table-cell whitespace-nowrap font-mono-tech text-[11px] text-text-muted">
                    <div className="space-y-0.5">
                      {agent && (
                        <div className="flex items-center gap-1 text-text-primary">
                          <Bot className="h-3 w-3 text-interactive" />
                          <span>{agent.definition.name}</span>
                        </div>
                      )}
                      {task && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <CheckSquare className="h-2.5 w-2.5" />
                          <span>{task.id}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectApproval(appr)
                      }}
                      className="h-7 w-7 p-0 text-text-muted group-hover:text-text-primary"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
