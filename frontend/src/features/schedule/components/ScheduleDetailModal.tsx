import React from 'react'
import { CalendarDays, Bot, AlertTriangle, Copy, Play } from 'lucide-react'
import { ModalShell } from '@/components/modal/ModalShell'
import { DetailHeader } from '@/components/modal/DetailHeader'
import { DetailSection } from '@/components/modal/DetailSection'
import { MetadataGrid } from '@/components/modal/MetadataGrid'
import { Button } from '@/components/ui/button'
import { getScheduleTypeBadge, getScheduleStatusBadge, formatRecurrenceLabel } from '../schedule-utils'
import type { ScheduleItem } from '../types'
import { useScheduleStore } from '../store'

export interface ScheduleDetailModalProps {
  schedule: ScheduleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditDraft?: (item: ScheduleItem) => void;
  onNavigateAgent?: (agentId: string) => void;
  conflictReason?: string;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onEditDraft,
  onNavigateAgent,
  conflictReason,
}) => {
  const duplicateSchedule = useScheduleStore((s) => s.duplicateSchedule)

  if (!schedule) return null

  const typeMeta = getScheduleTypeBadge(schedule.type)
  const statusMeta = getScheduleStatusBadge(schedule.status)

  const handleDuplicate = () => {
    duplicateSchedule(schedule.id)
    onClose()
  }

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-muted">Source: {schedule.source}</span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">Priority: {schedule.priority || 'NORMAL'}</span>
      {schedule.timezone && (
        <>
          <span>•</span>
          <span className="font-mono-tech text-text-muted">{schedule.timezone}</span>
        </>
      )}
    </div>
  )

  const extraActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="xs"
        onClick={handleDuplicate}
        className="border-border bg-surface text-text-secondary hover:text-text-primary gap-1 font-mono-tech text-[11px] min-h-8"
        title="Duplicate schedule entry"
      >
        <Copy className="h-3 w-3" />
        Duplicate
      </Button>
      {onEditDraft && (
        <Button
          size="xs"
          onClick={() => {
            onClose()
            onEditDraft(schedule)
          }}
          className="bg-interactive text-interactive-foreground hover:bg-interactive-hover font-mono-tech text-[11px] min-h-8"
        >
          Edit Draft
        </Button>
      )}
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule: ${schedule.title}`}
      size="default"
    >
      <DetailHeader
        title={schedule.title}
        subtitle={subtitle}
        icon={<CalendarDays className="h-5 w-5" />}
        idToCopy={schedule.id}
        badge={
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase ${typeMeta.className}`}
            >
              {typeMeta.label}
            </span>
            <span
              className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
          </div>
        }
        extraActions={extraActions}
        onClose={onClose}
      />

      <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-90px)]">
        {/* Advisory Conflict Banner */}
        {conflictReason && (
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-mono-tech flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase block">Advisory: Potential Scheduling Conflict</span>
              <span>{conflictReason}</span>
            </div>
          </div>
        )}

        {/* Description */}
        <DetailSection title="Description">
          <p className="text-xs text-text-primary leading-relaxed p-3.5 rounded-lg border border-border bg-surface-subtle">
            {schedule.description || 'No description provided for this schedule.'}
          </p>
        </DetailSection>

        {/* Timing and Recurrence */}
        <DetailSection title="Timing & Recurrence">
          <MetadataGrid
            columns={2}
            items={[
              {
                label: 'Scheduled Start',
                value: new Date(schedule.startAt).toLocaleString(),
              },
              {
                label: 'Scheduled End',
                value: schedule.endAt ? new Date(schedule.endAt).toLocaleString() : 'Open ended',
              },
              {
                label: 'Recurrence Rule',
                value: formatRecurrenceLabel(schedule.recurrence),
                hint: schedule.recurrence?.cronExpression ? `Cron: ${schedule.recurrence.cronExpression}` : undefined,
              },
              {
                label: 'Timezone',
                value: schedule.timezone || 'UTC (Default)',
              },
            ]}
          />
        </DetailSection>

        {/* Assigned Agent / Profile */}
        <DetailSection title="Agent Assignment">
          {schedule.agentId ? (
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-surface">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-interactive/10 border border-interactive/20 flex items-center justify-center text-interactive">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-text-primary">
                    {schedule.agentId.toUpperCase()}
                  </div>
                  <div className="text-[10px] font-mono-tech text-text-muted">
                    Profile: {schedule.profileId || schedule.agentId}
                  </div>
                </div>
              </div>
              {onNavigateAgent && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    onClose()
                    onNavigateAgent(schedule.agentId!)
                  }}
                  className="text-interactive hover:text-interactive-hover font-mono-tech text-xs"
                >
                  View Profile →
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted italic p-3 rounded-lg border border-border bg-surface-subtle">
              No specific agent assigned (Operational Event).
            </p>
          )}
        </DetailSection>

        {/* Production Execution Warning */}
        <div className="p-3.5 rounded-lg border border-border/80 bg-surface-subtle flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-medium text-text-primary block">Execution Status</span>
            <span className="text-text-muted text-[11px]">
              Production execution disabled in current phase. Realtime Hermes trigger requires production scheduler contract.
            </span>
          </div>
          <Button
            size="xs"
            disabled
            className="opacity-50 cursor-not-allowed bg-surface border border-border text-text-muted font-mono-tech text-[11px] shrink-0"
            title="Production execution is not available in read-only / local draft mode"
          >
            <Play className="h-3 w-3 mr-1" />
            Run Now
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
