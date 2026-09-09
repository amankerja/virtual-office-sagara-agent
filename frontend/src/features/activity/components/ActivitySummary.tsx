import React from 'react'
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Cpu,
} from 'lucide-react'
import type { ActivityProjection } from '@/types/activity'

interface ActivitySummaryProps {
  events: ActivityProjection[]
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({ events }) => {
  const totalEvents = events.length
  const warningCount = events.filter((e) => e.severity === 'WARNING').length
  const errorCount = events.filter(
    (e) => e.severity === 'ERROR' || e.severity === 'CRITICAL'
  ).length
  const approvalCount = events.filter((e) => e.category === 'APPROVAL').length
  const taskCount = events.filter((e) => e.category === 'TASK').length
  const runtimeCount = events.filter(
    (e) =>
      e.category === 'SESSION' ||
      e.category === 'DELEGATION' ||
      e.category === 'GATEWAY' ||
      e.category === 'SYSTEM'
  ).length

  const items = [
    {
      label: 'Events',
      count: totalEvents,
      icon: Activity,
      textColor: 'text-text-primary',
      iconColor: 'text-primary',
    },
    {
      label: 'Warnings',
      count: warningCount,
      icon: AlertTriangle,
      textColor: warningCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Errors',
      count: errorCount,
      icon: AlertCircle,
      textColor: errorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text-primary',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Approvals',
      count: approvalCount,
      icon: ShieldCheck,
      textColor: 'text-text-primary',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Task Changes',
      count: taskCount,
      icon: CheckSquare,
      textColor: 'text-text-primary',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Runtime Changes',
      count: runtimeCount,
      icon: Cpu,
      textColor: 'text-text-primary',
      iconColor: 'text-cyan-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface text-left"
          >
            <div className="p-2 rounded-md bg-surface-subtle shrink-0">
              <Icon className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-text-secondary truncate">
                {item.label}
              </p>
              <p className={`text-lg font-bold font-mono-tech ${item.textColor}`}>
                {item.count}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
