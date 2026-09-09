import React from 'react'
import {
  CheckSquare,
  Bot,
  ShieldCheck,
  Terminal,
  GitBranch,
  Wrench,
  Radio,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityCategory } from '@/types/activity'

interface ActivityCategoryBadgeProps {
  category: ActivityCategory
  showIcon?: boolean
  className?: string
}

const CATEGORY_CONFIG: Record<
  ActivityCategory,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    badgeClass: string
  }
> = {
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  AGENT: {
    label: 'Agent',
    icon: Bot,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  APPROVAL: {
    label: 'Approval',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
  SESSION: {
    label: 'Session',
    icon: Terminal,
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  },
  DELEGATION: {
    label: 'Delegation',
    icon: GitBranch,
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  },
  SKILL: {
    label: 'Skill',
    icon: Wrench,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  GATEWAY: {
    label: 'Gateway',
    icon: Radio,
    badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  },
  SYSTEM: {
    label: 'System',
    icon: Cpu,
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  },
}

export const ActivityCategoryBadge: React.FC<ActivityCategoryBadgeProps> = ({
  category,
  showIcon = true,
  className,
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono-tech uppercase tracking-wider border',
        config.badgeClass,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  )
}
