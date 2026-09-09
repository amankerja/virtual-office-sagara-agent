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
import { ApprovalRiskBadge } from '@/components/shared/ApprovalRiskBadge'
import { ApprovalStateBadge } from '@/components/shared/ApprovalStateBadge'
import { ApproveConfirmDialog } from './ApproveConfirmDialog'
import { RejectConfirmDialog } from './RejectConfirmDialog'
import type { ApprovalProjection } from '@/types/approval'
import type { AgentProjection } from '@/types/agent'
import type { TaskProjection } from '@/types/task'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bot,
  CheckSquare,
  Globe,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Lock,
  Copy,
  Check,
} from 'lucide-react'

interface ApprovalDetailDrawerProps {
  approval: ApprovalProjection | null
  agent: AgentProjection | null
  task: TaskProjection | null
  isOpen: boolean
  onClose: () => void
  onApprove: (id: string, reason?: string) => Promise<unknown>
  onReject: (id: string, reason: string) => Promise<unknown>
}

export const ApprovalDetailDrawer: React.FC<ApprovalDetailDrawerProps> = ({
  approval,
  agent,
  task,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'context' | 'audit'>('review')
  const [copied, setCopied] = useState(false)

  // Dialog state
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false)
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false)

  // Mutation status states: 'idle' | 'submitting' | 'confirmed' | 'failed'
  const [decisionState, setDecisionState] = useState<'idle' | 'submitting' | 'confirmed' | 'failed'>('idle')
  const [decisionError, setDecisionError] = useState<string | null>(null)

  if (!approval) return null

  const isPending = approval.state === 'PENDING'
  const isExpired = approval.state === 'EXPIRED'
  const isCriticalOrHigh = approval.risk === 'CRITICAL' || approval.risk === 'HIGH'

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(approval.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle Approve button click
  const handleApproveClick = () => {
    if (!isPending || decisionState === 'submitting') return
    if (isCriticalOrHigh) {
      setIsApproveConfirmOpen(true)
    } else {
      executeApprove()
    }
  }

  // Execute Approve mutation
  const executeApprove = async () => {
    try {
      setDecisionState('submitting')
      setDecisionError(null)
      await onApprove(approval.id)
      setDecisionState('confirmed')
      setIsApproveConfirmOpen(false)
    } catch (err: unknown) {
      setDecisionState('failed')
      setIsApproveConfirmOpen(false)
      setDecisionError(
        err instanceof Error
          ? err.message
          : 'Decision was not confirmed. No approval state was changed.'
      )
    }
  }

  // Handle Reject button click
  const handleRejectClick = () => {
    if (!isPending || decisionState === 'submitting') return
    setIsRejectConfirmOpen(true)
  }

  // Execute Reject mutation
  const executeReject = async (reason: string) => {
    try {
      setDecisionState('submitting')
      setDecisionError(null)
      await onReject(approval.id, reason)
      setDecisionState('confirmed')
      setIsRejectConfirmOpen(false)
    } catch (err: unknown) {
      setDecisionState('failed')
      setIsRejectConfirmOpen(false)
      setDecisionError(
        err instanceof Error
          ? err.message
          : 'Decision was not confirmed. No approval state was changed.'
      )
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && decisionState !== 'submitting' && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:w-[75vw] lg:w-150 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
        >
          {/* Drawer Header */}
          <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono-tech text-xs text-text-muted">{approval.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                    title="Copy Approval ID"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <ApprovalRiskBadge risk={approval.risk} />
                  <ApprovalStateBadge state={approval.state} />
                </div>

                <SheetTitle className="text-base font-bold text-text-primary tracking-tight leading-snug">
                  {approval.title}
                </SheetTitle>

                <SheetDescription className="text-xs text-text-secondary mt-1 flex items-center gap-2 flex-wrap font-mono-tech">
                  <span>Action: {approval.actionType.replace(/_/g, ' ')}</span>
                  <span>•</span>
                  <span>Requested: {new Date(approval.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </SheetDescription>
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
                  value="review"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
                >
                  Review Decision
                </TabsTrigger>
                <TabsTrigger
                  value="context"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
                >
                  Entity Context
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none h-10 px-1 text-xs font-mono-tech"
                >
                  Audit Trail {approval.audit && `(${approval.audit.length})`}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Failure Banner: Prompt 04 Section 42 */}
              {decisionError && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs font-mono-tech space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Decision Error</span>
                  </div>
                  <p>{decisionError}</p>
                </div>
              )}

              {/* Expired Banner: Prompt 04 Section 43 */}
              {isExpired && (
                <div className="p-3 rounded-lg border border-border bg-surface-subtle text-text-muted text-xs font-mono-tech flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-muted shrink-0" />
                  <span>This approval request is no longer actionable (time window expired).</span>
                </div>
              )}

              {/* 1. REVIEW TAB */}
              <TabsContent value="review" className="mt-0 space-y-4">
                {/* Reason Approval is Required */}
                {approval.reasonRequired && (
                  <div className="p-3.5 rounded-lg border border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 space-y-1 text-xs">
                    <span className="font-mono-tech text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Policy Boundary Checkpoint
                    </span>
                    <p className="leading-relaxed">{approval.reasonRequired}</p>
                  </div>
                )}

                {/* Target Resource Specifier */}
                {approval.target && (
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1 text-xs font-mono-tech">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">
                      Target Boundary ({approval.target.type || 'External Entity'})
                    </span>
                    <div className="font-semibold text-text-primary text-xs flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{approval.target.label}</span>
                    </div>
                  </div>
                )}

                {/* Structured Payload Preview: Prompt 04 Section 37 & 38 */}
                {approval.preview && (
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider font-semibold">
                        Action Payload Preview
                      </span>
                      <span className="text-[10px] font-mono-tech text-text-muted">
                        Structured inspection
                      </span>
                    </div>

                    {approval.preview.summary && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {approval.preview.summary}
                      </p>
                    )}

                    {approval.preview.fields && (
                      <div className="space-y-2 pt-2 border-t border-border-subtle">
                        {Object.entries(approval.preview.fields).map(([key, val]) => {
                          const isSensitive =
                            approval.preview?.sensitiveFields?.includes(key) ||
                            val === '••••••••'

                          return (
                            <div
                              key={key}
                              className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 p-2 rounded-md bg-surface-subtle text-xs"
                            >
                              <span className="text-text-muted font-mono-tech text-[11px] shrink-0 sm:w-1/3">
                                {key}
                              </span>
                              <div className="sm:w-2/3 font-mono-tech text-[11px] text-text-primary break-all">
                                {isSensitive ? (
                                  <span className="inline-flex items-center gap-1 text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                                    <Lock className="h-2.5 w-2.5 text-interactive" />
                                    <span>•••••••• [Redacted]</span>
                                  </span>
                                ) : (
                                  <span className="whitespace-pre-wrap">{val}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Expiration & Timing */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-text-muted uppercase block">Requested</span>
                    <span className="text-text-primary font-medium mt-0.5 block">
                      {new Date(approval.requestedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-text-muted uppercase block">Valid Until</span>
                    <span className="text-text-primary font-medium mt-0.5 block">
                      {approval.expiresAt ? new Date(approval.expiresAt).toLocaleString() : 'No expiration set'}
                    </span>
                  </div>
                </div>

                {/* Decision Audit Note if already decided */}
                {approval.decision && (
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1.5 text-xs font-mono-tech">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">
                      Recorded Decision
                    </span>
                    <div className="text-text-primary font-semibold">
                      State: {approval.state} • by {approval.decision.decisionMaker || 'Operator'}
                    </div>
                    {approval.decision.reason && (
                      <p className="text-text-secondary text-xs italic pt-1">
                        "{approval.decision.reason}"
                      </p>
                    )}
                    {approval.decision.decidedAt && (
                      <div className="text-[10px] text-text-muted">
                        At: {new Date(approval.decision.decidedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 2. CONTEXT TAB */}
              <TabsContent value="context" className="mt-0 space-y-4">
                {/* Agent Card */}
                <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                  <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                    Requesting Agent
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
                        Profile
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">Agent metadata unavailable.</span>
                  )}
                </div>

                {/* Task Link Card: Prompt 04 Section 46 */}
                <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                  <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                    Associated Task Pipeline
                  </span>
                  {task ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-text-primary truncate">
                            {task.title}
                          </div>
                          <div className="text-[10px] font-mono-tech text-text-muted">
                            ID: {task.id} • State: {task.state}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/tasks?task=${task.id}`}
                        className="text-xs font-mono-tech text-interactive hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        View Task
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">No task linked to this request.</span>
                  )}
                </div>

                {/* Session Link: Prompt 04 Section 47 */}
                {approval.sessionId && (
                  <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2">
                    <span className="text-[11px] font-mono-tech text-text-muted uppercase tracking-wider block">
                      Runtime Session Context
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-subtle border border-border text-xs font-mono-tech">
                      <span className="text-text-primary font-semibold truncate">
                        Session: {approval.sessionId}
                      </span>
                      <Link
                        to={`/runtime?tab=sessions&session=${approval.sessionId}`}
                        className="text-interactive hover:underline inline-flex items-center gap-1"
                      >
                        Inspect
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 3. AUDIT TAB */}
              <TabsContent value="audit" className="mt-0 space-y-4">
                {(!approval.audit || approval.audit.length === 0) ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border bg-surface text-text-muted text-xs">
                    No audit records logged for this approval request.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {approval.audit.map((entry, index) => (
                      <div key={index} className="relative">
                        <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-surface bg-interactive shrink-0" />
                        <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono-tech">
                            <span className="font-bold text-text-primary uppercase tracking-wider">
                              {entry.stage}
                            </span>
                            <span className="text-text-muted">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.actor && (
                            <div className="text-[11px] font-mono-tech text-interactive">
                              Actor: {entry.actor}
                            </div>
                          )}
                          {entry.note && (
                            <p className="text-xs text-text-secondary leading-relaxed pt-0.5">
                              {entry.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Decision Actions Bar (Bottom Drawer Footer) */}
          {/* Prompt 04 Section 67: min-h-11 (44px) touch target, ample spacing */}
          {isPending && (
            <div className="p-4 sm:p-5 border-t border-border bg-surface-subtle shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRejectClick}
                  disabled={decisionState === 'submitting'}
                  className="min-h-11 px-5 text-xs font-mono-tech border-rose-600/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-600/50 cursor-pointer"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Action
                </Button>

                <Button
                  type="button"
                  variant="default"
                  onClick={handleApproveClick}
                  disabled={decisionState === 'submitting'}
                  className="min-h-11 px-6 text-xs font-mono-tech cursor-pointer"
                >
                  {decisionState === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting Decision...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Action
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Modals */}
      <ApproveConfirmDialog
        approval={approval}
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        onConfirm={executeApprove}
        isSubmitting={decisionState === 'submitting'}
      />

      <RejectConfirmDialog
        approval={approval}
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={executeReject}
        isSubmitting={decisionState === 'submitting'}
      />
    </>
  )
}
