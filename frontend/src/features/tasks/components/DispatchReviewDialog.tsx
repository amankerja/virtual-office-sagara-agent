import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TaskStateBadge } from '@/components/shared/TaskStateBadge'
import { TaskPriorityBadge } from '@/components/shared/TaskPriorityBadge'
import type { TaskProjection } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  Bot,
  Layers,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react'

interface DispatchReviewDialogProps {
  task: TaskProjection | null
  agent: AgentProjection | null
  skills: SkillProjection[]
  isOpen: boolean
  onClose: () => void
  onConfirmDispatch: (taskId: string) => Promise<unknown>
}

export const DispatchReviewDialog: React.FC<DispatchReviewDialogProps> = ({
  task,
  agent,
  skills,
  isOpen,
  onClose,
  onConfirmDispatch,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!task) return null

  // Pre-flight warning evaluation
  const warnings: { id: string; message: string; severity: 'high' | 'medium' | 'low' }[] = []

  if (!agent) {
    warnings.push({
      id: 'warn-no-agent',
      message: 'No agent assigned to this task. A worker will need to be dynamically claimed by runtime.',
      severity: 'high',
    })
  } else {
    if (agent.runtime.state === 'OFFLINE') {
      warnings.push({
        id: 'warn-agent-offline',
        message: `Assigned agent (${agent.definition.name}) is currently OFFLINE.`,
        severity: 'high',
      })
    } else if (agent.runtime.state === 'DEGRADED') {
      warnings.push({
        id: 'warn-agent-degraded',
        message: `Assigned agent (${agent.definition.name}) is currently operating with DEGRADED health.`,
        severity: 'medium',
      })
    }

    if (agent.definition.configurationState === 'INCOMPLETE') {
      warnings.push({
        id: 'warn-agent-config',
        message: `Agent profile definition is marked INCOMPLETE in configuration manifest.`,
        severity: 'high',
      })
    }
  }

  // Check requested skills against skills registry
  const skillMap = new Map(skills.map((s) => [s.id, s]))
  task.requestedSkills?.forEach((skId) => {
    const sk = skillMap.get(skId)
    if (!sk) {
      warnings.push({
        id: `warn-sk-missing-${skId}`,
        message: `Requested skill "${skId}" is not registered in the Skills Registry.`,
        severity: 'medium',
      })
    } else if (sk.health === 'degraded') {
      warnings.push({
        id: `warn-sk-degraded-${skId}`,
        message: `Requested skill "${sk.name}" has degraded health status.`,
        severity: 'low',
      })
    }
  })

  // Double-dispatch check
  const isAlreadyDispatched = ['DISPATCHING', 'RUNNING', 'COMPLETED'].includes(task.state)

  const handleDispatch = async () => {
    if (isAlreadyDispatched || isSubmitting) return

    try {
      setIsSubmitting(true)
      setError(null)
      await onConfirmDispatch(task.id)
      setIsSubmitting(false)
      onClose()
    } catch (err: unknown) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Dispatch failed.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl p-6 bg-surface border-border">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-md bg-interactive/10 text-interactive border border-interactive/25">
              <Send className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-semibold text-text-primary">
              Prepare Dispatch Review
            </DialogTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono-tech border-interactive/30 text-interactive bg-interactive/10"
            >
              PRE-FLIGHT
            </Badge>
          </div>
          <DialogDescription className="text-xs text-text-secondary mt-1">
            Review agent assignment, capability prerequisites, and system constraints before triggering autonomous execution.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-mono-tech">
            {error}
          </div>
        )}

        {/* Task Overview Box */}
        <div className="rounded-lg border border-border bg-surface-subtle p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <TaskPriorityBadge priority={task.priority} />
              <span className="font-mono-tech text-[10px] text-text-muted">{task.id}</span>
            </div>
            <TaskStateBadge state={task.state} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-text-primary">{task.title}</h4>
            {task.description && (
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Assignment & Capabilities Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Assigned Agent */}
          <div className="p-3 rounded-lg border border-border bg-surface space-y-1.5">
            <span className="text-[10px] font-mono-tech text-text-muted uppercase tracking-wider block">
              Assigned Worker
            </span>
            {agent ? (
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-interactive shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary truncate">{agent.definition.name}</div>
                  <div className="text-[10px] text-text-muted truncate">
                    {agent.definition.role} • {agent.runtime.state}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-text-muted italic text-xs">No agent assigned</span>
            )}
          </div>

          {/* Requested Skills */}
          <div className="p-3 rounded-lg border border-border bg-surface space-y-1.5">
            <span className="text-[10px] font-mono-tech text-text-muted uppercase tracking-wider block">
              Skills & Capabilities
            </span>
            <div className="flex flex-wrap gap-1">
              {task.requestedSkills && task.requestedSkills.length > 0 ? (
                task.requestedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-tech bg-surface-subtle border border-border text-text-muted"
                  >
                    <Layers className="h-2.5 w-2.5" />
                    {sk}
                  </span>
                ))
              ) : (
                <span className="text-text-muted text-[10px] italic">No specific skills requested</span>
              )}
            </div>
          </div>
        </div>

        {/* Pre-flight Warnings / Diagnostics */}
        {warnings.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 font-mono-tech">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pre-Flight Diagnostic Warnings ({warnings.length})
            </span>
            <div className="space-y-1.5">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="p-2.5 rounded-lg border border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2"
                >
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span className="leading-snug">{w.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>All pre-flight checks passed. Task is ready for autonomous worker dispatch.</span>
          </div>
        )}

        {/* Policy Safeguard Notice: Production Execution Safety */}
        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center gap-2 text-[11px] text-text-muted">
          <Info className="h-3.5 w-3.5 shrink-0 text-interactive" />
          <span>Execution Policy V3 active — dispatch operates under strict safety gates and approval requirements.</span>
        </div>

        {/* Footer: Explicit Dispatch Button with Double-Click Protection */}
        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleDispatch}
            disabled={isAlreadyDispatched || isSubmitting}
            className="text-xs h-9 font-mono-tech"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Dispatching...
              </>
            ) : isAlreadyDispatched ? (
              'Already Dispatched'
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Dispatch Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
