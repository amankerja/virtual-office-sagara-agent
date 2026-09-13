import React from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  PauseCircle,
  PowerOff,
  Settings,
  ShieldAlert,
  Slash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/types/agent'

export type CanonicalStatus =
  | AgentStatus
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'STALE'
  | 'UNKNOWN'
  | 'ACTIVE'
  | 'IDLE'
  | 'OFFLINE'
  | 'LIMITED'
  | 'DISABLED'
  | 'LOCKED'
  | string;

interface StatusBadgeProps {
  status: CanonicalStatus;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotClass: string;
  uppercase?: boolean;
}

const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  // System Health
  HEALTHY: {
    label: 'Healthy',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  DEGRADED: {
    label: 'Degraded',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/20',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    icon: AlertCircle,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/20',
    dotClass: 'bg-rose-600 dark:bg-rose-400',
  },
  STALE: {
    label: 'Stale',
    icon: Clock,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-600/20',
    dotClass: 'bg-slate-500',
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-600/20',
    dotClass: 'bg-slate-400',
  },

  // Operational State
  ACTIVE: {
    label: 'Active',
    icon: Activity,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400 animate-pulse',
  },
  IDLE: {
    label: 'Idle',
    icon: PauseCircle,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-600/20',
    dotClass: 'bg-slate-500 dark:bg-slate-400',
  },
  OFFLINE: {
    label: 'Offline',
    icon: PowerOff,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-400/20 dark:border-slate-700/30',
    dotClass: 'bg-slate-500',
  },
  RECENTLY_ACTIVE: {
    label: 'Recently Active',
    icon: Clock,
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-600/20',
    dotClass: 'bg-sky-600 dark:bg-sky-400',
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/20',
    dotClass: 'bg-amber-600 dark:bg-amber-400 animate-pulse',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/20',
    dotClass: 'bg-rose-600 dark:bg-rose-400',
  },
  CONFIGURATION_INCOMPLETE: {
    label: 'Config Incomplete',
    icon: Settings,
    badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-600/20',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
  },

  // Policy & Safety Gates
  LIMITED: {
    label: 'LIMITED',
    icon: ShieldAlert,
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-600/20',
    dotClass: 'bg-blue-600 dark:bg-blue-400',
    uppercase: true,
  },
  DISABLED: {
    label: 'DISABLED',
    icon: Slash,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    dotClass: 'bg-slate-400',
    uppercase: true,
  },
  LOCKED: {
    label: 'LOCKED',
    icon: Lock,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/25',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
    uppercase: true,
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className,
  size = 'default',
}) => {
  const normalizedKey = String(status || 'UNKNOWN').toUpperCase()
  const config = STATUS_CONFIG_MAP[normalizedKey] || {
    label: String(status || 'Unknown'),
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-600/20',
    dotClass: 'bg-slate-500',
  }

  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium select-none transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        config.uppercase ? 'uppercase tracking-wider font-semibold' : 'tracking-normal',
        config.badgeClass,
        className
      )}
      title={`Status: ${config.label}`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} aria-hidden="true" />
      {showIcon && <IconComponent className={cn('shrink-0', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  )
}
