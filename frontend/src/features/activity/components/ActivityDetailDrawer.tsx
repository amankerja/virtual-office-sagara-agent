import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ActivitySeverityBadge } from '@/components/shared/ActivitySeverityBadge'
import { ActivityCategoryBadge } from '@/components/shared/ActivityCategoryBadge'
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
  Wrench,
  User,
  Database,
} from 'lucide-react'
import type { ActivityProjection } from '@/types/activity'

interface ActivityDetailDrawerProps {
  event: ActivityProjection | null
  isOpen: boolean
  onClose: () => void
  onFilterCorrelation?: (correlationId: string) => void
}

export const ActivityDetailDrawer: React.FC<ActivityDetailDrawerProps> = ({
  event,
  isOpen,
  onClose,
  onFilterCorrelation,
}) => {
  const [copiedId, setCopiedId] = useState(false)
  const [copiedCorr, setCopiedCorr] = useState(false)

  if (!event) return null

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(event.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const handleCopyCorr = () => {
    if (navigator.clipboard && event.correlationId) {
      navigator.clipboard.writeText(event.correlationId)
      setCopiedCorr(true)
      setTimeout(() => setCopiedCorr(false), 2000)
    }
  }

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
                <span className="font-mono-tech text-xs text-text-muted">{event.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                  title="Copy Event ID"
                >
                  {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
                <ActivityCategoryBadge category={event.category} />
                <ActivitySeverityBadge severity={event.severity} />
              </div>
            </div>

            <SheetTitle className="text-base font-bold text-text-primary tracking-tight leading-snug">
              {event.title}
            </SheetTitle>

            <SheetDescription className="text-xs text-text-secondary font-mono-tech flex items-center gap-2 flex-wrap">
              <span>{formatFullDateTime(event.timestamp)}</span>
              <span>•</span>
              <span>{formatTimestampRelative(event.timestamp)}</span>
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Description */}
          {event.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Event Description
              </h4>
              <div className="p-3 rounded-lg border border-border bg-surface-subtle/50 text-xs text-text-primary leading-relaxed">
                {event.description}
              </div>
            </div>
          )}

          {/* Actor & Entity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Actor */}
            <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
                <User className="h-3.5 w-3.5 text-text-muted" />
                <span>Actor</span>
              </div>
              <p className="text-xs font-semibold text-text-primary">
                {event.actor?.label || event.actor?.id || 'Unknown'}
              </p>
              {event.actor?.type && (
                <p className="text-[11px] font-mono-tech text-text-muted">
                  Type: {event.actor.type}
                </p>
              )}
            </div>

            {/* Entity */}
            <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
                <Database className="h-3.5 w-3.5 text-text-muted" />
                <span>Target Entity</span>
              </div>
              <p className="text-xs font-semibold text-text-primary font-mono-tech truncate">
                {event.entity?.label || event.entity?.id || '—'}
              </p>
              {event.entity?.type && (
                <p className="text-[11px] font-mono-tech text-text-muted">
                  Type: {event.entity.type}
                </p>
              )}
            </div>
          </div>

          {/* Correlation Section */}
          {event.correlationId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Correlation Trace
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
                correlationId={event.correlationId}
                related={event.related}
                onFilterCorrelation={onFilterCorrelation}
              />
            </div>
          )}

          {/* Related System Entities */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Direct System Cross-Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.related?.taskId && (
                <Link
                  to={`/tasks?task=${event.related.taskId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Task</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.taskId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}

              {event.related?.agentId && (
                <Link
                  to={`/agents?agent=${event.related.agentId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Agent</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.agentId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}

              {event.related?.sessionId && (
                <Link
                  to={`/runtime?tab=sessions&session=${event.related.sessionId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-4 w-4 text-cyan-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Session</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.sessionId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}

              {event.related?.delegationId && (
                <Link
                  to={`/runtime?tab=delegations&delegation=${event.related.delegationId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="h-4 w-4 text-indigo-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Delegation</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.delegationId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}

              {event.related?.approvalId && (
                <Link
                  to={`/approvals?approval=${event.related.approvalId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Approval</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.approvalId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}

              {event.related?.skillId && (
                <Link
                  to={`/skills?skill=${event.related.skillId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Wrench className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] text-text-muted">Skill</p>
                      <p className="text-xs font-mono-tech text-text-primary group-hover:text-primary">
                        {event.related.skillId}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
