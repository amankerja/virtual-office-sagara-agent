import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SkillProjection } from '@/types/skill'
import { ModalShell } from './ModalShell'
import { DetailHeader } from './DetailHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EvidenceBadge } from '@/components/shared/EvidenceBadge'
import { SkillOverviewTab } from '@/features/skills/components/SkillOverviewTab'
import { SkillProfilesTab } from '@/features/skills/components/SkillProfilesTab'
import { SkillDependenciesTab } from '@/features/skills/components/SkillDependenciesTab'
import { SkillEvidenceTab } from '@/features/skills/components/SkillEvidenceTab'
import { Layers } from 'lucide-react'

export interface SkillDetailModalProps {
  skill: SkillProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateAgent?: (agentId: string) => void;
  onNavigateSession?: (sessionId: string) => void;
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  isOpen,
  onClose,
  onNavigateAgent,
  onNavigateSession,
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'dependencies' | 'evidence'>('overview')

  if (!skill) return null

  const handleProfileClick = (profileId: string) => {
    onClose()
    navigate(`/agent-config?profile=${encodeURIComponent(profileId)}&tab=skills`)
  }

  const subtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono-tech text-text-muted">Domain: {skill.category || 'General'}</span>
      <span>•</span>
      <span className="font-mono-tech text-text-muted">ID: {skill.id}</span>
      {skill.version && (
        <>
          <span>•</span>
          <span className="font-mono-tech text-text-muted">v{skill.version}</span>
        </>
      )}
    </div>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Skill Details: ${skill.name}`}
      size="default"
    >
      <DetailHeader
        title={skill.name}
        subtitle={subtitle}
        icon={<Layers className="h-5 w-5" />}
        idToCopy={skill.id}
        badge={<EvidenceBadge type="health" value={skill.health} />}
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
              value="profiles"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Assigned Profiles
            </TabsTrigger>
            <TabsTrigger
              value="dependencies"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Dependencies
            </TabsTrigger>
            <TabsTrigger
              value="evidence"
              className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
            >
              Execution Evidence
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <SkillOverviewTab skill={skill} />
          </TabsContent>

          <TabsContent value="profiles" className="m-0 focus-visible:outline-none">
            <SkillProfilesTab
              skill={skill}
              onNavigateAgent={(profileId) => {
                if (onNavigateAgent) {
                  onNavigateAgent(profileId)
                } else {
                  handleProfileClick(profileId)
                }
              }}
            />
          </TabsContent>

          <TabsContent value="dependencies" className="m-0 focus-visible:outline-none">
            <SkillDependenciesTab skill={skill} />
          </TabsContent>

          <TabsContent value="evidence" className="m-0 focus-visible:outline-none">
            <SkillEvidenceTab
              skill={skill}
              onNavigateAgent={onNavigateAgent}
              onNavigateSession={onNavigateSession}
            />
          </TabsContent>
        </div>
      </Tabs>
    </ModalShell>
  )
}
