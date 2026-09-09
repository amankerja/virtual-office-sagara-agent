import React from 'react'
import type { DelegationProjection } from '@/types/runtime'
import { CheckCircle2, Clock } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface DelegationTimelineTabProps {
  delegation: DelegationProjection;
}

export const DelegationTimelineTab: React.FC<DelegationTimelineTabProps> = ({ delegation }) => {
  const timeline = delegation.timeline || []

  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <Clock className="h-8 w-8 text-text-muted mx-auto" />
        <p className="text-xs text-text-muted">
          No lifecycle timeline checkpoints recorded for this delegation.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Lifecycle Verification Trail:
        </span>
        Chronological execution stages emitted by the supervisor. Only stages verified by telemetry checkpoints are displayed.
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {timeline.map((event, idx) => {
          const isLatest = idx === timeline.length - 1

          return (
            <div key={`${event.stage}-${idx}`} className="relative space-y-1">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-surface ${
                  isLatest
                    ? 'border-interactive text-interactive ring-4 ring-interactive/10'
                    : 'border-border text-text-muted'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
              </div>

              {/* Event Content */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-text-primary text-xs uppercase tracking-wide">
                  {event.stage}
                </span>
                <span className="text-[10px] text-text-muted">
                  {formatTimestampRelative(event.timestamp)}
                </span>
              </div>

              {event.details && (
                <p className="text-xs text-text-secondary font-sans leading-relaxed">
                  {event.details}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
