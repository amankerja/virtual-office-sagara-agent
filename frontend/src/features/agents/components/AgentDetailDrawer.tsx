import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Copy, Check, Bot } from 'lucide-react'
import { AgentOverviewTab } from './AgentOverviewTab'
import { AgentSkillsTab } from './AgentSkillsTab'
import { AgentSessionsTab } from './AgentSessionsTab'
import { AgentUsageTab } from './AgentUsageTab'
import { AgentDelegationsTab } from './AgentDelegationsTab'
import type { AgentProjection } from '@/types/agent'

interface AgentDetailDrawerProps {
  agent: AgentProjection | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  agent,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  if (!agent) return null

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(agent.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Generate initials from agent name
  const initials = agent.definition.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-[540px] p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Agent Avatar Icon / Initials */}
              <div className="h-10 w-10 shrink-0 rounded-lg bg-interactive/10 border border-interactive/30 flex items-center justify-center text-interactive font-mono-tech font-bold text-sm">
                {initials || <Bot className="h-5 w-5" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-base font-semibold text-text-primary tracking-tight truncate">
                    {agent.definition.name}
                  </SheetTitle>
                  <StatusBadge status={agent.runtime.state} />
                </div>
                <SheetDescription className="text-xs text-text-secondary mt-0.5 truncate">
                  {agent.definition.role || 'Specialist Profile'} •{' '}
                  <span className="font-mono-tech text-text-muted">
                    Confidence: {agent.runtime.confidence}
                  </span>
                </SheetDescription>
              </div>
            </div>

            {/* Copy Identifier Action */}
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopyId}
              className="border-border bg-surface text-text-muted hover:text-text-primary shrink-0 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px]"
              title="Copy Agent ID"
              aria-label="Copy Agent ID"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </SheetHeader>

        {/* Tabbed Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-4 border-b border-border bg-surface shrink-0">
            <TabsList className="bg-transparent h-10 p-0 gap-4 w-full justify-start overflow-x-auto">
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

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <TabsContent value="overview" className="m-0">
              <AgentOverviewTab agent={agent} />
            </TabsContent>

            <TabsContent value="skills" className="m-0">
              <AgentSkillsTab agent={agent} />
            </TabsContent>

            <TabsContent value="sessions" className="m-0">
              <AgentSessionsTab agent={agent} />
            </TabsContent>

            <TabsContent value="usage" className="m-0">
              <AgentUsageTab agent={agent} />
            </TabsContent>

            <TabsContent value="delegations" className="m-0">
              <AgentDelegationsTab agent={agent} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
