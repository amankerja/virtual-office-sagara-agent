import React, { useState, useEffect } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import { ModalShell } from '@/components/modal/ModalShell'
import { DetailHeader } from '@/components/modal/DetailHeader'
import { DetailSection } from '@/components/modal/DetailSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ScheduleItem, ScheduleItemType, RecurrenceFrequency, RecurrenceRule } from '../types'
import { explainCronExpression } from '../schedule-utils'
import { useAgents } from '@/api/hooks'

export interface ScheduleEditorModalProps {
  isOpen: boolean;
  initialItem?: ScheduleItem | null;
  onClose: () => void;
  onSave: (data: Omit<ScheduleItem, 'id' | 'createdAt' | 'source'>) => void;
}

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  isOpen,
  initialItem,
  onClose,
  onSave,
}) => {
  const { data: agents = [] } = useAgents()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ScheduleItemType>('TASK')
  const [startDate, setStartDate] = useState('2026-09-10')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [agentId, setAgentId] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM')
  const [notes, setNotes] = useState('')

  // Recurrence builder state
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('NONE')
  const [interval, setInterval] = useState(1)
  const [selectedDays, setSelectedDays] = useState<number[]>([1]) // 1 = Mon
  const [cronExpression, setCronExpression] = useState('')
  const [showAdvancedCron, setShowAdvancedCron] = useState(false)

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title)
      setDescription(initialItem.description || '')
      setType(initialItem.type)
      const d = new Date(initialItem.startAt)
      setStartDate(d.toISOString().slice(0, 10))
      setStartTime(d.toTimeString().slice(0, 5))
      if (initialItem.endAt) {
        const endD = new Date(initialItem.endAt)
        setEndTime(endD.toTimeString().slice(0, 5))
      }
      setTimezone(initialItem.timezone || 'Asia/Jakarta')
      setAgentId(initialItem.agentId || '')
      setPriority(initialItem.priority || 'MEDIUM')
      setNotes(initialItem.notes || '')
      if (initialItem.recurrence) {
        setFrequency(initialItem.recurrence.frequency)
        setInterval(initialItem.recurrence.interval || 1)
        setSelectedDays(initialItem.recurrence.byWeekDays || [1])
        setCronExpression(initialItem.recurrence.cronExpression || '')
        if (initialItem.recurrence.cronExpression) {
          setShowAdvancedCron(true)
        }
      }
    } else {
      // Default reset
      setTitle('')
      setDescription('')
      setType('TASK')
      setStartDate('2026-09-10')
      setStartTime('09:00')
      setEndTime('10:00')
      setTimezone('Asia/Jakarta')
      setAgentId(agents[0]?.id || '')
      setPriority('MEDIUM')
      setNotes('')
      setFrequency('NONE')
      setInterval(1)
      setSelectedDays([1])
      setCronExpression('')
      setShowAdvancedCron(false)
    }
  }, [initialItem, isOpen, agents])

  const toggleDay = (dayIdx: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort()
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const startIso = `${startDate}T${startTime}:00.000Z`
    const endIso = endTime ? `${startDate}T${endTime}:00.000Z` : undefined

    let recurrenceRule: RecurrenceRule | undefined
    if (frequency !== 'NONE') {
      recurrenceRule = {
        frequency,
        interval: interval > 0 ? interval : 1,
        byWeekDays: frequency === 'WEEKLY' ? selectedDays : undefined,
        cronExpression: showAdvancedCron && cronExpression ? cronExpression : undefined,
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      startAt: startIso,
      endAt: endIso,
      timezone,
      agentId: agentId || undefined,
      profileId: agentId || undefined,
      priority,
      status: 'SCHEDULED',
      recurrence: recurrenceRule,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  const daysOfWeek = [
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
    { label: 'S', value: 0 },
  ]

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={initialItem ? 'Edit Schedule Draft' : 'Create New Schedule'}
      size="default"
    >
      <DetailHeader
        title={initialItem ? 'Edit Schedule Draft' : 'Create New Schedule'}
        subtitle="Configure timing, recurrence pattern, and agent assignments."
        icon={<CalendarDays className="h-5 w-5" />}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Basic Information */}
          <DetailSection title="Basic Information">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">
                  Title <span className="text-status-danger">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Daily Marketing Digest"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs bg-surface border-border font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono-tech text-text-muted mb-1">
                    Schedule Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ScheduleItemType)}
                    className="w-full h-8 px-2.5 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
                  >
                    <option value="TASK">Task (Actionable)</option>
                    <option value="RECURRING_JOB">Recurring Job</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="CONTENT">Content Publishing</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="EVENT">Operational Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono-tech text-text-muted mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose, notes, or execution constraints..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive resize-none"
                />
              </div>
            </div>
          </DetailSection>

          {/* Timing */}
          <DetailSection title="Timing">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-mono-tech bg-surface border-border"
                />
              </div>
              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs font-mono-tech bg-surface border-border"
                />
              </div>
              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs font-mono-tech bg-surface border-border"
                />
              </div>
            </div>
          </DetailSection>

          {/* Recurrence Builder */}
          <DetailSection title="Recurrence Pattern">
            <div className="space-y-3 p-3.5 rounded-lg border border-border bg-surface-subtle">
              <div>
                <label className="block text-xs font-mono-tech text-text-muted mb-1">Repeats</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  className="w-full h-8 px-2.5 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
                >
                  <option value="NONE">Does not repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKDAYS">Weekdays (Monday - Friday)</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="CUSTOM">Custom Rule</option>
                </select>
              </div>

              {frequency === 'WEEKLY' && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono-tech text-text-muted block">Repeat on days:</span>
                  <div className="flex gap-1.5">
                    {daysOfWeek.map((d) => {
                      const selected = selectedDays.includes(d.value)
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDay(d.value)}
                          className={`h-7 w-7 rounded border text-xs font-mono-tech transition-colors ${
                            selected
                              ? 'bg-interactive text-interactive-foreground border-interactive'
                              : 'bg-surface border-border text-text-muted hover:border-border-strong'
                          }`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Cron Option */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAdvancedCron(!showAdvancedCron)}
                  className="text-xs font-mono-tech text-interactive hover:underline inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  {showAdvancedCron ? 'Hide Cron Expression' : 'Advanced: Configure Cron Expression'}
                </button>

                {showAdvancedCron && (
                  <div className="mt-2 space-y-1.5">
                    <Input
                      placeholder="e.g. 0 9 * * 1-5"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      className="text-xs font-mono-tech bg-surface border-border"
                    />
                    {cronExpression && (
                      <p className="text-[11px] text-text-muted font-mono-tech">
                        Preview: <span className="text-text-primary">{explainCronExpression(cronExpression)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DetailSection>

          {/* Assignment */}
          <DetailSection title="Agent Assignment">
            <div>
              <label className="block text-xs font-mono-tech text-text-muted mb-1">
                Assigned Agent Profile
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
              >
                <option value="">Unassigned (Operational Event)</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.definition.name} ({ag.id})
                  </option>
                ))}
              </select>
            </div>
          </DetailSection>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface-subtle shrink-0">
          <span className="text-[11px] font-mono-tech text-text-muted">
            Held in local draft store. No production writes.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onClose}
              className="border-border text-text-secondary font-mono-tech text-xs min-h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="xs"
              className="bg-interactive text-interactive-foreground hover:bg-interactive-hover font-mono-tech text-xs min-h-8"
            >
              Save Schedule Draft
            </Button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
