import React from 'react'
import type { TaskProjection } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import { TaskPriorityBadge } from '@/components/shared/TaskPriorityBadge'
import { TaskStateBadge } from '@/components/shared/TaskStateBadge'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Send,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: TaskProjection
  assignedAgent?: AgentProjection | null
  onSelect: (task: TaskProjection) => void
  onPrepareDispatch?: (task: TaskProjection) => void
  onReviewApproval?: (approvalId: string) => void
  onMoveColumn?: (task: TaskProjection, targetState: TaskProjection['state']) => void
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignedAgent,
  onSelect,
  onPrepareDispatch,
  onReviewApproval,
}) => {
  const isAwaitingApproval = task.state === 'AWAITING_APPROVAL'
  const isBlocked = task.state === 'BLOCKED'
  const isFailed = task.state === 'FAILED'
  const isReady = task.state === 'READY'
  const isDraft = task.state === 'DRAFT'

  const hasAttention = isAwaitingApproval || isBlocked || isFailed

  const handleCardClick = () => {
    onSelect(task)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(task)
    }
  }

  const primaryApprovalId = task.approvalIds && task.approvalIds.length > 0 ? task.approvalIds[0] : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex flex-col p-3.5 rounded-lg border bg-surface transition-all text-left',
        'hover:border-border-strong hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-interactive/40 cursor-pointer',
        hasAttention
          ? isFailed
            ? 'border-rose-500/35 bg-rose-500/5 hover:border-rose-500/50'
            : isAwaitingApproval
              ? 'border-amber-500/35 bg-amber-500/5 hover:border-amber-500/50'
              : 'border-yellow-500/35 bg-yellow-500/5 hover:border-yellow-500/50'
          : 'border-border'
      )}
      aria-label={`Task ${task.id}: ${task.title}, priority ${task.priority}, state ${task.state}`}
    >
      {/* Top row: Priority & Internal State */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <TaskPriorityBadge priority={task.priority} />
          <span className="text-[10px] font-mono-tech text-text-muted">
            {task.id}
          </span>
        </div>
        <TaskStateBadge state={task.state} />
      </div>

      {/* Task Title & Description */}
      <div className="mt-2.5">
        <h4 className="text-xs font-semibold text-text-primary group-hover:text-interactive transition-colors leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Attention Callout Strip if Action Required */}
      {isAwaitingApproval && (
        <div className="mt-2.5 p-2 rounded-md bg-amber-500/10 border border-amber-600/25 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Human approval required</span>
          </div>
          {primaryApprovalId && onReviewApproval && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                onReviewApproval(primaryApprovalId)
              }}
              className="h-6 px-2 text-[10px] font-mono-tech border-amber-600/40 text-amber-800 dark:text-amber-300 bg-surface hover:bg-amber-500/10"
            >
              Review
              <ExternalLink className="ml-1 h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      )}

      {isBlocked && task.failure && (
        <div className="mt-2.5 p-2 rounded-md bg-yellow-500/10 border border-yellow-600/25 text-[11px] text-yellow-800 dark:text-yellow-300 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{task.failure.message}</span>
        </div>
      )}

      {isFailed && task.failure && (
        <div className="mt-2.5 p-2 rounded-md bg-rose-500/10 border border-rose-600/25 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{task.failure.message}</span>
        </div>
      )}

      {/* Progress Bar if active execution */}
      {task.progress && (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-text-muted">
            <span className="truncate">{task.progress.label || 'Execution progress'}</span>
            <span className="shrink-0 ml-1 font-semibold text-text-primary">
              {task.progress.completed} / {task.progress.total}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-subtle overflow-hidden border border-border">
            <div
              className="h-full bg-interactive rounded-full transition-all duration-300"
              style={{
                width: `${
                  task.progress.total && task.progress.total > 0
                    ? Math.round(((task.progress.completed || 0) / task.progress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Skills / Capabilities Chips */}
      {((task.requestedSkills && task.requestedSkills.length > 0) ||
        (task.capabilityRequirements && task.capabilityRequirements.length > 0)) && (
        <div className="mt-2.5 flex flex-wrap gap-1 items-center">
          {task.requestedSkills?.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-tech bg-surface-subtle border border-border text-text-muted"
            >
              <Layers className="h-2.5 w-2.5" />
              {skill}
            </span>
          ))}
          {task.capabilityRequirements?.map((cap) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-tech bg-interactive/10 border border-interactive/20 text-interactive"
              title="Capability Requirement"
            >
              REQ: {cap}
            </span>
          ))}
        </div>
      )}

      {/* Card Footer: Assigned Agent & Due/Age & Quick Actions */}
      <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2 text-[11px] font-mono-tech">
        {/* Agent Name or Unassigned */}
        <div className="flex items-center gap-1.5 min-w-0 text-text-secondary">
          <Bot className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="truncate">
            {assignedAgent ? (
              <span className="text-text-primary font-medium">{assignedAgent.definition.name}</span>
            ) : (
              <span className="text-text-muted italic">Unassigned</span>
            )}
          </span>
        </div>

        {/* Due Date or Dispatch Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.dueAt && (
            <span className="flex items-center gap-1 text-text-muted text-[10px]" title={`Due: ${task.dueAt}`}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}

          {(isReady || isDraft) && onPrepareDispatch && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                onPrepareDispatch(task)
              }}
              className="h-6 px-2 text-[10px] font-mono-tech text-text-primary hover:text-interactive border-border bg-surface-subtle hover:bg-surface-hover"
            >
              <Send className="h-2.5 w-2.5 mr-1" />
              Dispatch
            </Button>
          )}

          <ArrowRight className="h-3 w-3 text-text-muted group-hover:text-interactive transition-colors" />
        </div>
      </div>
    </div>
  )
}
