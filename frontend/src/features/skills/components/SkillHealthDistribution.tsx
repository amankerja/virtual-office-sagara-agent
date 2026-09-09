import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'

interface SkillHealthDistributionProps {
  skills: SkillProjection[];
  className?: string;
}

export const SkillHealthDistribution: React.FC<SkillHealthDistributionProps> = ({
  skills,
  className,
}) => {
  const total = skills.length || 1
  const healthy = skills.filter((s) => s.health === 'healthy').length
  const degraded = skills.filter((s) => s.health === 'degraded').length
  const missing = skills.filter((s) => s.health === 'missing').length
  const unknown = skills.filter((s) => s.health === 'unknown').length

  const rows = [
    {
      label: 'Healthy',
      count: healthy,
      pct: Math.round((healthy / total) * 100),
      barClass: 'bg-emerald-500 dark:bg-emerald-400',
      icon: CheckCircle2,
      textColor: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Degraded',
      count: degraded,
      pct: Math.round((degraded / total) * 100),
      barClass: 'bg-amber-500 dark:bg-amber-400',
      icon: AlertTriangle,
      textColor: 'text-amber-700 dark:text-amber-400',
    },
    {
      label: 'Missing',
      count: missing,
      pct: Math.round((missing / total) * 100),
      barClass: 'bg-rose-500 dark:bg-rose-400',
      icon: XCircle,
      textColor: 'text-rose-700 dark:text-rose-400',
    },
    {
      label: 'Unknown',
      count: unknown,
      pct: Math.round((unknown / total) * 100),
      barClass: 'bg-slate-400 dark:bg-slate-600',
      icon: HelpCircle,
      textColor: 'text-text-muted',
    },
  ]

  return (
    <Card className={`border-border bg-surface ${className || ''}`}>
      <CardHeader className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
            Capability Health Distribution
          </CardTitle>
          <span className="text-[11px] font-mono-tech text-text-muted">
            Total: {skills.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-0 space-y-2.5">
        {/* Stacked Proportional Bar */}
        <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden flex">
          {healthy > 0 && (
            <div
              style={{ width: `${(healthy / total) * 100}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Healthy: ${healthy}`}
            />
          )}
          {degraded > 0 && (
            <div
              style={{ width: `${(degraded / total) * 100}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Degraded: ${degraded}`}
            />
          )}
          {missing > 0 && (
            <div
              style={{ width: `${(missing / total) * 100}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Missing: ${missing}`}
            />
          )}
          {unknown > 0 && (
            <div
              style={{ width: `${(unknown / total) * 100}%` }}
              className="bg-slate-400 h-full transition-all"
              title={`Unknown: ${unknown}`}
            />
          )}
        </div>

        {/* Detailed Breakdown Rows */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono-tech text-xs">
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.label}
                className="flex items-center justify-between p-2 rounded-md bg-surface-subtle border border-border-subtle"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className={`h-3 w-3 shrink-0 ${row.textColor}`} />
                  <span className="text-[11px] text-text-secondary truncate">{row.label}</span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0 ml-1.5">
                  <span className="font-semibold text-text-primary text-[12px]">{row.count}</span>
                  <span className="text-[10px] text-text-muted">({row.pct}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
