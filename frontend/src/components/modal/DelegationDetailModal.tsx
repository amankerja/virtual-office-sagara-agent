import React, { useState } from 'react'
import type { DelegationProjection } from '@/types/runtime'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DelegationOverviewTab } from '@/features/runtime/components/delegation-tabs/DelegationOverviewTab'
import { DelegationTaskTab } from '@/features/runtime/components/delegation-tabs/DelegationTaskTab'
import { DelegationResultTab } from '@/features/runtime/components/delegation-tabs/DelegationResultTab'
import { DelegationTimelineTab } from '@/features/runtime/components/delegation-tabs/DelegationTimelineTab'
import { GitFork } from 'lucide-react'

export interface DelegationDetailModalProps {
  delegation: DelegationProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateSession?: (id: string) => void;
}

export const DelegationDetailModal: React.FC<DelegationDetailModalProps> = ({
  delegation,
  isOpen,
  onClose,
  onNavigateSession,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'task' | 'result' | 'timeline'>('overview')

  if (!delegation) return null

  const getStateClass = (state: DelegationProjection['state']) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/25'
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/25'
      case 'FAILED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/25'
      case 'QUEUED':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/25'
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/25'
    }
  }

  const badge = (
    <span
      className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border uppercase ${getStateClass(
        delegation.state
      )}`}
    >
      {delegation.state}
    </span>
  )

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-primary">
        Origin: {delegation.originSessionId.slice(0, 8)}...
      </span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">
        Parent: {delegation.parentSessionId ? `${delegation.parentSessionId.slice(0, 8)}...` : 'Direct'}
      </span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">Owner PID: {delegation.ownerPid ?? '—'}</span>
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Delegation Details: ${delegation.id}`}
      size="default"
    >
      <DetailHeader
        title={`Delegation ${delegation.id.slice(0, 12)}...`}
        subtitle={subtitle}
        icon={<GitFork className="h-5 w-5" />}
        idToCopy={delegation.id}
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
              value="task"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Delegated Payload
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Result
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Lifecycle Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <DelegationOverviewTab delegation={delegation} onNavigateSession={onNavigateSession} />
          </TabsContent>

          <TabsContent value="task" className="m-0 focus-visible:outline-none">
            <DelegationTaskTab delegation={delegation} />
          </TabsContent>

          <TabsContent value="result" className="m-0 focus-visible:outline-none">
            <DelegationResultTab delegation={delegation} />
          </TabsContent>

          <TabsContent value="timeline" className="m-0 focus-visible:outline-none">
            <DelegationTimelineTab delegation={delegation} />
          </TabsContent>
        </div>
      </Tabs>
    </ModalShell>
  )
}
