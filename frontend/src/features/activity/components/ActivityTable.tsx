import React from 'react'
import {
  formatTimestampRelative,
  formatTimeOnly,
} from '@/lib/formatters'
import { ActivitySeverityBadge } from '@/components/shared/ActivitySeverityBadge'
import { ActivityCategoryBadge } from '@/components/shared/ActivityCategoryBadge'
import { ChevronRight, GitFork } from 'lucide-react'
import type { ActivityProjection } from '@/types/activity'

interface ActivityTableProps {
  events: ActivityProjection[]
  selectedEventId?: string | null
  onSelectEvent: (event: ActivityProjection) => void
  onFilterCorrelation?: (correlationId: string) => void
}

export const ActivityTable: React.FC<ActivityTableProps> = ({
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
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-subtle border-b border-border text-text-secondary font-mono-tech uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-32">Time</th>
              <th className="py-2.5 px-3 font-semibold w-24">Severity</th>
              <th className="py-2.5 px-3 font-semibold w-28">Category</th>
              <th className="py-2.5 px-4 font-semibold">Event</th>
              <th className="py-2.5 px-3 font-semibold w-40">Actor</th>
              <th className="py-2.5 px-3 font-semibold w-32">Entity</th>
              <th className="py-2.5 px-3 font-semibold w-36">Correlation</th>
              <th className="py-2.5 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {events.map((event) => {
              const isSelected = selectedEventId === event.id

              return (
                <tr
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-surface-subtle font-medium text-text-primary'
                      : 'hover:bg-surface-subtle/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {/* Time */}
                  <td className="py-2.5 px-4 font-mono-tech whitespace-nowrap">
                    <span className="text-text-primary">
                      {formatTimeOnly(event.timestamp)}
                    </span>
                    <span className="text-[10px] text-text-muted ml-1.5">
                      {formatTimestampRelative(event.timestamp)}
                    </span>
                  </td>

                  {/* Severity */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <ActivitySeverityBadge severity={event.severity} />
                  </td>

                  {/* Category */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <ActivityCategoryBadge category={event.category} />
                  </td>

                  {/* Event */}
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-text-primary truncate max-w-sm">
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-[11px] text-text-muted truncate max-w-sm mt-0.5">
                        {event.description}
                      </div>
                    )}
                  </td>

                  {/* Actor */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-text-primary truncate block max-w-36">
                      {event.actor?.label || event.actor?.id || '—'}
                    </span>
                  </td>

                  {/* Entity */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono-tech text-[11px]">
                    {event.entity?.id ? (
                      <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-text-secondary">
                        {event.entity.id}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Correlation */}
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono-tech text-[11px]">
                    {event.correlationId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onFilterCorrelation && event.correlationId) {
                            onFilterCorrelation(event.correlationId)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-text-muted hover:text-primary hover:underline"
                        title="Filter correlation"
                      >
                        <GitFork className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-28">{event.correlationId}</span>
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Arrow */}
                  <td className="py-2.5 px-3 text-right">
                    <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List (Section 14: no desktop table squeezed into 375px) */}
      <div className="md:hidden divide-y divide-border">
        {events.map((event) => {
          const isSelected = selectedEventId === event.id

          return (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className={`p-3.5 space-y-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/50'
              }`}
            >
              {/* Severity + Category & Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ActivityCategoryBadge category={event.category} />
                  <ActivitySeverityBadge severity={event.severity} />
                </div>
                <span className="text-[11px] font-mono-tech text-text-muted">
                  {formatTimestampRelative(event.timestamp)}
                </span>
              </div>

              {/* Event Title */}
              <p className="text-xs font-semibold text-text-primary">
                {event.title}
              </p>

              {/* Entity + Actor */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-text-secondary pt-1 border-t border-border/40">
                <span className="font-mono-tech truncate">
                  {event.entity?.id ? `ID: ${event.entity.id}` : ''}
                </span>
                <span className="truncate text-text-muted">
                  {event.actor?.label || event.actor?.id || ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
