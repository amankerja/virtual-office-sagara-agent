import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { Activity, CheckCircle2, XCircle, Clock, Radio, ExternalLink } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface SkillEvidenceTabProps {
  skill: SkillProjection;
  onNavigateSession?: (sessionId: string) => void;
  onNavigateAgent?: (agentId: string) => void;
}

export const SkillEvidenceTab: React.FC<SkillEvidenceTabProps> = ({
  skill,
  onNavigateSession,
  onNavigateAgent,
}) => {
  const evidenceList = skill.runtimeEvidence || []

  if (evidenceList.length === 0) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <Clock className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">
          No Execution Evidence Recorded
        </h4>
        <p className="text-[11px] text-text-muted max-w-xs mx-auto font-sans leading-relaxed">
          This capability is installed or registered, but no verified invocation events have been observed in the current session window.
        </p>
      </div>
    )
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'invocation_observed':
        return {
          icon: Activity,
          label: 'Invocation Observed',
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25',
        }
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25',
        }
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25',
        }
      case 'requested':
      default:
        return {
          icon: Radio,
          label: 'Requested',
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25',
        }
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Runtime Evidence Audit Trail:
        </span>
        Evidence items represent cryptographic or supervisor checkpoints verifying capability utilization in actual agent sessions.
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Observed Telemetry Records ({evidenceList.length})
        </h4>

        <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {evidenceList.map((ev) => {
            const config = getTypeConfig(ev.type)
            const Icon = config.icon

            return (
              <div
                key={ev.id}
                className="p-3.5 space-y-2 hover:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${config.badgeClass}`}
                    >
                      <Icon className="h-2.5 w-2.5 mr-1" />
                      {config.label}
                    </span>
                    <span className="text-[10px] text-text-muted bg-surface-raised px-1.5 py-0.5 rounded border border-border">
                      Confidence: {ev.confidence}
                    </span>
                  </div>

                  <span className="text-[10px] text-text-muted">
                    {formatTimestampRelative(ev.observedAt)}
                  </span>
                </div>

                {ev.details && (
                  <p className="text-xs font-sans text-text-secondary leading-relaxed pl-1">
                    {ev.details}
                  </p>
                )}

                {/* Session & Agent Correlation */}
                <div className="flex items-center gap-3 pt-1 border-t border-border-subtle text-[11px] flex-wrap">
                  {ev.sessionId && (
                    <button
                      type="button"
                      onClick={() => onNavigateSession?.(ev.sessionId!)}
                      className="inline-flex items-center gap-1 text-interactive hover:underline"
                    >
                      Session: <span className="font-mono-tech">{ev.sessionId}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {ev.agentName && (
                    <button
                      type="button"
                      onClick={() => ev.agentId && onNavigateAgent?.(ev.agentId)}
                      className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
                    >
                      Agent: <span>{ev.agentName}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
