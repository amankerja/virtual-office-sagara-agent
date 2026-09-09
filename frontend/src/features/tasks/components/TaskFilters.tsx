import React from 'react'
import { Search, X, LayoutGrid, ListFilter, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { TaskPriority, TaskState } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import { cn } from '@/lib/utils'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void

  selectedState: string
  onStateChange: (state: string) => void

  selectedPriority: string
  onPriorityChange: (priority: string) => void

  selectedAgent: string
  onAgentChange: (agentId: string) => void

  selectedAttention: string
  onAttentionChange: (attention: string) => void

  selectedSkill: string
  onSkillChange: (skill: string) => void

  viewMode: 'board' | 'list'
  onViewModeChange: (mode: 'board' | 'list') => void

  agents: AgentProjection[]
  availableSkills: string[]
  onResetFilters: () => void
}

const STATE_OPTIONS: { label: string; value: TaskState | 'ALL' }[] = [
  { label: 'All States', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Ready', value: 'READY' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Dispatching', value: 'DISPATCHING' },
  { label: 'Running', value: 'RUNNING' },
  { label: 'Awaiting Approval', value: 'AWAITING_APPROVAL' },
  { label: 'Blocked', value: 'BLOCKED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const PRIORITY_OPTIONS: { label: string; value: TaskPriority | 'ALL' }[] = [
  { label: 'All Priorities', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const ATTENTION_OPTIONS = [
  { label: 'All Work', value: 'ALL' },
  { label: 'Requires Approval', value: 'APPROVAL' },
  { label: 'Blocked', value: 'BLOCKED' },
  { label: 'Failed', value: 'FAILED' },
]

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  search,
  onSearchChange,
  selectedState,
  onStateChange,
  selectedPriority,
  onPriorityChange,
  selectedAgent,
  onAgentChange,
  selectedAttention,
  onAttentionChange,
  selectedSkill,
  onSkillChange,
  viewMode,
  onViewModeChange,
  agents,
  availableSkills,
  onResetFilters,
}) => {
  const isFiltered =
    search.trim() !== '' ||
    selectedState !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedAgent !== 'ALL' ||
    selectedAttention !== 'ALL' ||
    selectedSkill !== 'ALL'

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID, title, description, or assigned agent..."
            className="pl-9 pr-8 text-xs h-9 bg-surface border-border text-text-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* View Mode Toggle & Reset */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {isFiltered && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onResetFilters}
              className="text-text-secondary hover:text-text-primary text-xs h-8 px-2 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          )}

          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              title="Kanban Board view"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                viewMode === 'board'
                  ? 'bg-surface-subtle text-text-primary shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="Dense List view"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-surface-subtle text-text-primary shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* State Filter */}
        <select
          value={selectedState}
          aria-label="Filter by task state"
          onChange={(e) => onStateChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              State: {opt.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          aria-label="Filter by task priority"
          onChange={(e) => onPriorityChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Priority: {opt.label}
            </option>
          ))}
        </select>

        {/* Attention Filter */}
        <select
          value={selectedAttention}
          aria-label="Filter by attention requirement"
          onChange={(e) => onAttentionChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {ATTENTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Attention: {opt.label}
            </option>
          ))}
        </select>

        {/* Agent Filter */}
        <select
          value={selectedAgent}
          aria-label="Filter by assigned agent"
          onChange={(e) => onAgentChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech max-w-44 truncate"
        >
          <option value="ALL">Agent: All Agents</option>
          <option value="UNASSIGNED">Agent: Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.definition.name} ({agent.definition.role})
            </option>
          ))}
        </select>

        {/* Skill / Capability Filter */}
        {availableSkills.length > 0 && (
          <select
            value={selectedSkill}
            aria-label="Filter by skill requirement"
            onChange={(e) => onSkillChange(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech max-w-44 truncate"
          >
            <option value="ALL">Skill: All Skills</option>
            {availableSkills.map((sk) => (
              <option key={sk} value={sk}>
                {sk}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
