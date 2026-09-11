import type { ScheduleItemType, ScheduleStatus, RecurrenceRule, ScheduleItem } from './types'

export interface ScheduleConflict {
  itemA: ScheduleItem;
  itemB: ScheduleItem;
  agentId: string;
  reason: string;
}

export function detectScheduleConflicts(items: ScheduleItem[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const byAgent = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    if (!item.agentId) continue
    const list = byAgent.get(item.agentId) || []
    list.push(item)
    byAgent.set(item.agentId, list)
  }

  for (const [agentId, agentItems] of byAgent.entries()) {
    for (let i = 0; i < agentItems.length; i++) {
      for (let j = i + 1; j < agentItems.length; j++) {
        const a = agentItems[i]
        const b = agentItems[j]
        const startA = new Date(a.startAt).getTime()
        const endA = a.endAt ? new Date(a.endAt).getTime() : startA + 30 * 60 * 1000
        const startB = new Date(b.startAt).getTime()
        const endB = b.endAt ? new Date(b.endAt).getTime() : startB + 30 * 60 * 1000

        if (startA < endB && endA > startB) {
          conflicts.push({
            itemA: a,
            itemB: b,
            agentId,
            reason: `Overlapping schedule between "${a.title}" and "${b.title}"`,
          })
        }
      }
    }
  }
  return conflicts
}

export function getScheduleTypeBadge(type: ScheduleItemType): {
  label: string;
  className: string;
  accentColor: string;
} {
  switch (type) {
    case 'TASK':
      return {
        label: 'Task',
        className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
        accentColor: '#2563eb',
      }
    case 'REMINDER':
      return {
        label: 'Reminder',
        className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
        accentColor: '#9333ea',
      }
    case 'RECURRING_JOB':
      return {
        label: 'Recurring Job',
        className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
        accentColor: '#0891b2',
      }
    case 'CONTENT':
      return {
        label: 'Content',
        className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
        accentColor: '#4f46e5',
      }
    case 'MAINTENANCE':
      return {
        label: 'Maintenance',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        accentColor: '#d97706',
      }
    case 'EVENT':
      return {
        label: 'Event',
        className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
        accentColor: '#64748b',
      }
    default:
      return {
        label: 'Schedule',
        className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
        accentColor: '#64748b',
      }
  }
}

export function getScheduleStatusBadge(status: ScheduleStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' }
    case 'RUNNING':
      return { label: 'Running', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' }
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
    case 'PAUSED':
      return { label: 'Paused', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' }
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' }
    case 'MISSED':
      return { label: 'Missed', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' }
    default:
      return { label: 'Unknown', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
  }
}

export function formatRecurrenceLabel(rule?: RecurrenceRule): string {
  if (!rule || rule.frequency === 'NONE') return 'Does not repeat'
  if (rule.frequency === 'DAILY') return rule.interval && rule.interval > 1 ? `Every ${rule.interval} days` : 'Every day'
  if (rule.frequency === 'WEEKDAYS') return 'Every weekday (Mon - Fri)'
  if (rule.frequency === 'WEEKLY') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayNames = rule.byWeekDays?.map((d) => days[d]).join(', ') || 'week'
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} weeks on ${dayNames}` : `Every week on ${dayNames}`
  }
  if (rule.frequency === 'MONTHLY') return 'Every month'
  if (rule.frequency === 'CUSTOM') {
    if (rule.cronExpression) return explainCronExpression(rule.cronExpression)
    return 'Custom schedule'
  }
  return 'Repeats'
}

export function explainCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return 'Custom cron schedule'
  const [min, hour, dom, mon, dow] = parts

  if (dow === '1-5' && min === '0') {
    return `Every weekday at ${hour.padStart(2, '0')}:00`
  }
  if (dow === '*' && dom === '*' && mon === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }
  if (mon === '*' && dow !== '*') {
    return `Weekly on ${dow} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }
  return `Cron: ${cron}`
}
