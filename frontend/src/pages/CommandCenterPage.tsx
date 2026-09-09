import React from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  Layers,
  Radio,
  Clock,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetricCard } from '@/components/shared/MetricCard'
import { SectionCard } from '@/components/shared/SectionCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export const CommandCenterPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Command Center"
        description="Unified operational overview across Sagara agents, runtime telemetry, and action queues."
        badge={
          <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
            TELEMETRY V0
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="xs"
            asChild
            className="border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors min-h-[36px] sm:min-h-[28px]"
          >
            <Link to="/agents">
              View Agents
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      />

      {/* 1. System Pulse Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xs font-semibold text-text-muted tracking-wider uppercase font-mono-tech">
            System Pulse
          </h2>
          <span className="text-[11px] text-text-muted font-mono-tech">
            Awaiting backend connection
          </span>
        </div>

        {/* Responsive Grid: 1-2 cols mobile, 3 cols tablet, 6 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Gateway"
            value="Not connected"
            subtext="Backend offline"
            icon={Radio}
            statusTone="neutral"
          />
          <MetricCard
            label="Profiles"
            value="—"
            subtext="0 registered"
            icon={Layers}
            statusTone="neutral"
          />
          <MetricCard
            label="Active Agents"
            value="—"
            subtext="0 running"
            icon={Bot}
            statusTone="neutral"
          />
          <MetricCard
            label="Sessions"
            value="—"
            subtext="0 active"
            icon={Activity}
            statusTone="neutral"
          />
          <MetricCard
            label="Skill Health"
            value="—"
            subtext="No telemetry"
            icon={Cpu}
            statusTone="neutral"
          />
          <MetricCard
            label="Needs Attention"
            value="—"
            subtext="0 pending items"
            icon={AlertTriangle}
            statusTone="neutral"
          />
        </div>
      </div>

      {/* 2. Operational Grids: Attention Queue & Agent Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Attention Queue */}
        <SectionCard
          title="Attention Queue"
          description="High-priority approval gates, human interventions, and degraded health alerts."
        >
          <EmptyState
            icon={ShieldCheck}
            title="Attention Queue Clear"
            description="No agent interventions or approvals currently require human operator sign-off."
          />
        </SectionCard>

        {/* Agent Overview */}
        <SectionCard
          title="Agent Overview"
          description="Operational status and active workload projections for registered agent instances."
          action={
            <Button variant="ghost" size="xs" asChild className="text-text-muted hover:text-text-primary">
              <Link to="/agents" className="flex items-center gap-1 font-mono-tech text-[11px]">
                Directory
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          <EmptyState
            icon={Bot}
            title="No Active Agents Detected"
            description="Agents will appear in this cluster once connected to the Sagara Mission Control API."
          />
        </SectionCard>
      </div>

      {/* 3. Recent Activity */}
      <SectionCard
        title="Recent Activity"
        description="Chronological log of agent actions, system handoffs, and capability executions."
        action={
          <Button variant="ghost" size="xs" asChild className="text-text-muted hover:text-text-primary">
            <Link to="/activity" className="flex items-center gap-1 font-mono-tech text-[11px]">
              Full Log
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        }
      >
        <EmptyState
          icon={Clock}
          title="Event Stream Inactive"
          description="Live operational telemetry and event feeds will stream here when the Mission Control API is online."
        />
      </SectionCard>
    </div>
  )
}
