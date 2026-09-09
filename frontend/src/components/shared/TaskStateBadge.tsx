import React from 'react'
import {
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Ban,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskState } from '@/types/task'

interface TaskStateBadgeProps {
  state: TaskState
  showIcon?: boolean
  className?: string
}

interface StateConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
  dotClass?: string
}

const STATE_CONFIG_MAP: Record<TaskState, StateConfig> = {
  DRAFT: {
    label: 'Draft',
    icon: FileText,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25 dark:border-slate-500/20',
  },
  READY: {
    label: 'Ready',
    icon: CheckCircle2,
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-600/25 dark:border-sky-500/20',
  },
  QUEUED: {
    label: 'Queued',
    icon: Clock,
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-600/25 dark:border-purple-500/20',
  },
  DISPATCHING: {
    label: 'Dispatching',
    icon: Loader2,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25 dark:border-amber-500/20',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  RUNNING: {
    label: 'Running',
    icon: Activity,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25 dark:border-emerald-500/20',
    dotClass: 'bg-emerald-500 animate-pulse',
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/30 dark:border-amber-500/30',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  BLOCKED: {
    label: 'Blocked',
    icon: ShieldAlert,
    badgeClass: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-400 border-yellow-600/25 dark:border-yellow-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25 dark:border-emerald-500/20',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25 dark:border-rose-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-400/20 dark:border-slate-700/30',
  },
}

export const TaskStateBadge: React.FC<TaskStateBadgeProps> = ({
  state,
  showIcon = true,
  className,
}) => {
  const config = STATE_CONFIG_MAP[state] || {
    label: state,
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25',
  }

  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wider font-mono-tech transition-colors shrink-0',
        config.badgeClass,
        className
      )}
      title={`State: ${config.label}`}
    >
      {config.dotClass && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      )}
      {showIcon && (
        <IconComponent
          className={cn('h-3 w-3 shrink-0', state === 'DISPATCHING' ? 'animate-spin' : '')}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  )
}
