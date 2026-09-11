import React from 'react'
import { DetailSection } from '@/components/modal/DetailSection'
import { MetadataGrid } from '@/components/modal/MetadataGrid'
import type { AgentProjection } from '@/types/agent'

export interface ProfileAdvancedTabProps {
  agent: AgentProjection;
}

export const ProfileAdvancedTab: React.FC<ProfileAdvancedTabProps> = ({ agent }) => {
  return (
    <div className="space-y-5">
      <DetailSection title="Architecture & Blueprint Metadata">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Profile Definition ID',
              value: agent.id,
              hint: 'Immutable internal key',
            },
            {
              label: 'Memory Namespace',
              value: `sagara:${agent.id}`,
              hint: 'Profile-specific Redis/vector isolation',
            },
            {
              label: 'Registry Source',
              value: 'Sagara ProfileRegistry',
              hint: 'Local manifest filesystem origin',
            },
            {
              label: 'Configuration Manifest',
              value: 'profile.yaml',
              hint: 'Relative manifest filename (path sanitized)',
            },
          ]}
        />
      </DetailSection>

      <DetailSection title="Capability Metadata & Tool Governance">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Capability Revision',
              value: 'rev-2026.09-v1',
              hint: 'Registry version tag',
            },
            {
              label: 'Tool Dispatch Privilege',
              value: 'Restricted to Allowed Skills',
              hint: 'Strict sandbox execution policy',
            },
            {
              label: 'Autonomous Delegation Limit',
              value: 'Max 3 concurrent sub-agents',
              hint: 'Runtime concurrency bounds',
            },
            {
              label: 'Telemetry Heartbeat Rate',
              value: '30 seconds interval',
              hint: 'Gateway correlation frequency',
            },
          ]}
        />
      </DetailSection>
    </div>
  )
}
