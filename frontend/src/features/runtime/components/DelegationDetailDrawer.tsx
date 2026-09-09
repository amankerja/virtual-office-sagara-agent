import React, { useState } from 'react'
import type { DelegationProjection } from '@/types/runtime'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DelegationOverviewTab } from './delegation-tabs/DelegationOverviewTab'
import { DelegationTaskTab } from './delegation-tabs/DelegationTaskTab'
import { DelegationResultTab } from './delegation-tabs/DelegationResultTab'
import { DelegationTimelineTab } from './delegation-tabs/DelegationTimelineTab'
import { GitFork, Copy, Check } from 'lucide-react'

interface DelegationDetailDrawerProps {
  delegation: DelegationProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateSession?: (id: string) => void;
}

export const DelegationDetailDrawer: React.FC<DelegationDetailDrawerProps> = ({
  delegation,
  isOpen,
  onClose,
  onNavigateSession,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'task' | 'result' | 'timeline'>('overview')
  const [copied, setCopied] = useState(false)

  if (!delegation) return null

  const handleCopyId = () => {
    navigator.clipboard.writeText(delegation.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-135 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-mono-tech">
                <GitFork className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-base font-semibold text-text-primary tracking-tight truncate font-mono-tech">
                    {delegation.id}
                  </SheetTitle>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide font-mono-tech ${getStateClass(
                      delegation.state
                    )}`}
                  >
                    {delegation.state}
                  </span>
                </div>
                <SheetDescription className="text-xs text-text-secondary mt-0.5 truncate font-sans">
                  {delegation.taskTitle}
                </SheetDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopyId}
              className="border-border bg-surface text-text-muted hover:text-text-primary shrink-0 min-h-9 min-w-9 sm:min-h-7 sm:min-w-7"
              title="Copy Delegation ID"
              aria-label="Copy Delegation ID"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </SheetHeader>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b border-border bg-surface-subtle/50 px-4 sm:px-5 shrink-0">
            <TabsList className="bg-transparent h-10 p-0 space-x-4 border-b-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="task"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Task
              </TabsTrigger>
              <TabsTrigger
                value="result"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Result
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Timeline ({delegation.timeline?.length ?? 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
              <DelegationOverviewTab
                delegation={delegation}
                onNavigateSession={onNavigateSession}
              />
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
      </SheetContent>
    </Sheet>
  )
}
