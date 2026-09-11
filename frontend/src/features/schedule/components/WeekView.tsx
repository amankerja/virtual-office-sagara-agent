import React from 'react'
import type { ScheduleItem } from '../types'
import { getScheduleTypeBadge } from '../schedule-utils'

export interface WeekViewProps {
  currentDate: Date;
  items: ScheduleItem[];
  onSelectSchedule: (item: ScheduleItem) => void;
  onSelectDate: (dateStr: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  items,
  onSelectSchedule,
  onSelectDate,
}) => {
  // Compute Monday of the week
  const dayOfWeek = currentDate.getDay() // 0 = Sun
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
  const monday = new Date(currentDate)
  monday.setDate(currentDate.getDate() + diffToMonday)

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const hours = Array.from({ length: 13 }).map((_, i) => i + 8) // 08:00 to 20:00
  const todayStr = '2026-09-10' // Reference sandbox date

  // Group items by day YYYY-MM-DD
  const itemsByDay = new Map<string, ScheduleItem[]>()
  items.forEach((it) => {
    const dayKey = it.startAt.slice(0, 10)
    const list = itemsByDay.get(dayKey) || []
    list.push(it)
    itemsByDay.set(dayKey, list)
  })

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden flex flex-col">
      {/* Day Headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-surface-subtle sticky top-0 z-10">
        <div className="py-2.5 px-1 text-center text-[10px] font-mono-tech text-text-muted border-r border-border/60">
          GMT+7
        </div>
        {weekDays.map((d) => {
          const dateStr = d.toISOString().slice(0, 10)
          const isToday = dateStr === todayStr
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
          const dayNum = d.getDate()

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`py-2 px-1 text-center border-r border-border/60 last:border-r-0 cursor-pointer transition-colors ${
                isToday ? 'bg-interactive/10' : 'hover:bg-surface-hover/60'
              }`}
            >
              <span className="text-[10px] font-mono-tech uppercase text-text-muted block">
                {dayName}
              </span>
              <span
                className={`inline-flex items-center justify-center text-xs font-semibold font-mono-tech h-6 w-6 rounded-full mt-0.5 ${
                  isToday
                    ? 'bg-interactive text-interactive-foreground'
                    : 'text-text-primary'
                }`}
              >
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* Week Grid with Hourly Slots */}
      <div className="relative overflow-y-auto max-h-160">
        {hours.map((hour) => {
          const hourLabel = `${String(hour).padStart(2, '0')}:00`

          return (
            <div
              key={hour}
              className="grid grid-cols-[56px_repeat(7,1fr)] min-h-14 border-b border-border/40"
            >
              {/* Time Label Column */}
              <div className="py-1 px-1.5 text-right text-[10px] font-mono-tech text-text-muted border-r border-border/60 select-none">
                {hourLabel}
              </div>

              {/* Day Columns */}
              {weekDays.map((d) => {
                const dateStr = d.toISOString().slice(0, 10)
                const isToday = dateStr === todayStr
                const dayItems = itemsByDay.get(dateStr) || []

                // Items starting within this hour
                const hourItems = dayItems.filter((it) => {
                  const itemHour = parseInt(it.startAt.slice(11, 13), 10)
                  return itemHour === hour
                })

                return (
                  <div
                    key={dateStr}
                    className={`p-1 border-r border-border/40 last:border-r-0 relative transition-colors ${
                      isToday ? 'bg-interactive/2' : ''
                    }`}
                  >
                    {hourItems.map((it) => {
                      const typeMeta = getScheduleTypeBadge(it.type)
                      const timeStr = it.startAt.slice(11, 16)
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => onSelectSchedule(it)}
                          className={`w-full text-left p-1.5 rounded-md border text-xs font-mono-tech mb-1 shadow-xs transition-opacity hover:opacity-90 block ${typeMeta.className}`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span>{timeStr}</span>
                            {it.agentId && (
                              <span className="uppercase text-[9px] opacity-75">
                                {it.agentId}
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-[11px] truncate mt-0.5">
                            {it.title}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
