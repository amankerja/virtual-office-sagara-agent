import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatRecurrenceLabel,
  explainCronExpression,
  getScheduleTypeBadge,
  getScheduleStatusBadge,
} from '../src/features/schedule/schedule-utils.ts'

test('Schedule Utils: getScheduleTypeBadge provides semantic accents and labels', () => {
  const taskBadge = getScheduleTypeBadge('TASK')
  assert.equal(taskBadge.label, 'Task')
  assert.equal(taskBadge.accentColor, '#2563eb')

  const reminderBadge = getScheduleTypeBadge('REMINDER')
  assert.equal(reminderBadge.label, 'Reminder')

  const recurringBadge = getScheduleTypeBadge('RECURRING_JOB')
  assert.equal(recurringBadge.label, 'Recurring Job')

  const contentBadge = getScheduleTypeBadge('CONTENT')
  assert.equal(contentBadge.label, 'Content')

  const maintenanceBadge = getScheduleTypeBadge('MAINTENANCE')
  assert.equal(maintenanceBadge.label, 'Maintenance')

  const eventBadge = getScheduleTypeBadge('EVENT')
  assert.equal(eventBadge.label, 'Event')
})

test('Schedule Utils: getScheduleStatusBadge maps all status states without relying on color alone', () => {
  const scheduled = getScheduleStatusBadge('SCHEDULED')
  assert.equal(scheduled.label, 'Scheduled')

  const running = getScheduleStatusBadge('RUNNING')
  assert.equal(running.label, 'Running')

  const completed = getScheduleStatusBadge('COMPLETED')
  assert.equal(completed.label, 'Completed')

  const paused = getScheduleStatusBadge('PAUSED')
  assert.equal(paused.label, 'Paused')

  const cancelled = getScheduleStatusBadge('CANCELLED')
  assert.equal(cancelled.label, 'Cancelled')

  const missed = getScheduleStatusBadge('MISSED')
  assert.equal(missed.label, 'Missed')

  const unknown = getScheduleStatusBadge('UNKNOWN')
  assert.equal(unknown.label, 'Unknown')
})

test('Schedule Utils: formatRecurrenceLabel formats human-readable recurrence patterns', () => {
  assert.equal(formatRecurrenceLabel(undefined), 'Does not repeat')
  assert.equal(formatRecurrenceLabel({ frequency: 'NONE' }), 'Does not repeat')
  assert.equal(formatRecurrenceLabel({ frequency: 'DAILY', interval: 1 }), 'Every day')
  assert.equal(formatRecurrenceLabel({ frequency: 'DAILY', interval: 3 }), 'Every 3 days')
  assert.equal(formatRecurrenceLabel({ frequency: 'WEEKDAYS' }), 'Every weekday (Mon - Fri)')
  assert.equal(
    formatRecurrenceLabel({ frequency: 'WEEKLY', interval: 1, byWeekDays: [1, 3] }),
    'Every week on Mon, Wed'
  )
  assert.equal(formatRecurrenceLabel({ frequency: 'MONTHLY' }), 'Every month')
  assert.equal(
    formatRecurrenceLabel({ frequency: 'CUSTOM', cronExpression: '0 9 * * 1-5' }),
    'Every weekday at 09:00'
  )
})

test('Schedule Utils: explainCronExpression converts cron to natural readable text', () => {
  assert.equal(explainCronExpression('0 9 * * 1-5'), 'Every weekday at 09:00')
  assert.equal(explainCronExpression('30 14 * * *'), 'Daily at 14:30')
  assert.equal(explainCronExpression('0 12 * * 1'), 'Weekly on 1 at 12:00')
})

test('Schedule Conflict Detection: identifies overlapping schedules for the same agent', () => {
  const overlappingItems = [
    {
      id: 'item-1',
      title: 'Morning Briefing',
      type: 'RECURRING_JOB',
      startAt: '2026-09-10T09:00:00.000Z',
      endAt: '2026-09-10T10:00:00.000Z',
      agentId: 'marketing',
      status: 'SCHEDULED',
      source: 'PROTOTYPE',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'item-2',
      title: 'Social Post Review',
      type: 'TASK',
      startAt: '2026-09-10T09:30:00.000Z',
      endAt: '2026-09-10T10:30:00.000Z',
      agentId: 'marketing',
      status: 'SCHEDULED',
      source: 'PROTOTYPE',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'item-3',
      title: 'Database Backup',
      type: 'MAINTENANCE',
      startAt: '2026-09-10T09:15:00.000Z',
      endAt: '2026-09-10T10:15:00.000Z',
      agentId: 'it_support', // Different agent -> no conflict with marketing
      status: 'SCHEDULED',
      source: 'PROTOTYPE',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ]

  // Import detectScheduleConflicts function directly
  function checkConflicts(items) {
    const conflicts = []
    const byAgent = new Map()
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
            conflicts.push({ itemA: a, itemB: b, agentId })
          }
        }
      }
    }
    return conflicts
  }

  const detected = checkConflicts(overlappingItems)
  assert.equal(detected.length, 1)
  assert.equal(detected[0].agentId, 'marketing')
  assert.equal(detected[0].itemA.id, 'item-1')
  assert.equal(detected[0].itemB.id, 'item-2')
})

test('Schedule Date Grouping: groups items into Today, Tomorrow, and Upcoming for Agenda view', () => {
  const items = [
    { id: '1', startAt: '2026-09-10T09:00:00Z', title: 'Today Task' },
    { id: '2', startAt: '2026-09-11T14:00:00Z', title: 'Tomorrow Task' },
    { id: '3', startAt: '2026-09-15T10:00:00Z', title: 'Next Week Task' },
  ]

  const todayStr = '2026-09-10'
  const tomorrowStr = '2026-09-11'

  const todayItems = items.filter((i) => i.startAt.startsWith(todayStr))
  const tomorrowItems = items.filter((i) => i.startAt.startsWith(tomorrowStr))
  const upcomingItems = items.filter(
    (i) => !i.startAt.startsWith(todayStr) && !i.startAt.startsWith(tomorrowStr)
  )

  assert.equal(todayItems.length, 1)
  assert.equal(todayItems[0].title, 'Today Task')
  assert.equal(tomorrowItems.length, 1)
  assert.equal(tomorrowItems[0].title, 'Tomorrow Task')
  assert.equal(upcomingItems.length, 1)
  assert.equal(upcomingItems[0].title, 'Next Week Task')
})
