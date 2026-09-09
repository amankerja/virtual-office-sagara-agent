import React from 'react'
import type { TaskProjection } from '@/types/task'
import { CheckSquare, PlayCircle, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskSummaryProps {
  tasks: TaskProjection[]
  activeStateFilter?: string
  onSelectFilter?: (state: string) => void
  isLoading?: boolean
}

export const TaskSummary: React.FC<TaskSummaryProps> = ({
  tasks,
  activeStateFilter,
  onSelectFilter,
  isLoading = false,
}) => {
  const total = tasks.length
  const ready = tasks.filter((t) => t.state === 'READY').length
  const running = tasks.filter((t) => ['RUNNING', 'DISPATCHING', 'QUEUED'].includes(t.state)).length
  const needsAttention = tasks.filter((t) => ['AWAITING_APPROVAL', 'BLOCKED', 'FAILED'].includes(t.state)).length
  const completed = tasks.filter((t) => t.state === 'COMPLETED').length
  const failed = tasks.filter((t) => t.state === 'FAILED').length

  const stats = [
    {
      label: 'Total Tasks',
      value: total,
      filterKey: 'ALL',
      icon: CheckSquare,
      color: 'text-text-primary',
      badgeClass: 'bg-surface-subtle text-text-primary border-border',
    },
    {
      label: 'Ready',
      value: ready,
      filterKey: 'READY',
      icon: Clock,
      color: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-600/20',
    },
    {
      label: 'In Progress',
      value: running,
      filterKey: 'RUNNING',
      icon: PlayCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    },
    {
      label: 'Needs Attention',
      value: needsAttention,
      filterKey: 'ATTENTION',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/20',
    },
    {
      label: 'Completed',
      value: completed,
      filterKey: 'COMPLETED',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    },
    {
      label: 'Failed',
      value: failed,
      filterKey: 'FAILED',
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface border border-border animate-pulse p-3" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        const isSelected = activeStateFilter === stat.filterKey

        return (
          <button
            key={stat.label}
            type="button"
            onClick={() => onSelectFilter?.(stat.filterKey)}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border bg-surface text-left transition-all',
              'hover:border-border-strong hover:bg-surface-hover cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-interactive/30',
              isSelected ? 'border-interactive/60 ring-1 ring-interactive/30 bg-surface-subtle' : 'border-border'
            )}
          >
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider font-mono-tech truncate">
                {stat.label}
              </div>
              <div className={cn('text-lg font-bold font-mono-tech mt-0.5', stat.color)}>
                {stat.value}
              </div>
            </div>
            <div className={cn('p-1.5 rounded-md border shrink-0 ml-2', stat.badgeClass)}>
              <IconComponent className="h-3.5 w-3.5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
