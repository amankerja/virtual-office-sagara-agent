import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Sparkles } from 'lucide-react'
import { SystemPulse } from '@/features/command-center/components/SystemPulse'
import { AttentionQueue } from '@/features/command-center/components/AttentionQueue'
import { AgentFleetOverview } from '@/features/command-center/components/AgentFleetOverview'
import { RecentActivity } from '@/features/command-center/components/RecentActivity'
import { AgentDetailDrawer } from '@/features/agents/components/AgentDetailDrawer'
import { useMissionControlSnapshot, useAgents, useAgent } from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import type { AttentionItem } from '@/types/mission-control'

export const CommandCenterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
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
    if (item.entityId && agents.some((a) => a.id === item.entityId)) {
      handleSelectAgent(item.entityId)
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

      {/* 2. Priority Grid: Attention Queue & Agent Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 xl:col-span-7">
          <AttentionQueue
            items={snapshot?.attentionQueue || []}
            onReviewItem={handleReviewAttentionItem}
            isLoading={snapshotLoading}
          />
        </div>

        <div className="lg:col-span-6 xl:col-span-5">
          <AgentFleetOverview
            agents={agents}
            onSelectAgent={handleSelectAgent}
            isLoading={agentsLoading}
          />
        </div>
      </div>

      {/* 3. Recent Activity Stream */}
      <RecentActivity
        events={snapshot?.recentActivity || []}
        isLoading={snapshotLoading}
      />

      {/* Reusable Agent Detail Drawer */}
      <AgentDetailDrawer
        agent={activeAgent}
        isOpen={Boolean(selectedAgentId && activeAgent)}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
