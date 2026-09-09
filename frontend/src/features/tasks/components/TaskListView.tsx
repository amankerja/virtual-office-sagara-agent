import React from 'react'
import type { TaskProjection } from '@/types/task'
import { mapStateToKanbanColumn, KANBAN_COLUMNS } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import { TaskStateBadge } from '@/components/shared/TaskStateBadge'
import { TaskPriorityBadge } from '@/components/shared/TaskPriorityBadge'
import { Button } from '@/components/ui/button'
import { Bot, Calendar, ArrowRight, Layers, Send, ExternalLink } from 'lucide-react'

interface TaskListViewProps {
  tasks: TaskProjection[]
  agents: AgentProjection[]
  onSelectTask: (task: TaskProjection) => void
  onPrepareDispatch?: (task: TaskProjection) => void
  onReviewApproval?: (approvalId: string) => void
  isLoading?: boolean
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  agents,
  onSelectTask,
  onPrepareDispatch,
  onReviewApproval,
  isLoading = false,
}) => {
  const agentMap = new Map(agents.map((a) => [a.id, a]))
  const kanbanColumnMap = new Map(KANBAN_COLUMNS.map((c) => [c.id, c.label]))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
        No tasks found matching current filters.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/80 text-[11px] font-mono-tech uppercase tracking-wider text-text-muted">
              <th className="py-3 px-3.5 font-medium">Task</th>
              <th className="py-3 px-3 font-medium">State / Stage</th>
              <th className="py-3 px-3 font-medium">Priority</th>
              <th className="py-3 px-3 font-medium">Assigned Agent</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Requirements</th>
              <th className="py-3 px-3 font-medium hidden lg:table-cell">Due / Updated</th>
              <th className="py-3 px-3.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {tasks.map((task) => {
              const agent = task.assignedAgentId ? agentMap.get(task.assignedAgentId) : null
              const colLabel = kanbanColumnMap.get(mapStateToKanbanColumn(task.state)) || ''
              const isReady = task.state === 'READY' || task.state === 'DRAFT'
              const isAwaitingApproval = task.state === 'AWAITING_APPROVAL'
              const primaryApprovalId = task.approvalIds && task.approvalIds.length > 0 ? task.approvalIds[0] : null

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="hover:bg-surface-hover/80 transition-colors cursor-pointer group"
                >
                  {/* Task ID & Title */}
                  <td className="py-3 px-3.5 min-w-56 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-tech text-[10px] text-text-muted">{task.id}</span>
                    </div>
                    <div className="font-semibold text-text-primary group-hover:text-interactive transition-colors mt-0.5 leading-snug line-clamp-1">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>

                  {/* State & Kanban Projection */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TaskStateBadge state={task.state} />
                      <span className="text-[10px] font-mono-tech text-text-muted hidden sm:inline">
                        • {colLabel}
                      </span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <TaskPriorityBadge priority={task.priority} />
                  </td>

                  {/* Agent */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {agent ? (
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-interactive" />
                        <span className="font-medium text-text-primary font-mono-tech">
                          {agent.definition.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-muted italic font-mono-tech">Unassigned</span>
                    )}
                  </td>

                  {/* Requirements / Skills */}
                  <td className="py-3 px-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 flex-wrap max-w-44">
                      {task.requestedSkills?.slice(0, 2).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono-tech bg-surface-subtle border border-border text-text-muted truncate"
                        >
                          <Layers className="h-2 w-2" />
                          {skill}
                        </span>
                      ))}
                      {(task.requestedSkills?.length || 0) > 2 && (
                        <span className="text-[9px] font-mono-tech text-text-muted">
                          +{(task.requestedSkills?.length || 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Due / Updated */}
                  <td className="py-3 px-3 hidden lg:table-cell whitespace-nowrap font-mono-tech text-[10px] text-text-muted">
                    {task.dueAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ) : (
                      <span>{new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {isReady && onPrepareDispatch && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPrepareDispatch(task)
                          }}
                          className="h-6 px-2 text-[10px] font-mono-tech text-text-primary hover:text-interactive border-border"
                        >
                          <Send className="h-2.5 w-2.5 mr-1" />
                          Dispatch
                        </Button>
                      )}

                      {isAwaitingApproval && primaryApprovalId && onReviewApproval && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onReviewApproval(primaryApprovalId)
                          }}
                          className="h-6 px-2 text-[10px] font-mono-tech border-amber-600/40 text-amber-700 dark:text-amber-300"
                        >
                          Review
                          <ExternalLink className="h-2.5 w-2.5 ml-1" />
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectTask(task)
                        }}
                        className="h-6 w-6 p-0 text-text-muted group-hover:text-text-primary"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
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
