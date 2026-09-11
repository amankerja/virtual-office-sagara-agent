import React from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ArrowRight, Bot } from 'lucide-react'
import { useScheduleStore } from '@/features/schedule/store'
import { getScheduleTypeBadge } from '@/features/schedule/schedule-utils'

export const UpcomingScheduleCard: React.FC = () => {
  const items = useScheduleStore((s) => s.items)

  // Take next 3 upcoming items
  const sorted = [...items]
    .filter((it) => it.status === 'SCHEDULED' || it.status === 'RUNNING')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 3)

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-interactive" />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono-tech">
            Upcoming Schedule
          </h3>
        </div>
        <Link
          to="/schedule"
          className="text-[11px] font-mono-tech text-interactive hover:underline inline-flex items-center gap-1"
        >
          View Schedule
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-text-muted italic py-3 text-center">
            No upcoming events scheduled.
          </p>
        ) : (
          sorted.map((it) => {
            const typeMeta = getScheduleTypeBadge(it.type)
            const timeStr = it.startAt.slice(11, 16)

            return (
              <Link
                key={it.id}
                to={`/schedule?schedule=${it.id}`}
                className="p-2.5 rounded-lg border border-border/70 bg-surface-subtle hover:bg-surface-hover/80 transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono-tech font-semibold text-text-muted shrink-0 w-11 text-center py-0.5 rounded bg-surface border border-border/60">
                    {timeStr}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {it.title}
                    </div>
                    {it.agentId && (
                      <div className="text-[10px] font-mono-tech text-text-muted flex items-center gap-1">
                        <Bot className="h-3 w-3 text-interactive" />
                        <span className="uppercase">{it.agentId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono-tech px-1.5 py-0.2 rounded-full border uppercase shrink-0 ${typeMeta.className}`}
                >
                  {typeMeta.label}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
