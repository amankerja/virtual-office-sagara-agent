import React, { useState } from 'react'
import {
  CheckSquare,
  Bot,
  Layers,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Send,
  ExternalLink,
} from 'lucide-react'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { DetailSection } from './DetailSection'
import { MetadataGrid } from './MetadataGrid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TaskStateBadge } from '@/components/shared/TaskStateBadge'
import { TaskPriorityBadge } from '@/components/shared/TaskPriorityBadge'
import { mapStateToKanbanColumn, KANBAN_COLUMNS } from '@/types/task'
import type { TaskProjection } from '@/types/task'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import type { ApprovalProjection } from '@/types/approval'

export interface TaskDetailModalProps {
  task: TaskProjection | null;
  agent?: AgentProjection | null;
  skills?: SkillProjection[];
  approvals?: ApprovalProjection[];
  isOpen: boolean;
  onClose: () => void;
  onPrepareDispatch?: (task: TaskProjection) => void;
  onReviewApproval?: (approvalId: string) => void;
  onSelectAgent?: (agentId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  agent,
  skills = [],
  approvals = [],
  isOpen,
  onClose,
  onPrepareDispatch,
  onReviewApproval,
  onSelectAgent,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'execution' | 'approvals' | 'activity' | 'result'>('overview')

  if (!task) return null

  const kanbanColumn = KANBAN_COLUMNS.find((c) => c.id === mapStateToKanbanColumn(task.state))
  const isAwaitingApproval = task.state === 'AWAITING_APPROVAL'
  const canDispatch = ['DRAFT', 'READY'].includes(task.state)

  const relatedApprovals = approvals.filter(
    (a) => a.taskId === task.id || (task.approvalIds && task.approvalIds.includes(a.id))
  )

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-muted">Column: {kanbanColumn?.label || 'Backlog'}</span>
      {task.assignedAgentId && (
        <>
          <span>•</span>
          <span className="font-mono-tech text-text-primary">Worker: {task.assignedAgentId}</span>
        </>
      )}
    </div>
  )

  const extraActions = (
    <div className="flex items-center gap-2">
      {canDispatch && onPrepareDispatch && (
        <Button
          size="xs"
          onClick={() => {
            onClose()
            onPrepareDispatch(task)
          }}
          className="bg-interactive text-interactive-foreground hover:bg-interactive-hover gap-1.5 min-h-8 font-mono-tech text-[11px]"
        >
          <Send className="h-3 w-3" />
          Dispatch
        </Button>
      )}
      {isAwaitingApproval && relatedApprovals.length > 0 && onReviewApproval && (
        <Button
          size="xs"
          variant="outline"
          onClick={() => onReviewApproval(relatedApprovals[0].id)}
          className="border-status-warning/40 text-status-warning hover:bg-status-warning/10 gap-1.5 min-h-8 font-mono-tech text-[11px]"
        >
          <ShieldAlert className="h-3 w-3" />
          Review Gate
        </Button>
      )}
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Task Details: ${task.title}`}
      size="default"
    >
      <DetailHeader
        title={task.title}
        subtitle={subtitle}
        icon={<CheckSquare className="h-5 w-5" />}
        idToCopy={task.id}
        badge={
          <div className="flex items-center gap-1.5">
            <TaskPriorityBadge priority={task.priority} />
            <TaskStateBadge state={task.state} />
          </div>
        }
        extraActions={extraActions}
        onClose={onClose}
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="px-5 sm:px-6 border-b border-border bg-surface shrink-0">
          <TabsList className="bg-transparent h-10 p-0 gap-5 w-full justify-start overflow-x-auto">
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

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 1. OVERVIEW TAB */}
          <TabsContent value="overview" className="m-0 space-y-4 focus-visible:outline-none">
            <DetailSection title="Description">
              <p className="text-xs text-text-primary leading-relaxed p-3 rounded-lg border border-border bg-surface-subtle">
                {task.description || 'No description provided.'}
              </p>
            </DetailSection>

            <MetadataGrid
              columns={2}
              items={[
                { label: 'Created At', value: new Date(task.createdAt).toLocaleString() },
                { label: 'Target Due Date', value: task.dueAt ? new Date(task.dueAt).toLocaleString() : '—' },
                { label: 'Assigned Agent ID', value: task.assignedAgentId || '—' },
                { label: 'Active Session ID', value: task.sessionId || '—' },
              ]}
            />

            {/* Assigned Worker Link */}
            <DetailSection title="Assigned Worker">
              {agent ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-interactive/10 border border-interactive/20 flex items-center justify-center text-interactive">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-text-primary">{agent.definition.name}</div>
                      <div className="text-[10px] font-mono-tech text-text-muted">
                        {agent.definition.role} • Status: {agent.runtime.state}
                      </div>
                    </div>
                  </div>
                  {onSelectAgent && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSelectAgent(agent.id)}
                      className="text-interactive hover:text-interactive-hover font-mono-tech text-xs gap-1"
                    >
                      View Profile
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic p-3 rounded-lg border border-border bg-surface-subtle">
                  No dedicated agent assigned to this task.
                </p>
              )}
            </DetailSection>

            {/* Requested Skills */}
            {task.requestedSkills && task.requestedSkills.length > 0 && (
              <DetailSection title={`Requested Skills (${task.requestedSkills.length})`}>
                <div className="flex flex-wrap gap-1.5">
                  {task.requestedSkills.map((skillId: string) => {
                    const matchedSkill = skills.find((s) => s.id === skillId)
                    return (
                      <span
                        key={skillId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border text-[11px] font-mono-tech text-text-secondary"
                      >
                        <Layers className="h-3 w-3 text-interactive" />
                        {matchedSkill ? matchedSkill.name : skillId}
                      </span>
                    )
                  })}
                </div>
              </DetailSection>
            )}
          </TabsContent>

          {/* 2. EXECUTION TAB */}
          <TabsContent value="execution" className="m-0 space-y-4 focus-visible:outline-none">
            <DetailSection title="Direct Runtime Correlation">
              <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-xs text-text-muted">Correlation Mode</span>
                  <span className="font-mono-tech text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {task.sessionId ? 'Authoritative Direct Receipt' : 'None / Pending Dispatch'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-xs text-text-muted">Hermes Session ID</span>
                  <span className="font-mono-tech text-xs font-semibold text-text-primary">
                    {task.sessionId || '—'}
                  </span>
                </div>
                {task.sessionId && (
                  <div className="pt-2 border-t border-border flex justify-end">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        window.location.href = `/runtime?session=${encodeURIComponent(task.sessionId!)}`;
                      }}
                      className="border-border text-interactive hover:bg-surface-hover font-mono-tech text-xs gap-1.5"
                    >
                      <span>Open in Runtime Monitor</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </DetailSection>

            <DetailSection title="Production Execution Policy & Telemetry">
              <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2 text-xs font-mono-tech">
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
            </DetailSection>

            <DetailSection title="Progress & Concurrency">
              <MetadataGrid
                columns={2}
                items={[
                  { label: 'State', value: task.state },
                  { label: 'Progress', value: task.progress?.label || `${task.progress?.completed ?? 0} / ${task.progress?.total ?? 0}` },
                  { label: 'Revision', value: `rev ${task.revision ?? '—'} (v${task.version ?? '—'})` },
                  { label: 'Updated At', value: task.updatedAt ? new Date(task.updatedAt).toLocaleString() : '—' },
                ]}
              />
            </DetailSection>

            {task.failure?.message && (
              <DetailSection title="Failure Diagnostic">
                <div className="p-3 rounded-lg border border-status-danger/40 bg-status-danger/10 text-status-danger text-xs font-mono-tech flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{task.failure.code || 'TASK_FAILURE'}</span>
                    <span>{task.failure.message}</span>
                  </div>
                </div>
              </DetailSection>
            )}
          </TabsContent>

          {/* 3. APPROVALS TAB */}
          <TabsContent value="approvals" className="m-0 space-y-3 focus-visible:outline-none">
            {relatedApprovals.length > 0 ? (
              relatedApprovals.map((appr) => (
                <div
                  key={appr.id}
                  className="p-3.5 rounded-lg border border-border bg-surface space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-xs font-semibold text-text-primary">
                      {appr.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono-tech px-2 py-0.5 rounded bg-surface-raised border border-border text-text-secondary">
                      {appr.risk} Risk
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{appr.description}</p>
                  {onReviewApproval && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onReviewApproval(appr.id)}
                      className="border-border text-interactive hover:bg-surface-hover font-mono-tech text-xs mt-1"
                    >
                      Inspect Gate ({appr.state}) →
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-text-muted italic p-4 text-center rounded-lg border border-border bg-surface-subtle">
                No governance approval gates associated with this task.
              </p>
            )}
          </TabsContent>

          {/* 4. ACTIVITY TAB */}
          <TabsContent value="activity" className="m-0 space-y-2 focus-visible:outline-none">
            {task.timeline && task.timeline.length > 0 ? (
              <div className="space-y-2">
                {task.timeline.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded border border-border bg-surface text-xs font-mono-tech flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-text-primary">{item.type}</span>
                      {item.detail && <span className="text-text-muted">({item.detail})</span>}
                    </div>
                    <span className="text-text-muted text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic p-4 text-center rounded-lg border border-border bg-surface-subtle">
                No activity logs available for this task yet.
              </p>
            )}
          </TabsContent>

          {/* 5. RESULT TAB */}
          <TabsContent value="result" className="m-0 space-y-3 focus-visible:outline-none">
            {task.result?.summary ? (
              <DetailSection title="Output Result Summary">
                <p className="text-xs text-text-primary p-3 rounded-lg border border-border bg-surface-subtle leading-relaxed">
                  {task.result.summary}
                </p>
              </DetailSection>
            ) : (
              <p className="text-xs text-text-muted italic p-4 text-center rounded-lg border border-border bg-surface-subtle">
                No completion result available yet.
              </p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </ModalShell>
  )
}
