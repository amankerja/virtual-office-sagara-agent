import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AuditFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedActorType: string
  onActorTypeChange: (type: string) => void
  selectedOutcome: string
  onOutcomeChange: (outcome: string) => void
  selectedTimeRange: string
  onTimeRangeChange: (timeRange: string) => void
  onReset: () => void
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedActorType,
  onActorTypeChange,
  selectedOutcome,
  onOutcomeChange,
  selectedTimeRange,
  onTimeRangeChange,
  onReset,
}) => {
  const isFiltered =
    Boolean(searchQuery) ||
    selectedActorType !== 'ALL' ||
    selectedOutcome !== 'ALL' ||
    selectedTimeRange !== 'ALL'

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search action, target, reason, correlation ID..."
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
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Actor Type Select */}
        <select
          value={selectedActorType}
          aria-label="Filter by actor type"
          onChange={(e) => onActorTypeChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Actor Types</option>
          <option value="USER">User</option>
          <option value="AGENT">Agent</option>
          <option value="SYSTEM">System</option>
          <option value="RUNTIME">Runtime</option>
        </select>

        {/* Outcome Select */}
        <select
          value={selectedOutcome}
          aria-label="Filter by outcome"
          onChange={(e) => onOutcomeChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="DENIED">Denied</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Time Range Select */}
        <select
          value={selectedTimeRange}
          aria-label="Filter by time range"
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-sans"
        >
          <option value="ALL">All Records</option>
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>

        {/* Reset */}
        {isFiltered && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 px-2.5 text-xs text-text-muted hover:text-text-primary gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  )
}
