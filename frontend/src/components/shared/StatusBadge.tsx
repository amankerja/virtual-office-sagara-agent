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
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dotClass: 'bg-emerald-400 animate-pulse',
  },
  IDLE: {
    label: 'Idle',
    icon: PauseCircle,
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dotClass: 'bg-slate-400',
  },
  RECENTLY_ACTIVE: {
    label: 'Recently Active',
    icon: Clock,
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    dotClass: 'bg-cyan-400',
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-400 animate-pulse',
  },
  DEGRADED: {
    label: 'Degraded',
    icon: AlertCircle,
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dotClass: 'bg-orange-400',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dotClass: 'bg-rose-400',
  },
  OFFLINE: {
    label: 'Offline',
    icon: PowerOff,
    badgeClass: 'bg-slate-700/20 text-slate-500 border-slate-700/30',
    dotClass: 'bg-slate-500',
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: HelpCircle,
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dotClass: 'bg-purple-400',
  },
  CONFIGURATION_INCOMPLETE: {
    label: 'Config Incomplete',
    icon: Settings,
    badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    dotClass: 'bg-yellow-400',
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
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dotClass: 'bg-slate-400',
  }

  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase font-mono-tech',
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
