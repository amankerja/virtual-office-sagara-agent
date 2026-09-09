import React from 'react'
import type { SessionUsage } from '@/types/runtime'
import { Coins, Hash, Cpu, Database, Brain, Sparkles } from 'lucide-react'
import { formatCurrencyUsd, formatMetricNumber } from '@/lib/formatters'

interface SessionUsageTabProps {
  usage?: SessionUsage;
}

export const SessionUsageTab: React.FC<SessionUsageTabProps> = ({ usage }) => {
  if (!usage) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <Coins className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">
          No Token Telemetry Recorded
        </h4>
        <p className="text-[11px] text-text-muted max-w-xs mx-auto font-sans leading-relaxed">
          Usage accounting metrics were not emitted or are awaiting settlement from provider gateway.
        </p>
      </div>
    )
  }

  const items = [
    {
      label: 'API Invocations',
      value: formatMetricNumber(usage.apiCalls),
      icon: Hash,
    },
    {
      label: 'Input Tokens',
      value: formatMetricNumber(usage.inputTokens),
      icon: Cpu,
    },
    {
      label: 'Output Tokens',
      value: formatMetricNumber(usage.outputTokens),
      icon: Sparkles,
    },
    {
      label: 'Cache Read Tokens',
      value: formatMetricNumber(usage.cacheReadTokens),
      icon: Database,
    },
    {
      label: 'Cache Write Tokens',
      value: formatMetricNumber(usage.cacheWriteTokens),
      icon: Database,
    },
    {
      label: 'Reasoning Tokens',
      value: formatMetricNumber(usage.reasoningTokens),
      icon: Brain,
    },
    {
      label: 'Estimated Cost',
      value: formatCurrencyUsd(usage.estimatedCostUsd),
      icon: Coins,
    },
    {
      label: 'Actual Cost',
      value: formatCurrencyUsd(usage.actualCostUsd),
      icon: Coins,
    },
  ]

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] text-text-muted uppercase block">Billing Settlement Status</span>
          <span className="font-semibold text-text-primary capitalize mt-0.5 block">
            {usage.billingStatus || '—'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-text-muted uppercase block">Total Cost</span>
          <span className="text-sm font-bold text-text-primary mt-0.5 block">
            {formatCurrencyUsd(usage.actualCostUsd ?? usage.estimatedCostUsd)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <div
              key={it.label}
              className="p-3 rounded-md bg-surface-subtle border border-border-subtle flex flex-col justify-between"
            >
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Icon className="h-3 w-3" /> {it.label}
              </span>
              <span className="text-sm font-bold text-text-primary mt-1.5 block">
                {it.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
