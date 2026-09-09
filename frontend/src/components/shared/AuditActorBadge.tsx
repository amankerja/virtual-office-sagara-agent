import React from 'react'
import { User, Bot, Cpu, Terminal, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditActorType } from '@/types/audit'

interface AuditActorBadgeProps {
  actorType: AuditActorType
  label?: string
  showIcon?: boolean
  className?: string
}

const ACTOR_CONFIG: Record<
  AuditActorType,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    badgeClass: string
  }
> = {
  USER: {
    label: 'User',
    icon: User,
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  AGENT: {
    label: 'Agent',
    icon: Bot,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  SYSTEM: {
    label: 'System',
    icon: Cpu,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  },
  RUNTIME: {
    label: 'Runtime',
    icon: Terminal,
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
  UNKNOWN: {
    label: 'Unknown',
    icon: HelpCircle,
    badgeClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
  },
}

export const AuditActorBadge: React.FC<AuditActorBadgeProps> = ({
  actorType,
  label,
  showIcon = true,
  className,
}) => {
  const config = ACTOR_CONFIG[actorType] || ACTOR_CONFIG.UNKNOWN
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono-tech border',
        config.badgeClass,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{label || config.label}</span>
    </span>
  )
}
