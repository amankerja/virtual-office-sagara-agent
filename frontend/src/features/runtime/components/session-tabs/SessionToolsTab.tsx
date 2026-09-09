import React from 'react'
import type { SessionToolActivity } from '@/types/runtime'
import { Wrench, CheckCircle2, AlertTriangle, Activity, Clock } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface SessionToolsTabProps {
  tools?: SessionToolActivity[];
}

export const SessionToolsTab: React.FC<SessionToolsTabProps> = ({ tools = [] }) => {
  if (tools.length === 0) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <Wrench className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">
          No Tool Invocations Recorded
        </h4>
        <p className="text-[11px] text-text-muted max-w-xs mx-auto font-sans leading-relaxed">
          This session has not invoked external tools or supervisor plugins.
        </p>
      </div>
    )
  }

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25',
        }
      case 'running':
        return {
          icon: Activity,
          label: 'Running',
          class: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25',
        }
      case 'failed':
        return {
          icon: AlertTriangle,
          label: 'Failed',
          class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25',
        }
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          class: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25',
        }
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-3 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Tool Invocation Timeline:
        </span>
        Normalized capability invocations during this execution turn.
      </div>

      <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
        {tools.map((t) => {
          const stateCfg = getStateBadge(t.state)
          const StateIcon = stateCfg.icon

          return (
            <div key={t.id} className="p-3.5 space-y-2 hover:bg-surface-subtle transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-surface-raised border border-border text-interactive shrink-0">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-text-primary text-xs truncate">
                    {t.toolName}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${stateCfg.class}`}
                >
                  <StateIcon className="h-2.5 w-2.5 mr-1" />
                  {stateCfg.label}
                </span>
              </div>

              {/* Result Summary */}
              {t.resultSummary && (
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle text-[11px] font-sans text-text-secondary leading-relaxed">
                  {t.resultSummary}
                </div>
              )}

              {/* Duration & Timestamps */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-text-muted">
                <span>Started: {formatTimestampRelative(t.startedAt)}</span>
                <span>
                  Duration: {t.durationMs !== undefined ? `${t.durationMs}ms` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
