import React from 'react'
import { CheckCircle2, XCircle, Slash, Ban, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditOutcome } from '@/types/audit'

interface AuditOutcomeBadgeProps {
  outcome: AuditOutcome
  showIcon?: boolean
  className?: string
}

const OUTCOME_CONFIG: Record<
  AuditOutcome,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    badgeClass: string
  }
> = {
  SUCCESS: {
    label: 'Success',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  },
  DENIED: {
    label: 'Denied',
    icon: Ban,
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: Slash,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
  },
}

export const AuditOutcomeBadge: React.FC<AuditOutcomeBadgeProps> = ({
  outcome,
  showIcon = true,
  className,
}) => {
  const config = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.UNKNOWN
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wider',
        config.badgeClass,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  )
}
