import React from 'react'
import type { SessionProjection } from '@/types/runtime'
import { GitFork, Radio, ArrowUpRight, GitBranch } from 'lucide-react'

interface SessionRelatedTabProps {
  session: SessionProjection;
  onNavigateSession?: (id: string) => void;
  onNavigateDelegation?: (id: string) => void;
}

export const SessionRelatedTab: React.FC<SessionRelatedTabProps> = ({
  session,
  onNavigateSession,
  onNavigateDelegation,
}) => {
  const hasParent = Boolean(session.parentSessionId)
  const hasChildren = Boolean(session.childSessionIds && session.childSessionIds.length > 0)
  const hasDelegations = Boolean(session.delegationIds && session.delegationIds.length > 0)

  if (!hasParent && !hasChildren && !hasDelegations) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <GitBranch className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">
          No Hierarchy Links
        </h4>
        <p className="text-[11px] text-text-muted max-w-xs mx-auto font-sans leading-relaxed">
          This session executed standalone without child tasks, parent sessions, or async worker delegations.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Execution Tree Hierarchy:
        </span>
        Relational lineage connecting upstream sessions to downstream async workers and sub-sessions.
      </div>

      <div className="space-y-4">
        {/* Parent Session */}
        {session.parentSessionId && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase text-text-muted font-semibold tracking-wider">
              Parent Session (Upstream)
            </span>
            <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-interactive" />
                <span className="font-semibold text-text-primary font-mono-tech">
                  {session.parentSessionId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSession?.(session.parentSessionId!)}
                className="text-interactive hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                Inspect <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Current Node */}
        <div className="p-3 rounded-lg border-2 border-interactive/30 bg-interactive/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-interactive" />
            <div>
              <span className="font-bold text-text-primary block">{session.id}</span>
              <span className="text-[10px] text-text-muted">{session.agentName} (Current)</span>
            </div>
          </div>
          <span className="text-[10px] bg-interactive/10 text-interactive px-2 py-0.5 rounded border border-interactive/20 uppercase font-semibold">
            Active Focus
          </span>
        </div>

        {/* Child Sessions */}
        {hasChildren && (
          <div className="space-y-1.5 pl-4 border-l-2 border-border">
            <span className="text-[10px] uppercase text-text-muted font-semibold tracking-wider">
              Child Sessions ({session.childSessionIds!.length})
            </span>
            <div className="space-y-1.5">
              {session.childSessionIds!.map((childId) => (
                <div
                  key={childId}
                  className="p-2.5 rounded-md border border-border bg-surface flex items-center justify-between"
                >
                  <span className="text-text-primary">{childId}</span>
                  <button
                    type="button"
                    onClick={() => onNavigateSession?.(childId)}
                    className="text-interactive hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    View <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delegations */}
        {hasDelegations && (
          <div className="space-y-1.5 pl-4 border-l-2 border-border">
            <span className="text-[10px] uppercase text-text-muted font-semibold tracking-wider">
              Dispatched Delegations ({session.delegationIds!.length})
            </span>
            <div className="space-y-1.5">
              {session.delegationIds!.map((delId) => (
                <div
                  key={delId}
                  className="p-2.5 rounded-md border border-border bg-surface flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <GitFork className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-text-primary">{delId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateDelegation?.(delId)}
                    className="text-interactive hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    Inspect Worker <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
