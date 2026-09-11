import React from 'react'
import type { RuntimeOverview as RuntimeOverviewType } from '@/types/runtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrencyUsd, formatTimestampRelative } from '@/lib/formatters'
import {
  Radio,
  GitFork,
  Coins,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

interface RuntimeOverviewProps {
  overview: RuntimeOverviewType;
  onNavigateTab: (tab: string) => void;
  isLoading?: boolean;
}

export const RuntimeOverview: React.FC<RuntimeOverviewProps> = ({
  overview,
  onNavigateTab,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-surface-subtle animate-pulse border border-border" />
          ))}
        </div>
      </div>
    )
  }

  const { health, gateway, activeSessionsCount, runningDelegationsCount, totalCostEstimateUsd, recentEvents } = overview

  const getHealthBadge = (state: string) => {
    switch (state) {
      case 'HEALTHY':
        return {
          icon: CheckCircle2,
          class: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-600/20',
        }
      case 'DEGRADED':
        return {
          icon: AlertTriangle,
          class: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-600/20',
        }
      case 'ERROR':
      case 'OFFLINE':
        return {
          icon: XCircle,
          class: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-600/20',
        }
      default:
        return {
          icon: Activity,
          class: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-600/20',
        }
    }
  }

  const gwConfig = getHealthBadge(gateway.state)
  const GwIcon = gwConfig.icon

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gateway Card */}
        <Card className="border-border bg-surface hover:border-border-strong transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono-tech text-text-muted tracking-wider">
                Hermes Gateway
              </span>
              <div className={`p-1.5 rounded-md ${gwConfig.class} border`}>
                <GwIcon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono-tech text-text-primary tracking-tight">
                {gateway.state}
              </div>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                PID: <span className="font-mono-tech">{gateway.pid ?? '—'}</span> • {gateway.host}
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigateTab('gateway')}
                className="h-6 text-[11px] font-mono-tech text-text-muted hover:text-interactive p-0"
              >
                Inspect Gateway <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Card */}
        <Card className="border-border bg-surface hover:border-border-strong transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono-tech text-text-muted tracking-wider">
                Active Sessions
              </span>
              <div className="p-1.5 rounded-md bg-interactive/10 border border-interactive/20 text-interactive">
                <Radio className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono-tech text-text-primary tracking-tight">
                {activeSessionsCount ?? '—'}
              </div>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                Current operational transcripts
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigateTab('sessions')}
                className="h-6 text-[11px] font-mono-tech text-text-muted hover:text-interactive p-0"
              >
                View Sessions <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delegations Card */}
        <Card className="border-border bg-surface hover:border-border-strong transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono-tech text-text-muted tracking-wider">
                Running Delegations
              </span>
              <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <GitFork className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono-tech text-text-primary tracking-tight">
                {runningDelegationsCount ?? '—'}
              </div>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                Background worker tasks
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigateTab('delegations')}
                className="h-6 text-[11px] font-mono-tech text-text-muted hover:text-interactive p-0"
              >
                View Delegations <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card className="border-border bg-surface hover:border-border-strong transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono-tech text-text-muted tracking-wider">
                Est. Window Cost
              </span>
              <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <Coins className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold font-mono-tech text-text-primary tracking-tight">
                {formatCurrencyUsd(totalCostEstimateUsd)}
              </div>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                Token consumption billing estimate
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigateTab('usage')}
                className="h-6 text-[11px] font-mono-tech text-text-muted hover:text-interactive p-0"
              >
                Inspect Usage <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subsystem Health Matrix */}
      <Card className="border-border bg-surface">
        <CardHeader className="p-4 pb-2 border-b border-border bg-surface-subtle">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
            Subsystem Health Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-tech text-xs">
            {Object.entries(health).map(([key, val]) => {
              const cfg = getHealthBadge(val)
              const Icon = cfg.icon
              return (
                <div
                  key={key}
                  className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle flex flex-col justify-between"
                >
                  <span className="text-[10px] text-text-muted uppercase truncate">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.class.split(' ')[0]}`} />
                    <span className="font-semibold text-text-primary text-[11px]">{val}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Runtime Events Preview */}
      <Card className="border-border bg-surface">
        <CardHeader className="p-4 pb-2 border-b border-border bg-surface-subtle flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider font-mono-tech text-text-muted">
            Recent Supervisor Events
          </CardTitle>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onNavigateTab('events')}
            className="h-6 text-[11px] font-mono-tech text-interactive hover:underline p-0"
          >
            All Events <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="p-3.5 hover:bg-surface-subtle flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono-tech uppercase bg-surface-raised px-1.5 py-0.5 rounded border border-border text-text-muted">
                    {evt.category}
                  </span>
                  <span className="font-semibold text-text-primary font-mono-tech text-xs">
                    {evt.entity}
                  </span>
                </div>
                <p className="text-xs text-text-secondary font-sans leading-relaxed">
                  {evt.message}
                </p>
              </div>
              <span className="text-[10px] font-mono-tech text-text-muted shrink-0 whitespace-nowrap">
                {formatTimestampRelative(evt.timestamp)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
