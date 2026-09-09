import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { EvidenceBadge } from '@/components/shared/EvidenceBadge'
import { Info, Layers, Tag, Hash, Cpu } from 'lucide-react'

interface SkillOverviewTabProps {
  skill: SkillProjection;
}

export const SkillOverviewTab: React.FC<SkillOverviewTabProps> = ({ skill }) => {
  const getSemanticExplanation = () => {
    if (skill.execution === 'observed_active') {
      return 'Active runtime execution telemetry confirmed within the current operational window.'
    }
    if (skill.health === 'degraded') {
      return 'The skill is operational but experiencing degraded performance or collector resource warnings.'
    }
    if (skill.installation === 'missing' || skill.health === 'missing') {
      return 'The capability is registered in the Sagara manifest, but required host tools or binary executables were not found.'
    }
    if (skill.execution === 'requested') {
      return 'The capability was requested by an active profile, but execution confirmation is pending.'
    }
    if (skill.execution === 'completed') {
      return 'Recent execution completed successfully and returned verified results.'
    }
    if (skill.execution === 'failed') {
      return 'Recent execution failed due to an execution error or process exit code.'
    }
    return 'The capability is available, but no verified runtime execution evidence exists for the selected observation window.'
  }

  return (
    <div className="p-4 sm:p-5 space-y-5 text-xs font-mono-tech">
      {/* Semantic Notice Banner */}
      <div className="p-3 rounded-lg bg-surface-subtle border border-border flex items-start gap-2.5">
        <Info className="h-4 w-4 text-interactive shrink-0 mt-0.5" />
        <div className="text-xs font-sans text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary block font-mono-tech text-[11px] mb-0.5">
            Operational Evidence Evaluation:
          </span>
          {getSemanticExplanation()}
        </div>
      </div>

      {/* Core Metadata */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Capability Identification
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Hash className="h-3 w-3" /> Skill ID
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate font-mono-tech">
              {skill.id}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Layers className="h-3 w-3" /> Version
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {skill.version ? `v${skill.version}` : 'Unversioned'}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Tag className="h-3 w-3" /> Category
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {skill.category || 'General'}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Provider Type
            </span>
            <span className="font-medium text-text-primary mt-1 block capitalize">
              {skill.provider || 'builtin'}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Manifest Description
        </h4>
        <p className="text-xs font-sans text-text-secondary bg-surface-subtle p-3 rounded-md border border-border-subtle leading-relaxed">
          {skill.description || 'No description provided in skill manifest.'}
        </p>
      </div>

      {/* Multi-Dimensional Status */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Status Matrix
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted block mb-1">Registration</span>
            <EvidenceBadge type="registration" value={skill.registration} />
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted block mb-1">Installation</span>
            <EvidenceBadge type="installation" value={skill.installation} />
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted block mb-1">Health</span>
            <EvidenceBadge type="health" value={skill.health} />
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted block mb-1">Execution Evidence</span>
            <EvidenceBadge type="execution" value={skill.execution} />
          </div>
        </div>
      </div>
    </div>
  )
}
