import React from 'react'
import {
  Search,
  RotateCcw,
  LayoutList,
  Table as TableIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ActivityProjection } from '@/types/activity'

interface ActivityFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedSeverity: string
  onSeverityChange: (severity: string) => void
  selectedTimeRange: string
  onTimeRangeChange: (timeRange: string) => void
  selectedAgent: string
  onAgentChange: (agent: string) => void
  viewMode: 'timeline' | 'table'
  onViewModeChange: (mode: 'timeline' | 'table') => void
  events: ActivityProjection[]
  onReset: () => void
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSeverity,
  onSeverityChange,
  selectedTimeRange,
  onTimeRangeChange,
  selectedAgent,
  onAgentChange,
  viewMode,
  onViewModeChange,
  events,
  onReset,
}) => {
  // Dynamically derive agents from events
  const agents = Array.from(
    new Set(
      events
        .map((e) => e.actor?.label || e.actor?.id || e.related?.agentId)
        .filter(Boolean) as string[]
    )
  ).sort()

  const isFiltered =
    Boolean(searchQuery) ||
    selectedCategory !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedTimeRange !== 'ALL' ||
    selectedAgent !== 'ALL'

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, actor, entity, correlation ID..."
            className="pl-9 bg-surface text-xs h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 shrink-0 self-start md:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('timeline')}
            className={`h-8 px-3 gap-1.5 text-xs font-medium rounded-md ${
              viewMode === 'timeline'
                ? 'bg-surface-subtle text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('table')}
            className={`h-8 px-3 gap-1.5 text-xs font-medium rounded-md ${
              viewMode === 'table'
                ? 'bg-surface-subtle text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Table</span>
          </Button>
        </div>
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* Category Select */}
        <select
          value={selectedCategory}
          aria-label="Filter by event category"
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Categories</option>
          <option value="TASK">Tasks</option>
          <option value="AGENT">Agents</option>
          <option value="APPROVAL">Approvals</option>
          <option value="SESSION">Sessions</option>
          <option value="DELEGATION">Delegations</option>
          <option value="SKILL">Skills</option>
          <option value="GATEWAY">Gateway</option>
          <option value="SYSTEM">System</option>
        </select>

        {/* Severity Select */}
        <select
          value={selectedSeverity}
          aria-label="Filter by event severity"
          onChange={(e) => onSeverityChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {/* Agent Select */}
        <select
          value={selectedAgent}
          aria-label="Filter by agent or actor"
          onChange={(e) => onAgentChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Actors</option>
          {agents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        {/* Time Range Select */}
        <select
          value={selectedTimeRange}
          aria-label="Filter by time range"
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Activity</option>
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>

        {/* Reset filters button */}
        {isFiltered && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 px-2.5 text-xs text-text-muted hover:text-text-primary gap-1.5 col-span-2 sm:col-span-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  )
}
