import React from 'react'
import {
  formatTimestampRelative,
  formatTimeOnly,
} from '@/lib/formatters'
import { ActivitySeverityBadge } from '@/components/shared/ActivitySeverityBadge'
import { ActivityCategoryBadge } from '@/components/shared/ActivityCategoryBadge'
import { ChevronRight, GitFork, User } from 'lucide-react'
import type { ActivityProjection } from '@/types/activity'

interface ActivityTimelineProps {
  events: ActivityProjection[]
  selectedEventId?: string | null
  onSelectEvent: (event: ActivityProjection) => void
  onFilterCorrelation?: (correlationId: string) => void
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  onFilterCorrelation,
}) => {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-lg bg-surface">
        <p className="text-xs text-text-secondary">No operational activity matching current criteria.</p>
      </div>
    )
  }

  return (
    <div className="relative border-l border-border ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id

        return (
          <div
            key={event.id}
            className="relative group cursor-pointer"
            onClick={() => onSelectEvent(event)}
          >
            {/* Timeline node dot */}
            <div
              className={`absolute -left-5.5 sm:-left-7.5 top-3.5 h-3 w-3 rounded-full border-2 bg-surface transition-colors ${
                isSelected
                  ? 'border-primary bg-primary'
                  : event.severity === 'CRITICAL' || event.severity === 'ERROR'
                  ? 'border-rose-500 bg-rose-500/20'
                  : event.severity === 'WARNING'
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'border-border group-hover:border-primary/60'
              }`}
            />

            {/* Event Card */}
            <div
              className={`p-3.5 sm:p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-surface-subtle border-primary/40 shadow-xs'
                  : 'bg-surface border-border hover:border-border-subtle hover:bg-surface-subtle/50'
              }`}
            >
              {/* Header row: Category, Severity, and Time */}
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ActivityCategoryBadge category={event.category} />
                  <ActivitySeverityBadge severity={event.severity} />
                  {event.entity?.id && (
                    <span className="text-[11px] font-mono-tech px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted border border-border">
                      {event.entity.id}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-text-muted font-mono-tech flex items-center gap-1.5">
                  <span title={event.timestamp}>
                    {formatTimeOnly(event.timestamp)}
                  </span>
                  <span>•</span>
                  <span>{formatTimestampRelative(event.timestamp)}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="mb-2">
                <h4 className="text-xs sm:text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                  {event.title}
                </h4>
                {event.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Footer row: Actor, Correlation, and Arrow */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-text-muted">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Actor */}
                  {event.actor?.label && (
                    <div className="flex items-center gap-1 text-text-secondary">
                      <User className="h-3 w-3 text-text-muted shrink-0" />
                      <span>{event.actor.label}</span>
                    </div>
                  )}

                  {/* Correlation ID link */}
                  {event.correlationId && (
                    <div className="flex items-center gap-1">
                      <GitFork className="h-3 w-3 text-text-muted shrink-0" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onFilterCorrelation && event.correlationId) {
                            onFilterCorrelation(event.correlationId)
                          }
                        }}
                        className="font-mono-tech hover:text-primary hover:underline"
                        title="Filter by correlation chain"
                      >
                        {event.correlationId}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center text-text-muted group-hover:text-text-primary transition-colors">
                  <span className="text-[10px] hidden sm:inline mr-0.5">Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
