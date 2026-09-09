import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Sparkles } from 'lucide-react'
import { ApprovalSummary } from '@/features/approvals/components/ApprovalSummary'
import { ApprovalFilters } from '@/features/approvals/components/ApprovalFilters'
import { ApprovalQueue } from '@/features/approvals/components/ApprovalQueue'
import { ApprovalHistory } from '@/features/approvals/components/ApprovalHistory'
import { ApprovalDetailDrawer } from '@/features/approvals/components/ApprovalDetailDrawer'
import {
  useApprovals,
  useAgents,
  useTasks,
  useApproveAction,
  useRejectAction,
} from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import type { ApprovalProjection, ApprovalQuery } from '@/types/approval'

export const ApprovalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // URL state
  const selectedApprovalId = searchParams.get('approval')
  const urlRisk = searchParams.get('risk') || 'ALL'
  const urlActionType = searchParams.get('actionType') || 'ALL'
  const urlState = searchParams.get('state') || 'ALL'

  // Local filter states
  const [search, setSearch] = useState('')

  // Build query filters
  const queryFilters: ApprovalQuery = useMemo(
    () => ({
      search: search.trim() || undefined,
      risk: urlRisk as ApprovalQuery['risk'],
      actionType: urlActionType as ApprovalQuery['actionType'],
      state: urlState as ApprovalQuery['state'],
    }),
    [search, urlRisk, urlActionType, urlState]
  )

  // Queries
  const {
    data: approvals = [],
    isLoading: approvalsLoading,
    error: approvalsError,
    refetch: refetchApprovals,
  } = useApprovals(queryFilters)

  const { data: agents = [] } = useAgents()
  const { data: tasks = [] } = useTasks()

  // Mutations
  const approveMutation = useApproveAction()
  const rejectMutation = useRejectAction()

  // Find active selected approval
  const selectedApproval = useMemo(
    () => approvals.find((a) => a.id === selectedApprovalId) || null,
    [approvals, selectedApprovalId]
  )

  const assignedAgent = useMemo(() => {
    if (!selectedApproval?.agentId) return null
    return agents.find((a) => a.id === selectedApproval.agentId) || null
  }, [selectedApproval, agents])

  const associatedTask = useMemo(() => {
    if (!selectedApproval?.taskId) return null
    return tasks.find((t) => t.id === selectedApproval.taskId) || null
  }, [selectedApproval, tasks])

  // Navigation handlers
  const handleSelectApproval = (approval: ApprovalProjection) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('approval', approval.id)
      return next
    })
  }

  const handleCloseDetailDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('approval')
      return next
    })
  }

  const handleRiskChange = (risk: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (risk === 'ALL') next.delete('risk')
      else next.set('risk', risk)
      return next
    })
  }

  const handleActionTypeChange = (actionType: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (actionType === 'ALL') next.delete('actionType')
      else next.set('actionType', actionType)
      return next
    })
  }

  const handleStateChange = (state: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (state === 'ALL') next.delete('state')
      else next.set('state', state)
      return next
    })
  }

  const handleResetFilters = () => {
    setSearch('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      const currentAppr = prev.get('approval')
      if (currentAppr) next.set('approval', currentAppr)
      return next
    })
  }

  // Pessimistic Approval Action
  const handleApprove = async (id: string, reason?: string) => {
    await approveMutation.mutateAsync({ id, input: { reason } })
  }

  // Pessimistic Rejection Action
  const handleReject = async (id: string, reason: string) => {
    await rejectMutation.mutateAsync({ id, input: { reason } })
  }

  if (approvalsError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Approval Center Unavailable"
          message="Unable to ingest operator approval gates from the local engine. Please retry."
          onRetry={() => refetchApprovals()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Approvals"
        description="Review and authorize sensitive actions requiring human confirmation."
        badge={
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-interactive/30 bg-interactive/10 text-interactive font-mono-tech text-[10px] gap-1"
            >
              <Sparkles className="h-3 w-3" />
              PROTOTYPE DATA
            </Badge>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchApprovals()}
            className="text-xs h-9 font-mono-tech border-border bg-surface text-text-primary hover:bg-surface-hover"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Approval Summary Strip */}
      <ApprovalSummary
        approvals={approvals}
        activeRiskFilter={urlRisk}
        onSelectRiskFilter={handleRiskChange}
        isLoading={approvalsLoading}
      />

      {/* Filters Bar */}
      <ApprovalFilters
        search={search}
        onSearchChange={setSearch}
        selectedRisk={urlRisk}
        onRiskChange={handleRiskChange}
        selectedActionType={urlActionType}
        onActionTypeChange={handleActionTypeChange}
        selectedState={urlState}
        onStateChange={handleStateChange}
        onResetFilters={handleResetFilters}
      />

      {/* Main Pending Queue Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono-tech">
              Pending Authorization Queue
            </h2>
            <p className="text-xs text-text-muted">
              Evaluated in strict risk priority order (Critical → High → Medium → Low).
            </p>
          </div>
        </div>

        <ApprovalQueue
          approvals={approvals}
          agents={agents}
          tasks={tasks}
          onSelectApproval={handleSelectApproval}
          isLoading={approvalsLoading}
        />
      </div>

      {/* Approval History Section */}
      <div className="space-y-3 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono-tech">
              Decision History & Audit Records
            </h3>
            <p className="text-[11px] text-text-muted">
              Past approved, rejected, expired, and archived requests.
            </p>
          </div>
        </div>

        <ApprovalHistory
          approvals={approvals}
          agents={agents}
          tasks={tasks}
          onSelectApproval={handleSelectApproval}
          isLoading={approvalsLoading}
        />
      </div>

      {/* Approval Detail Drawer */}
      <ApprovalDetailDrawer
        approval={selectedApproval}
        agent={assignedAgent}
        task={associatedTask}
        isOpen={Boolean(selectedApprovalId && selectedApproval)}
        onClose={handleCloseDetailDrawer}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}
