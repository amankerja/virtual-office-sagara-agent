import React, { useState, useMemo } from 'react'
import type { RuntimeEvent, EventSeverity } from '@/types/runtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatTimestampRelative } from '@/lib/formatters'
import { Activity, Search, Filter, X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RuntimeEventsProps {
  events: RuntimeEvent[];
  isLoading?: boolean;
}

export const RuntimeEvents: React.FC<RuntimeEventsProps> = ({ events, isLoading }) => {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (search) {
        const q = search.toLowerCase()
        const matchEntity = evt.entity.toLowerCase().includes(q)
        const matchMsg = evt.message.toLowerCase().includes(q)
        const matchId = evt.entityId?.toLowerCase().includes(q)
        if (!matchEntity && !matchMsg && !matchId) return false
      }

      if (categoryFilter !== 'All' && evt.category !== categoryFilter) return false
      if (severityFilter !== 'All' && evt.severity !== severityFilter) return false

      return true
    })
  }, [events, search, categoryFilter, severityFilter])

  const hasActiveFilters = Boolean(search || categoryFilter !== 'All' || severityFilter !== 'All')

  const handleResetFilters = () => {
    setSearch('')
    setCategoryFilter('All')
    setSeverityFilter('All')
  }

  const getSeverityBadge = (severity: EventSeverity) => {
    switch (severity) {
      case 'CRITICAL':
      case 'ERROR':
        return {
          icon: AlertCircle,
          class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25',
        }
      case 'WARNING':
        return {
          icon: AlertTriangle,
          class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25',
        }
      case 'INFO':
      default:
        return {
          icon: CheckCircle2,
          class: 'bg-interactive/10 text-interactive border-interactive/20',
        }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-subtle animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search events by message, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-surface border-border font-mono-tech"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  categoryFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <Filter className="mr-1 h-3 w-3 text-text-muted" />
                <span className="font-mono-tech text-[11px]">Category: {categoryFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Event Category
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['All', 'GATEWAY', 'SESSION', 'DELEGATION', 'USAGE', 'SKILL', 'PROFILE', 'SYSTEM'].map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn('text-xs cursor-pointer', categoryFilter === cat && 'text-interactive font-semibold')}
                >
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Severity Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  severityFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Severity: {severityFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Event Severity
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['All', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((sev) => (
                <DropdownMenuItem
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn('text-xs cursor-pointer', severityFilter === sev && 'text-interactive font-semibold')}
                >
                  {sev}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
              className="text-text-muted hover:text-rose-500 min-h-8 text-xs"
              title="Reset all filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Operational Events"
          description={
            hasActiveFilters
              ? 'No events match the selected filter parameters.'
              : 'No runtime supervisor events recorded in the current telemetry window.'
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="min-h-8 text-xs font-mono-tech"
              >
                Reset Filters
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border border-border bg-surface overflow-hidden transition-colors">
            <table className="w-full text-left text-xs font-mono-tech border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-text-muted font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Correlation ID</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredEvents.map((evt) => {
                  const sevConfig = getSeverityBadge(evt.severity)
                  const SevIcon = sevConfig.icon

                  return (
                    <tr key={evt.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${sevConfig.class}`}
                        >
                          <SevIcon className="h-2.5 w-2.5 mr-1" />
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                        <span className="bg-surface-raised px-1.5 py-0.5 rounded border border-border text-[10px]">
                          {evt.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-text-primary whitespace-nowrap">
                        {evt.entity} {evt.entityId ? `(${evt.entityId})` : ''}
                      </td>
                      <td className="py-3 px-3 text-text-secondary font-sans leading-relaxed">
                        {evt.message}
                      </td>
                      <td className="py-3 px-3 text-text-muted whitespace-nowrap">
                        {evt.correlationId || '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-text-muted whitespace-nowrap">
                        {formatTimestampRelative(evt.timestamp)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredEvents.map((evt) => {
              const sevConfig = getSeverityBadge(evt.severity)
              const SevIcon = sevConfig.icon

              return (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-lg border border-border bg-surface space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono-tech border ${sevConfig.class}`}
                      >
                        <SevIcon className="h-2.5 w-2.5 mr-1" />
                        {evt.severity}
                      </span>
                      <span className="text-[10px] font-mono-tech uppercase bg-surface-raised px-1.5 py-0.5 rounded border border-border text-text-muted">
                        {evt.category}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-tech text-text-muted">
                      {formatTimestampRelative(evt.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs font-sans text-text-primary leading-relaxed">
                    {evt.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono-tech text-text-muted pt-1 border-t border-border-subtle">
                    <span>Entity: <span className="text-text-secondary">{evt.entity}</span></span>
                    {evt.correlationId && <span>{evt.correlationId}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
