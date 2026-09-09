import React, { useState } from 'react'
import type { SkillProjection } from '@/types/skill'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { EvidenceBadge } from '@/components/shared/EvidenceBadge'
import { SkillOverviewTab } from './SkillOverviewTab'
import { SkillProfilesTab } from './SkillProfilesTab'
import { SkillDependenciesTab } from './SkillDependenciesTab'
import { SkillEvidenceTab } from './SkillEvidenceTab'
import { Layers, Copy, Check } from 'lucide-react'

interface SkillDetailDrawerProps {
  skill: SkillProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateAgent?: (agentId: string) => void;
  onNavigateSession?: (sessionId: string) => void;
}

export const SkillDetailDrawer: React.FC<SkillDetailDrawerProps> = ({
  skill,
  isOpen,
  onClose,
  onNavigateAgent,
  onNavigateSession,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'dependencies' | 'evidence'>('overview')
  const [copied, setCopied] = useState(false)

  if (!skill) return null

  const handleCopyId = () => {
    navigator.clipboard.writeText(skill.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:w-[75vw] lg:w-135 p-0 bg-surface border-l border-border flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle shrink-0 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-interactive/10 border border-interactive/30 flex items-center justify-center text-interactive">
                <Layers className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-base font-semibold text-text-primary tracking-tight truncate">
                    {skill.name}
                  </SheetTitle>
                  <EvidenceBadge type="health" value={skill.health} />
                </div>
                <SheetDescription className="text-xs text-text-secondary mt-0.5 truncate font-mono-tech">
                  {skill.category || 'General'} • {skill.id}
                </SheetDescription>
              </div>
            </div>

            {/* Copy Action */}
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopyId}
              className="border-border bg-surface text-text-muted hover:text-text-primary shrink-0 min-h-9 min-w-9 sm:min-h-7 sm:min-w-7"
              title="Copy Skill ID"
              aria-label="Copy Skill ID"
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
                value="profiles"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Profiles ({skill.profiles?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger
                value="dependencies"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Dependencies ({skill.dependencies?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger
                value="evidence"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-interactive rounded-none px-1 pb-2 text-xs font-mono-tech"
              >
                Evidence ({skill.runtimeEvidence?.length ?? 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
              <SkillOverviewTab skill={skill} />
            </TabsContent>

            <TabsContent value="profiles" className="m-0 focus-visible:outline-none">
              <SkillProfilesTab skill={skill} onNavigateAgent={onNavigateAgent} />
            </TabsContent>

            <TabsContent value="dependencies" className="m-0 focus-visible:outline-none">
              <SkillDependenciesTab skill={skill} />
            </TabsContent>

            <TabsContent value="evidence" className="m-0 focus-visible:outline-none">
              <SkillEvidenceTab
                skill={skill}
                onNavigateSession={onNavigateSession}
                onNavigateAgent={onNavigateAgent}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
