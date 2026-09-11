import React, { useState } from 'react'
import type { SessionProjection } from '@/types/runtime'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SessionOverviewTab } from '@/features/runtime/components/session-tabs/SessionOverviewTab'
import { SessionMessagesTab } from '@/features/runtime/components/session-tabs/SessionMessagesTab'
import { SessionToolsTab } from '@/features/runtime/components/session-tabs/SessionToolsTab'
import { SessionUsageTab } from '@/features/runtime/components/session-tabs/SessionUsageTab'
import { SessionRelatedTab } from '@/features/runtime/components/session-tabs/SessionRelatedTab'
import { Radio } from 'lucide-react'

export interface SessionDetailModalProps {
  session: SessionProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateSession?: (id: string) => void;
  onNavigateDelegation?: (id: string) => void;
  onNavigateAgent?: (agentId: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onNavigateSession,
  onNavigateDelegation,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'tools' | 'usage' | 'related'>('overview')

  if (!session) return null

  const getStateClass = (state: SessionProjection['state']) => {
    switch (state) {
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
      case 'FAILED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
      case 'COMPLETED':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25'
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
    }
  }

  const badge = (
    <span
      className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase ${getStateClass(
        session.state
      )}`}
    >
      {session.state}
    </span>
  )

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-primary">Profile: {session.profileId || session.agentName}</span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">Source: {session.source || 'runtime'}</span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">Model: {session.model || 'unknown'}</span>
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Session Details: ${session.id}`}
      size="default"
    >
      <DetailHeader
        title={`Session ${session.id.slice(0, 12)}...`}
        subtitle={subtitle}
        icon={<Radio className="h-5 w-5" />}
        idToCopy={session.id}
        badge={badge}
        onClose={onClose}
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b border-border bg-surface px-5 sm:px-6 shrink-0">
          <TabsList className="bg-transparent h-10 p-0 gap-5 w-full justify-start overflow-x-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Transcript ({session.messagesCount})
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Tool Calls ({session.toolsCount})
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Usage & Cost
            </TabsTrigger>
            <TabsTrigger
              value="related"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Hierarchy
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <SessionOverviewTab session={session} />
          </TabsContent>

          {/* Lazy loaded: only mounts when selected */}
          {activeTab === 'messages' && (
            <TabsContent value="messages" className="m-0 focus-visible:outline-none">
              <SessionMessagesTab messages={session.messages} />
            </TabsContent>
          )}

          <TabsContent value="tools" className="m-0 focus-visible:outline-none">
            <SessionToolsTab tools={session.tools} />
          </TabsContent>

          <TabsContent value="usage" className="m-0 focus-visible:outline-none">
            <SessionUsageTab usage={session.usage} />
          </TabsContent>

          <TabsContent value="related" className="m-0 focus-visible:outline-none">
            <SessionRelatedTab
              session={session}
              onNavigateSession={onNavigateSession}
              onNavigateDelegation={onNavigateDelegation}
            />
          </TabsContent>
        </div>
      </Tabs>
    </ModalShell>
  )
}
