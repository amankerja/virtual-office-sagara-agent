import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import {
  ActivitySummary,
  ActivityFilters,
  ActivityTimeline,
  ActivityTable,
  ActivityDetailDrawer,
  AuditFilters,
  AuditTable,
  AuditDetailDrawer,
  UsageSummary,
  BudgetStatusCard,
  UsageDistribution,
  TaskCostAttribution,
  GovernanceSignals,
} from '@/features/activity'
import {
  useActivity,
  useActivityEvent,
  useAuditRecords,
  useAuditRecord,
  useGovernanceSnapshot,
} from '@/api/hooks'
import {
  Activity as ActivityIcon,
  ShieldAlert,
  BarChart2,
  GitFork,
  X,
} from 'lucide-react'
import type { ActivityProjection } from '@/types/activity'
import type { AuditRecord } from '@/types/audit'

export const ActivityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // URL state
  const activeTab = searchParams.get('tab') || 'events'
  const selectedEventId = searchParams.get('event')
  const selectedAuditId = searchParams.get('audit')
  const correlationFilter = searchParams.get('correlation')

  // Local UI filters for Activity
  const [activitySearch, setActivitySearch] = useState('')
  const [activityCategory, setActivityCategory] = useState('ALL')
  const [activitySeverity, setActivitySeverity] = useState('ALL')
  const [activityTimeRange, setActivityTimeRange] = useState('ALL')
  const [activityAgent, setActivityAgent] = useState('ALL')
  const [activityViewMode, setActivityViewMode] = useState<'timeline' | 'table'>('timeline')

  // Local UI filters for Audit
  const [auditSearch, setAuditSearch] = useState('')
  const [auditActorType, setAuditActorType] = useState('ALL')
  const [auditOutcome, setAuditOutcome] = useState('ALL')
  const [auditTimeRange, setAuditTimeRange] = useState('ALL')

  // Queries
  const {
    data: allActivityEvents = [],
    isLoading: isLoadingActivity,
    isError: isErrorActivity,
    refetch: refetchActivity,
  } = useActivity()

  const {
    data: selectedEventFromQuery,
  } = useActivityEvent(selectedEventId)

  const {
    data: allAuditRecords = [],
    isLoading: isLoadingAudit,
    isError: isErrorAudit,
    refetch: refetchAudit,
  } = useAuditRecords()

  const {
    data: selectedAuditFromQuery,
  } = useAuditRecord(selectedAuditId)

  const {
    data: governanceSnapshot,
    isLoading: isLoadingGovernance,
    isError: isErrorGovernance,
    refetch: refetchGovernance,
  } = useGovernanceSnapshot()

  // Tab switching
  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', tab)
    setSearchParams(newParams)
  }

  // Correlation filter handling
  const handleFilterCorrelation = (correlationId: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('correlation', correlationId)
    setSearchParams(newParams)
  }

  const handleClearCorrelation = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('correlation')
    setSearchParams(newParams)
  }

  // Event selection drawer
  const handleSelectEvent = (event: ActivityProjection) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('event', event.id)
    setSearchParams(newParams)
  }

  const handleCloseEventDrawer = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('event')
    setSearchParams(newParams)
  }

  // Audit selection drawer
  const handleSelectAudit = (record: AuditRecord) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('audit', record.id)
    setSearchParams(newParams)
  }

  const handleCloseAuditDrawer = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('audit')
    setSearchParams(newParams)
  }

  // Static reference timestamp for deterministic filtering (React compiler safety)
  const REFERENCE_TIME = useMemo(() => new Date('2026-09-09T05:30:00Z').getTime(), [])

  // Filtered Activity events
  const filteredEvents = useMemo(() => {
    return allActivityEvents.filter((event) => {
      // Correlation filter
      if (correlationFilter && event.correlationId !== correlationFilter) {
        return false
      }

      // Category filter
      if (activityCategory !== 'ALL' && event.category !== activityCategory) {
        return false
      }

      // Severity filter
      if (activitySeverity !== 'ALL' && event.severity !== activitySeverity) {
        return false
      }

      // Agent filter
      if (activityAgent !== 'ALL') {
        const actorLabel = event.actor?.label || event.actor?.id || event.related?.agentId
        if (actorLabel !== activityAgent) return false
      }

      // Time range filter
      if (activityTimeRange !== 'ALL') {
        const eventTime = new Date(event.timestamp).getTime()
        const diffMs = REFERENCE_TIME - eventTime
        if (activityTimeRange === '1h' && diffMs > 3600 * 1000) return false
        if (activityTimeRange === '24h' && diffMs > 24 * 3600 * 1000) return false
        if (activityTimeRange === '7d' && diffMs > 7 * 24 * 3600 * 1000) return false
      }

      // Search query
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase().trim()
        const matchesTitle = event.title.toLowerCase().includes(q)
        const matchesDesc = event.description?.toLowerCase().includes(q) ?? false
        const matchesActor =
          (event.actor?.label?.toLowerCase().includes(q) ?? false) ||
          (event.actor?.id?.toLowerCase().includes(q) ?? false)
        const matchesEntity =
          (event.entity?.label?.toLowerCase().includes(q) ?? false) ||
          (event.entity?.id?.toLowerCase().includes(q) ?? false)
        const matchesCorr = event.correlationId?.toLowerCase().includes(q) ?? false

        if (!matchesTitle && !matchesDesc && !matchesActor && !matchesEntity && !matchesCorr) {
          return false
        }
      }

      return true
    })
  }, [
    allActivityEvents,
    correlationFilter,
    activityCategory,
    activitySeverity,
    activityAgent,
    activityTimeRange,
    activitySearch,
    REFERENCE_TIME,
  ])

  // Filtered Audit records
  const filteredAuditRecords = useMemo(() => {
    return allAuditRecords.filter((record) => {
      // Correlation filter
      if (correlationFilter && record.correlationId !== correlationFilter) {
        return false
      }

      // Actor type filter
      if (auditActorType !== 'ALL' && record.actor.type !== auditActorType) {
        return false
      }

      // Outcome filter
      if (auditOutcome !== 'ALL' && record.outcome !== auditOutcome) {
        return false
      }

      // Time range filter
      if (auditTimeRange !== 'ALL') {
        const recordTime = new Date(record.timestamp).getTime()
        const diffMs = REFERENCE_TIME - recordTime
        if (auditTimeRange === '1h' && diffMs > 3600 * 1000) return false
        if (auditTimeRange === '24h' && diffMs > 24 * 3600 * 1000) return false
        if (auditTimeRange === '7d' && diffMs > 7 * 24 * 3600 * 1000) return false
      }

      // Search query
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim()
        const matchesAction = record.action.toLowerCase().includes(q)
        const matchesReason = record.reason?.toLowerCase().includes(q) ?? false
        const matchesActor =
          (record.actor.label?.toLowerCase().includes(q) ?? false) ||
          (record.actor.id?.toLowerCase().includes(q) ?? false)
        const matchesTarget =
          (record.target?.label?.toLowerCase().includes(q) ?? false) ||
          (record.target?.id?.toLowerCase().includes(q) ?? false)
        const matchesCorr = record.correlationId?.toLowerCase().includes(q) ?? false

        if (!matchesAction && !matchesReason && !matchesActor && !matchesTarget && !matchesCorr) {
          return false
        }
      }

      return true
    })
  }, [
    allAuditRecords,
    correlationFilter,
    auditActorType,
    auditOutcome,
    auditTimeRange,
    auditSearch,
    REFERENCE_TIME,
  ])

  // Resolve active detail drawer items
  const activeEvent =
    selectedEventFromQuery ||
    allActivityEvents.find((e) => e.id === selectedEventId) ||
    null

  const activeAudit =
    selectedAuditFromQuery ||
    allAuditRecords.find((a) => a.id === selectedAuditId) ||
    null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Activity"
        description="Normalized operational events across tasks, agents, runtime, approvals, and capabilities."
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
              EVENTS: {allActivityEvents.length}
            </Badge>
            <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
              AUDIT: {allAuditRecords.length}
            </Badge>
          </div>
        }
      />

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="bg-surface border border-border p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="events"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-subtle data-[state=active]:text-text-primary"
          >
            <ActivityIcon className="h-3.5 w-3.5" />
            <span>Activity</span>
            <span className="text-[10px] font-mono-tech text-text-muted">
              ({allActivityEvents.length})
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="audit"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-subtle data-[state=active]:text-text-primary"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Audit Trail</span>
            <span className="text-[10px] font-mono-tech text-text-muted">
              ({allAuditRecords.length})
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="usage"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-subtle data-[state=active]:text-text-primary"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Usage & Governance</span>
          </TabsTrigger>
        </TabsList>

        {/* Correlation Banner (Active across tabs) */}
        {correlationFilter && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs text-text-primary">
            <div className="flex items-center gap-2 min-w-0">
              <GitFork className="h-4 w-4 text-primary shrink-0" />
              <span className="text-text-secondary">Filtered by Correlation:</span>
              <span className="font-mono-tech font-semibold px-2 py-0.5 rounded bg-surface border border-border truncate">
                {correlationFilter}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCorrelation}
              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary gap-1 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filter</span>
            </Button>
          </div>
        )}

        {/* Tab 1: Activity Stream */}
        <TabsContent value="events" className="space-y-5 mt-0">
          {isLoadingActivity ? (
            <LoadingState message="Loading operational event telemetry..." />
          ) : isErrorActivity ? (
            <ErrorState
              title="Activity Telemetry Unavailable"
              message="Failed to retrieve operational activity records."
              onRetry={() => refetchActivity()}
            />
          ) : (
            <>
              {/* Operational Summary */}
              <ActivitySummary events={allActivityEvents} />

              {/* Filters */}
              <ActivityFilters
                searchQuery={activitySearch}
                onSearchChange={setActivitySearch}
                selectedCategory={activityCategory}
                onCategoryChange={setActivityCategory}
                selectedSeverity={activitySeverity}
                onSeverityChange={setActivitySeverity}
                selectedTimeRange={activityTimeRange}
                onTimeRangeChange={setActivityTimeRange}
                selectedAgent={activityAgent}
                onAgentChange={setActivityAgent}
                viewMode={activityViewMode}
                onViewModeChange={setActivityViewMode}
                events={allActivityEvents}
                onReset={() => {
                  setActivitySearch('')
                  setActivityCategory('ALL')
                  setActivitySeverity('ALL')
                  setActivityTimeRange('ALL')
                  setActivityAgent('ALL')
                  handleClearCorrelation()
                }}
              />

              {/* Event Stream (Timeline vs Table) */}
              {activityViewMode === 'timeline' ? (
                <ActivityTimeline
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleSelectEvent}
                  onFilterCorrelation={handleFilterCorrelation}
                />
              ) : (
                <ActivityTable
                  events={filteredEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleSelectEvent}
                  onFilterCorrelation={handleFilterCorrelation}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 2: Audit Trail */}
        <TabsContent value="audit" className="space-y-5 mt-0">
          {isLoadingAudit ? (
            <LoadingState message="Loading immutable accountability audit log..." />
          ) : isErrorAudit ? (
            <ErrorState
              title="Audit Log Unavailable"
              message="Failed to retrieve accountability audit records."
              onRetry={() => refetchAudit()}
            />
          ) : (
            <>
              {/* Audit Filters */}
              <AuditFilters
                searchQuery={auditSearch}
                onSearchChange={setAuditSearch}
                selectedActorType={auditActorType}
                onActorTypeChange={setAuditActorType}
                selectedOutcome={auditOutcome}
                onOutcomeChange={setAuditOutcome}
                selectedTimeRange={auditTimeRange}
                onTimeRangeChange={setAuditTimeRange}
                onReset={() => {
                  setAuditSearch('')
                  setAuditActorType('ALL')
                  setAuditOutcome('ALL')
                  setAuditTimeRange('ALL')
                  handleClearCorrelation()
                }}
              />

              {/* Audit Table */}
              <AuditTable
                records={filteredAuditRecords}
                selectedRecordId={selectedAuditId}
                onSelectRecord={handleSelectAudit}
                onFilterCorrelation={handleFilterCorrelation}
              />
            </>
          )}
        </TabsContent>

        {/* Tab 3: Usage & Governance */}
        <TabsContent value="usage" className="space-y-6 mt-0">
          {isLoadingGovernance ? (
            <LoadingState message="Loading token consumption and budget governance snapshot..." />
          ) : isErrorGovernance || !governanceSnapshot ? (
            <ErrorState
              title="Governance Snapshot Unavailable"
              message="Failed to retrieve token analytics and budget envelope data."
              onRetry={() => refetchGovernance()}
            />
          ) : (
            <>
              {/* Usage Summary (7 metrics with explicit unknown handling) */}
              <UsageSummary totalUsage={governanceSnapshot.totalUsage} />

              {/* Budget Envelope */}
              <BudgetStatusCard budget={governanceSnapshot.budget} />

              {/* Desktop 2-Column Composition (Section 56) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: Agent Breakdown & Provider Breakdown */}
                <div className="space-y-5">
                  <UsageDistribution
                    title="Agent Token Consumption"
                    subtitle="Allocation of token burn across active agents"
                    iconType="agent"
                    items={governanceSnapshot.breakdowns.agents}
                    colorScheme="emerald"
                  />

                  <UsageDistribution
                    title="Provider Distribution"
                    subtitle="Inference gateway traffic by vendor backend"
                    iconType="provider"
                    items={governanceSnapshot.breakdowns.providers}
                    colorScheme="purple"
                  />
                </div>

                {/* Column 2: Model Breakdown & Governance Signals */}
                <div className="space-y-5">
                  <UsageDistribution
                    title="Model Utilization"
                    subtitle="Token distribution across foundational LLMs"
                    iconType="model"
                    items={governanceSnapshot.breakdowns.models}
                    colorScheme="blue"
                  />

                  <GovernanceSignals signals={governanceSnapshot.signals} />
                </div>
              </div>

              {/* Task Cost Attribution */}
              <TaskCostAttribution tasks={governanceSnapshot.taskAttributions} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Activity Detail Drawer */}
      <ActivityDetailDrawer
        event={activeEvent}
        isOpen={Boolean(selectedEventId)}
        onClose={handleCloseEventDrawer}
        onFilterCorrelation={handleFilterCorrelation}
      />

      {/* Audit Detail Drawer */}
      <AuditDetailDrawer
        record={activeAudit}
        isOpen={Boolean(selectedAuditId)}
        onClose={handleCloseAuditDrawer}
        onFilterCorrelation={handleFilterCorrelation}
      />
    </div>
  )
}
