import React, { useState } from 'react'
import {
  ShieldAlert,
  Bot,
  CheckSquare,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { DetailSection } from './DetailSection'
import { MetadataGrid } from './MetadataGrid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ApprovalRiskBadge } from '@/components/shared/ApprovalRiskBadge'
import { ApprovalStateBadge } from '@/components/shared/ApprovalStateBadge'
import { ApproveConfirmDialog } from '@/features/approvals/components/ApproveConfirmDialog'
import { RejectConfirmDialog } from '@/features/approvals/components/RejectConfirmDialog'
import type { ApprovalProjection } from '@/types/approval'
import type { AgentProjection } from '@/types/agent'
import type { TaskProjection } from '@/types/task'

export interface ApprovalDetailModalProps {
  approval: ApprovalProjection | null;
  agent?: AgentProjection | null;
  task?: TaskProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string, reason?: string) => Promise<unknown>;
  onReject?: (id: string, reason: string) => Promise<unknown>;
  onSelectTask?: (taskId: string) => void;
  onSelectAgent?: (agentId: string) => void;
}

export const ApprovalDetailModal: React.FC<ApprovalDetailModalProps> = ({
  approval,
  agent,
  task,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSelectTask,
  onSelectAgent,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'context' | 'audit'>('review')
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false)
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false)
  const [decisionState, setDecisionState] = useState<'idle' | 'submitting' | 'confirmed' | 'failed'>('idle')
  const [decisionError, setDecisionError] = useState<string | null>(null)

  if (!approval) return null

  const isPending = approval.state === 'PENDING'
  const isCriticalOrHigh = approval.risk === 'CRITICAL' || approval.risk === 'HIGH'

  const handleApproveClick = () => {
    if (!isPending || decisionState === 'submitting') return
    if (isCriticalOrHigh) {
      setIsApproveConfirmOpen(true)
    } else {
      executeApprove()
    }
  }

  const executeApprove = async () => {
    if (!onApprove) return
    try {
      setDecisionState('submitting')
      setDecisionError(null)
      await onApprove(approval.id)
      setDecisionState('confirmed')
      setIsApproveConfirmOpen(false)
    } catch (err: unknown) {
      setDecisionState('failed')
      setIsApproveConfirmOpen(false)
      setDecisionError(err instanceof Error ? err.message : 'Failed to approve request')
    }
  }

  const executeReject = async (reason: string) => {
    if (!onReject) return
    try {
      setDecisionState('submitting')
      setDecisionError(null)
      await onReject(approval.id, reason)
      setDecisionState('confirmed')
      setIsRejectConfirmOpen(false)
    } catch (err: unknown) {
      setDecisionState('failed')
      setIsRejectConfirmOpen(false)
      setDecisionError(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-muted">Type: {approval.actionType}</span>
      {approval.expiresAt && (
        <>
          <span>•</span>
          <span className="font-mono-tech text-text-muted">
            Expires: {new Date(approval.expiresAt).toLocaleTimeString()}
          </span>
        </>
      )}
    </div>
  )

  const extraActions = isPending && (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="xs"
        disabled={decisionState === 'submitting'}
        onClick={() => setIsRejectConfirmOpen(true)}
        className="min-h-8 font-mono-tech text-[11px]"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Reject
      </Button>
      <Button
        size="xs"
        disabled={decisionState === 'submitting'}
        onClick={handleApproveClick}
        className="bg-interactive text-interactive-foreground hover:bg-interactive-hover min-h-8 font-mono-tech text-[11px]"
      >
        {decisionState === 'submitting' ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckCircle2 className="h-3 w-3 mr-1" />
        )}
        Approve Gate
      </Button>
    </div>
  )

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={`Approval Gate: ${approval.title}`}
        size="default"
      >
        <DetailHeader
          title={approval.title}
          subtitle={subtitle}
          icon={<ShieldAlert className="h-5 w-5" />}
          idToCopy={approval.id}
          badge={
            <div className="flex items-center gap-1.5">
              <ApprovalRiskBadge risk={approval.risk} />
              <ApprovalStateBadge state={approval.state} />
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
                value="review"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Request Review
              </TabsTrigger>
              <TabsTrigger
                value="context"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Operation Context
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
              >
                Decision & Audit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {decisionError && (
              <div className="p-3 rounded-lg border border-status-danger/40 bg-status-danger/10 text-status-danger text-xs font-mono-tech flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            {/* 1. REVIEW TAB */}
            <TabsContent value="review" className="m-0 space-y-4 focus-visible:outline-none">
              <DetailSection title="Action Summary">
                <p className="text-xs text-text-primary leading-relaxed p-3 rounded-lg border border-border bg-surface-subtle">
                  {approval.description || 'No description provided.'}
                </p>
              </DetailSection>

              <MetadataGrid
                columns={2}
                items={[
                  { label: 'Risk Assessment', value: approval.risk, hint: `${approval.actionType} category` },
                  { label: 'Requested At', value: new Date(approval.requestedAt).toLocaleString() },
                  { label: 'Expiration', value: approval.expiresAt ? new Date(approval.expiresAt).toLocaleString() : 'Never' },
                  { label: 'Version / Rev', value: `${approval.version ?? 1} (rev ${approval.revision ?? 1})` },
                ]}
              />

              {/* Related Task Section */}
              {task && (
                <DetailSection title="Originating Task">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="h-4 w-4 text-interactive" />
                      <div>
                        <div className="font-semibold text-xs text-text-primary">{task.title}</div>
                        <div className="text-[10px] font-mono-tech text-text-muted">
                          State: {task.state} • Priority: {task.priority}
                        </div>
                      </div>
                    </div>
                    {onSelectTask && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onSelectTask(task.id)}
                        className="text-interactive hover:text-interactive-hover font-mono-tech text-xs gap-1"
                      >
                        Inspect Task
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Requesting Agent */}
              {agent && (
                <DetailSection title="Requesting Agent">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                    <div className="flex items-center gap-2.5">
                      <Bot className="h-4 w-4 text-interactive" />
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
                        View Agent
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DetailSection>
              )}
            </TabsContent>

            {/* 2. CONTEXT TAB */}
            <TabsContent value="context" className="m-0 space-y-4 focus-visible:outline-none">
              <DetailSection title="Parameters & Payload Context">
                {approval.preview?.fields && Object.keys(approval.preview.fields).length > 0 ? (
                  <pre className="text-[11px] font-mono-tech p-3 rounded-lg border border-border bg-surface-subtle overflow-x-auto text-text-secondary">
                    {JSON.stringify(approval.preview.fields, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-text-muted italic p-3 rounded-lg border border-border bg-surface-subtle">
                    {approval.preview?.summary || 'No contextual preview payload attached to this approval.'}
                  </p>
                )}
              </DetailSection>
            </TabsContent>

            {/* 3. AUDIT TAB */}
            <TabsContent value="audit" className="m-0 space-y-4 focus-visible:outline-none">
              <MetadataGrid
                columns={2}
                items={[
                  { label: 'Decision State', value: approval.state },
                  { label: 'Decision Maker', value: approval.decision?.decisionMaker || 'Pending assignment' },
                  { label: 'Decision Time', value: approval.decision?.decidedAt ? new Date(approval.decision.decidedAt).toLocaleString() : 'Not decided yet' },
                  { label: 'Reason / Note', value: approval.decision?.reason || 'No rationale recorded' },
                ]}
              />
            </TabsContent>
          </div>
        </Tabs>
      </ModalShell>

      {/* Confirmation Dialogs */}
      <ApproveConfirmDialog
        isOpen={isApproveConfirmOpen}
        approval={approval}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={executeApprove}
        isSubmitting={decisionState === 'submitting'}
      />

      <RejectConfirmDialog
        isOpen={isRejectConfirmOpen}
        approval={approval}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={executeReject}
        isSubmitting={decisionState === 'submitting'}
      />
    </>
  )
}
