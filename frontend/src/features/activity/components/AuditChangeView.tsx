import React from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import type { AuditChange } from '@/types/audit'

interface AuditChangeViewProps {
  changes?: AuditChange[]
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export const AuditChangeView: React.FC<AuditChangeViewProps> = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded-lg bg-surface">
        <p className="text-xs text-text-secondary">
          No entity field diffs captured in this audit record.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => {
        const isRedacted = Boolean(change.redacted)
        const beforeText = isRedacted ? '[REDACTED]' : formatValue(change.before)
        const afterText = isRedacted ? '[REDACTED]' : formatValue(change.after)

        return (
          <div
            key={`${change.field}-${index}`}
            className="rounded-lg border border-border bg-surface p-3.5 space-y-2.5"
          >
            {/* Field header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold font-mono-tech text-text-primary">
                {change.field}
              </span>
              {isRedacted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-tech uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="h-2.5 w-2.5" />
                  <span>Redacted Security Field</span>
                </span>
              )}
            </div>

            {/* Diff Presentation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Before */}
              <div className="p-2.5 rounded-md bg-surface-subtle border border-border/80 space-y-1">
                <span className="text-[10px] uppercase font-mono-tech tracking-wider text-text-muted">
                  Before
                </span>
                <p
                  className={`text-xs font-mono-tech break-all ${
                    isRedacted
                      ? 'text-amber-600 dark:text-amber-400 italic select-none'
                      : 'text-text-secondary'
                  }`}
                >
                  {beforeText}
                </p>
              </div>

              {/* After */}
              <div className="p-2.5 rounded-md bg-surface-subtle border border-border/80 space-y-1">
                <span className="text-[10px] uppercase font-mono-tech tracking-wider text-text-muted flex items-center gap-1">
                  <span>After</span>
                  <ArrowRight className="h-2.5 w-2.5 text-primary" />
                </span>
                <p
                  className={`text-xs font-mono-tech break-all ${
                    isRedacted
                      ? 'text-amber-600 dark:text-amber-400 italic select-none'
                      : 'text-text-primary font-medium'
                  }`}
                >
                  {afterText}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
