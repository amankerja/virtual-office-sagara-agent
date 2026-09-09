import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  Clock,
  Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  SkillHealthState,
  SkillInstallationState,
  SkillExecutionState,
  SkillRegistrationState,
} from '@/types/skill'

interface EvidenceBadgeProps {
  type: 'health' | 'installation' | 'execution' | 'registration';
  value: SkillHealthState | SkillInstallationState | SkillExecutionState | SkillRegistrationState | string;
  className?: string;
  showIcon?: boolean;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  type,
  value,
  className,
  showIcon = true,
}) => {
  let label = String(value).replace(/_/g, ' ')
  let badgeClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/20'
  let IconComponent = HelpCircle

  if (type === 'health') {
    switch (value) {
      case 'healthy':
        label = 'Healthy'
        badgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
        IconComponent = CheckCircle2
        break
      case 'degraded':
        label = 'Degraded'
        badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25'
        IconComponent = AlertTriangle
        break
      case 'missing':
        label = 'Missing'
        badgeClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
        IconComponent = XCircle
        break
      default:
        label = 'Unknown'
        badgeClass = 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
        IconComponent = HelpCircle
    }
  } else if (type === 'installation') {
    switch (value) {
      case 'installed':
        label = 'Installed'
        badgeClass = 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-600/25'
        IconComponent = CheckCircle2
        break
      case 'missing':
        label = 'Missing'
        badgeClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
        IconComponent = XCircle
        break
      default:
        label = 'Unknown'
        badgeClass = 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
        IconComponent = HelpCircle
    }
  } else if (type === 'execution') {
    switch (value) {
      case 'observed_active':
        label = 'Observed Active'
        badgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
        IconComponent = Activity
        break
      case 'requested':
        label = 'Requested'
        badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25'
        IconComponent = Radio
        break
      case 'completed':
        label = 'Completed'
        badgeClass = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25'
        IconComponent = CheckCircle2
        break
      case 'failed':
        label = 'Failed'
        badgeClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
        IconComponent = XCircle
        break
      case 'execution_unknown':
        label = 'Execution Unknown'
        badgeClass = 'bg-slate-500/10 text-text-muted border-border'
        IconComponent = HelpCircle
        break
      case 'not_observed':
      default:
        label = 'Not Observed'
        badgeClass = 'bg-surface-subtle text-text-muted border-border'
        IconComponent = Clock
    }
  } else if (type === 'registration') {
    switch (value) {
      case 'registered':
        label = 'Registered'
        badgeClass = 'bg-interactive/10 text-interactive border-interactive/30'
        IconComponent = CheckCircle2
        break
      default:
        label = 'Unregistered'
        badgeClass = 'bg-surface-subtle text-text-muted border-border'
        IconComponent = HelpCircle
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wide font-mono-tech transition-colors',
        badgeClass,
        className
      )}
      title={`${type.toUpperCase()}: ${label}`}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  )
}
