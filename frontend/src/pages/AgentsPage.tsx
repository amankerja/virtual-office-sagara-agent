import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bot,
  Search,
  Filter,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgentCard } from '@/features/agents/components/AgentCard'
import { AgentListRow } from '@/features/agents/components/AgentListRow'
import { AgentSummaryBar } from '@/features/agents/components/AgentSummaryBar'
import { AgentDetailDrawer } from '@/features/agents/components/AgentDetailDrawer'
import { useAgents, useAgent } from '@/api/hooks'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

export const AgentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchQuery = searchParams.get('search') || ''
  const stateFilter = searchParams.get('state') || 'All'
  const roleFilter = searchParams.get('role') || 'All'
  const configFilter = searchParams.get('config') || 'All'
  const selectedAgentId = searchParams.get('agent')

  const { agentViewMode, setAgentViewMode } = useUIStore()

  const {
    data: agents = [],
    isLoading,
    error,
    refetch,
  } = useAgents()

  const { data: selectedAgent } = useAgent(selectedAgentId)
  const activeAgent = selectedAgent || agents.find((a) => a.id === selectedAgentId) || null

  // Dynamically derive available roles from the agents data
  const availableRoles = useMemo(() => {
    const roles = new Set<string>()
    agents.forEach((agent) => {
      if (agent.definition.role) {
        roles.add(agent.definition.role)
      }
    })
    return Array.from(roles).sort()
  }, [agents])

  // Update query params helper
  const updateParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value || value === 'All') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }

  const handleSelectAgent = (id: string) => {
    updateParam('agent', id)
  }

  const handleCloseDrawer = () => {
    updateParam('agent', null)
  }

  const handleResetFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      // Preserve agent drawer if open
      const currentAgent = prev.get('agent')
      if (currentAgent) {
        next.set('agent', currentAgent)
      }
      return next
    })
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      stateFilter !== 'All' ||
      roleFilter !== 'All' ||
      configFilter !== 'All'
  )

  // Filter pipeline
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // 1. Text Search matching name, role, description
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const nameMatch = agent.definition.name.toLowerCase().includes(query)
        const roleMatch = agent.definition.role?.toLowerCase().includes(query) || false
        const descMatch = agent.definition.description?.toLowerCase().includes(query) || false
        if (!nameMatch && !roleMatch && !descMatch) {
          return false
        }
      }

      // 2. Runtime State Filter
      if (stateFilter !== 'All') {
        if (stateFilter === 'Active' && agent.runtime.state !== 'ACTIVE') return false
        if (stateFilter === 'Idle' && agent.runtime.state !== 'IDLE' && agent.runtime.state !== 'RECENTLY_ACTIVE') return false
        if (stateFilter === 'Needs Attention') {
          const isAttention =
            agent.runtime.state === 'AWAITING_APPROVAL' ||
            agent.runtime.state === 'DEGRADED' ||
            agent.runtime.state === 'ERROR' ||
            agent.definition.configurationState === 'INCOMPLETE'
          if (!isAttention) return false
        }
        if (stateFilter === 'Offline' && agent.runtime.state !== 'OFFLINE') return false
        if (stateFilter === 'Unknown' && agent.runtime.state !== 'UNKNOWN') return false
      }

      // 3. Configuration Filter
      if (configFilter !== 'All') {
        if (configFilter === 'Complete' && agent.definition.configurationState !== 'COMPLETE') return false
        if (configFilter === 'Incomplete' && agent.definition.configurationState !== 'INCOMPLETE') return false
        if (configFilter === 'Disabled' && agent.definition.enabled !== false) return false
      }

      // 4. Role Filter (Dynamic)
      if (roleFilter !== 'All') {
        if (agent.definition.role !== roleFilter) return false
      }

      return true
    })
  }, [agents, searchQuery, stateFilter, roleFilter, configFilter])

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="Failed to Load Agent Directory"
          message="Unable to retrieve the registered agent projections from the runtime gateway."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Prototype Badge */}
      <PageHeader
        title="Agents"
        description="Persistent Sagara specialist profiles, runtime projections, and capability bindings."
        badge={
          <Badge
            variant="outline"
            className="border-interactive/30 bg-interactive/10 text-interactive font-mono-tech text-[10px] gap-1"
          >
            <Sparkles className="h-3 w-3" />
            PROTOTYPE FLEET
          </Badge>
        }
      />

      {/* Summary Statistics Bar */}
      <AgentSummaryBar agents={agents} />

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface border border-border transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <Input
              type="text"
              placeholder="Search by name, role, or description..."
              value={searchQuery}
              onChange={(e) => updateParam('search', e.target.value || null)}
              className="pl-8 h-9 sm:h-8 text-xs bg-background border-border text-text-primary placeholder:text-text-muted focus-visible:ring-interactive/50"
            />
          </div>

          {/* Desktop Filter Dropdowns */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {/* Runtime State Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className={cn(
                    'border-border bg-background text-text-secondary hover:text-text-primary min-h-[32px]',
                    stateFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                  )}
                >
                  <Filter className="mr-1.5 h-3 w-3 text-text-muted" />
                  <span className="font-mono-tech text-[11px]">
                    State: {stateFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-surface-overlay border-border text-text-primary">
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                  Filter by State
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {['All', 'Active', 'Idle', 'Needs Attention', 'Offline', 'Unknown'].map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onClick={() => updateParam('state', st)}
                    className={cn(
                      'text-xs cursor-pointer focus:bg-surface-hover',
                      stateFilter === st && 'text-interactive font-semibold'
                    )}
                  >
                    {st}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Configuration Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className={cn(
                    'border-border bg-background text-text-secondary hover:text-text-primary min-h-[32px]',
                    configFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                  )}
                >
                  <span className="font-mono-tech text-[11px]">
                    Config: {configFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-surface-overlay border-border text-text-primary">
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                  Filter by Configuration
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {['All', 'Complete', 'Incomplete', 'Disabled'].map((cfg) => (
                  <DropdownMenuItem
                    key={cfg}
                    onClick={() => updateParam('config', cfg)}
                    className={cn(
                      'text-xs cursor-pointer focus:bg-surface-hover',
                      configFilter === cfg && 'text-interactive font-semibold'
                    )}
                  >
                    {cfg}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dynamic Role Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className={cn(
                    'border-border bg-background text-text-secondary hover:text-text-primary min-h-[32px]',
                    roleFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                  )}
                >
                  <span className="font-mono-tech text-[11px]">
                    Role: {roleFilter}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-surface-overlay border-border text-text-primary">
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                  Dynamic Roles ({availableRoles.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => updateParam('role', 'All')}
                  className={cn(
                    'text-xs cursor-pointer focus:bg-surface-hover',
                    roleFilter === 'All' && 'text-interactive font-semibold'
                  )}
                >
                  All Roles
                </DropdownMenuItem>
                {availableRoles.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => updateParam('role', role)}
                    className={cn(
                      'text-xs cursor-pointer focus:bg-surface-hover truncate',
                      roleFilter === role && 'text-interactive font-semibold'
                    )}
                  >
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reset Filters CTA */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                className="text-text-muted hover:text-rose-500 min-h-[32px]"
                title="Reset all filters"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}

            {/* View Mode (Grid vs List) */}
            <div className="flex items-center rounded-md border border-border bg-background p-0.5 ml-1">
              <Button
                variant={agentViewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setAgentViewMode('grid')}
                className={agentViewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted'}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={agentViewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setAgentViewMode('list')}
                className={agentViewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted'}
                title="List View"
                aria-label="List View"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Mobile Filters Dropdown & View Mode (< 640px) */}
          <div className="flex sm:hidden items-center justify-between gap-2 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'flex-1 justify-center border-border bg-background text-text-secondary min-h-[44px]',
                    hasActiveFilters && 'border-interactive text-interactive'
                  )}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-text-muted" />
                  <span className="font-mono-tech text-xs">
                    {hasActiveFilters ? 'Filters (Active)' : 'Filter Agents'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 bg-surface-overlay border-border text-text-primary">
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                  State Filter
                </DropdownMenuLabel>
                {['All', 'Active', 'Idle', 'Needs Attention', 'Offline'].map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onClick={() => updateParam('state', st)}
                    className={cn('text-xs', stateFilter === st && 'text-interactive font-semibold')}
                  >
                    {st}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                  Config Filter
                </DropdownMenuLabel>
                {['All', 'Complete', 'Incomplete'].map((cfg) => (
                  <DropdownMenuItem
                    key={cfg}
                    onClick={() => updateParam('config', cfg)}
                    className={cn('text-xs', configFilter === cfg && 'text-interactive font-semibold')}
                  >
                    {cfg}
                  </DropdownMenuItem>
                ))}

                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={handleResetFilters}
                      className="text-xs text-rose-500 font-semibold"
                    >
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center rounded-md border border-border bg-background p-1">
              <Button
                variant={agentViewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setAgentViewMode('grid')}
                className={cn('min-h-[40px] min-w-[40px]', agentViewMode === 'grid' ? 'bg-surface-raised text-text-primary' : 'text-text-muted')}
                aria-label="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={agentViewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setAgentViewMode('list')}
                className={cn('min-h-[40px] min-w-[40px]', agentViewMode === 'list' ? 'bg-surface-raised text-text-primary' : 'text-text-muted')}
                aria-label="List View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Status */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] font-mono-tech text-text-muted">
            <span>Filtering {filteredAgents.length} of {agents.length} agents:</span>
            {searchQuery && (
              <Badge variant="outline" className="border-border bg-surface-subtle text-text-primary text-[10px]">
                Search: "{searchQuery}"
              </Badge>
            )}
            {stateFilter !== 'All' && (
              <Badge variant="outline" className="border-border bg-surface-subtle text-text-primary text-[10px]">
                State: {stateFilter}
              </Badge>
            )}
            {configFilter !== 'All' && (
              <Badge variant="outline" className="border-border bg-surface-subtle text-text-primary text-[10px]">
                Config: {configFilter}
              </Badge>
            )}
            {roleFilter !== 'All' && (
              <Badge variant="outline" className="border-border bg-surface-subtle text-text-primary text-[10px]">
                Role: {roleFilter}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Main Agent Grid or List Container */}
      <div className="w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-surface-subtle animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={hasActiveFilters ? 'No Matching Agents Found' : 'No Agents Registered'}
            description={
              hasActiveFilters
                ? 'No agent instances match the active search and filter constraints.'
                : 'The agent fleet directory is currently empty.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="border-border bg-surface text-text-primary"
                >
                  Clear All Filters
                </Button>
              ) : undefined
            }
            className="py-16"
          />
        ) : agentViewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={handleSelectAgent}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5">
            {filteredAgents.map((agent) => (
              <AgentListRow
                key={agent.id}
                agent={agent}
                onSelect={handleSelectAgent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deep-Linked Reusable Agent Detail Drawer */}
      <AgentDetailDrawer
        agent={activeAgent}
        isOpen={Boolean(selectedAgentId && activeAgent)}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
