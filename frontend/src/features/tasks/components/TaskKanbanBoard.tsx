import React, { useState } from 'react'
import type { TaskProjection, KanbanColumnId } from '@/types/task'
import { KANBAN_COLUMNS, mapStateToKanbanColumn } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import { TaskCard } from './TaskCard'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, PlayCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskKanbanBoardProps {
  tasks: TaskProjection[]
  agents: AgentProjection[]
  onSelectTask: (task: TaskProjection) => void
  onPrepareDispatch?: (task: TaskProjection) => void
  onReviewApproval?: (approvalId: string) => void
  isLoading?: boolean
}

const COLUMN_ICON_MAP: Record<KanbanColumnId, React.ComponentType<{ className?: string }>> = {
  TODO: Clock,
  IN_PROGRESS: PlayCircle,
  NEEDS_ATTENTION: AlertTriangle,
  DONE: CheckCircle2,
}

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  agents,
  onSelectTask,
  onPrepareDispatch,
  onReviewApproval,
  isLoading = false,
}) => {
  // Mobile active column selector
  const [mobileActiveColumn, setMobileActiveColumn] = useState<KanbanColumnId>('TODO')

  // Group tasks by their projected Kanban column
  const groupedTasks: Record<KanbanColumnId, TaskProjection[]> = {
    TODO: [],
    IN_PROGRESS: [],
    NEEDS_ATTENTION: [],
    DONE: [],
  }

  tasks.forEach((t) => {
    const colId = mapStateToKanbanColumn(t.state)
    groupedTasks[colId].push(t)
  })

  // Agent lookup map for fast lookup
  const agentMap = new Map(agents.map((a) => [a.id, a]))

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-96 rounded-xl bg-surface border border-border animate-pulse p-4 space-y-3">
            <div className="h-6 w-1/2 bg-surface-subtle rounded" />
            <div className="h-24 bg-surface-subtle rounded-lg" />
            <div className="h-24 bg-surface-subtle rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile Segmented Column Tabs (visible on small screens) */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-lg bg-surface border border-border">
          {KANBAN_COLUMNS.map((col) => {
            const count = groupedTasks[col.id].length
            const isSelected = mobileActiveColumn === col.id
            const Icon = COLUMN_ICON_MAP[col.id]

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setMobileActiveColumn(col.id)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-mono-tech transition-all cursor-pointer',
                  isSelected
                    ? 'bg-surface-subtle text-text-primary font-bold shadow-xs border border-border'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{col.label}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-1 text-[10px] px-1 py-0 border-border',
                    col.id === 'NEEDS_ATTENTION' && count > 0
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-600/30'
                      : 'bg-surface text-text-muted'
                  )}
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop 4-Column Grid & Mobile Filtered Single Column */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = groupedTasks[col.id]
          const isMobileVisible = mobileActiveColumn === col.id
          const Icon = COLUMN_ICON_MAP[col.id]

          return (
            <div
              key={col.id}
              className={cn(
                'flex flex-col rounded-xl border border-border bg-surface-subtle/60 p-3 sm:p-3.5 transition-all',
                // On mobile, show only the selected segmented column; on lg show all 4
                isMobileVisible ? 'flex' : 'hidden lg:flex'
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'p-1.5 rounded-md border text-text-primary',
                      col.id === 'NEEDS_ATTENTION'
                        ? 'bg-amber-500/10 border-amber-600/20 text-amber-700 dark:text-amber-400'
                        : col.id === 'IN_PROGRESS'
                          ? 'bg-emerald-500/10 border-emerald-600/20 text-emerald-700 dark:text-emerald-400'
                          : col.id === 'DONE'
                            ? 'bg-blue-500/10 border-blue-600/20 text-blue-700 dark:text-blue-400'
                            : 'bg-surface border-border text-text-secondary'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono-tech truncate">
                      {col.label}
                    </h3>
                    <p className="text-[10px] text-text-muted truncate hidden sm:block">
                      {col.description}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono-tech px-2 py-0.5 border-border shrink-0',
                    col.id === 'NEEDS_ATTENTION' && colTasks.length > 0
                      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/30'
                      : 'bg-surface text-text-primary'
                  )}
                >
                  {colTasks.length}
                </Badge>
              </div>

              {/* Scrollable Column Stack */}
              <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-border bg-surface/50 text-text-muted text-xs">
                    No tasks in {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assignedAgent={task.assignedAgentId ? agentMap.get(task.assignedAgentId) || null : null}
                      onSelect={onSelectTask}
                      onPrepareDispatch={onPrepareDispatch}
                      onReviewApproval={onReviewApproval}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
