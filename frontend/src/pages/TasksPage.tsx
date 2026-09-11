import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Sparkles } from 'lucide-react'
import { TaskSummary } from '@/features/tasks/components/TaskSummary'
import { TaskFilters } from '@/features/tasks/components/TaskFilters'
import { TaskKanbanBoard } from '@/features/tasks/components/TaskKanbanBoard'
import { TaskListView } from '@/features/tasks/components/TaskListView'
import { CreateTaskDrawer } from '@/features/tasks/components/CreateTaskDrawer'
import { DispatchReviewDialog } from '@/features/tasks/components/DispatchReviewDialog'
import { TaskDetailModal } from '@/components/modal/TaskDetailModal'
import {
  useTasks,
  useAgents,
  useSkills,
  useApprovals,
  useCreateTask,
  useDispatchTask,
} from '@/api/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import type { TaskProjection, TaskQuery } from '@/types/task'

export const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // URL state
  const selectedTaskId = searchParams.get('task')
  const urlState = searchParams.get('state') || 'ALL'
  const urlPriority = searchParams.get('priority') || 'ALL'
  const urlAgent = searchParams.get('agent') || 'ALL'
  const urlAttention = searchParams.get('attention') || 'ALL'
  const urlSkill = searchParams.get('skill') || 'ALL'
  const urlView = (searchParams.get('view') as 'board' | 'list') || 'board'

  // Local filter states synced with URL
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'board' | 'list'>(urlView)

  // Drawer & Dialog states
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [dispatchTaskCandidate, setDispatchTaskCandidate] = useState<TaskProjection | null>(null)

  // Queries
  const queryFilters: TaskQuery = useMemo(
    () => ({
      search: search.trim() || undefined,
      state: urlState as TaskProjection['state'] | 'ALL',
      priority: urlPriority as TaskProjection['priority'] | 'ALL',
      agentId: urlAgent,
      attention: urlAttention as TaskQuery['attention'],
      skill: urlSkill,
    }),
    [search, urlState, urlPriority, urlAgent, urlAttention, urlSkill]
  )

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks(queryFilters)

  const { data: agents = [] } = useAgents()
  const { data: skills = [] } = useSkills()
  const { data: approvals = [] } = useApprovals()

  // Mutations
  const createTaskMutation = useCreateTask()
  const dispatchTaskMutation = useDispatchTask()

  // Derived available skills for filter
  const availableSkills = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((t) => {
      t.requestedSkills?.forEach((s) => set.add(s))
      t.capabilityRequirements?.forEach((c) => set.add(c))
    })
    return Array.from(set).sort()
  }, [tasks])

  // Active selected task projection
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  const assignedAgentForSelectedTask = useMemo(() => {
    if (!selectedTask?.assignedAgentId) return null
    return agents.find((a) => a.id === selectedTask.assignedAgentId) || null
  }, [selectedTask, agents])

  // Navigation handlers
  const handleSelectTask = (task: TaskProjection) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('task', task.id)
      return next
    })
  }

  const handleCloseDetailDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('task')
      return next
    })
  }

  const handleViewModeChange = (mode: 'board' | 'list') => {
    setViewMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('view', mode)
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

  const handlePriorityChange = (priority: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (priority === 'ALL') next.delete('priority')
      else next.set('priority', priority)
      return next
    })
  }

  const handleAgentChange = (agentId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (agentId === 'ALL') next.delete('agent')
      else next.set('agent', agentId)
      return next
    })
  }

  const handleAttentionChange = (attention: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (attention === 'ALL') next.delete('attention')
      else next.set('attention', attention)
      return next
    })
  }

  const handleSkillChange = (skill: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (skill === 'ALL') next.delete('skill')
      else next.set('skill', skill)
      return next
    })
  }

  const handleResetFilters = () => {
    setSearch('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      const currentTask = prev.get('task')
      const currentView = prev.get('view')
      if (currentTask) next.set('task', currentTask)
      if (currentView) next.set('view', currentView)
      return next
    })
  }

  const handlePrepareDispatch = (task: TaskProjection) => {
    setDispatchTaskCandidate(task)
  }

  const handleConfirmDispatch = async (taskId: string) => {
    await dispatchTaskMutation.mutateAsync(taskId)
  }

  const handleReviewApproval = (approvalId: string) => {
    navigate(`/approvals?approval=${approvalId}`)
  }

  if (tasksError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Failed to Load Task Orchestration Board"
          message="Unable to ingest active task projections. Please verify the local prototype engine or retry."
          onRetry={() => refetchTasks()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tasks"
        description="Plan, assign, monitor, and inspect work across the Sagara AI organization."
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTasks()}
              className="text-xs h-9 font-mono-tech border-border bg-surface text-text-primary hover:bg-surface-hover"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateDrawerOpen(true)}
              className="text-xs h-9 font-mono-tech"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Task
            </Button>
          </div>
        }
      />

      {/* Task Summary Strip */}
      <TaskSummary
        tasks={tasks}
        activeStateFilter={urlState}
        onSelectFilter={handleStateChange}
        isLoading={tasksLoading}
      />

      {/* Filters Bar */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        selectedState={urlState}
        onStateChange={handleStateChange}
        selectedPriority={urlPriority}
        onPriorityChange={handlePriorityChange}
        selectedAgent={urlAgent}
        onAgentChange={handleAgentChange}
        selectedAttention={urlAttention}
        onAttentionChange={handleAttentionChange}
        selectedSkill={urlSkill}
        onSkillChange={handleSkillChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        agents={agents}
        availableSkills={availableSkills}
        onResetFilters={handleResetFilters}
      />

      {/* Main Board or List View */}
      {viewMode === 'board' ? (
        <TaskKanbanBoard
          tasks={tasks}
          agents={agents}
          onSelectTask={handleSelectTask}
          onPrepareDispatch={handlePrepareDispatch}
          onReviewApproval={handleReviewApproval}
          isLoading={tasksLoading}
        />
      ) : (
        <TaskListView
          tasks={tasks}
          agents={agents}
          onSelectTask={handleSelectTask}
          onPrepareDispatch={handlePrepareDispatch}
          onReviewApproval={handleReviewApproval}
          isLoading={tasksLoading}
        />
      )}

      {/* Create Task Drawer */}
      <CreateTaskDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        agents={agents}
        skills={skills}
        onCreateTask={async (input) => {
          await createTaskMutation.mutateAsync(input)
        }}
        isSubmitting={createTaskMutation.isPending}
      />

      {/* Dispatch Review Dialog */}
      <DispatchReviewDialog
        task={dispatchTaskCandidate}
        agent={
          dispatchTaskCandidate?.assignedAgentId
            ? agents.find((a) => a.id === dispatchTaskCandidate.assignedAgentId) || null
            : null
        }
        skills={skills}
        isOpen={Boolean(dispatchTaskCandidate)}
        onClose={() => setDispatchTaskCandidate(null)}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        agent={assignedAgentForSelectedTask}
        skills={skills}
        approvals={approvals}
        isOpen={Boolean(selectedTaskId && selectedTask)}
        onClose={handleCloseDetailDrawer}
        onPrepareDispatch={handlePrepareDispatch}
        onReviewApproval={handleReviewApproval}
        onSelectAgent={(agId) => navigate(`/agents?agent=${agId}`)}
      />
    </div>
  )
}
