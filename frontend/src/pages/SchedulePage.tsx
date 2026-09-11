import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MonthView } from '@/features/schedule/components/MonthView'
import { WeekView } from '@/features/schedule/components/WeekView'
import { DayView } from '@/features/schedule/components/DayView'
import { AgendaView } from '@/features/schedule/components/AgendaView'
import { ScheduleDetailModal } from '@/features/schedule/components/ScheduleDetailModal'
import { ScheduleEditorModal } from '@/features/schedule/components/ScheduleEditorModal'
import { useScheduleStore, detectScheduleConflicts } from '@/features/schedule/store'
import type { ScheduleItem, ScheduleViewMode } from '@/features/schedule/types'
import { useAgents } from '@/api/hooks'
import { useEntityDetailNavigation } from '@/hooks/useEntityDetailNavigation'

export const SchedulePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { openAgentDetail } = useEntityDetailNavigation()
  const { data: agents = [] } = useAgents()

  const {
    items,
    viewMode,
    selectedDate,
    searchQuery,
    typeFilter,
    statusFilter,
    agentFilter,
    setViewMode,
    setSelectedDate,
    setSearchQuery,
    setTypeFilter,
    setAgentFilter,
    addSchedule,
    updateSchedule,
  } = useScheduleStore()

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)

  // URL deep linked schedule id
  const selectedScheduleId = searchParams.get('schedule')
  const activeSchedule = useMemo(() => {
    return items.find((it) => it.id === selectedScheduleId) || null
  }, [items, selectedScheduleId])

  // Conflict detection
  const conflicts = useMemo(() => detectScheduleConflicts(items), [items])

  const activeConflictForSelected = useMemo(() => {
    if (!activeSchedule) return undefined
    const matched = conflicts.find(
      (c) => c.itemA.id === activeSchedule.id || c.itemB.id === activeSchedule.id
    )
    return matched?.reason
  }, [activeSchedule, conflicts])

  // Current anchor date
  const currentDate = useMemo(() => new Date(selectedDate), [selectedDate])

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setDate(d.getDate() - 1)
    }
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setDate(d.getDate() + 1)
    }
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    setSelectedDate('2026-09-10')
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = it.title.toLowerCase().includes(q)
        const matchDesc = it.description?.toLowerCase().includes(q)
        const matchAgent = it.agentId?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchAgent) return false
      }
      // Type
      if (typeFilter !== 'ALL' && it.type !== typeFilter) return false
      // Status
      if (statusFilter !== 'ALL' && it.status !== statusFilter) return false
      // Agent
      if (agentFilter !== 'ALL' && it.agentId !== agentFilter) return false

      return true
    })
  }, [items, searchQuery, typeFilter, statusFilter, agentFilter])

  // Modal open / close
  const handleSelectSchedule = (item: ScheduleItem) => {
    const next = new URLSearchParams(searchParams)
    next.set('schedule', item.id)
    setSearchParams(next)
  }

  const handleCloseDetailModal = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('schedule')
    setSearchParams(next)
  }

  const handleCreateNew = () => {
    setEditingItem(null)
    setIsEditorOpen(true)
  }

  const handleEditDraft = (item: ScheduleItem) => {
    setEditingItem(item)
    setIsEditorOpen(true)
  }

  const handleSaveSchedule = (data: Omit<ScheduleItem, 'id' | 'createdAt' | 'source'>) => {
    if (editingItem) {
      updateSchedule(editingItem.id, data)
    } else {
      addSchedule(data)
    }
    setIsEditorOpen(false)
    setEditingItem(null)
  }

  // Header stats
  const scheduledCount = items.filter((i) => i.status === 'SCHEDULED').length
  const recurringCount = items.filter((i) => i.type === 'RECURRING_JOB').length

  const monthYearLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Schedule"
        description="Plan agent work, reminders, recurring jobs, and operational events."
        actions={
          <Button
            size="xs"
            onClick={handleCreateNew}
            className="bg-interactive text-interactive-foreground hover:bg-interactive-hover gap-1.5 font-mono-tech text-xs min-h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            New Schedule
          </Button>
        }
      />

      {/* Advisory Conflict Banner */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs font-mono-tech flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold uppercase block">
                Advisory: {conflicts.length} Potential Schedule {conflicts.length === 1 ? 'Conflict' : 'Conflicts'} Detected
              </span>
              <span className="opacity-90">
                {conflicts[0].reason}. Multi-tasking or staggered scheduling recommended.
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 shrink-0">
            Advisory Only
          </span>
        </div>
      )}

      {/* Operational Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border bg-surface">
          <span className="text-[10px] font-mono-tech text-text-muted uppercase block">
            Scheduled Items
          </span>
          <span className="text-base font-semibold text-text-primary font-mono-tech mt-0.5 block">
            {scheduledCount}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-surface">
          <span className="text-[10px] font-mono-tech text-text-muted uppercase block">
            Recurring Jobs
          </span>
          <span className="text-base font-semibold text-text-primary font-mono-tech mt-0.5 block">
            {recurringCount}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-surface">
          <span className="text-[10px] font-mono-tech text-text-muted uppercase block">
            Advisory Conflicts
          </span>
          <span className="text-base font-semibold text-status-warning font-mono-tech mt-0.5 block">
            {conflicts.length}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border bg-surface">
          <span className="text-[10px] font-mono-tech text-text-muted uppercase block">
            Next Job
          </span>
          <span className="text-xs font-semibold text-text-primary font-mono-tech mt-1 block truncate">
            09:00 Daily Marketing
          </span>
        </div>
      </div>

      {/* Controls & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-xl border border-border bg-surface">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={handleToday}
            className="border-border text-xs font-mono-tech min-h-8"
          >
            Today
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-md bg-surface-subtle p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handlePrev}
              className="text-text-secondary hover:text-text-primary h-7 w-7"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleNext}
              className="text-text-secondary hover:text-text-primary h-7 w-7"
              aria-label="Next period"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-sm font-semibold font-mono-tech text-text-primary ml-1">
            {monthYearLabel}
          </span>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-40 sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <Input
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-surface-subtle border-border font-mono-tech"
            />
          </div>

          {/* Dynamic Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="h-8 px-2 rounded-md bg-surface-subtle border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
          >
            <option value="ALL">All Agents</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.definition.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-8 px-2 rounded-md bg-surface-subtle border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech hidden sm:block"
          >
            <option value="ALL">All Types</option>
            <option value="TASK">Tasks</option>
            <option value="RECURRING_JOB">Recurring Jobs</option>
            <option value="REMINDER">Reminders</option>
            <option value="CONTENT">Content</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="EVENT">Events</option>
          </select>

          {/* View Mode Buttons */}
          <div className="flex items-center border border-border rounded-md bg-surface-subtle p-0.5">
            {(['month', 'week', 'day', 'agenda'] as ScheduleViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-xs font-mono-tech capitalize rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-surface text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div>
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            items={filteredItems}
            onSelectSchedule={handleSelectSchedule}
            onSelectDate={(d) => {
              setSelectedDate(d)
              setViewMode('day')
            }}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            items={filteredItems}
            onSelectSchedule={handleSelectSchedule}
            onSelectDate={(d) => {
              setSelectedDate(d)
              setViewMode('day')
            }}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            items={filteredItems}
            onSelectSchedule={handleSelectSchedule}
          />
        )}
        {viewMode === 'agenda' && (
          <AgendaView
            items={filteredItems}
            onSelectSchedule={handleSelectSchedule}
          />
        )}
      </div>

      {/* Schedule Detail Modal */}
      <ScheduleDetailModal
        schedule={activeSchedule}
        isOpen={Boolean(activeSchedule)}
        onClose={handleCloseDetailModal}
        onEditDraft={handleEditDraft}
        onNavigateAgent={(agId) => openAgentDetail(agId)}
        conflictReason={activeConflictForSelected}
      />

      {/* Schedule Editor Modal */}
      <ScheduleEditorModal
        isOpen={isEditorOpen}
        initialItem={editingItem}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSaveSchedule}
      />
    </div>
  )
}
