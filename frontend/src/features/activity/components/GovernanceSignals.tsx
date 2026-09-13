import React from 'react'
import {
  AlertTriangle,
  Info,
  TrendingUp,
  Brain,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react'
import type { GovernanceSignal } from '@/types/governance'

interface GovernanceSignalsProps {
  signals?: GovernanceSignal[]
}

const SIGNAL_ICONS: Record<
  GovernanceSignal['type'],
  React.ComponentType<{ className?: string }>
> = {
  HIGH_COST_TASK: TrendingUp,
  UNUSUAL_TOKEN_GROWTH: TrendingUp,
  UNKNOWN_BILLING_DATA: HelpCircle,
  HIGH_REASONING_USAGE: Brain,
  BUDGET_APPROACHING_THRESHOLD: AlertTriangle,
}

export const GovernanceSignals: React.FC<GovernanceSignalsProps> = ({ signals = [] }) => {
  if (signals.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border bg-surface text-center">
        <p className="text-xs text-text-muted">No governance anomaly signals observed.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary tracking-tight">
            Governance Advisory Signals
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational advisory telemetry alerts identifying potential budget or token consumption anomalies.
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {signals.map((signal) => {
          const Icon = SIGNAL_ICONS[signal.type] || Info
          const isWarning = signal.severity === 'WARNING'
          const isCritical = signal.severity === 'CRITICAL'

          const borderClass = isCritical
            ? 'border-rose-500/30 bg-rose-500/5'
            : isWarning
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border bg-surface-subtle/50'

          const iconColor = isCritical
            ? 'text-rose-500'
            : isWarning
            ? 'text-amber-500'
            : 'text-text-muted'

          return (
            <div
              key={signal.id}
              className={`p-3 rounded-md border flex items-start gap-3 ${borderClass}`}
            >
              <div className="p-1 rounded bg-surface shrink-0 mt-0.5">
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary">
                    {signal.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono-tech px-1.5 py-0.2 rounded-full uppercase border ${
                      isCritical
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : isWarning
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-text-muted border-border'
                    }`}
                  >
                    {signal.severity}
                  </span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {signal.description}
                </p>

                {signal.relatedEntity && (
                  <div className="text-[10px] font-mono-tech text-text-muted pt-1">
                    Related: {signal.relatedEntity.type} ({signal.relatedEntity.id})
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-[10px] text-text-muted flex items-center gap-1.5 pt-1 border-t border-border/40 font-mono-tech">
        <ShieldAlert className="h-3 w-3 shrink-0" />
        <span>Advisory signals are observational only and do not interrupt active runtime execution.</span>
      </div>
    </div>
  )
}
