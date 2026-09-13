import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Server,
  Lock,
  Clock,
  PlayCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  HardDrive,
  Cpu,
} from 'lucide-react'
import { SystemPulse } from '@/features/command-center/components/SystemPulse'
import { AttentionQueue } from '@/features/command-center/components/AttentionQueue'
import { AgentFleetOverview } from '@/features/command-center/components/AgentFleetOverview'
import { RecentActivity } from '@/features/command-center/components/RecentActivity'
import { UpcomingScheduleCard } from '@/features/command-center/components/UpcomingScheduleCard'
import { AgentDetailModal } from '@/components/modal/AgentDetailModal'
import {
  useMissionControlSnapshot,
  useAgents,
  useAgent,
  useTasks,
  useRuntimeOverview,
  useGatewayTelemetry,
  useNineRouterHealth,
  useExecutionLock,
} from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import { formatUptimeHours, formatUptimeSeconds } from '@/lib/formatters'
import type { AttentionItem } from '@/types/mission-control'

export const CommandCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedAgentId = searchParams.get('agent')

  const {
    data: snapshot,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot,
  } = useMissionControlSnapshot()

  const {
    data: agents = [],
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = useAgents()

  const { data: tasks = [] } = useTasks()
  const { data: runtimeOverview } = useRuntimeOverview()
  const { data: gateway } = useGatewayTelemetry()
  const { data: nineRouter } = useNineRouterHealth()
  const { data: lockInfo } = useExecutionLock()

  const handleSelectAgent = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('agent', id)
      return next
    })
  }

  const handleCloseDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('agent')
      return next
    })
  }

  const handleReviewAttentionItem = (item: AttentionItem) => {
    if (item.type === 'APPROVAL' || item.entityId?.startsWith('appr-')) {
      navigate(`/approvals?approval=${item.entityId}`)
    } else if (item.entityId?.startsWith('tsk-')) {
      navigate(`/tasks?task=${item.entityId}`)
    } else if (item.type === 'CAPABILITY' || item.entityId?.startsWith('sk-')) {
      navigate(`/skills?skill=${item.entityId}`)
    } else if (item.entityId && agents.some((a) => a.id === item.entityId)) {
      handleSelectAgent(item.entityId)
    } else if (item.entityId?.startsWith('sess-')) {
      navigate(`/runtime?tab=sessions&session=${item.entityId}`)
    } else if (item.entityId?.startsWith('del-')) {
      navigate(`/runtime?tab=delegations&delegation=${item.entityId}`)
    }
  }

  const handleManualRefresh = () => {
    refetchSnapshot()
    refetchAgents()
  }

  // Find currently selected agent projection
  const { data: selectedAgent } = useAgent(selectedAgentId)
  const activeAgent = selectedAgent || agents.find((a) => a.id === selectedAgentId) || null

  // System load & uptime metrics
  const systemLoad = runtimeOverview?.systemLoad
  const cpuPercent = systemLoad?.cpuPercent
  const memUsedMb = systemLoad?.memoryUsedMb
  const memTotalMb = systemLoad?.memoryTotalMb
  const memPercent = systemLoad?.memoryPercent ?? (memUsedMb !== undefined && memTotalMb ? ((memUsedMb / memTotalMb) * 100).toFixed(1) : undefined)
  const diskUsedGb = systemLoad?.diskUsedGb
  const diskTotalGb = systemLoad?.diskTotalGb
  const diskPercent = systemLoad?.diskPercent

  // Calculate approximate uptime from VPS or gateway
  const uptimeStr = systemLoad?.uptimeSeconds !== undefined
    ? formatUptimeSeconds(systemLoad.uptimeSeconds)
    : formatUptimeHours(gateway?.startedAt)

  if (snapshotError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Mission Control Telemetry Unavailable"
          message="Unable to ingest operational telemetry snapshot. Ensure the backend gateway is reachable."
          onRetry={handleManualRefresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Clean Production Status & Freshness */}
      <PageHeader
        title="Command Center"
        description="Autonomous operations control center and agent fleet supervisor."
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-text-muted hidden sm:inline">
              Refreshed: {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
            </span>

            <Button
              variant="outline"
              size="xs"
              onClick={handleManualRefresh}
              className="border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover min-h-8 sm:min-h-7"
              title="Refresh operational telemetry"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1 text-text-muted" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* 2. Top Area: Service Status & Lightweight Infrastructure Strip (Prompt Item 11) */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Top Status Bar: Core Services & Execution Gate */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border bg-surface-subtle/60 px-4 py-2.5 gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Mission Control:</span>
            {snapshotError ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Unavailable
              </span>
            ) : snapshotLoading ? (
              <span className="inline-flex items-center gap-1 font-medium text-text-muted">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                Connecting
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">Hermes:</span>
            {gateway?.state === 'HEALTHY' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Healthy
              </span>
            ) : gateway?.state === 'STALE' || gateway?.state === 'DEGRADED' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {gateway.state === 'STALE' ? 'Stale' : 'Degraded'}
              </span>
            ) : gateway?.state === 'OFFLINE' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-text-muted">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                {gateway?.state || 'UNKNOWN'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">9Router:</span>
            {nineRouter?.health === 'HEALTHY' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Healthy
              </span>
            ) : nineRouter?.health === 'DEGRADED' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Degraded
              </span>
            ) : nineRouter?.health === 'UNAVAILABLE' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Unavailable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-text-muted">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                {nineRouter?.health || 'UNKNOWN'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-text-muted">Execution:</span>
            {lockInfo?.is_locked || lockInfo?.status === 'LOCKED' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold uppercase">
                <Lock className="h-3 w-3" />
                LOCKED
              </span>
            ) : lockInfo?.status === 'UNLOCKED' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold uppercase">
                <Lock className="h-3 w-3" />
                UNLOCKED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border text-[10px] font-medium uppercase" title="Authoritative lock status not observed">
                <Lock className="h-3 w-3" />
                Execution state unavailable
              </span>
            )}
          </div>
        </div>

        {/* Lightweight Infrastructure Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 px-4 py-2.5 gap-3 text-xs bg-surface">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-text-muted text-[11px] flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-text-muted" />
              CPU:
            </span>
            <span className="font-mono-tech text-xs font-semibold text-text-primary">
              {cpuPercent !== undefined ? `${cpuPercent}%` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-text-muted text-[11px] flex items-center gap-1">
              <Server className="h-3.5 w-3.5 text-text-muted" />
              RAM:
            </span>
            <span className="font-mono-tech text-xs text-text-primary">
              {memUsedMb !== undefined ? (
                <>
                  <span className="font-semibold">{memUsedMb} MB</span>
                  {memTotalMb ? ` / ${(memTotalMb / 1024).toFixed(1)} GB` : ''}
                  {memPercent !== undefined ? <span className="text-text-muted text-[11px]"> ({memPercent}%)</span> : null}
                </>
              ) : (
                <span className="font-semibold">—</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-text-muted text-[11px] flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5 text-text-muted" />
              Disk:
            </span>
            <span className="font-mono-tech text-xs text-text-primary">
              {diskUsedGb !== undefined && diskTotalGb !== undefined ? (
                <>
                  <span className="font-semibold">{diskUsedGb} GB</span>
                  <span className="text-text-muted text-[11px]"> / {diskTotalGb} GB</span>
                  {diskPercent !== undefined ? <span className="text-text-muted text-[11px]"> ({diskPercent}%)</span> : null}
                </>
              ) : (
                <span className="font-semibold">—</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-text-muted text-[11px] flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              Uptime:
            </span>
            <span className="font-mono-tech text-xs font-semibold text-text-primary">{uptimeStr}</span>
          </div>
        </div>
      </div>

      {/* 3. System Pulse: Flat Status Strip (Prompt Item 12) */}
      {snapshot?.pulse && (
        <SystemPulse pulse={snapshot.pulse} isLoading={snapshotLoading} />
      )}

      {/* 4. Segmented Work Queue Operational Row (Prompt Item 13) */}
      <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h3 className="text-xs font-semibold text-text-primary">
            Work Queue
          </h3>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-xs text-interactive hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Open Tasks Board</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border rounded-md border border-border bg-surface-subtle/50">
          <button
            type="button"
            onClick={() => navigate('/tasks?state=READY')}
            className="p-3 hover:bg-surface-hover transition-colors text-left cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] text-text-muted">Ready</div>
              <div className="text-lg font-bold font-mono-tech text-sky-600 dark:text-sky-400 mt-0.5">
                {tasks.filter((t) => t.state === 'READY').length}
              </div>
            </div>
            <Clock className="h-4 w-4 text-sky-500/50" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?state=RUNNING')}
            className="p-3 hover:bg-surface-hover transition-colors text-left cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] text-text-muted">Running</div>
              <div className="text-lg font-bold font-mono-tech text-emerald-600 dark:text-emerald-400 mt-0.5">
                {tasks.filter((t) => ['RUNNING', 'DISPATCHING', 'QUEUED'].includes(t.state)).length}
              </div>
            </div>
            <PlayCircle className="h-4 w-4 text-emerald-500/50" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/approvals')}
            className="p-3 hover:bg-surface-hover transition-colors text-left cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] text-text-muted">Approval</div>
              <div className="text-lg font-bold font-mono-tech text-amber-600 dark:text-amber-400 mt-0.5">
                {tasks.filter((t) => t.state === 'AWAITING_APPROVAL').length}
              </div>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500/50" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?state=FAILED')}
            className="p-3 hover:bg-surface-hover transition-colors text-left cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] text-text-muted">Failed</div>
              <div className="text-lg font-bold font-mono-tech text-rose-600 dark:text-rose-400 mt-0.5">
                {tasks.filter((t) => t.state === 'FAILED').length}
              </div>
            </div>
            <XCircle className="h-4 w-4 text-rose-500/50" />
          </button>
        </div>
      </div>

      {/* 5. Priority Grid: Attention Queue & Agent Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 xl:col-span-7">
          <AttentionQueue
            items={snapshot?.attentionQueue || []}
            onReviewItem={handleReviewAttentionItem}
            isLoading={snapshotLoading}
          />
        </div>

        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          <AgentFleetOverview
            agents={agents}
            onSelectAgent={handleSelectAgent}
            isLoading={agentsLoading}
          />

          {/* Compact Upcoming Schedule Preview */}
          <UpcomingScheduleCard />
        </div>
      </div>

      {/* 6. Recent Activity Stream */}
      <RecentActivity
        events={snapshot?.recentActivity || []}
        isLoading={snapshotLoading}
      />

      {/* Reusable Agent Detail Modal */}
      <AgentDetailModal
        agent={activeAgent}
        isOpen={Boolean(selectedAgentId && activeAgent)}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
