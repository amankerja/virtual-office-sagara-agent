import React from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ApprovalRisk, ApprovalActionType, ApprovalState } from '@/types/approval'

interface ApprovalFiltersProps {
  search: string
  onSearchChange: (value: string) => void

  selectedRisk: string
  onRiskChange: (risk: string) => void

  selectedActionType: string
  onActionTypeChange: (actionType: string) => void

  selectedState: string
  onStateChange: (state: string) => void

  onResetFilters: () => void
}

const RISK_OPTIONS: { label: string; value: ApprovalRisk | 'ALL' }[] = [
  { label: 'All Risks', value: 'ALL' },
  { label: 'Critical Risk', value: 'CRITICAL' },
  { label: 'High Risk', value: 'HIGH' },
  { label: 'Medium Risk', value: 'MEDIUM' },
  { label: 'Low Risk', value: 'LOW' },
]

const ACTION_TYPE_OPTIONS: { label: string; value: ApprovalActionType | 'ALL' }[] = [
  { label: 'All Action Types', value: 'ALL' },
  { label: 'Send Email', value: 'SEND_EMAIL' },
  { label: 'Post Content', value: 'POST_CONTENT' },
  { label: 'Write External', value: 'WRITE_EXTERNAL' },
  { label: 'Delete External', value: 'DELETE_EXTERNAL' },
  { label: 'Execute Code', value: 'EXECUTE_CODE' },
  { label: 'Infrastructure Change', value: 'INFRASTRUCTURE_CHANGE' },
  { label: 'Financial Action', value: 'FINANCIAL_ACTION' },
]

const STATE_OPTIONS: { label: string; value: ApprovalState | 'ALL' }[] = [
  { label: 'All States', value: 'ALL' },
  { label: 'Pending Review', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Failed', value: 'FAILED' },
]

export const ApprovalFilters: React.FC<ApprovalFiltersProps> = ({
  search,
  onSearchChange,
  selectedRisk,
  onRiskChange,
  selectedActionType,
  onActionTypeChange,
  selectedState,
  onStateChange,
  onResetFilters,
}) => {
  const isFiltered =
    search.trim() !== '' ||
    selectedRisk !== 'ALL' ||
    selectedActionType !== 'ALL' ||
    selectedState !== 'ALL'

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, ID, agent, task, or target..."
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

        {isFiltered && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onResetFilters}
            className="text-text-secondary hover:text-text-primary text-xs h-8 px-2 gap-1 self-end md:self-auto"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={selectedRisk}
          aria-label="Filter by risk assessment"
          onChange={(e) => onRiskChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {RISK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Risk: {opt.label}
            </option>
          ))}
        </select>

        <select
          value={selectedActionType}
          aria-label="Filter by action category"
          onChange={(e) => onActionTypeChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {ACTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Action: {opt.label}
            </option>
          ))}
        </select>

        <select
          value={selectedState}
          aria-label="Filter by decision state"
          onChange={(e) => onStateChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              State: {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
