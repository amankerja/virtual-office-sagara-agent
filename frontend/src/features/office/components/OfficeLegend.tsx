import React from 'react'
import {
  Activity,
  PauseCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  PowerOff,
  HelpCircle,
  Settings,
} from 'lucide-react'

const LEGEND_ITEMS = [
  { label: 'Active', icon: Activity, colorClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
  { label: 'Idle', icon: PauseCircle, colorClass: 'text-slate-600 dark:text-slate-400', dotClass: 'bg-slate-400' },
  { label: 'Recently Active', icon: Clock, colorClass: 'text-cyan-600 dark:text-cyan-400', dotClass: 'bg-cyan-500' },
  { label: 'Approval Needed', icon: AlertTriangle, colorClass: 'text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-500' },
  { label: 'Degraded', icon: AlertCircle, colorClass: 'text-orange-600 dark:text-orange-400', dotClass: 'bg-orange-500' },
  { label: 'Error', icon: AlertCircle, colorClass: 'text-rose-600 dark:text-rose-400', dotClass: 'bg-rose-500' },
  { label: 'Offline', icon: PowerOff, colorClass: 'text-slate-500', dotClass: 'bg-slate-500' },
  { label: 'Unknown', icon: HelpCircle, colorClass: 'text-purple-600 dark:text-purple-400', dotClass: 'bg-purple-500' },
  { label: 'Config Incomplete', icon: Settings, colorClass: 'text-yellow-600 dark:text-yellow-500', dotClass: 'bg-yellow-500' },
]

export const OfficeLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 bg-surface/70 border border-border rounded-lg text-[11px] font-mono-tech text-text-secondary">
      <span className="font-bold text-text-primary uppercase tracking-wider text-[10px]">
        Status Legend:
      </span>
      {LEGEND_ITEMS.map((item) => {
        const IconComponent = item.icon
        return (
          <div key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
            <IconComponent className={`h-3 w-3 ${item.colorClass}`} />
            <span>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
