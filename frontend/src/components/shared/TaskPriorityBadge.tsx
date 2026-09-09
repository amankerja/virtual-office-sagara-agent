import React from 'react'
import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types/task'

interface TaskPriorityBadgeProps {
  priority: TaskPriority
  showIcon?: boolean
  className?: string
}

interface PriorityConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
}

const PRIORITY_CONFIG_MAP: Record<TaskPriority, PriorityConfig> = {
  CRITICAL: {
    label: 'Critical',
    icon: Flame,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/30 dark:border-rose-500/30',
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/30 dark:border-amber-500/30',
  },
  MEDIUM: {
    label: 'Medium',
    icon: Minus,
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-600/30 dark:border-blue-500/30',
  },
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40 dark:border-slate-600/50',
  },
}

export const TaskPriorityBadge: React.FC<TaskPriorityBadgeProps> = ({
  priority,
  showIcon = true,
  className,
}) => {
  const config = PRIORITY_CONFIG_MAP[priority] || PRIORITY_CONFIG_MAP.MEDIUM
  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider font-mono-tech transition-colors shrink-0',
        config.badgeClass,
        className
      )}
      title={`Priority: ${config.label}`}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  )
}
