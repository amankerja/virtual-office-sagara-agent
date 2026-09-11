import React, { useState, useMemo } from 'react'
import type { DelegationProjection } from '@/types/runtime'
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
import { GitFork, Search, Filter, X, ChevronRight, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DelegationsTableProps {
  delegations: DelegationProjection[];
  onSelectDelegation: (id: string) => void;
  selectedDelegationId?: string | null;
  isLoading?: boolean;
}

export const DelegationsTable: React.FC<DelegationsTableProps> = ({
  delegations,
  onSelectDelegation,
  selectedDelegationId,
  isLoading,
}) => {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [agentFilter, setAgentFilter] = useState('All')

  const availableAgents = useMemo(() => {
    return Array.from(new Set(delegations.map((d) => d.originAgentName))).sort()
  }, [delegations])

  const filteredDelegations = useMemo(() => {
    return delegations.filter((del) => {
      if (search) {
        const q = search.toLowerCase()
        const matchId = del.id.toLowerCase().includes(q)
        const matchTitle = del.taskTitle.toLowerCase().includes(q)
        const matchAgent = del.originAgentName.toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchAgent) return false
      }

      if (stateFilter !== 'All' && del.state !== stateFilter) return false
      if (agentFilter !== 'All' && del.originAgentName !== agentFilter) return false

      return true
    })
  }, [delegations, search, stateFilter, agentFilter])

  const hasActiveFilters = Boolean(search || stateFilter !== 'All' || agentFilter !== 'All')

  const handleResetFilters = () => {
    setSearch('')
    setStateFilter('All')
    setAgentFilter('All')
  }

  const getStateClass = (state: DelegationProjection['state']) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25'
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
      case 'FAILED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
      case 'QUEUED':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25'
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
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
            placeholder="Search delegations by ID, task, agent..."
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
              {['All', 'QUEUED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((s) => (
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
                Origin Agent
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

      {filteredDelegations.length === 0 ? (
        <EmptyState
          icon={GitFork}
          title="No Delegations Discovered"
          description={
            hasActiveFilters
              ? 'No worker delegations match the specified filters.'
              : 'No active or completed async worker tasks found in runtime memory.'
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
                    <th className="py-2.5 px-3">Delegation</th>
                    <th className="py-2.5 px-3">Task Title</th>
                    <th className="py-2.5 px-3">Origin Agent</th>
                    <th className="py-2.5 px-3">Origin Session</th>
                    <th className="py-2.5 px-3">Host PID</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Delivery</th>
                    <th className="py-2.5 px-3 text-right">Started</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredDelegations.map((del) => {
                    const isSelected = del.id === selectedDelegationId

                    return (
                      <tr
                        key={del.id}
                        onClick={() => onSelectDelegation(del.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelectDelegation(del.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className={`group cursor-pointer transition-colors hover:bg-surface-hover focus:outline-none focus:bg-surface-hover ${
                          isSelected ? 'bg-interactive/10 border-interactive' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-text-primary whitespace-nowrap">
                          {del.id}
                        </td>
                        <td className="py-3 px-3 text-text-primary font-sans font-medium max-w-50 truncate">
                          {del.taskTitle}
                        </td>
                        <td className="py-3 px-3 text-text-secondary whitespace-nowrap font-sans">
                          {del.originAgentName}
                        </td>
                        <td className="py-3 px-3 text-text-muted whitespace-nowrap">
                          {del.originSessionId}
                        </td>
                        <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                          {del.ownerPid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <Cpu className="h-3 w-3" /> PID {del.ownerPid}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getStateClass(
                              del.state
                            )}`}
                          >
                            {del.state}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-muted whitespace-nowrap uppercase text-[10px]">
                          {del.deliveryState || '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-text-muted whitespace-nowrap">
                          {formatTimestampRelative(del.startedAt)}
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
            {filteredDelegations.map((del) => (
              <div
                key={del.id}
                onClick={() => onSelectDelegation(del.id)}
                role="button"
                tabIndex={0}
                className="p-3.5 rounded-lg border border-border bg-surface hover:border-border-strong cursor-pointer space-y-2.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono-tech font-bold text-text-primary text-xs block">
                      {del.id}
                    </span>
                    <span className="font-sans text-xs text-text-primary font-semibold block mt-0.5">
                      {del.taskTitle}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono-tech border ${getStateClass(
                      del.state
                    )}`}
                  >
                    {del.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tech text-text-muted pt-1 border-t border-border-subtle">
                  <span>Agent: <span className="text-text-secondary font-sans">{del.originAgentName}</span></span>
                  <span className="text-right">{del.ownerPid ? `PID ${del.ownerPid}` : 'No PID'}</span>
                  <span>Origin: <span className="text-text-secondary">{del.originSessionId}</span></span>
                  <span className="text-right">{formatTimestampRelative(del.startedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
