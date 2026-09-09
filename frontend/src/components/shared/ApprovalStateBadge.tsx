import React from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Ban,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApprovalState } from '@/types/approval'

interface ApprovalStateBadgeProps {
  state: ApprovalState
  showIcon?: boolean
  className?: string
}

interface StateConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
  dotClass?: string
}

const STATE_CONFIG_MAP: Record<ApprovalState, StateConfig> = {
  PENDING: {
    label: 'Pending Review',
    icon: Clock,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/30 dark:border-amber-500/30',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 dark:border-emerald-500/30',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/30 dark:border-rose-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    icon: AlertOctagon,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/20 dark:border-slate-700/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: Ban,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/20 dark:border-slate-700/30',
  },
  FAILED: {
    label: 'System Error',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/30 dark:border-rose-500/30',
  },
}

export const ApprovalStateBadge: React.FC<ApprovalStateBadgeProps> = ({
  state,
  showIcon = true,
  className,
}) => {
  const config = STATE_CONFIG_MAP[state] || STATE_CONFIG_MAP.PENDING
  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider font-mono-tech transition-colors shrink-0',
        config.badgeClass,
        className
      )}
      title={`Decision State: ${config.label}`}
    >
      {config.dotClass && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      )}
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  )
}
