import React, { useState, useMemo } from 'react'
import type { SessionProjection } from '@/types/runtime'
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
import { formatCurrencyUsd, formatMetricNumber, formatTimestampRelative } from '@/lib/formatters'
import { Radio, Search, Filter, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionsTableProps {
  sessions: SessionProjection[];
  onSelectSession: (id: string) => void;
  selectedSessionId?: string | null;
  isLoading?: boolean;
}

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  onSelectSession,
  selectedSessionId,
  isLoading,
}) => {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [agentFilter, setAgentFilter] = useState('All')

  // Derive dynamic sources and agents
  const availableSources = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.source))).sort()
  }, [sessions])

  const availableAgents = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.agentName))).sort()
  }, [sessions])

  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (search) {
        const q = search.toLowerCase()
        const matchId = sess.id.toLowerCase().includes(q)
        const matchAgent = sess.agentName.toLowerCase().includes(q)
        const matchModel = sess.model?.toLowerCase().includes(q)
        const matchSource = sess.source.toLowerCase().includes(q)
        if (!matchId && !matchAgent && !matchModel && !matchSource) return false
      }

      if (stateFilter !== 'All' && sess.state !== stateFilter) return false
      if (sourceFilter !== 'All' && sess.source !== sourceFilter) return false
      if (agentFilter !== 'All' && sess.agentName !== agentFilter) return false

      return true
    })
  }, [sessions, search, stateFilter, sourceFilter, agentFilter])

  const hasActiveFilters = Boolean(
    search || stateFilter !== 'All' || sourceFilter !== 'All' || agentFilter !== 'All'
  )

  const handleResetFilters = () => {
    setSearch('')
    setStateFilter('All')
    setSourceFilter('All')
    setAgentFilter('All')
  }

  const getStateClass = (state: SessionProjection['state']) => {
    switch (state) {
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
      case 'FAILED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
      case 'COMPLETED':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25'
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
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
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search sessions by ID, agent, model..."
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
          {/* State Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  stateFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <Filter className="mr-1 h-3 w-3 text-text-muted" />
                <span className="font-mono-tech text-[11px]">State: {stateFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Filter by State
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['All', 'ACTIVE', 'RECENT', 'COMPLETED', 'FAILED', 'ARCHIVED', 'UNKNOWN'].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStateFilter(s)}
                  className={cn('text-xs cursor-pointer', stateFilter === s && 'text-interactive font-semibold')}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Agent Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  agentFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Agent: {agentFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Filter by Agent
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => setAgentFilter('All')}
                className={cn('text-xs cursor-pointer', agentFilter === 'All' && 'text-interactive font-semibold')}
              >
                All Agents
              </DropdownMenuItem>
              {availableAgents.map((ag) => (
                <DropdownMenuItem
                  key={ag}
                  onClick={() => setAgentFilter(ag)}
                  className={cn('text-xs cursor-pointer truncate', agentFilter === ag && 'text-interactive font-semibold')}
                >
                  {ag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Source Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="xs"
                className={cn(
                  'border-border bg-surface text-text-secondary hover:text-text-primary min-h-8 text-xs',
                  sourceFilter !== 'All' && 'border-interactive text-interactive font-semibold'
                )}
              >
                <span className="font-mono-tech text-[11px]">Source: {sourceFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface-overlay border-border text-text-primary">
              <DropdownMenuLabel className="text-[10px] text-text-muted uppercase font-mono-tech">
                Filter by Source
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => setSourceFilter('All')}
                className={cn('text-xs cursor-pointer', sourceFilter === 'All' && 'text-interactive font-semibold')}
              >
                All Sources
              </DropdownMenuItem>
              {availableSources.map((src) => (
                <DropdownMenuItem
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={cn('text-xs cursor-pointer truncate', sourceFilter === src && 'text-interactive font-semibold')}
                >
                  {src}
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

      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Sessions Discovered"
          description={
            hasActiveFilters
              ? 'No operational sessions match the specified filters.'
              : 'No session transcripts are currently stored in runtime memory.'
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-tech border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-subtle text-text-muted font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Session ID</th>
                    <th className="py-2.5 px-3">Agent / Profile</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3 text-center">Messages</th>
                    <th className="py-2.5 px-3 text-center">Tools</th>
                    <th className="py-2.5 px-3 text-right">Tokens</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Last Active</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredSessions.map((sess) => {
                    const isSelected = sess.id === selectedSessionId
                    const totalTokens = sess.usage
                      ? (sess.usage.inputTokens ?? 0) + (sess.usage.outputTokens ?? 0)
                      : undefined

                    return (
                      <tr
                        key={sess.id}
                        onClick={() => onSelectSession(sess.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelectSession(sess.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className={`group cursor-pointer transition-colors hover:bg-surface-hover focus:outline-none focus:bg-surface-hover ${
                          isSelected ? 'bg-interactive/10 border-interactive' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-text-primary whitespace-nowrap">
                          {sess.id}
                        </td>
                        <td className="py-3 px-3 text-text-secondary whitespace-nowrap font-sans font-medium">
                          {sess.agentName}
                        </td>
                        <td className="py-3 px-3 text-text-muted whitespace-nowrap">
                          {sess.source}
                        </td>
                        <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                          {sess.model || '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-text-primary whitespace-nowrap">
                          {sess.messagesCount}
                        </td>
                        <td className="py-3 px-3 text-center text-text-primary whitespace-nowrap">
                          {sess.toolsCount}
                        </td>
                        <td className="py-3 px-3 text-right text-text-secondary whitespace-nowrap">
                          {formatMetricNumber(totalTokens)}
                        </td>
                        <td className="py-3 px-3 text-right text-text-primary whitespace-nowrap">
                          {formatCurrencyUsd(sess.usage?.actualCostUsd ?? sess.usage?.estimatedCostUsd)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getStateClass(
                              sess.state
                            )}`}
                          >
                            {sess.state}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-text-muted whitespace-nowrap">
                          {formatTimestampRelative(sess.lastActivityAt)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredSessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-lg border border-border bg-surface hover:border-border-strong cursor-pointer space-y-2.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono-tech font-bold text-text-primary text-xs block">
                      {sess.id}
                    </span>
                    <span className="font-sans text-xs text-text-secondary font-medium block mt-0.5">
                      {sess.agentName}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono-tech border ${getStateClass(
                      sess.state
                    )}`}
                  >
                    {sess.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tech text-text-muted pt-1 border-t border-border-subtle">
                  <span>Model: <span className="text-text-secondary">{sess.model || '—'}</span></span>
                  <span className="text-right">Cost: <span className="text-text-primary">{formatCurrencyUsd(sess.usage?.actualCostUsd ?? sess.usage?.estimatedCostUsd)}</span></span>
                  <span>Msgs: <span className="text-text-secondary">{sess.messagesCount}</span> • Tools: <span className="text-text-secondary">{sess.toolsCount}</span></span>
                  <span className="text-right">{formatTimestampRelative(sess.lastActivityAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
