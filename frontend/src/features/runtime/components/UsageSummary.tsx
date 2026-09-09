import React from 'react'
import type { RuntimeUsageOverview } from '@/types/runtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyUsd, formatMetricNumber } from '@/lib/formatters'
import { Coins, Cpu, Sparkles, Database, Brain, Hash } from 'lucide-react'

interface UsageSummaryProps {
  usage: RuntimeUsageOverview;
  isLoading?: boolean;
}

export const UsageSummary: React.FC<UsageSummaryProps> = ({ usage, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-subtle animate-pulse border border-border" />
          ))}
        </div>
      </div>
    )
  }

  const totals = [
    {
      label: 'API Invocations',
      value: formatMetricNumber(usage.totalApiCalls),
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
      label: 'Prompt Cache Read',
      value: formatMetricNumber(usage.cacheTokens),
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
      label: 'Actual Settled Cost',
      value: formatCurrencyUsd(usage.actualCostUsd),
      icon: Coins,
    },
  ]

  const maxAgentCost = Math.max(...usage.byAgent.map((a) => a.estimatedCostUsd ?? 0), 0.01)
  const maxModelCost = Math.max(...usage.byModel.map((m) => m.estimatedCostUsd ?? 0), 0.01)
  const maxProviderCost = Math.max(...usage.byProvider.map((p) => p.estimatedCostUsd ?? 0), 0.01)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Overview Totals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono-tech text-xs">
        {totals.map((t) => {
          const Icon = t.icon
          return (
            <div
              key={t.label}
              className="p-3 rounded-lg border border-border bg-surface flex flex-col justify-between"
            >
              <span className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                <Icon className="h-3 w-3 shrink-0" /> {t.label}
              </span>
              <span className="text-base font-bold text-text-primary tracking-tight mt-1 block">
                {t.value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Agent */}
        <Card className="border-border bg-surface">
          <CardHeader className="p-4 pb-2 border-b border-border bg-surface-subtle">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
              Usage by Agent Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono-tech text-xs">
            {usage.byAgent.map((item) => {
              const cost = item.estimatedCostUsd ?? 0
              const pct = Math.round((cost / maxAgentCost) * 100)

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-primary truncate font-sans">
                      {item.name}
                    </span>
                    <span className="text-text-primary font-bold">
                      {formatCurrencyUsd(item.estimatedCostUsd)}
                    </span>
                  </div>
                  {/* Proportion Bar */}
                  <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-interactive transition-all rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                    <span>Calls: {formatMetricNumber(item.apiCalls)}</span>
                    <span>Tokens: {formatMetricNumber((item.inputTokens ?? 0) + (item.outputTokens ?? 0))}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* By Model */}
        <Card className="border-border bg-surface">
          <CardHeader className="p-4 pb-2 border-b border-border bg-surface-subtle">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
              Usage by Foundation Model
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono-tech text-xs">
            {usage.byModel.map((item) => {
              const cost = item.estimatedCostUsd ?? 0
              const pct = Math.round((cost / maxModelCost) * 100)

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-primary truncate">
                      {item.name}
                    </span>
                    <span className="text-text-primary font-bold">
                      {formatCurrencyUsd(item.estimatedCostUsd)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-sky-500 transition-all rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                    <span>Calls: {formatMetricNumber(item.apiCalls)}</span>
                    <span>Tokens: {formatMetricNumber((item.inputTokens ?? 0) + (item.outputTokens ?? 0))}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* By Provider */}
        <Card className="border-border bg-surface">
          <CardHeader className="p-4 pb-2 border-b border-border bg-surface-subtle">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
              Usage by Upstream Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono-tech text-xs">
            {usage.byProvider.map((item) => {
              const cost = item.estimatedCostUsd ?? 0
              const pct = Math.round((cost / maxProviderCost) * 100)

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-primary">
                      {item.name}
                    </span>
                    <span className="text-text-primary font-bold">
                      {formatCurrencyUsd(item.estimatedCostUsd)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 transition-all rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                    <span>Calls: {formatMetricNumber(item.apiCalls)}</span>
                    <span>Tokens: {formatMetricNumber((item.inputTokens ?? 0) + (item.outputTokens ?? 0))}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
