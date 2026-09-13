import React from 'react'
import { formatCurrencyUsd } from '@/lib/formatters'
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { BudgetConfig } from '@/types/governance'

interface BudgetStatusCardProps {
  budget?: BudgetConfig
}

export const BudgetStatusCard: React.FC<BudgetStatusCardProps> = ({ budget }) => {
  if (!budget) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border bg-surface text-center">
        <p className="text-xs text-text-muted">No budget policy configured for this period.</p>
      </div>
    )
  }

  const limit = budget.limitUsd ?? 0
  const consumed = budget.consumedUsd ?? 0
  const remaining = budget.remainingUsd ?? (limit > consumed ? limit - consumed : 0)
  const percentage = limit > 0 ? Math.min(100, Math.round((consumed / limit) * 100)) : 0

  const status = budget.status || (percentage >= 90 ? 'CRITICAL' : percentage >= 70 ? 'WARNING' : 'NORMAL')

  const statusConfig = {
    NORMAL: {
      label: 'Normal',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
      barClass: 'bg-emerald-500',
      icon: ShieldCheck,
    },
    WARNING: {
      label: 'Warning (70-90%)',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
      barClass: 'bg-amber-500',
      icon: AlertTriangle,
    },
    CRITICAL: {
      label: 'Critical (>90%)',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
      barClass: 'bg-rose-500',
      icon: AlertCircle,
    },
    UNKNOWN: {
      label: 'Unknown',
      badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25',
      barClass: 'bg-slate-400',
      icon: Info,
    },
  }[status]

  const StatusIcon = statusConfig.icon

  return (
    <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {budget.period} Cost Governance Envelope
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Simulation policy tracking token expenditures against advisory limits.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono-tech uppercase font-medium border ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" />
          <span>{statusConfig.label}</span>
        </span>
      </div>

      {/* Figures Row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="p-2.5 rounded-md bg-surface-subtle border border-border/80">
          <p className="text-[11px] text-text-secondary font-medium">Consumed</p>
          <p className="text-base sm:text-lg font-bold font-mono-tech text-text-primary">
            {formatCurrencyUsd(consumed)}
          </p>
        </div>

        <div className="p-2.5 rounded-md bg-surface-subtle border border-border/80">
          <p className="text-[11px] text-text-secondary font-medium">Monthly Limit</p>
          <p className="text-base sm:text-lg font-bold font-mono-tech text-text-primary">
            {formatCurrencyUsd(limit)}
          </p>
        </div>

        <div className="p-2.5 rounded-md bg-surface-subtle border border-border/80">
          <p className="text-[11px] text-text-secondary font-medium">Remaining</p>
          <p className="text-base sm:text-lg font-bold font-mono-tech text-text-primary">
            {formatCurrencyUsd(remaining)}
          </p>
        </div>
      </div>

      {/* Progress Bar (Tailwind CSS - Section 27, 28, 29) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono-tech">
          <span className="text-text-secondary">Envelope Utilization</span>
          <span className="font-semibold text-text-primary">{percentage}% consumed</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-subtle border border-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusConfig.barClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Telemetry Notice */}
      <div className="text-[10px] text-text-muted flex items-center gap-1.5 pt-1 border-t border-border/40 font-sans">
        <Info className="h-3 w-3 shrink-0" />
        <span>Budget telemetry projection. Production execution safety is managed via Execution Policy V3.</span>
      </div>
    </div>
  )
}
