import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TaskPriority, CreateTaskInput } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import { Plus, Info, Loader2 } from 'lucide-react'

interface CreateTaskDrawerProps {
  isOpen: boolean
  onClose: () => void
  agents: AgentProjection[]
  skills: SkillProjection[]
  onCreateTask: (input: CreateTaskInput) => Promise<unknown>
  isSubmitting?: boolean
}

export const CreateTaskDrawer: React.FC<CreateTaskDrawerProps> = ({
  isOpen,
  onClose,
  agents,
  skills,
  onCreateTask,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [assignedAgentId, setAssignedAgentId] = useState<string>('')
  const [requestedSkills, setRequestedSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [capabilityRequirements, setCapabilityRequirements] = useState<string[]>([])
  const [capabilityInput, setCapabilityInput] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setAssignedAgentId('')
    setRequestedSkills([])
    setSkillInput('')
    setCapabilityRequirements([])
    setCapabilityInput('')
    setDueAt('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !requestedSkills.includes(trimmed)) {
      setRequestedSkills([...requestedSkills, trimmed])
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setRequestedSkills(requestedSkills.filter((s) => s !== skill))
  }

  const handleAddCapability = (cap: string) => {
    const trimmed = cap.trim()
    if (trimmed && !capabilityRequirements.includes(trimmed)) {
      setCapabilityRequirements([...capabilityRequirements, trimmed])
      setCapabilityInput('')
    }
  }

  const handleRemoveCapability = (cap: string) => {
    setCapabilityRequirements(capabilityRequirements.filter((c) => c !== cap))
  }

  const handleSubmit = async (initialState: 'DRAFT' | 'READY') => {
    if (!title.trim()) {
      setError('Task title is required.')
      return
    }

    try {
      setError(null)
      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        state: initialState,
        assignedAgentId: assignedAgentId || undefined,
        requestedSkills: requestedSkills.length > 0 ? requestedSkills : undefined,
        capabilityRequirements: capabilityRequirements.length > 0 ? capabilityRequirements : undefined,
        dueAt: dueAt || undefined,
      })
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task record.')
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-145 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold text-text-primary tracking-tight">
              Create New Task
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-text-secondary mt-0.5">
            Define planning parameters and capabilities. Execution requires a separate explicit dispatch.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-semibold text-text-primary font-mono-tech">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Synthesize Weekly Vulnerability Report"
              className="text-xs bg-surface border-border text-text-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-xs font-semibold text-text-primary font-mono-tech">
              Description / Objectives
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide high-level context, success criteria, and constraints..."
              className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 leading-relaxed"
            />
          </div>

          {/* Priority Selection */}
          <div className="space-y-1.5">
            <label htmlFor="task-priority" className="text-xs font-semibold text-text-primary font-mono-tech">
              Priority Level
            </label>
            <div id="task-priority" className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`p-2 rounded-lg border text-xs font-mono-tech font-semibold text-center transition-all cursor-pointer ${
                    priority === p
                      ? 'border-interactive bg-interactive/10 text-interactive ring-1 ring-interactive/30'
                      : 'border-border bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Assignment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="assign-agent" className="text-xs font-semibold text-text-primary font-mono-tech">
                Assign Agent (Optional)
              </label>
              <span className="text-[10px] font-mono-tech text-text-muted">
                {assignedAgentId ? '1 Assigned' : 'Unassigned'}
              </span>
            </div>

            <select
              id="assign-agent"
              value={assignedAgentId}
              onChange={(e) => setAssignedAgentId(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-border bg-surface text-text-primary focus:outline-hidden focus:ring-1 focus:ring-interactive/40 cursor-pointer font-mono-tech"
            >
              <option value="">Leave Unassigned (Planning Phase)</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.definition.name} — {agent.definition.role} [{agent.runtime.state}, {agent.runtime.confidence} confidence]
                </option>
              ))}
            </select>

            {/* Mandatory Safety Notice: Prompt 04 Section 20 */}
            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-start gap-2 text-[11px] text-text-muted leading-relaxed">
              <Info className="h-3.5 w-3.5 shrink-0 text-text-secondary mt-0.5" />
              <span>
                <strong>Safety Principle:</strong> Assigning an agent does not dispatch this task.
                Autonomous execution requires an explicit Dispatch flow.
              </span>
            </div>
          </div>

          {/* Requested Skills (Operator Preference) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="skill-selector" className="text-xs font-semibold text-text-primary font-mono-tech">
                Requested Skills (Operator Preference)
              </label>
              <span className="text-[10px] text-text-muted italic">Non-binding recommendation</span>
            </div>

            <div className="flex gap-1.5">
              <select
                id="skill-selector"
                value={skillInput}
                onChange={(e) => {
                  if (e.target.value) handleAddSkill(e.target.value)
                }}
                className="flex-1 h-8 px-2.5 text-xs rounded-md border border-border bg-surface text-text-primary font-mono-tech cursor-pointer"
              >
                <option value="">Select registry skill...</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>

            {requestedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {requestedSkills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono-tech bg-surface-subtle border border-border text-text-primary"
                  >
                    {sk}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk)}
                      className="text-text-muted hover:text-rose-500 ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Capability Requirements (Mandatory for Execution) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="capability-input" className="text-xs font-semibold text-text-primary font-mono-tech">
                Capability Requirements (Task Contract)
              </label>
              <span className="text-[10px] text-text-muted font-mono-tech">Required for dispatch</span>
            </div>

            <div className="flex gap-1.5">
              <Input
                id="capability-input"
                value={capabilityInput}
                onChange={(e) => setCapabilityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCapability(capabilityInput)
                  }
                }}
                placeholder="e.g., git-write-access, postgres-readonly-profile"
                className="text-xs bg-surface border-border h-8 font-mono-tech"
              />
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleAddCapability(capabilityInput)}
                className="h-8 px-2.5 text-xs font-mono-tech"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {capabilityRequirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {capabilityRequirements.map((cap) => (
                  <span
                    key={cap}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono-tech bg-interactive/10 border border-interactive/30 text-interactive"
                  >
                    REQ: {cap}
                    <button
                      type="button"
                      onClick={() => handleRemoveCapability(cap)}
                      className="text-text-muted hover:text-rose-500 ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="task-due" className="text-xs font-semibold text-text-primary font-mono-tech">
              Target Completion Date (Optional)
            </label>
            <Input
              id="task-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="text-xs bg-surface border-border text-text-primary font-mono-tech h-9"
            />
          </div>
        </div>

        {/* Footer with Explicit Actions: Prompt 04 Section 19 */}
        <SheetFooter className="p-4 sm:p-5 border-t border-border bg-surface-subtle flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting || !title.trim()}
            className="text-xs h-9 font-mono-tech"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Create Draft
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={() => handleSubmit('READY')}
            disabled={isSubmitting || !title.trim()}
            className="text-xs h-9 font-mono-tech"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Create as Ready
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
