import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Sparkles } from 'lucide-react'
import { SystemPulse } from '@/features/command-center/components/SystemPulse'
import { AttentionQueue } from '@/features/command-center/components/AttentionQueue'
import { AgentFleetOverview } from '@/features/command-center/components/AgentFleetOverview'
import { RecentActivity } from '@/features/command-center/components/RecentActivity'
import { UpcomingScheduleCard } from '@/features/command-center/components/UpcomingScheduleCard'
import { AgentDetailModal } from '@/components/modal/AgentDetailModal'
import { useMissionControlSnapshot, useAgents, useAgent, useTasks } from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import type { AttentionItem } from '@/types/mission-control'
import { CheckSquare, ArrowRight, PlayCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

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

  if (snapshotError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Mission Control Offline"
          message="Unable to ingest operational telemetry snapshot. Ensure the backend gateway is reachable or prototype mode is active."
          onRetry={handleManualRefresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Prototype Data Badge & Refresh */}
      <PageHeader
        title="Command Center"
        description="Operational overview of the Sagara AI organization."
        badge={
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-interactive/30 bg-interactive/10 text-interactive font-mono-tech text-[10px] gap-1"
            >
              <Sparkles className="h-3 w-3" />
              PROTOTYPE DATA
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-tech text-text-muted hidden sm:inline">
              Refreshed: {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
            </span>

            <Button
              variant="outline"
              size="xs"
              onClick={handleManualRefresh}
              className="border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover min-h-8 sm:min-h-7"
              title="Refresh telemetry"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1 text-text-muted" />
              <span className="font-mono-tech text-[11px]">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* 1. System Pulse Metrics */}
      {snapshot?.pulse && (
        <SystemPulse pulse={snapshot.pulse} isLoading={snapshotLoading} />
      )}

      {/* 1.5 Compact Work Queue Operational Overview (Prompt 04 Section 51) */}
      <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-interactive/10 text-interactive border border-interactive/25">
              <CheckSquare className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono-tech">
              Work Queue
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-xs font-mono-tech text-interactive hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Tasks Board</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/tasks?state=READY')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-subtle hover:border-sky-500/40 hover:bg-surface-hover transition-colors text-left cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-mono-tech text-text-muted uppercase">Ready</div>
              <div className="text-base font-bold font-mono-tech text-sky-600 dark:text-sky-400 mt-0.5">
                {tasks.filter((t) => t.state === 'READY').length}
              </div>
            </div>
            <Clock className="h-4 w-4 text-sky-500/60" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?state=RUNNING')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-subtle hover:border-emerald-500/40 hover:bg-surface-hover transition-colors text-left cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-mono-tech text-text-muted uppercase">Running</div>
              <div className="text-base font-bold font-mono-tech text-emerald-600 dark:text-emerald-400 mt-0.5">
                {tasks.filter((t) => ['RUNNING', 'DISPATCHING', 'QUEUED'].includes(t.state)).length}
              </div>
            </div>
            <PlayCircle className="h-4 w-4 text-emerald-500/60" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/approvals')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-subtle hover:border-amber-500/40 hover:bg-surface-hover transition-colors text-left cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-mono-tech text-text-muted uppercase">Waiting Approval</div>
              <div className="text-base font-bold font-mono-tech text-amber-600 dark:text-amber-400 mt-0.5">
                {tasks.filter((t) => t.state === 'AWAITING_APPROVAL').length}
              </div>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500/60" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?state=FAILED')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-subtle hover:border-rose-500/40 hover:bg-surface-hover transition-colors text-left cursor-pointer"
          >
            <div>
              <div className="text-[10px] font-mono-tech text-text-muted uppercase">Failed</div>
              <div className="text-base font-bold font-mono-tech text-rose-600 dark:text-rose-400 mt-0.5">
                {tasks.filter((t) => t.state === 'FAILED').length}
              </div>
            </div>
            <XCircle className="h-4 w-4 text-rose-500/60" />
          </button>
        </div>
      </div>

      {/* 2. Priority Grid: Attention Queue & Agent Fleet Overview */}
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

          {/* Compact Upcoming Schedule Preview (Prompt 11.5 Section 82) */}
          <UpcomingScheduleCard />
        </div>
      </div>

      {/* 3. Recent Activity Stream */}
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
