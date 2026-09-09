import React from 'react'
import type { AgentProjection, AgentSkillEvidence, SkillHealthState } from '@/types/agent'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Cpu, CheckCircle2, AlertCircle, HelpCircle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentSkillsTabProps {
  agent: AgentProjection;
}

const HEALTH_CONFIG_MAP: Record<SkillHealthState, { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }> = {
  HEALTHY: {
    label: 'Healthy',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    icon: CheckCircle2,
  },
  DEGRADED: {
    label: 'Degraded',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/20',
    icon: AlertCircle,
  },
  MISSING: {
    label: 'Missing',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/20',
    icon: AlertCircle,
  },
  REQUESTED: {
    label: 'Requested',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/20',
    icon: HelpCircle,
  },
  EXECUTION_UNKNOWN: {
    label: 'Unknown',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/20',
    icon: HelpCircle,
  },
  OBSERVED_ACTIVE: {
    label: 'Observed Active',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-600/20',
    icon: Activity,
  },
}

export const AgentSkillsTab: React.FC<AgentSkillsTabProps> = ({ agent }) => {
  const skills: AgentSkillEvidence[] = agent.skills || []

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="No Skills Bound"
        description="This agent profile has not been assigned explicit capabilities in its configuration manifest."
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono-tech px-1">
        <span>Assigned Capabilities ({skills.length})</span>
        <span>Evidence Verification</span>
      </div>

      <div className="space-y-2">
        {skills.map((skill) => {
          const config = HEALTH_CONFIG_MAP[skill.health] || HEALTH_CONFIG_MAP.EXECUTION_UNKNOWN
          const IconComponent = config.icon

          return (
            <div
              key={skill.id}
              className="p-3 rounded-lg border border-border bg-surface hover:border-border-strong transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary font-mono-tech text-xs">
                      {skill.name}
                    </span>
                    <Badge variant="outline" className="border-border bg-surface-subtle text-[10px] text-text-muted">
                      {skill.category}
                    </Badge>
                  </div>
                  {skill.description && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {skill.description}
                    </p>
                  )}
                </div>

                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border font-mono-tech uppercase shrink-0',
                    config.badgeClass
                  )}
                >
                  <IconComponent className="h-3 w-3" />
                  {config.label}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle text-[11px] font-mono-tech text-text-muted">
                <span>Status: {config.label}</span>
                <span className="text-text-secondary">Evidence: {skill.evidence}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
