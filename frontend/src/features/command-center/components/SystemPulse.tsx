import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Layers, Bot, Activity, Cpu, AlertTriangle } from 'lucide-react'
import { MetricCard } from '@/components/shared/MetricCard'
import type { SystemPulseData } from '@/types/mission-control'

interface SystemPulseProps {
  pulse: SystemPulseData;
  isLoading?: boolean;
}

export const SystemPulse: React.FC<SystemPulseProps> = ({ pulse, isLoading = false }) => {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-surface-subtle animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  const { gateway, profiles, activeAgents, sessions, skills, attention } = pulse

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h2 className="text-xs font-semibold text-text-muted tracking-wider uppercase font-mono-tech">
          System Pulse
        </h2>
        <span className="text-[11px] text-text-muted font-mono-tech">
          Autonomous Telemetry Feed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Gateway State (Clickable to /runtime?tab=gateway) */}
        <div
          onClick={() => navigate('/runtime?tab=gateway')}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/runtime?tab=gateway')}
          title="Inspect Gateway Telemetry"
        >
          <MetricCard
            label="Gateway"
            value={gateway.status}
            subtext={gateway.detail}
            icon={Radio}
            statusTone={gateway.status === 'HEALTHY' ? 'active' : 'warning'}
            className="group-hover:border-interactive transition-colors"
          />
        </div>

        {/* Profiles */}
        <MetricCard
          label="Profiles"
          value={profiles.registered}
          subtext={`${profiles.enabled} enabled, ${profiles.incomplete} incomplete`}
          icon={Layers}
          statusTone="default"
        />

        {/* Active Agents (Clickable to /agents?state=Active) */}
        <div
          onClick={() => navigate('/agents?state=Active')}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/agents?state=Active')}
          title="Filter agents by Active state"
        >
          <MetricCard
            label="Active Agents"
            value={activeAgents.active}
            subtext={`of ${activeAgents.enabledTotal} enabled profiles`}
            icon={Bot}
            statusTone="active"
            className="group-hover:border-interactive transition-colors"
          />
        </div>

        {/* Sessions (Clickable to /runtime?tab=sessions) */}
        <div
          onClick={() => navigate('/runtime?tab=sessions')}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/runtime?tab=sessions')}
          title="View Sessions Browser"
        >
          <MetricCard
            label="Sessions"
            value={sessions.active}
            subtext={`across ${sessions.totalAgents} active agents`}
            icon={Activity}
            statusTone="default"
            className="group-hover:border-interactive transition-colors"
          />
        </div>

        {/* Skill Health (Clickable to /skills) */}
        <div
          onClick={() => navigate('/skills')}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/skills')}
          title="Open Skills Registry"
        >
          <MetricCard
            label="Skill Health"
            value={`${skills.healthy} Healthy`}
            subtext={`${skills.degraded} degraded, ${skills.missing} missing`}
            icon={Cpu}
            statusTone={skills.degraded > 0 || skills.missing > 0 ? 'warning' : 'active'}
            className="group-hover:border-interactive transition-colors"
          />
        </div>

        {/* Needs Attention */}
        <div
          onClick={() => {
            const queueEl = document.getElementById('attention-queue-section')
            queueEl?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              document.getElementById('attention-queue-section')?.scrollIntoView({ behavior: 'smooth' })
            }
          }}
          title="Jump to Attention Queue"
        >
          <MetricCard
            label="Needs Attention"
            value={attention.count}
            subtext={`${attention.criticalCount} critical, ${attention.highCount} high`}
            icon={AlertTriangle}
            statusTone={attention.criticalCount > 0 ? 'error' : attention.count > 0 ? 'warning' : 'neutral'}
            className="group-hover:border-amber-500/50 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
