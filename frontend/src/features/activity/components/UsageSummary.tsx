import React from 'react'
import {
  formatMetricNumber,
  formatCurrencyUsd,
  formatCompactTokens,
} from '@/lib/formatters'
import {
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Brain,
  Layers,
  DollarSign,
  CircleDollarSign,
} from 'lucide-react'
import type { UsageMetric } from '@/types/governance'

interface UsageSummaryProps {
  totalUsage: UsageMetric
}

export const UsageSummary: React.FC<UsageSummaryProps> = ({ totalUsage }) => {
  const cacheTotal =
    totalUsage.cacheReadTokens !== undefined || totalUsage.cacheWriteTokens !== undefined
      ? (totalUsage.cacheReadTokens || 0) + (totalUsage.cacheWriteTokens || 0)
      : undefined

  const items = [
    {
      label: 'API Invocations',
      value: formatMetricNumber(totalUsage.apiCalls),
      compact: null,
      icon: Zap,
      color: 'text-primary',
    },
    {
      label: 'Input Tokens',
      value: formatMetricNumber(totalUsage.inputTokens),
      compact: formatCompactTokens(totalUsage.inputTokens),
      icon: ArrowDownLeft,
      color: 'text-blue-500',
    },
    {
      label: 'Output Tokens',
      value: formatMetricNumber(totalUsage.outputTokens),
      compact: formatCompactTokens(totalUsage.outputTokens),
      icon: ArrowUpRight,
      color: 'text-emerald-500',
    },
    {
      label: 'Reasoning Tokens',
      value: formatMetricNumber(totalUsage.reasoningTokens),
      compact: formatCompactTokens(totalUsage.reasoningTokens),
      icon: Brain,
      color: 'text-purple-500',
    },
    {
      label: 'Cache Tokens',
      value: formatMetricNumber(cacheTotal),
      compact: formatCompactTokens(cacheTotal),
      icon: Layers,
      color: 'text-cyan-500',
    },
    {
      label: 'Estimated Cost',
      value: formatCurrencyUsd(totalUsage.estimatedCostUsd),
      tag: 'ESTIMATED',
      icon: DollarSign,
      color: 'text-amber-500',
    },
    {
      label: 'Actual Cost',
      value: formatCurrencyUsd(totalUsage.actualCostUsd),
      tag: totalUsage.actualCostUsd !== undefined ? 'CONFIRMED' : 'PENDING',
      icon: CircleDollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="p-3 rounded-lg border border-border bg-surface flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-text-secondary truncate">
                {item.label}
              </span>
              <Icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
            </div>

            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-bold font-mono-tech text-text-primary tracking-tight">
                {item.value}
              </div>

              {item.tag && (
                <span
                  className={`inline-block text-[9px] font-mono-tech px-1.5 py-0.2 rounded uppercase font-semibold ${
                    item.tag === 'CONFIRMED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : item.tag === 'ESTIMATED'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-slate-500/10 text-text-muted border border-border'
                  }`}
                >
                  {item.tag}
                </span>
              )}

              {item.compact && item.value !== '—' && (
                <div className="text-[10px] font-mono-tech text-text-muted">
                  ≈ {item.compact} tokens
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
