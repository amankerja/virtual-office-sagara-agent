import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Package } from 'lucide-react'

interface SkillDependenciesTabProps {
  skill: SkillProjection;
}

export const SkillDependenciesTab: React.FC<SkillDependenciesTabProps> = ({ skill }) => {
  const dependencies = skill.dependencies || []

  if (dependencies.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <Package className="h-8 w-8 text-text-muted mx-auto" />
        <p className="text-xs text-text-muted">
          No external dependencies declared for this capability manifest.
        </p>
      </div>
    )
  }

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'available':
        return {
          icon: CheckCircle2,
          class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25',
        }
      case 'degraded':
        return {
          icon: AlertTriangle,
          class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25',
        }
      case 'missing':
        return {
          icon: XCircle,
          class: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25',
        }
      default:
        return {
          icon: HelpCircle,
          class: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25',
        }
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Dependency Verification Boundary:
        </span>
        Host dependencies are verified by runtime supervisors prior to capability execution. Secrets and raw credentials are redacted.
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Declared Dependencies ({dependencies.length})
        </h4>

        <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {dependencies.map((dep, idx) => {
            const stateConfig = getStateBadge(dep.state)
            const Icon = stateConfig.icon

            return (
              <div
                key={`${dep.name}-${idx}`}
                className="p-3.5 space-y-1.5 hover:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="font-semibold text-text-primary text-xs truncate">
                      {dep.name}
                    </span>
                    <span className="text-[10px] text-text-muted bg-surface-raised px-1.5 py-0.5 rounded border border-border">
                      {dep.type}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${stateConfig.class}`}
                  >
                    <Icon className="h-2.5 w-2.5 mr-1" />
                    {dep.state}
                  </span>
                </div>

                {dep.reason && (
                  <p className="text-[11px] text-text-secondary font-sans pl-6 leading-relaxed">
                    {dep.reason}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
