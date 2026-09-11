import React from 'react'
import { Bot, Repeat } from 'lucide-react'
import type { ScheduleItem } from '../types'
import { getScheduleTypeBadge, formatRecurrenceLabel } from '../schedule-utils'

export interface DayViewProps {
  currentDate: Date;
  items: ScheduleItem[];
  onSelectSchedule: (item: ScheduleItem) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  items,
  onSelectSchedule,
}) => {
  const dateStr = currentDate.toISOString().slice(0, 10)
  const dayItems = items.filter((it) => it.startAt.slice(0, 10) === dateStr)

  // Sort chronologically
  const sorted = [...dayItems].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  )

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden flex flex-col">
      <div className="p-3.5 border-b border-border bg-surface-subtle flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-text-primary font-mono-tech">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-text-muted text-xs ml-2 font-mono-tech">
            ({sorted.length} scheduled {sorted.length === 1 ? 'event' : 'events'})
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-160">
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs">
            <p className="font-mono-tech">No scheduled work for this day.</p>
            <p className="text-[11px] mt-1">
              Create a schedule to plan reminders, recurring operations, or agent work.
            </p>
          </div>
        ) : (
          sorted.map((it) => {
            const typeMeta = getScheduleTypeBadge(it.type)
            const startTime = it.startAt.slice(11, 16)
            const endTime = it.endAt ? it.endAt.slice(11, 16) : null

            return (
              <div
                key={it.id}
                onClick={() => onSelectSchedule(it)}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${typeMeta.className}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold font-mono-tech">
                        {startTime} {endTime && `– ${endTime}`}
                      </span>
                      <span className="text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded-full border bg-surface/80">
                        {typeMeta.label}
                      </span>
                      {it.priority && (
                        <span className="text-[10px] font-mono-tech uppercase text-text-muted">
                          {it.priority} Priority
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                      {it.title}
                    </h4>

                    {it.description && (
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                        {it.description}
                      </p>
                    )}
                  </div>

                  {it.agentId && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface/80 border border-border/60 text-xs font-mono-tech text-text-secondary shrink-0">
                      <Bot className="h-3.5 w-3.5 text-interactive" />
                      <span className="uppercase">{it.agentId}</span>
                    </div>
                  )}
                </div>

                {it.recurrence && it.recurrence.frequency !== 'NONE' && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-1 text-[10px] font-mono-tech text-text-muted">
                    <Repeat className="h-3 w-3" />
                    <span>{formatRecurrenceLabel(it.recurrence)}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
