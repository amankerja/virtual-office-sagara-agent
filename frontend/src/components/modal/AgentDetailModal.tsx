import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, SlidersHorizontal, ArrowUpRight } from 'lucide-react'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AgentOverviewTab } from '@/features/agents/components/AgentOverviewTab'
import { AgentSkillsTab } from '@/features/agents/components/AgentSkillsTab'
import { AgentSessionsTab } from '@/features/agents/components/AgentSessionsTab'
import { AgentUsageTab } from '@/features/agents/components/AgentUsageTab'
import { AgentDelegationsTab } from '@/features/agents/components/AgentDelegationsTab'
import type { AgentProjection } from '@/types/agent'

export interface AgentDetailModalProps {
  agent: AgentProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  if (!agent) return null

  const initials = agent.definition.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const handleConfigureProfile = () => {
    onClose()
    navigate(`/agent-config?profile=${encodeURIComponent(agent.id)}&tab=skills`)
  }

  const extraActions = (
    <Button
      variant="outline"
      size="xs"
      onClick={handleConfigureProfile}
      className="border-border bg-surface text-text-secondary hover:text-interactive hover:border-interactive/40 gap-1.5 font-mono-tech text-[11px] min-h-8"
      title="Open configuration editor for this agent's profile"
    >
      <SlidersHorizontal className="h-3 w-3" />
      <span className="hidden sm:inline">Configure Profile</span>
      <ArrowUpRight className="h-3 w-3 opacity-60" />
    </Button>
  )

  const subtitle = (
    <>
      <span className="font-medium text-text-primary">
        {agent.definition.role || 'Specialist Profile'}
      </span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">
        Confidence: {agent.runtime.confidence}
      </span>
      {agent.runtime.currentActivity && (
        <>
          <span>•</span>
          <span className="truncate max-w-xs text-text-muted">
            {agent.runtime.currentActivity}
          </span>
        </>
      )}
    </>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Agent Details: ${agent.definition.name}`}
      size="default"
    >
      <DetailHeader
        title={agent.definition.name}
        subtitle={subtitle}
        icon={initials || <Bot className="h-5 w-5" />}
        idToCopy={agent.id}
        badge={<StatusBadge status={agent.runtime.state} />}
        extraActions={extraActions}
        onClose={onClose}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="px-5 sm:px-6 border-b border-border bg-surface shrink-0">
          <TabsList className="bg-transparent h-10 p-0 gap-5 w-full justify-start overflow-x-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Skills ({agent.skills?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Sessions ({agent.sessions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Usage
            </TabsTrigger>
            <TabsTrigger
              value="delegations"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Delegations ({agent.delegations?.length ?? 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <AgentOverviewTab agent={agent} />
          </TabsContent>

          <TabsContent value="skills" className="m-0 focus-visible:outline-none">
            <AgentSkillsTab agent={agent} />
          </TabsContent>

          <TabsContent value="sessions" className="m-0 focus-visible:outline-none">
            <AgentSessionsTab agent={agent} />
          </TabsContent>

          <TabsContent value="usage" className="m-0 focus-visible:outline-none">
            <AgentUsageTab agent={agent} />
          </TabsContent>

          <TabsContent value="delegations" className="m-0 focus-visible:outline-none">
            <AgentDelegationsTab agent={agent} />
          </TabsContent>
        </div>
      </Tabs>
    </ModalShell>
  )
}
