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
import { AuditOutcomeBadge } from '@/components/shared/AuditOutcomeBadge'
import { AuditActorBadge } from '@/components/shared/AuditActorBadge'
import { AuditChangeView } from './AuditChangeView'
import { CorrelationSummary } from './CorrelationSummary'
import {
  formatFullDateTime,
  formatTimestampRelative,
} from '@/lib/formatters'
import {
  Copy,
  Check,
  ExternalLink,
  Bot,
  CheckSquare,
  Terminal,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react'
import type { AuditRecord } from '@/types/audit'

interface AuditDetailDrawerProps {
  record: AuditRecord | null
  isOpen: boolean
  onClose: () => void
  onFilterCorrelation?: (correlationId: string) => void
}

export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({
  record,
  isOpen,
  onClose,
  onFilterCorrelation,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'changes' | 'related'>('overview')
  const [copiedId, setCopiedId] = useState(false)
  const [copiedCorr, setCopiedCorr] = useState(false)

  if (!record) return null

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(record.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const handleCopyCorr = () => {
    if (navigator.clipboard && record.correlationId) {
      navigator.clipboard.writeText(record.correlationId)
      setCopiedCorr(true)
      setTimeout(() => setCopiedCorr(false), 2000)
    }
  }

  const changesCount = record.changes?.length || 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-150 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono-tech text-xs text-text-muted">{record.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                  title="Copy Audit ID"
                >
                  {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
                <AuditActorBadge actorType={record.actor.type} />
                <AuditOutcomeBadge outcome={record.outcome} />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech text-text-muted uppercase px-2 py-0.5 rounded bg-surface border border-border">
                <Lock className="h-2.5 w-2.5" />
                <span>Immutable Record</span>
              </span>
            </div>

            <SheetTitle className="text-base font-bold text-text-primary tracking-tight font-mono-tech">
              {record.action}
            </SheetTitle>

            <SheetDescription className="text-xs text-text-secondary font-mono-tech flex items-center gap-2 flex-wrap">
              <span>{formatFullDateTime(record.timestamp)}</span>
              <span>•</span>
              <span>{formatTimestampRelative(record.timestamp)}</span>
            </SheetDescription>
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
                className="h-10 px-1 py-2 text-xs font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="changes"
                className="h-10 px-1 py-2 text-xs font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none"
              >
                Changes {changesCount > 0 && `(${changesCount})`}
              </TabsTrigger>
              <TabsTrigger
                value="related"
                className="h-10 px-1 py-2 text-xs font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none"
              >
                Related Entities
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-5">
              {/* Actor & Action Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider font-mono-tech">
                    Initiating Actor
                  </span>
                  <p className="text-xs font-semibold text-text-primary">
                    {record.actor.label || record.actor.id || 'System'}
                  </p>
                  <p className="text-[11px] font-mono-tech text-text-muted">
                    Type: {record.actor.type}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
                  <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider font-mono-tech">
                    Target Resource
                  </span>
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {record.target?.label || record.target?.id || '—'}
                  </p>
                  {record.target?.type && (
                    <p className="text-[11px] font-mono-tech text-text-muted">
                      Type: {record.target.type}
                    </p>
                  )}
                </div>
              </div>

              {/* Reason / Decision context */}
              {record.reason && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-mono-tech">
                    Action Context / Justification
                  </h4>
                  <div className="p-3 rounded-lg border border-border bg-surface-subtle/60 text-xs text-text-primary leading-relaxed">
                    {record.reason}
                  </div>
                </div>
              )}

              {/* Correlation Trace */}
              {record.correlationId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-mono-tech">
                      Correlation Chain
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyCorr}
                      className="text-[11px] text-text-muted hover:text-text-primary inline-flex items-center gap-1 font-mono-tech"
                      title="Copy correlation ID"
                    >
                      {copiedCorr ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCorr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <CorrelationSummary
                    correlationId={record.correlationId}
                    related={record.related}
                    onFilterCorrelation={onFilterCorrelation}
                  />
                </div>
              )}

              {/* Read-only Security Notice (Section 24 & 70) */}
              <div className="p-3 rounded-lg border border-border bg-surface-subtle flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                <div className="text-[11px] text-text-secondary space-y-0.5">
                  <p className="font-semibold text-text-primary">Immutable Audit Protocol</p>
                  <p>
                    Audit entries are append-only accountability records for operational traceability.
                    Modifications, deletion, or redaction bypasses are prohibited.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Changes Tab */}
            <TabsContent value="changes" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-mono-tech">
                  Recorded State Transitions
                </h4>
                <span className="text-xs font-mono-tech text-text-muted">
                  {changesCount} field {changesCount === 1 ? 'change' : 'changes'}
                </span>
              </div>

              <AuditChangeView changes={record.changes} />
            </TabsContent>

            {/* Related Entities Tab */}
            <TabsContent value="related" className="mt-0 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary font-mono-tech">
                Associated Telemetry Entities
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {record.related?.taskId && (
                  <Link
                    to={`/tasks?task=${record.related.taskId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] text-text-muted">Task</p>
                        <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                          {record.related.taskId}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </Link>
                )}

                {record.related?.approvalId && (
                  <Link
                    to={`/approvals?approval=${record.related.approvalId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] text-text-muted">Approval</p>
                        <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                          {record.related.approvalId}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </Link>
                )}

                {record.related?.agentId && (
                  <Link
                    to={`/agents?agent=${record.related.agentId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bot className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] text-text-muted">Agent</p>
                        <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                          {record.related.agentId}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </Link>
                )}

                {record.related?.sessionId && (
                  <Link
                    to={`/runtime?tab=sessions&session=${record.related.sessionId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Terminal className="h-4 w-4 text-cyan-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] text-text-muted">Session</p>
                        <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                          {record.related.sessionId}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </Link>
                )}

                {record.related?.delegationId && (
                  <Link
                    to={`/runtime?tab=delegations&delegation=${record.related.delegationId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GitBranch className="h-4 w-4 text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] text-text-muted">Delegation</p>
                        <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                          {record.related.delegationId}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                  </Link>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
