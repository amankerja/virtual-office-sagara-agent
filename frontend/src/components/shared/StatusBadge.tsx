import React from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  PauseCircle,
  PowerOff,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/types/agent'

interface StatusBadgeProps {
  status: AgentStatus;
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotClass: string;
}

const STATUS_CONFIG_MAP: Record<AgentStatus, StatusConfig> = {
  ACTIVE: {
    label: 'Active',
    icon: Activity,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25 dark:border-emerald-500/20',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400 animate-pulse',
  },
  IDLE: {
    label: 'Idle',
    icon: PauseCircle,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25 dark:border-slate-500/20',
    dotClass: 'bg-slate-600 dark:bg-slate-400',
  },
  RECENTLY_ACTIVE: {
    label: 'Recently Active',
    icon: Clock,
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25 dark:border-cyan-500/20',
    dotClass: 'bg-cyan-600 dark:bg-cyan-400',
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25 dark:border-amber-500/20',
    dotClass: 'bg-amber-600 dark:bg-amber-400 animate-pulse',
  },
  DEGRADED: {
    label: 'Degraded',
    icon: AlertCircle,
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-600/25 dark:border-orange-500/20',
    dotClass: 'bg-orange-600 dark:bg-orange-400',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25 dark:border-rose-500/20',
    dotClass: 'bg-rose-600 dark:bg-rose-400',
  },
  OFFLINE: {
    label: 'Offline',
    icon: PowerOff,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-400/20 dark:border-slate-700/30',
    dotClass: 'bg-slate-500',
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: HelpCircle,
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-600/25 dark:border-purple-500/20',
    dotClass: 'bg-purple-600 dark:bg-purple-400',
  },
  CONFIGURATION_INCOMPLETE: {
    label: 'Config Incomplete',
    icon: Settings,
    badgeClass: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-400 border-yellow-600/25 dark:border-yellow-500/20',
    dotClass: 'bg-yellow-600 dark:bg-yellow-400',
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className,
}) => {
  const config = STATUS_CONFIG_MAP[status] || {
    label: status,
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25 dark:border-slate-500/20',
    dotClass: 'bg-slate-600 dark:bg-slate-400',
  }

  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase font-mono-tech transition-colors',
        config.badgeClass,
        className
      )}
      title={`Status: ${config.label}`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  )
}
