import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { RuntimeOverview } from '@/features/runtime/components/RuntimeOverview'
import { GatewayPanel } from '@/features/runtime/components/GatewayPanel'
import { SessionsTable } from '@/features/runtime/components/SessionsTable'
import { SessionDetailModal } from '@/components/modal/SessionDetailModal'
import { DelegationsTable } from '@/features/runtime/components/DelegationsTable'
import { DelegationDetailModal } from '@/components/modal/DelegationDetailModal'
import { UsageSummary } from '@/features/runtime/components/UsageSummary'
import { RuntimeEvents } from '@/features/runtime/components/RuntimeEvents'
import {
  useRuntimeOverview,
  useGatewayTelemetry,
  useSessions,
  useSession,
  useDelegations,
  useDelegation,
  useRuntimeUsage,
  useRuntimeEvents,
} from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'

export const RuntimePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const currentTab = searchParams.get('tab') || 'overview'
  const selectedSessionId = searchParams.get('session')
  const selectedDelegationId = searchParams.get('delegation')

  // Queries
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useRuntimeOverview()

  const {
    data: gateway,
    isLoading: gatewayLoading,
    refetch: refetchGateway,
  } = useGatewayTelemetry()

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
  } = useSessions()

  const { data: activeSession } = useSession(selectedSessionId)

  const {
    data: delegations = [],
    isLoading: delegationsLoading,
  } = useDelegations()

  const { data: activeDelegation } = useDelegation(selectedDelegationId)

  const {
    data: usage,
    isLoading: usageLoading,
  } = useRuntimeUsage()

  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useRuntimeEvents()

  const handleTabChange = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'overview') {
        next.delete('tab')
      } else {
        next.set('tab', tab)
      }
      return next
    })
  }

  const handleSelectSession = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('session', id)
      return next
    })
  }

  const handleCloseSessionDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('session')
      return next
    })
  }

  const handleSelectDelegation = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('delegation', id)
      return next
    })
  }

  const handleCloseDelegationDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('delegation')
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Runtime"
        description="Hermes execution engine telemetry, process supervisors, and memory management."
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
      />

      {/* Primary Runtime Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="border-b border-border bg-surface/50 overflow-x-auto">
          <TabsList className="bg-transparent h-10 p-0 space-x-6 border-b-0">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Sessions ({sessions.length})
            </TabsTrigger>
            <TabsTrigger
              value="gateway"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Gateway
            </TabsTrigger>
            <TabsTrigger
              value="delegations"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Delegations ({delegations.length})
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Usage Accounting
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech uppercase tracking-wide"
            >
              Supervisor Events ({events.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Overview Tab */}
        <TabsContent value="overview" className="m-0 focus-visible:outline-none">
          {overviewError ? (
            <ErrorState
              title="Telemetry Offline"
              message="Failed to ingest runtime supervisor overview."
              onRetry={() => refetchOverview()}
            />
          ) : (
            overview && (
              <RuntimeOverview
                overview={overview}
                onNavigateTab={handleTabChange}
                isLoading={overviewLoading}
              />
            )
          )}
        </TabsContent>

        {/* 2. Sessions Tab */}
        <TabsContent value="sessions" className="m-0 focus-visible:outline-none">
          <SessionsTable
            sessions={sessions}
            onSelectSession={handleSelectSession}
            selectedSessionId={selectedSessionId}
            isLoading={sessionsLoading}
          />
        </TabsContent>

        {/* 3. Gateway Tab */}
        <TabsContent value="gateway" className="m-0 focus-visible:outline-none">
          {gateway && (
            <GatewayPanel
              gateway={gateway}
              isLoading={gatewayLoading}
              onRefresh={() => refetchGateway()}
            />
          )}
        </TabsContent>

        {/* 4. Delegations Tab */}
        <TabsContent value="delegations" className="m-0 focus-visible:outline-none">
          <DelegationsTable
            delegations={delegations}
            onSelectDelegation={handleSelectDelegation}
            selectedDelegationId={selectedDelegationId}
            isLoading={delegationsLoading}
          />
        </TabsContent>

        {/* 5. Usage Tab */}
        <TabsContent value="usage" className="m-0 focus-visible:outline-none">
          {usage && <UsageSummary usage={usage} isLoading={usageLoading} />}
        </TabsContent>

        {/* 6. Events Tab */}
        <TabsContent value="events" className="m-0 focus-visible:outline-none">
          <RuntimeEvents events={events} isLoading={eventsLoading} />
        </TabsContent>
      </Tabs>

      {/* Session Detail Modal */}
      <SessionDetailModal
        session={activeSession || sessions.find((s) => s.id === selectedSessionId) || null}
        isOpen={Boolean(selectedSessionId)}
        onClose={handleCloseSessionDrawer}
        onNavigateSession={(id) => handleSelectSession(id)}
        onNavigateDelegation={(id) => {
          handleCloseSessionDrawer()
          handleTabChange('delegations')
          handleSelectDelegation(id)
        }}
      />

      {/* Delegation Detail Modal */}
      <DelegationDetailModal
        delegation={activeDelegation || delegations.find((d) => d.id === selectedDelegationId) || null}
        isOpen={Boolean(selectedDelegationId)}
        onClose={handleCloseDelegationDrawer}
        onNavigateSession={(sessionId) => {
          handleCloseDelegationDrawer()
          handleTabChange('sessions')
          handleSelectSession(sessionId)
        }}
      />
    </div>
  )
}
