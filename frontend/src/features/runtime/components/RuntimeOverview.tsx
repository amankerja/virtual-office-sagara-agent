import React from 'react'
import type { RuntimeOverview as RuntimeOverviewType } from '@/types/runtime'
import { Button } from '@/components/ui/button'
import { formatCurrencyUsd, formatTimestampRelative, formatUptimeDetailed, formatUptimeSeconds } from '@/lib/formatters'
import { useRuntimeUsage, useExecutionPolicy, useNineRouterHealth, useServicesHealth } from '@/api/hooks'
import {
  Radio,
  GitFork,
  Coins,
  ArrowRight,
  Bot,
  MessageSquare,
  Send,
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
  const { data: usage } = useRuntimeUsage()
  const { data: policy } = useExecutionPolicy()
  const { data: nineRouter } = useNineRouterHealth()
  const { data: servicesHealth } = useServicesHealth()

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

  const {
    gateway,
    activeSessionsCount,
    runningDelegationsCount,
    totalCostEstimateUsd,
    recentEvents,
    systemLoad,
    centralStoreSessions,
    profileLocalSessions,
    aggregateDistinctSessions,
    currentModel,
    currentProvider,
    platforms,
  } = overview

  const cpuPercent = systemLoad?.cpuPercent
  const memUsedMb = systemLoad?.memoryUsedMb
  const memTotalMb = systemLoad?.memoryTotalMb
  const memPercent = systemLoad?.memoryPercent ?? (memUsedMb !== undefined && memTotalMb ? ((memUsedMb / memTotalMb) * 100).toFixed(1) : undefined)

  const uptimeStr = systemLoad?.uptimeSeconds !== undefined
    ? formatUptimeSeconds(systemLoad.uptimeSeconds)
    : formatUptimeDetailed(gateway?.startedAt)

  const renderPlatformStatus = (status?: string) => {
    const norm = status?.toUpperCase()
    if (norm === 'CONNECTED' || norm === 'HEALTHY' || norm === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      )
    }
    if (norm === 'DEGRADED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Degraded
        </span>
      )
    }
    if (norm === 'UNAVAILABLE' || norm === 'OFFLINE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Unavailable
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        {norm || 'UNKNOWN'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Services & Subsystem Pulse Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gateway Card */}
        <div className="p-4 rounded-lg border border-border bg-surface flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-medium">Hermes Gateway</span>
            <span
              className={
                gateway.state === 'HEALTHY'
                  ? 'h-2 w-2 rounded-full bg-emerald-500'
                  : gateway.state === 'STALE' || gateway.state === 'DEGRADED'
                    ? 'h-2 w-2 rounded-full bg-amber-500'
                    : gateway.state === 'OFFLINE'
                      ? 'h-2 w-2 rounded-full bg-rose-500'
                      : 'h-2 w-2 rounded-full bg-slate-400'
              }
            />
          </div>
          <div>
            <div className="text-base font-semibold text-text-primary tracking-tight">
              {gateway.state}
            </div>
            <p className="text-[11px] text-text-secondary truncate mt-0.5">
              PID {gateway.pid !== undefined ? gateway.pid : '—'} • {gateway.host || '—'}
            </p>
          </div>
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('gateway')}
              className="h-6 text-[11px] text-interactive hover:underline p-0"
            >
              Inspect Gateway <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="p-4 rounded-lg border border-border bg-surface flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-medium">Active Sessions</span>
            <Radio className="h-3.5 w-3.5 text-interactive" />
          </div>
          <div>
            <div className="text-base font-semibold text-text-primary tracking-tight">
              {activeSessionsCount !== undefined ? `${activeSessionsCount} active` : '—'}
            </div>
            <p className="text-[11px] text-text-secondary truncate mt-0.5">
              Current operational transcripts
            </p>
          </div>
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('sessions')}
              className="h-6 text-[11px] text-interactive hover:underline p-0"
            >
              View Sessions <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Delegations Card */}
        <div className="p-4 rounded-lg border border-border bg-surface flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-medium">Running Delegations</span>
            <GitFork className="h-3.5 w-3.5 text-cyan-500" />
          </div>
          <div>
            <div className="text-base font-semibold text-text-primary tracking-tight">
              {runningDelegationsCount !== undefined ? `${runningDelegationsCount} running` : '—'}
            </div>
            <p className="text-[11px] text-text-secondary truncate mt-0.5">
              Background worker tasks
            </p>
          </div>
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('delegations')}
              className="h-6 text-[11px] text-interactive hover:underline p-0"
            >
              View Delegations <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Token Spend Window */}
        <div className="p-4 rounded-lg border border-border bg-surface flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-medium">Window Token Cost</span>
            <Coins className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-base font-semibold text-text-primary tracking-tight">
              {totalCostEstimateUsd !== undefined ? formatCurrencyUsd(totalCostEstimateUsd) : '—'}
            </div>
            <p className="text-[11px] text-text-secondary truncate mt-0.5">
              Cumulative model inference estimate
            </p>
          </div>
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onNavigateTab('usage')}
              className="h-6 text-[11px] text-interactive hover:underline p-0"
            >
              Inspect Usage <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Authoritative Overview Sections: Host/Services & Runtime/Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Host / VPS & Services */}
        <div className="space-y-6">
          {/* Services Health */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold text-text-primary">
                Core Services Health
              </h3>
              <span className="text-[10px] font-semibold text-text-muted bg-surface-subtle px-2 py-0.5 rounded border border-border">
                SERVICES MONITORED
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="text-text-primary font-medium">Mission Control API</span>
                {(() => {
                  const mcService = (servicesHealth || overview.servicesHealth)?.find((s) => s.name.includes('mission-control'))
                  if (mcService && (mcService.health === 'HEALTHY' || mcService.activeState === 'active')) {
                    return (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy {mcService.mainPid ? `(PID ${mcService.mainPid})` : '(Same-Origin)'}
                      </span>
                    )
                  }
                  return (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Healthy (Same-Origin)
                    </span>
                  )
                })()}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="text-text-primary font-medium">Hermes Gateway</span>
                {gateway.state === 'HEALTHY' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Healthy {gateway.pid !== undefined ? `(PID ${gateway.pid})` : ''}
                  </span>
                ) : gateway.state === 'STALE' || gateway.state === 'DEGRADED' ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" /> {gateway.state === 'STALE' ? 'Stale' : 'Degraded'}
                  </span>
                ) : gateway.state === 'OFFLINE' ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                    <XCircle className="h-3.5 w-3.5" /> Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> UNKNOWN
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="text-text-primary font-medium">9Router Inference Proxy</span>
                {(() => {
                  const router = nineRouter || overview.routerHealth
                  if (router?.health === 'HEALTHY' || router?.available) {
                    return (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy {router.mainPid ? `(PID ${router.mainPid})` : ''}{router.modelsCount ? ` • ${router.modelsCount} models` : ''}
                      </span>
                    )
                  }
                  if (router?.health === 'DEGRADED') {
                    return (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" /> Degraded
                      </span>
                    )
                  }
                  if (router?.health === 'UNAVAILABLE') {
                    return (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Unavailable
                      </span>
                    )
                  }
                  return (
                    <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> UNKNOWN
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Resource Health (CPU, RAM, Swap, Disk, Uptime) */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold text-text-primary">
                Host & Resource Health
              </h3>
              <span className="text-[11px] font-mono-tech text-text-muted">
                {gateway.host ? `${gateway.host} (Linux x86_64)` : '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">CPU Load</span>
                <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">
                  {cpuPercent !== undefined ? `${cpuPercent}%` : '—'}
                </span>
                <span className="text-[10px] text-text-muted">
                  Load avg: {systemLoad?.load1m !== undefined ? `${systemLoad.load1m} / ${systemLoad.load5m} / ${systemLoad.load15m}` : (systemLoad?.loadAvg || '—')}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">Memory (RAM)</span>
                {memUsedMb !== undefined ? (
                  <>
                    <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">{memUsedMb} MB</span>
                    <span className="text-[10px] text-text-muted">{memTotalMb ? `of ${(memTotalMb / 1024).toFixed(1)} GB` : ''}{memPercent !== undefined ? ` (${memPercent}%)` : ''}</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">—</span>
                    <span className="text-[10px] text-text-muted">Memory metrics unavailable</span>
                  </>
                )}
              </div>
              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">Disk Storage</span>
                {systemLoad?.diskUsedGb !== undefined && systemLoad?.diskTotalGb !== undefined ? (
                  <>
                    <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">
                      {systemLoad.diskUsedGb} GB of {systemLoad.diskTotalGb} GB
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {systemLoad.diskFreeGb !== undefined ? `${systemLoad.diskFreeGb} GB free` : ''}{systemLoad.diskPercent !== undefined ? ` (${systemLoad.diskPercent}% used)` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">—</span>
                    <span className="text-[10px] text-text-muted">Storage telemetry unavailable</span>
                  </>
                )}
              </div>
              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">System Uptime</span>
                <span className="font-mono-tech font-semibold text-sm text-text-primary mt-0.5 block">{uptimeStr}</span>
                <span className="text-[10px] text-text-muted">
                  {gateway.restartCount !== undefined ? `${gateway.restartCount} restarts recorded` : 'Restarts: —'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Runtime Models & Integration Health */}
        <div className="space-y-6">
          {/* Runtime Engine Specifications */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold text-text-primary">
                Runtime Engine & Profiles
              </h3>
              <span className="text-[11px] font-mono-tech text-text-muted">
                SQLite state.db (WAL)
              </span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-text-muted">Primary Models:</span>
                <span className="font-mono-tech text-[11px] text-text-primary">
                  {currentModel || (usage?.byModel && usage.byModel.length > 0 ? usage.byModel.map((m) => m.name).join(', ') : 'UNKNOWN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-text-muted">Model Providers:</span>
                <span className="text-text-primary font-medium">
                  {currentProvider || (usage?.byProvider && usage.byProvider.length > 0 ? usage.byProvider.map((p) => p.name).join(', ') : 'UNKNOWN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                <span className="text-text-muted">Active Profiles:</span>
                <span className="text-text-primary font-medium">
                  {policy?.profiles ? (
                    (() => {
                      const total = Object.keys(policy.profiles).length
                      const enabled = Object.values(policy.profiles).filter((p) => p.status === 'ENABLED').length
                      const limited = Object.entries(policy.profiles).filter(([, p]) => p.status === 'LIMITED').map(([id]) => id)
                      return (
                        <>
                          {total} registered / {enabled} enabled
                          {limited.length > 0 ? (
                            <> (<span className="text-interactive">{limited.join(', ')}</span> LIMITED)</>
                          ) : null}
                        </>
                      )
                    })()
                  ) : (
                    'UNKNOWN'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Session Storage:</span>
                <span className="font-mono-tech text-[11px] text-text-secondary">
                  {centralStoreSessions !== undefined
                    ? `Hermes SQLite (${centralStoreSessions} central, ${profileLocalSessions ?? 0} local, ${aggregateDistinctSessions ?? centralStoreSessions} distinct)`
                    : 'Hermes SQLite /state.db (Synchronous NORMAL, WAL)'}
                </span>
              </div>
            </div>
          </div>

          {/* Integration Health (STATUS ONLY: Discord, Telegram, WhatsApp) */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-semibold text-text-primary">
                Integration Health (Status Only)
              </h3>
              <span className="text-[10px] text-text-muted font-mono-tech">
                CHANNEL PROJECTIONS
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-text-primary font-medium">Discord Integration</span>
                </div>
                {renderPlatformStatus(platforms?.discord)}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <div className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-sky-500" />
                  <span className="text-text-primary font-medium">Telegram Bot</span>
                </div>
                {renderPlatformStatus(platforms?.telegram)}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-text-primary font-medium">WhatsApp Bridge</span>
                </div>
                {renderPlatformStatus(platforms?.whatsapp)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Runtime Events Preview */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="p-3.5 border-b border-border bg-surface-subtle/70 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-primary">
            Recent Supervisor Events
          </h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onNavigateTab('events')}
            className="h-6 text-[11px] text-interactive hover:underline p-0 font-medium"
          >
            All Events <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <div className="divide-y divide-border">
          {recentEvents.length === 0 ? (
            <p className="p-4 text-xs text-text-muted italic">No supervisor events recorded.</p>
          ) : (
            recentEvents.map((evt) => (
              <div key={evt.id} className="p-3 hover:bg-surface-subtle/50 transition-colors flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase bg-surface-raised px-1.5 py-0.5 rounded border border-border text-text-muted">
                      {evt.category}
                    </span>
                    <span className="font-semibold text-text-primary text-xs">
                      {evt.entity}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {evt.message}
                  </p>
                </div>
                <span className="text-[11px] text-text-muted shrink-0 whitespace-nowrap">
                  {formatTimestampRelative(evt.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
