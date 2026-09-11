import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { DetailSection } from '@/components/modal/DetailSection'
import { MetadataGrid } from '@/components/modal/MetadataGrid'
import type { AgentProjection } from '@/types/agent'
import { useDraftStore } from '../draft-store'

export interface ProfileOverviewTabProps {
  agent: AgentProjection;
}

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({ agent }) => {
  const { getEffectiveSkills } = useDraftStore()
  const originalSkillIds = agent.skills?.map((s) => s.id) || []
  const effectiveSkills = getEffectiveSkills(agent.id, originalSkillIds)

  return (
    <div className="space-y-5">
      {/* Configuration Status Summary */}
      <div className="p-3.5 rounded-lg border border-border bg-surface-subtle flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-text-primary font-mono-tech block">
              Configuration Complete
            </span>
            <span className="text-[11px] text-text-muted">
              Source: Sagara ProfileRegistry • Immutable production profile
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
          Registry Validated
        </span>
      </div>

      {/* Profile Specification Metadata Grid */}
      <DetailSection title="Profile Specification">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Profile Identifier',
              value: agent.id,
              hint: 'Read-only system identifier',
            },
            {
              label: 'Display Name',
              value: agent.definition.name,
              hint: 'Configured in profile.yaml',
            },
            {
              label: 'Functional Role',
              value: agent.definition.role || 'Unspecified Role',
              hint: 'Read-only profile specialization',
            },
            {
              label: 'Profile Status',
              value: agent.definition.enabled ? 'Enabled' : 'Disabled',
              hint: 'Registry lifecycle state',
            },
          ]}
        />
      </DetailSection>

      {/* Description */}
      <DetailSection title="Operational Purpose & Description">
        <div className="p-3.5 rounded-lg border border-border bg-surface text-xs leading-relaxed text-text-primary">
          {agent.definition.description || 'No operational description configured for this profile.'}
        </div>
      </DetailSection>

      {/* Capability & Architecture */}
      <DetailSection title="Capability & Memory Boundaries">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Memory Namespace',
              value: `sagara:${agent.id}`,
              hint: 'Deterministic workspace isolation',
            },
            {
              label: 'Allowed Skill Count',
              value: `${effectiveSkills.length} skills active (${originalSkillIds.length} base)`,
              hint: 'Draft editable via Skills tab',
            },
            {
              label: 'Source Registry',
              value: 'Sagara ProfileRegistry',
              hint: 'Loaded from local project manifests',
            },
            {
              label: 'Field Mutability Policy',
              value: 'Read-Only (Draft Changeset Supported)',
              hint: 'Requires ChangeSet validation for future apply',
            },
          ]}
        />
      </DetailSection>
    </div>
  )
}
