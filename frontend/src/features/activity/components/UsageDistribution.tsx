import React from 'react'
import {
  formatCompactTokens,
  formatCurrencyUsd,
} from '@/lib/formatters'
import { Bot, Sparkles, Cpu } from 'lucide-react'
import type { UsageBreakdown } from '@/types/governance'

interface UsageDistributionProps {
  title: string
  subtitle?: string
  iconType: 'agent' | 'model' | 'provider'
  items?: UsageBreakdown[]
  colorScheme?: 'emerald' | 'blue' | 'purple'
}

export const UsageDistribution: React.FC<UsageDistributionProps> = ({
  title,
  subtitle,
  iconType,
  items = [],
  colorScheme = 'blue',
}) => {
  const Icon =
    iconType === 'agent' ? Bot : iconType === 'model' ? Sparkles : Cpu

  const barColor =
    colorScheme === 'emerald'
      ? 'bg-emerald-500'
      : colorScheme === 'purple'
      ? 'bg-purple-500'
      : 'bg-blue-500'

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border bg-surface text-center">
        <p className="text-xs text-text-muted">No usage data recorded for {title}.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-surface-subtle text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Items List */}
      <div className="space-y-3 pt-1">
        {items.map((item) => {
          const totalTokens =
            (item.usage.inputTokens || 0) +
            (item.usage.outputTokens || 0) +
            (item.usage.reasoningTokens || 0)
          const pct = item.percentage ?? 0

          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-medium text-text-primary truncate max-w-45 sm:max-w-xs font-mono-tech">
                  {item.label}
                </span>
                <div className="flex items-center gap-2.5 font-mono-tech text-[11px] shrink-0">
                  <span className="text-text-muted">
                    {formatCompactTokens(totalTokens)} tok
                  </span>
                  <span className="text-text-secondary font-medium">
                    {formatCurrencyUsd(item.usage.estimatedCostUsd)}
                  </span>
                  <span className="font-bold text-text-primary w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Progress Bar (Tailwind CSS) */}
              <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
