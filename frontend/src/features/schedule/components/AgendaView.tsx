import { Bot } from 'lucide-react'
import type { ScheduleItem } from '../types'
import { getScheduleTypeBadge, getScheduleStatusBadge } from '../schedule-utils'

export interface AgendaViewProps {
  items: ScheduleItem[];
  onSelectSchedule: (item: ScheduleItem) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  items,
  onSelectSchedule,
}) => {
  const todayStr = '2026-09-10' // Reference sandbox anchor
  const tomorrowStr = '2026-09-11'

  // Sort items
  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  )

  // Group into Today, Tomorrow, Upcoming
  const todayItems = sorted.filter((it) => it.startAt.slice(0, 10) === todayStr)
  const tomorrowItems = sorted.filter((it) => it.startAt.slice(0, 10) === tomorrowStr)
  const upcomingItems = sorted.filter(
    (it) => it.startAt.slice(0, 10) !== todayStr && it.startAt.slice(0, 10) !== tomorrowStr
  )

  const renderSection = (title: string, groupItems: ScheduleItem[]) => {
    if (groupItems.length === 0) return null

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono-tech px-1">
          {title} ({groupItems.length})
        </h4>
        <div className="border border-border rounded-xl bg-surface divide-y divide-border/60 overflow-hidden">
          {groupItems.map((it) => {
            const typeMeta = getScheduleTypeBadge(it.type)
            const statusMeta = getScheduleStatusBadge(it.status)
            const timeStr = it.startAt.slice(11, 16)
            const dateStr = it.startAt.slice(0, 10)

            return (
              <div
                key={it.id}
                onClick={() => onSelectSchedule(it)}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="text-center shrink-0 w-14 py-1 px-1 rounded bg-surface-subtle border border-border/80 text-[11px] font-mono-tech">
                    <span className="font-semibold text-text-primary block">{timeStr}</span>
                    <span className="text-[9px] text-text-muted">{dateStr.slice(5)}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-text-primary hover:text-interactive transition-colors">
                        {it.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono-tech px-1.5 py-0.2 rounded-full border uppercase ${typeMeta.className}`}
                      >
                        {typeMeta.label}
                      </span>
                    </div>
                    {it.description && (
                      <p className="text-[11px] text-text-muted line-clamp-1">
                        {it.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {it.agentId && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border/60">
                      <Bot className="h-3 w-3 text-interactive" />
                      <span className="uppercase">{it.agentId}</span>
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sorted.length === 0 ? (
        <div className="p-12 text-center text-text-muted text-xs border border-border rounded-xl bg-surface">
          <p className="font-mono-tech">No scheduled work matching criteria.</p>
          <p className="text-[11px] mt-1">
            Create a schedule to plan reminders, recurring operations, or agent work.
          </p>
        </div>
      ) : (
        <>
          {renderSection('Today — September 10, 2026', todayItems)}
          {renderSection('Tomorrow — September 11, 2026', tomorrowItems)}
          {renderSection('Upcoming & Operational Events', upcomingItems)}
        </>
      )}
    </div>
  )
}
