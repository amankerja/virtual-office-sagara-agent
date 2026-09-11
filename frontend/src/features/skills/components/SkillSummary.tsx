import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, XCircle, Activity, Sparkles, Layers } from 'lucide-react'

interface SkillSummaryProps {
  skills: SkillProjection[];
  isLoading?: boolean;
}

export const SkillSummary: React.FC<SkillSummaryProps> = ({ skills, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface-subtle animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  const registeredCount = skills.filter((s) => s.registration?.toLowerCase() === 'registered').length
  const installedCount = skills.filter((s) => s.installation?.toLowerCase() === 'installed').length
  const healthyCount = skills.filter((s) => s.health?.toLowerCase() === 'healthy').length
  const degradedCount = skills.filter((s) => s.health?.toLowerCase() === 'degraded').length
  const missingCount = skills.filter((s) => s.health?.toLowerCase() === 'missing' || s.installation?.toLowerCase() === 'missing').length
  const observedCount = skills.filter((s) => s.execution?.toLowerCase() === 'observed_active').length

  const metrics = [
    {
      label: 'Registered',
      value: registeredCount,
      icon: Layers,
      color: 'text-text-primary',
      badgeClass: 'bg-surface-raised',
    },
    {
      label: 'Installed',
      value: installedCount,
      icon: Sparkles,
      color: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-500/10',
    },
    {
      label: 'Healthy',
      value: healthyCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10',
    },
    {
      label: 'Degraded',
      value: degradedCount,
      icon: AlertTriangle,
      color: degradedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted',
      badgeClass: 'bg-amber-500/10',
    },
    {
      label: 'Missing',
      value: missingCount,
      icon: XCircle,
      color: missingCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted',
      badgeClass: 'bg-rose-500/10',
    },
    {
      label: 'Observed Active',
      value: observedCount,
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((item) => {
        const Icon = item.icon
        return (
          <Card
            key={item.label}
            className="border-border bg-surface p-3 transition-colors hover:border-border-strong"
          >
            <CardContent className="p-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono-tech text-text-muted tracking-wider block">
                  {item.label}
                </span>
                <span className="text-xl font-bold font-mono-tech text-text-primary tracking-tight mt-0.5 block">
                  {item.value}
                </span>
              </div>
              <div className={`p-2 rounded-md ${item.badgeClass} ${item.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
