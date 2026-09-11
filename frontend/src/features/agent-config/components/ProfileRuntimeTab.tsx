import React from 'react'
import { Activity, ArrowUpRight } from 'lucide-react'
import { DetailSection } from '@/components/modal/DetailSection'
import { MetadataGrid } from '@/components/modal/MetadataGrid'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { AgentProjection } from '@/types/agent'
import { useEntityDetailNavigation } from '@/hooks/useEntityDetailNavigation'

export interface ProfileRuntimeTabProps {
  agent: AgentProjection;
}

export const ProfileRuntimeTab: React.FC<ProfileRuntimeTabProps> = ({ agent }) => {
  const { openAgentDetail } = useEntityDetailNavigation()
  const { runtime } = agent

  return (
    <div className="space-y-5">
      {/* Informational Header */}
      <div className="p-3.5 rounded-lg border border-border bg-surface-subtle flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-interactive" />
          <span className="text-xs font-semibold text-text-primary font-mono-tech">
            Runtime Telemetry & Execution State
          </span>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => openAgentDetail(agent.id)}
          className="border-border bg-surface text-interactive hover:bg-surface-hover gap-1 font-mono-tech text-xs h-7"
        >
          Open Runtime Details
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </div>

      <DetailSection title="Live Correlation Telemetry">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Runtime State',
              value: <StatusBadge status={runtime.state} />,
              hint: 'Derived from active sessions and heartbeats',
            },
            {
              label: 'Runtime Confidence',
              value: runtime.confidence,
              hint: 'Confidence score derived deterministically',
            },
            {
              label: 'Runtime Source',
              value: 'Hermes / Local Runtime Adapter',
              hint: 'Contract V1 correlation layer',
            },
            {
              label: 'Current Session ID',
              value: runtime.currentSessionId || 'No active session',
              hint: 'Active session reference',
            },
          ]}
        />
      </DetailSection>

      <DetailSection title="Assigned Model Configuration">
        <MetadataGrid
          columns={2}
          items={[
            {
              label: 'Default Model',
              value: runtime.model || 'Not configured in current contract',
              hint: 'Model selection preference',
            },
            {
              label: 'Context Window Size',
              value: '128,000 tokens (Standard)',
              hint: 'Contract default specification',
            },
            {
              label: 'Temperature / Top-P',
              value: '0.2 / 0.95',
              hint: 'Deterministic enterprise execution profile',
            },
            {
              label: 'Gateway Route',
              value: 'Local Fastify / Hermes Bridge',
              hint: 'Production router proxy',
            },
          ]}
        />
      </DetailSection>
    </div>
  )
}
