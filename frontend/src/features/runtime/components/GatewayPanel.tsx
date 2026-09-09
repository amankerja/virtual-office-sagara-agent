import React from 'react'
import type { GatewayTelemetry } from '@/types/runtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, XCircle, Activity, Server, Hash, Clock, RefreshCw, Cpu } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface GatewayPanelProps {
  gateway: GatewayTelemetry;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const GatewayPanel: React.FC<GatewayPanelProps> = ({
  gateway,
  isLoading,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-lg bg-surface-subtle animate-pulse border border-border" />
      </div>
    )
  }

  const getStateConfig = (state: string) => {
    switch (state) {
      case 'HEALTHY':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-600/25',
          dot: 'bg-emerald-500',
        }
      case 'STALE':
      case 'DEGRADED':
        return {
          icon: AlertTriangle,
          color: 'text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-600/25',
          dot: 'bg-amber-500',
        }
      case 'OFFLINE':
        return {
          icon: XCircle,
          color: 'text-rose-700 dark:text-rose-400 bg-rose-500/15 border-rose-600/25',
          dot: 'bg-rose-500',
        }
      default:
        return {
          icon: Activity,
          color: 'text-slate-700 dark:text-slate-400 bg-slate-500/15 border-slate-600/25',
          dot: 'bg-slate-500',
        }
    }
  }

  const stateConfig = getStateConfig(gateway.state)
  const StateIcon = stateConfig.icon

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Primary Gateway Card */}
      <Card className="border-border bg-surface">
        <CardHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-text-primary shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-text-primary tracking-tight">
                  Central Hermes Gateway Telemetry
                </CardTitle>
                <p className="text-xs text-text-secondary font-mono-tech mt-0.5">
                  Host RPC bus and process supervisor monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase font-mono-tech border ${stateConfig.color}`}
              >
                <span className={`h-2 w-2 rounded-full ${stateConfig.dot} animate-pulse`} />
                <StateIcon className="h-3.5 w-3.5" />
                {gateway.state}
              </span>

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                  title="Check heartbeat probe"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* Status Message */}
          <div className="p-3.5 rounded-lg bg-surface-subtle border border-border font-sans text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary font-mono-tech block mb-1">
              Gateway Diagnostic Summary:
            </span>
            {gateway.statusMessage || 'Gateway telemetry stream operational.'}
          </div>

          {/* Telemetry Parameter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono-tech text-xs">
            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Hash className="h-3 w-3" /> Backend Identifier
              </span>
              <span className="font-medium text-text-primary mt-1 block truncate">
                {gateway.backendId}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Process PID
              </span>
              <span className="font-medium text-text-primary mt-1 block">
                {gateway.pid ?? '—'}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Server className="h-3 w-3" /> Host Name
              </span>
              <span className="font-medium text-text-primary mt-1 block truncate">
                {gateway.host}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Restarts Observed
              </span>
              <span className="font-medium text-text-primary mt-1 block">
                {gateway.restartCount ?? 0}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" /> Started At
              </span>
              <span className="font-medium text-text-primary mt-1 block truncate">
                {gateway.startedAt ? new Date(gateway.startedAt).toLocaleString() : '—'}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Activity className="h-3 w-3" /> Last Heartbeat
              </span>
              <span className="font-medium text-text-primary mt-1 block truncate">
                {formatTimestampRelative(gateway.lastHeartbeat)}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" /> Heartbeat Age
              </span>
              <span className="font-medium text-text-primary mt-1 block">
                {gateway.heartbeatAgeSeconds !== undefined ? `${gateway.heartbeatAgeSeconds}s` : '—'}
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Server className="h-3 w-3" /> Supervisor Policy
              </span>
              <span className="font-medium text-text-primary mt-1 block">
                Read-Only Probe
              </span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 rounded-md bg-surface-raised border border-border text-[11px] text-text-muted font-sans leading-relaxed">
            <span className="font-semibold text-text-secondary font-mono-tech block mb-0.5">
              Operator Boundary Note:
            </span>
            Process mutation controls (such as restart, kill, and supervisor stop) are reserved for CLI maintenance boundaries and are intentionally omitted from this web telemetry interface.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
