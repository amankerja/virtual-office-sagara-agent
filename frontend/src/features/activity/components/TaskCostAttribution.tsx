import React from 'react'
import { Link } from 'react-router-dom'
import {
  formatCurrencyUsd,
  formatCompactTokens,
} from '@/lib/formatters'
import { ExternalLink, CheckSquare } from 'lucide-react'
import type { TaskCostAttributionRecord } from '@/types/governance'

interface TaskCostAttributionProps {
  tasks?: TaskCostAttributionRecord[]
}

const CONFIDENCE_BADGES: Record<
  TaskCostAttributionRecord['cost']['confidence'],
  { label: string; badgeClass: string }
> = {
  ACTUAL: {
    label: 'Actual',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  ESTIMATED: {
    label: 'Estimated',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  PARTIAL: {
    label: 'Partial',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  UNKNOWN: {
    label: 'Unknown',
    badgeClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
  },
}

export const TaskCostAttribution: React.FC<TaskCostAttributionProps> = ({ tasks = [] }) => {
  if (tasks.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-dashed border-border bg-surface text-center">
        <p className="text-xs text-text-secondary">No task cost attribution data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden space-y-3 p-4 sm:p-5">
      <div>
        <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Task Cost Attribution
        </h4>
        <p className="text-xs text-text-secondary mt-0.5">
          Workload cost drivers mapped across task executions, session allocations, and confidence tiers.
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-border/80 rounded-md">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-subtle border-b border-border text-text-secondary font-mono-tech uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Task</th>
              <th className="py-2.5 px-3 font-semibold w-40">Agent</th>
              <th className="py-2.5 px-3 font-semibold w-24 text-center">Sessions</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-right">Tokens</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-right">Est. Cost</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-right">Actual Cost</th>
              <th className="py-2.5 px-3 font-semibold w-28 text-center">Confidence</th>
              <th className="py-2.5 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {tasks.map((task) => {
              const conf = CONFIDENCE_BADGES[task.cost.confidence] || CONFIDENCE_BADGES.UNKNOWN

              return (
                <tr key={task.taskId} className="hover:bg-surface-subtle/50 transition-colors">
                  {/* Task */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-[11px] font-semibold text-text-primary">
                        {task.taskId}
                      </span>
                      <span className="text-text-secondary truncate max-w-xs">
                        {task.taskTitle}
                      </span>
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="py-2.5 px-3 font-medium text-text-secondary">
                    {task.agentName || task.agentId || '—'}
                  </td>

                  {/* Sessions */}
                  <td className="py-2.5 px-3 text-center font-mono-tech">
                    {task.sessionCount ?? '—'}
                  </td>

                  {/* Tokens */}
                  <td className="py-2.5 px-3 text-right font-mono-tech text-text-primary">
                    {formatCompactTokens(task.tokens.total)}
                  </td>

                  {/* Estimated Cost */}
                  <td className="py-2.5 px-3 text-right font-mono-tech text-amber-600 dark:text-amber-400 font-medium">
                    {formatCurrencyUsd(task.cost.estimatedUsd)}
                  </td>

                  {/* Actual Cost (unknown displays as —, confirmed 0 displays as $0.00) */}
                  <td className="py-2.5 px-3 text-right font-mono-tech font-semibold text-text-primary">
                    {formatCurrencyUsd(task.cost.actualUsd)}
                  </td>

                  {/* Confidence */}
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono-tech uppercase border ${conf.badgeClass}`}
                    >
                      {conf.label}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/tasks?task=${task.taskId}`}
                      className="p-1 text-text-muted hover:text-primary transition-colors inline-block"
                      title="Inspect Task"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked List */}
      <div className="md:hidden divide-y divide-border border border-border/80 rounded-md">
        {tasks.map((task) => {
          const conf = CONFIDENCE_BADGES[task.cost.confidence] || CONFIDENCE_BADGES.UNKNOWN

          return (
            <div key={task.taskId} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="font-mono-tech font-bold text-xs text-text-primary">
                    {task.taskId}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono-tech uppercase border ${conf.badgeClass}`}
                >
                  {conf.label}
                </span>
              </div>

              <p className="text-xs text-text-secondary truncate">{task.taskTitle}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tech pt-1">
                <div>
                  <span className="text-text-muted block text-[10px]">EST. COST</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {formatCurrencyUsd(task.cost.estimatedUsd)}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">ACTUAL COST</span>
                  <span className="text-text-primary font-bold">
                    {formatCurrencyUsd(task.cost.actualUsd)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                <span className="text-text-muted font-mono-tech">
                  {formatCompactTokens(task.tokens.total)} tokens • {task.sessionCount ?? '—'} sessions
                </span>
                <Link
                  to={`/tasks?task=${task.taskId}`}
                  className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
                >
                  <span>View</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
