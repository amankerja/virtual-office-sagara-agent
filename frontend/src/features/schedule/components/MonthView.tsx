import React from 'react'
import type { ScheduleItem } from '../types'
import { getScheduleTypeBadge } from '../schedule-utils'

export interface MonthViewProps {
  currentDate: Date;
  items: ScheduleItem[];
  onSelectSchedule: (item: ScheduleItem) => void;
  onSelectDate: (dateStr: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  items,
  onSelectSchedule,
  onSelectDate,
}) => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of month
  const firstDayOfMonth = new Date(year, month, 1)
  // Day of week: 0 = Sun, 1 = Mon ... We want Monday as index 0
  let startingDay = firstDayOfMonth.getDay() - 1
  if (startingDay === -1) startingDay = 6 // Sunday is 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalSlots = Math.ceil((startingDay + daysInMonth) / 7) * 7

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Group items by day (YYYY-MM-DD)
  const itemsByDay = new Map<string, ScheduleItem[]>()
  items.forEach((it) => {
    const dayKey = it.startAt.slice(0, 10)
    const list = itemsByDay.get(dayKey) || []
    list.push(it)
    itemsByDay.set(dayKey, list)
  })

  const todayStr = '2026-09-10' // Reference sandbox time

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden flex flex-col">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-subtle text-center">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider font-mono-tech"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
        {Array.from({ length: totalSlots }).map((_, index) => {
          const dayNumber = index - startingDay + 1
          const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth

          if (!isCurrentMonth) {
            return (
              <div
                key={index}
                className="min-h-26.25 sm:min-h-30 p-1.5 bg-surface-subtle/30 opacity-40 select-none"
              />
            )
          }

          const currentMonthStr = String(month + 1).padStart(2, '0')
          const currentDayStr = String(dayNumber).padStart(2, '0')
          const dateKey = `${year}-${currentMonthStr}-${currentDayStr}`
          const dayItems = itemsByDay.get(dateKey) || []
          const isToday = dateKey === todayStr

          const visibleItems = dayItems.slice(0, 3)
          const overflowCount = dayItems.length - 3

          return (
            <div
              key={index}
              className={`min-h-26.25 sm:min-h-30 p-1.5 flex flex-col justify-between transition-colors hover:bg-surface-hover/50 ${
                isToday ? 'bg-interactive/5' : 'bg-surface'
              }`}
            >
              {/* Cell Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDate(dateKey)}
                  className={`text-xs font-mono-tech font-semibold h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                    isToday
                      ? 'bg-interactive text-interactive-foreground'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  }`}
                  title={`Go to day: ${dateKey}`}
                >
                  {dayNumber}
                </button>
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-mono-tech text-text-muted hidden sm:inline">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Event Snippets */}
              <div className="space-y-1 mt-1 flex-1">
                {visibleItems.map((it) => {
                  const typeMeta = getScheduleTypeBadge(it.type)
                  const time = it.startAt.slice(11, 16)
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onSelectSchedule(it)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-mono-tech truncate border transition-opacity hover:opacity-80 block ${typeMeta.className}`}
                      title={`${time} - ${it.title} (${it.type})`}
                    >
                      <span className="font-semibold mr-1">{time}</span>
                      <span>{it.title}</span>
                    </button>
                  )
                })}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDate(dateKey)}
                    className="text-[10px] font-mono-tech text-interactive hover:underline px-1 block"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
