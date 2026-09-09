import React from 'react'
import { Info, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivitySeverity } from '@/types/activity'

interface ActivitySeverityBadgeProps {
  severity: ActivitySeverity
  showIcon?: boolean
  className?: string
}

const SEVERITY_CONFIG: Record<
  ActivitySeverity,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    badgeClass: string
  }
> = {
  INFO: {
    label: 'Info',
    icon: Info,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  },
  CRITICAL: {
    label: 'Critical',
    icon: ShieldAlert,
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  },
}

export const ActivitySeverityBadge: React.FC<ActivitySeverityBadgeProps> = ({
  severity,
  showIcon = true,
  className,
}) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO
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
