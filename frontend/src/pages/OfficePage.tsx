import React, { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Building2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgentDetailModal } from '@/components/modal/AgentDetailModal'
import {
  useAgents,
  useAgent,
  useDelegations,
  useApprovals,
  useRuntimeOverview,
  useTasks,
} from '@/api/hooks'
import { useUIStore } from '@/stores/ui-store'
import { useTheme } from '@/app/theme-provider'
import { buildOfficeScene } from '@/features/office/layout/office-layout-engine'
import { OfficeControls } from '@/features/office/components/OfficeControls'
import { OfficeSummary } from '@/features/office/components/OfficeSummary'
import { OfficeLegend } from '@/features/office/components/OfficeLegend'
import { OfficeAttentionBanner } from '@/features/office/components/OfficeAttentionBanner'
import { VirtualOfficeCanvas } from '@/features/office/components/VirtualOfficeCanvas'
import { OfficeMobileSummary } from '@/features/office/components/OfficeMobileSummary'
import { OfficeListView } from '@/features/office/components/OfficeListView'
import { OfficeActivityStrip } from '@/features/office/components/OfficeActivityStrip'
import type { OfficeRenderMode, GraphicsQuality } from '@/features/office/renderers/Office3D/types'
import {
  getSavedRenderMode,
  saveRenderMode,
  getSavedGraphicsQuality,
  saveGraphicsQuality,
} from '@/features/office/renderers/Office3D/systems/GraphicsQuality'
import { Office3DErrorBoundary } from '@/features/office/renderers/Office3D/systems/SceneErrorBoundary'

// Lazy load 3D renderer so Three.js is not bundled into core routes (Section 81 & 82)
const ImmersiveOffice3D = React.lazy(
  () => import('@/features/office/renderers/Office3D/ImmersiveOffice3D')
)

export const OfficePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // URL Query Parameters
  const selectedAgentId = searchParams.get('agent')
  const focusAgentId = searchParams.get('focus') || selectedAgentId
  const urlViewParam = searchParams.get('view')

  // Global UI Store Preferences
  const { officeZoom, setOfficeZoom } = useUIStore()

  // Multi-Renderer Mode (3D / 2.5D / List) - Section 7 & 48
  const [renderMode, setRenderMode] = useState<OfficeRenderMode>(() => {
    if (urlViewParam === '3d' || urlViewParam === '2.5d' || urlViewParam === 'list') {
      return urlViewParam as OfficeRenderMode
    }
    if (urlViewParam === 'office') return '2.5d'
    return getSavedRenderMode()
  })

  // Graphics Quality Preset (Low / Balanced / Ultra) - Section 38
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() => {
    return getSavedGraphicsQuality()
  })

  // Local Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('ALL')
  const [zoneFilter, setZoneFilter] = useState<string>('ALL')
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null)
  const [fitRevision, setFitRevision] = useState(0)

  const handleRenderModeChange = (mode: OfficeRenderMode) => {
    setRenderMode(mode)
    saveRenderMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('view', mode)
      return next
    })
  }

  const handleQualityChange = (quality: GraphicsQuality) => {
    setGraphicsQuality(quality)
    saveGraphicsQuality(quality)
  }

  // Data fetching from domain projections
  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useAgents()

  const {
    data: delegations = [],
    refetch: refetchDelegations,
  } = useDelegations()

  const {
    data: approvals = [],
    refetch: refetchApprovals,
  } = useApprovals()

  const {
    data: runtimeOverview,
    refetch: refetchRuntime,
  } = useRuntimeOverview()

  const {
    data: tasks = [],
    refetch: refetchTasks,
  } = useTasks()

  const { data: selectedAgentData } = useAgent(selectedAgentId)
  const activeDrawerAgent = selectedAgentData || agents.find((a) => a.id === selectedAgentId) || null

  // Drawer open / close handlers
  const handleSelectAgent = useCallback((id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('agent', id)
      next.set('focus', id)
      return next
    })
  }, [setSearchParams])

  const handleCloseDrawer = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('agent')
      return next
    })
  }, [setSearchParams])

  // Zoom handlers
  const handleZoomIn = () => {
    setOfficeZoom(Math.min(1.75, Math.round((officeZoom + 0.15) * 100) / 100))
  }

  const handleZoomOut = () => {
    setOfficeZoom(Math.max(0.6, Math.round((officeZoom - 0.15) * 100) / 100))
  }

  const handleFit = () => {
    setOfficeZoom(1)
    setFitRevision(value => value + 1)
  }

  // Pure presentation layout engine invocation
  const fullScene = useMemo(() => {
    return buildOfficeScene({
      agents,
      delegations,
      approvals,
      runtimeOverview,
      tasks,
    })
  }, [agents, delegations, approvals, runtimeOverview, tasks])

  // Filtered scene for presentation (matching search query, state, and zone)
  const filteredScene = useMemo(() => {
    let matchingDesks = fullScene.desks

    // Filter by State
    if (stateFilter !== 'ALL') {
      matchingDesks = matchingDesks.filter((d) => d.agent.runtime.state === stateFilter)
    }

    // Filter by Zone
    if (zoneFilter !== 'ALL') {
      matchingDesks = matchingDesks.filter((d) => d.zone === zoneFilter)
    }

    // Filter by Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      matchingDesks = matchingDesks.filter(
        (d) =>
          d.agent.definition.name.toLowerCase().includes(q) ||
          d.agent.definition.role?.toLowerCase().includes(q) ||
          d.currentTask?.title.toLowerCase().includes(q) ||
          d.zone.toLowerCase().includes(q)
      )
    }

    // Matching worker stations
    const matchingAgentIds = new Set(matchingDesks.map((d) => d.agentId))
    const matchingWorkers = fullScene.workers.filter((w) => matchingAgentIds.has(w.parentAgentId))

    return {
      ...fullScene,
      desks: matchingDesks,
      workers: matchingWorkers,
    }
  }, [fullScene, stateFilter, zoneFilter, searchQuery])

  // Manual Refresh
  const handleRefresh = () => {
    refetchAgents()
    refetchDelegations()
    refetchApprovals()
    refetchRuntime()
    refetchTasks()
  }

  const isLoading = agentsLoading && agents.length === 0

  if (isLoading) {
    return <LoadingState message="Initializing Sagara 2.5D Operational Visualization..." />
  }

  if (agentsError) {
    return (
      <ErrorState
        title="Failed to Load Operational Telemetry"
        message="Unable to load agent projections for Virtual Office visualization."
        onRetry={handleRefresh}
      />
    )
  }

  // Section 52: Empty Office State
  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Virtual Office"
          description="Interactive spatial visualizer of autonomous agent workstations, communication channels, and active collaboration."
          badge={
            <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
              PROTOTYPE DATA
            </Badge>
          }
        />
        <EmptyState
          icon={Building2}
          title="No agent profiles available"
          description="Virtual Office will populate automatically when AgentProjection data is available."
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Check Operational Telemetry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Virtual Office"
        description="Spatial 2.5D operational visualization of agent workstations, delegated workers, runtime gateway, and human-in-the-loop security gates."
        badge={
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono-tech text-[10px] tracking-wider uppercase"
          >
            PROTOTYPE DATA
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 text-xs gap-1.5 border-border bg-surface text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </Button>
        }
      />

      {/* Fleet Summary Counters */}
      <OfficeSummary scene={fullScene} />

      {/* Operator Attention Banner */}
      <OfficeAttentionBanner scene={fullScene} onSelectAgent={handleSelectAgent} />

      {/* Controls Bar (Multi-Renderer Switcher, Zoom, Quality, Search, Filters) */}
      <OfficeControls
        viewMode={renderMode}
        onViewModeChange={handleRenderModeChange}
        quality={graphicsQuality}
        onQualityChange={handleQualityChange}
        zoom={officeZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        zoneFilter={zoneFilter}
        onZoneFilterChange={setZoneFilter}
      />

      {/* Primary Office View: Immersive 3D, Efficient 2.5D, or Accessible List View (Section 1) */}
      {renderMode === '3d' ? (
        <div className="space-y-3">
          <Office3DErrorBoundary
            onFallbackTo2D={() => handleRenderModeChange('2.5d')}
            onFallbackToList={() => handleRenderModeChange('list')}
          >
            <Suspense
              fallback={
                <div className="w-full h-165 md:h-180 rounded-xl border border-border bg-surface flex items-center justify-center">
                  <LoadingState message="Initializing Sagara 3D Operations Environment..." />
                </div>
              }
            >
              <ImmersiveOffice3D
                scene={filteredScene}
                focusedAgentId={focusAgentId}
                hoveredAgentId={hoveredAgentId}
                quality={graphicsQuality}
                onSelectAgent={handleSelectAgent}
                onHoverAgent={setHoveredAgentId}
                onSelectApprovalPod={() => navigate('/approvals')}
                onSelectServerRoom={() => navigate('/runtime')}
                onSelectVault={() => navigate('/tasks')}
                onSelectDelegation={(id) => navigate(`/runtime?tab=delegations&delegation=${id}`)}
                isDark={isDark}
              />
            </Suspense>
          </Office3DErrorBoundary>
          {/* Section 38: Mobile Summary below office viewport */}
          <OfficeMobileSummary scene={fullScene} onSelectAgent={handleSelectAgent} />
          <OfficeLegend />
        </div>
      ) : renderMode === '2.5d' ? (
        <div className="space-y-3">
          <VirtualOfficeCanvas
            fitRevision={fitRevision}
            scene={filteredScene}
            focusedAgentId={focusAgentId}
            hoveredAgentId={hoveredAgentId}
            zoom={officeZoom}
            onZoomChange={setOfficeZoom}
            onSelectAgent={handleSelectAgent}
            onHoverAgent={setHoveredAgentId}
          />
          {/* Section 38: Mobile Summary below office viewport */}
          <OfficeMobileSummary scene={fullScene} onSelectAgent={handleSelectAgent} />
          <OfficeLegend />
        </div>
      ) : (
        <div className="space-y-4">
          <OfficeListView scene={filteredScene} onSelectAgent={handleSelectAgent} />
          <OfficeLegend />
        </div>
      )}

      {/* Recent prototype activity */}
      <OfficeActivityStrip />

      {/* Reused Centered Agent Detail Modal (Prompt 11.5 Section 120) */}
      <AgentDetailModal
        agent={activeDrawerAgent}
        isOpen={Boolean(activeDrawerAgent)}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
