import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Layers, Bot, Activity, Cpu, AlertTriangle } from 'lucide-react'
import type { SystemPulseData } from '@/types/mission-control'
import { cn } from '@/lib/utils'

interface SystemPulseProps {
  pulse: SystemPulseData;
  isLoading?: boolean;
}

export const SystemPulse: React.FC<SystemPulseProps> = ({ pulse, isLoading = false }) => {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="h-16 rounded-lg bg-surface border border-border animate-pulse" />
    )
  }

  const { gateway, profiles, activeAgents, sessions, skills, attention } = pulse

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border">
        {/* 1. Gateway */}
        <div
          onClick={() => navigate('/runtime?tab=gateway')}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/runtime?tab=gateway')}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Gateway</span>
            <Radio className="h-3 w-3 text-text-muted group-hover:text-interactive" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full shrink-0', gateway.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500')} />
            <span className="font-semibold text-text-primary text-xs">{gateway.status}</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">{gateway.detail}</p>
        </div>

        {/* 2. Profiles */}
        <div
          onClick={() => navigate('/agent-config')}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/agent-config')}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Profiles</span>
            <Layers className="h-3 w-3 text-text-muted group-hover:text-interactive" />
          </div>
          <div className="text-xs font-semibold text-text-primary">
            {profiles.registered} <span className="text-[11px] font-normal text-text-muted">registered</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">{profiles.enabled} enabled, {profiles.incomplete} incomplete</p>
        </div>

        {/* 3. Active Agents */}
        <div
          onClick={() => navigate('/agents?state=Active')}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/agents?state=Active')}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Active Agents</span>
            <Bot className="h-3 w-3 text-text-muted group-hover:text-interactive" />
          </div>
          <div className="text-xs font-semibold text-text-primary">
            {activeAgents.active} <span className="text-[11px] font-normal text-text-muted">/ {activeAgents.enabledTotal}</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">Fleet operational</p>
        </div>

        {/* 4. Sessions */}
        <div
          onClick={() => navigate('/runtime?tab=sessions')}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/runtime?tab=sessions')}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Sessions</span>
            <Activity className="h-3 w-3 text-text-muted group-hover:text-interactive" />
          </div>
          <div className="text-xs font-semibold text-text-primary">
            {sessions.active} <span className="text-[11px] font-normal text-text-muted">active</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">Across {sessions.totalAgents} agents</p>
        </div>

        {/* 5. Skills */}
        <div
          onClick={() => navigate('/skills')}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/skills')}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Skills</span>
            <Cpu className="h-3 w-3 text-text-muted group-hover:text-interactive" />
          </div>
          <div className="text-xs font-semibold text-text-primary">
            {skills.healthy + skills.degraded} <span className="text-[11px] font-normal text-text-muted">active</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">{skills.healthy} healthy</p>
        </div>

        {/* 6. Attention */}
        <div
          onClick={() => {
            const el = document.getElementById('attention-queue-section')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
          className="p-3 hover:bg-surface-hover transition-colors cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const el = document.getElementById('attention-queue-section')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        >
          <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
            <span className="font-medium">Attention</span>
            <AlertTriangle className={cn('h-3 w-3', attention.count > 0 ? 'text-amber-500' : 'text-text-muted')} />
          </div>
          <div className={cn('text-xs font-semibold', attention.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary')}>
            {attention.count} <span className="text-[11px] font-normal text-text-muted">pending</span>
          </div>
          <p className="text-[10px] text-text-muted truncate mt-0.5">
            {attention.count === 0 ? 'Queue clear' : `${attention.criticalCount} critical`}
          </p>
        </div>
      </div>
    </div>
  )
}
