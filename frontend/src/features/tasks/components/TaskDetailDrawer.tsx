import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TaskStateBadge } from '@/components/shared/TaskStateBadge'
import { TaskPriorityBadge } from '@/components/shared/TaskPriorityBadge'
import { mapStateToKanbanColumn, KANBAN_COLUMNS } from '@/types/task'
import type { TaskProjection } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import type { ApprovalProjection } from '@/types/approval'
import {
  Send,
  ShieldAlert,
  Bot,
  Layers,
  Clock,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailDrawerProps {
  task: TaskProjection | null
  agent: AgentProjection | null
  skills: SkillProjection[]
  approvals: ApprovalProjection[]
  isOpen: boolean
  onClose: () => void
  onPrepareDispatch: (task: TaskProjection) => void
  onReviewApproval: (approvalId: string) => void
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  agent,
  approvals,
  isOpen,
  onClose,
  onPrepareDispatch,
  onReviewApproval,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'execution' | 'approvals' | 'activity' | 'result'>('overview')
  const [copied, setCopied] = useState(false)

  if (!task) return null

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(task.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const kanbanColumn = KANBAN_COLUMNS.find((c) => c.id === mapStateToKanbanColumn(task.state))
  const isAwaitingApproval = task.state === 'AWAITING_APPROVAL'
  const canDispatch = ['DRAFT', 'READY'].includes(task.state)

  const relatedApprovals = approvals.filter(
    (a) => a.taskId === task.id || (task.approvalIds && task.approvalIds.includes(a.id))
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-150 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono-tech text-xs text-text-muted">{task.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                  title="Copy Task ID"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
                <TaskPriorityBadge priority={task.priority} />
                <TaskStateBadge state={task.state} />
              </div>

              <SheetTitle className="text-base font-bold text-text-primary tracking-tight leading-snug">
                {task.title}
              </SheetTitle>

              <SheetDescription className="text-xs text-text-secondary mt-1 flex items-center gap-2 flex-wrap font-mono-tech">
                <span>Stage: {kanbanColumn?.label}</span>
                <span>•</span>
                {agent ? (
                  <Link
                    to={`/agents?agent=${agent.id}`}
                    className="text-interactive hover:underline inline-flex items-center gap-1"
                  >
                    <Bot className="h-3 w-3" />
                    {agent.definition.name}
                  </Link>
                ) : (
                  <span className="text-text-muted italic">Unassigned</span>
                )}
              </SheetDescription>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {canDispatch && (
                <Button
                  type="button"
                  variant="default"
                  size="xs"
                  onClick={() => onPrepareDispatch(task)}
                  className="h-8 px-3 text-xs font-mono-tech"
                >
                  <Send className="h-3 w-3 mr-1.5" />
                  Prepare Dispatch
                </Button>
              )}

              {isAwaitingApproval && relatedApprovals.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onReviewApproval(relatedApprovals[0].id)}
                  className="h-8 px-3 text-xs font-mono-tech border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                  Review Approval
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-4 sm:px-5 border-b border-border bg-surface shrink-0">
            <TabsList className="bg-transparent h-10 p-0 gap-4">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="execution"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Execution
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Approvals {relatedApprovals.length > 0 && `(${relatedApprovals.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Activity {task.timeline && `(${task.timeline.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="result"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Result
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 1. OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                  Description
                </span>
                <p className="text-xs text-text-primary leading-relaxed p-3 rounded-lg border border-border bg-surface-subtle">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              {/* Definition Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-[10px] text-text-muted uppercase block">Created At</span>
                  <span className="text-text-primary font-medium mt-0.5 block">
                    {new Date(task.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface">
                  <span className="text-[10px] text-text-muted uppercase block">Target Due Date</span>
                  <span className="text-text-primary font-medium mt-0.5 block">
                    {task.dueAt ? new Date(task.dueAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              {/* Assigned Agent Card */}
              <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                  Assigned Worker
                </span>
                {agent ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-interactive/10 border border-interactive/20 flex items-center justify-center text-interactive">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-text-primary">
                          {agent.definition.name}
                        </div>
                        <div className="text-[10px] font-mono-tech text-text-muted">
                          {agent.definition.role} • Status: {agent.runtime.state}
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/agents?agent=${agent.id}`}
                      className="text-xs font-mono-tech text-interactive hover:underline inline-flex items-center gap-1"
                    >
                      View Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted italic flex items-center justify-between">
                    <span>Task currently unassigned in planning backlog.</span>
                  </div>
                )}
              </div>

              {/* Capabilities & Skills Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                  Skills & Capabilities
                </span>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] font-mono-tech text-text-muted block mb-1.5">
                      REQUESTED SKILLS (OPERATOR PREFERENCE)
                    </span>
                    {task.requestedSkills && task.requestedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {task.requestedSkills.map((sk) => (
                          <Link
                            key={sk}
                            to={`/skills?skill=${sk}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tech bg-surface-subtle border border-border text-text-primary hover:border-interactive hover:text-interactive transition-colors"
                          >
                            <Layers className="h-3 w-3" />
                            {sk}
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5 text-text-muted" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">No specific skills requested.</span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] font-mono-tech text-text-muted block mb-1.5">
                      CAPABILITY REQUIREMENTS (CONTRACT SPECIFICATION)
                    </span>
                    {task.capabilityRequirements && task.capabilityRequirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {task.capabilityRequirements.map((cap) => (
                          <span
                            key={cap}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tech bg-interactive/10 border border-interactive/30 text-interactive"
                          >
                            REQ: {cap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">No strict capability constraints registered.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cross-entity Deep Links */}
              <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                  Related Operational Telemetry
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tech">
                  {task.sessionId ? (
                    <Link
                      to={`/runtime?tab=sessions&session=${task.sessionId}`}
                      className="p-2.5 rounded-md border border-border bg-surface-subtle hover:bg-surface-hover flex items-center justify-between text-text-primary hover:text-interactive"
                    >
                      <span className="truncate">Session: {task.sessionId}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                    </Link>
                  ) : (
                    <div className="p-2.5 rounded-md border border-dashed border-border text-text-muted text-[11px]">
                      No active runtime session
                    </div>
                  )}

                  {task.delegationIds && task.delegationIds.length > 0 ? (
                    <Link
                      to={`/runtime?tab=delegations&delegation=${task.delegationIds[0]}`}
                      className="p-2.5 rounded-md border border-border bg-surface-subtle hover:bg-surface-hover flex items-center justify-between text-text-primary hover:text-interactive"
                    >
                      <span className="truncate">Delegation: {task.delegationIds[0]}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                    </Link>
                  ) : (
                    <div className="p-2.5 rounded-md border border-dashed border-border text-text-muted text-[11px]">
                      No active delegations
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 2. EXECUTION TAB */}
            <TabsContent value="execution" className="mt-0 space-y-4">
              {!task.sessionId && ['DRAFT', 'READY'].includes(task.state) ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-text-muted">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase font-mono-tech">
                      Not Dispatched
                    </h4>
                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                      This task has not yet been dispatched to the Hermes execution runtime.
                      Review requirements and prepare dispatch to execute.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="xs"
                    onClick={() => onPrepareDispatch(task)}
                    className="text-xs font-mono-tech h-8 px-3"
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    Prepare Dispatch Review
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Execution State Strip */}
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono-tech text-text-muted uppercase">
                        Current Execution Phase
                      </span>
                      <TaskStateBadge state={task.state} />
                    </div>

                    {task.progress && (
                      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                        <div className="flex items-center justify-between text-xs font-mono-tech">
                          <span className="text-text-secondary">{task.progress.label || 'Progress'}</span>
                          <span className="font-bold text-text-primary">
                            {task.progress.completed} / {task.progress.total}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden border border-border">
                          <div
                            className="h-full bg-interactive rounded-full transition-all"
                            style={{
                              width: `${
                                task.progress.total
                                  ? Math.round(((task.progress.completed || 0) / task.progress.total) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Runtime Session Connection */}
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                    <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                      Runtime Session Telemetry
                    </span>
                    {task.sessionId ? (
                      <div className="flex items-center justify-between p-3 rounded-md bg-surface-subtle border border-border">
                        <div>
                          <div className="text-xs font-mono-tech font-bold text-text-primary">
                            {task.sessionId}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono-tech mt-0.5">
                            Active session inspector channel
                          </div>
                        </div>
                        <Link
                          to={`/runtime?tab=sessions&session=${task.sessionId}`}
                          className="text-xs font-mono-tech text-interactive hover:underline inline-flex items-center gap-1"
                        >
                          Inspect Session
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted italic">
                        No active runtime session recorded.
                      </div>
                    )}
                  </div>

                  {/* Production Execution Policy & Telemetry */}
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                    <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                      Production Execution Policy & Telemetry
                    </span>
                    <div className="p-3 rounded-md bg-surface-subtle border border-border space-y-2 text-xs font-mono-tech">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Task class</span>
                        <span className="font-semibold text-text-primary">
                          {task.taskClass || 'REASONING_ONLY'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Execution policy</span>
                        <span className="font-semibold text-text-primary">
                          {task.executionPolicy || 'V1'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Execution mode</span>
                        <span className="font-semibold text-text-primary">
                          {task.executionMode || 'SAFE_NO_TOOLS'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Receipt</span>
                        <span className="font-semibold text-text-primary">
                          {task.receiptId || (task.sessionId ? `rcpt-${task.sessionId.slice(-8)}` : '—')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Hermes session</span>
                        <span className="font-semibold text-text-primary">
                          {task.sessionId || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Correlation</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {task.sessionId ? 'CONFIRMED' : 'None / Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 3. APPROVALS TAB */}
            <TabsContent value="approvals" className="mt-0 space-y-4">
              {relatedApprovals.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
                  No approval gates requested for this task.
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedApprovals.map((appr) => (
                    <div
                      key={appr.id}
                      className="p-3.5 rounded-lg border border-border bg-surface space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono-tech font-bold text-text-muted">
                            {appr.id}
                          </span>
                          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded-full border border-border bg-surface-subtle text-text-primary uppercase">
                            {appr.actionType}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase font-semibold',
                            appr.state === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-600/30'
                              : appr.state === 'APPROVED'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-600/30'
                                : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-600/30'
                          )}
                        >
                          {appr.state}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-text-primary">{appr.title}</h4>
                        {appr.description && (
                          <p className="text-[11px] text-text-secondary mt-1">{appr.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2 text-xs font-mono-tech">
                        <span className="text-text-muted text-[10px]">
                          Target: {appr.target?.label || 'External Resource'}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => onReviewApproval(appr.id)}
                          className="h-6 px-2 text-[10px] text-interactive border-border bg-surface-subtle"
                        >
                          Review in Center
                          <ExternalLink className="h-2.5 w-2.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 4. ACTIVITY TAB */}
            <TabsContent value="activity" className="mt-0 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-text-primary font-mono-tech">Local Lifecycle Timeline</span>
                <Link
                  to="/activity?tab=events"
                  className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-interactive hover:underline"
                >
                  <span>View Global Activity</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {(!task.timeline || task.timeline.length === 0) ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {task.timeline.map((evt) => (
                    <div key={evt.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-surface bg-interactive shrink-0" />

                      <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-mono-tech font-semibold text-text-primary uppercase tracking-wider">
                            {evt.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono-tech text-text-muted flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {evt.actor && (
                          <div className="text-[11px] font-mono-tech text-interactive">
                            Actor: {evt.actor}
                          </div>
                        )}
                        {evt.detail && (
                          <p className="text-xs text-text-secondary leading-relaxed pt-0.5">
                            {evt.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 5. RESULT TAB */}
            <TabsContent value="result" className="mt-0 space-y-4">
              {task.state === 'COMPLETED' && task.result ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-emerald-600/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-mono-tech text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Execution Succeeded</span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed">
                      {task.result.summary}
                    </p>
                    {task.result.completedAt && (
                      <div className="text-[10px] font-mono-tech text-text-muted pt-1">
                        Completed at: {new Date(task.result.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Artifacts List */}
                  {task.result.artifacts && task.result.artifacts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                        Generated Artifacts ({task.result.artifacts.length})
                      </span>
                      <div className="space-y-1.5">
                        {task.result.artifacts.map((art) => (
                          <div
                            key={art.id}
                            className="p-2.5 rounded-md border border-border bg-surface flex items-center justify-between text-xs font-mono-tech"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCode className="h-3.5 w-3.5 text-text-muted shrink-0" />
                              <span className="font-semibold text-text-primary truncate">{art.name}</span>
                            </div>
                            <span className="text-text-muted text-[10px] shrink-0 ml-2">
                              {art.size || art.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : task.state === 'FAILED' && task.failure ? (
                <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 space-y-2 text-rose-800 dark:text-rose-300">
                  <div className="flex items-center gap-2 font-mono-tech text-xs font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Execution Failed: {task.failure.code || 'UNKNOWN_ERROR'}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{task.failure.message}</p>
                  {task.failure.stage && (
                    <div className="text-[10px] font-mono-tech text-rose-700 dark:text-rose-400">
                      Failure stage: {task.failure.stage}
                    </div>
                  )}
                </div>
              ) : task.state === 'BLOCKED' && task.failure ? (
                <div className="p-4 rounded-lg border border-yellow-600/30 bg-yellow-500/10 space-y-2 text-yellow-800 dark:text-yellow-300">
                  <div className="flex items-center gap-2 font-mono-tech text-xs font-bold">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Execution Blocked: {task.failure.code}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{task.failure.message}</p>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
                  No final result available. Task is currently {task.state.toLowerCase()}.
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
