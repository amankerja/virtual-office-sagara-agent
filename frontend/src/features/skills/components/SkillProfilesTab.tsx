import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { Bot, ShieldCheck } from 'lucide-react'

interface SkillProfilesTabProps {
  skill: SkillProjection;
  onNavigateAgent?: (agentId: string) => void;
}

export const SkillProfilesTab: React.FC<SkillProfilesTabProps> = ({
  skill,
  onNavigateAgent,
}) => {
  const profiles = skill.profiles || []

  if (profiles.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <Bot className="h-8 w-8 text-text-muted mx-auto" />
        <p className="text-xs text-text-muted">
          No agent profiles currently bound to this capability.
        </p>
      </div>
    )
  }

  const getBindingBadge = (state: string) => {
    switch (state) {
      case 'observed':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
      case 'requested':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25'
      case 'configured':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-600/25'
      case 'allowed':
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Profile Authorization Policy:
        </span>
        Profile binding permits an agent to access this capability. Actual execution occurs only when dispatched by the agent supervisor.
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Bound Agent Profiles ({profiles.length})
        </h4>

        <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
          {profiles.map((binding) => (
            <div
              key={binding.profileId}
              className="p-3.5 space-y-2 hover:bg-surface-subtle transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-md bg-surface-raised border border-border text-interactive shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onNavigateAgent?.(binding.profileId)}
                      className="font-semibold text-text-primary text-xs hover:text-interactive hover:underline truncate text-left block"
                    >
                      {binding.profileName}
                    </button>
                    <span className="text-[10px] text-text-muted block truncate">
                      {binding.profileId}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${getBindingBadge(
                    binding.bindingState
                  )}`}
                >
                  <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                  {binding.bindingState}
                </span>
              </div>

              {/* Binding Configuration */}
              {binding.configuration && (
                <div className="mt-1.5 p-2 rounded bg-surface-subtle border border-border-subtle text-[11px] text-text-secondary font-mono-tech truncate">
                  Config: <span className="text-text-primary">{binding.configuration}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
