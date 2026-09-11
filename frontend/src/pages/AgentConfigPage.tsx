import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Sparkles,
  Bot,
  Grid3X3,
  List,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfileOverviewTab } from '@/features/agent-config/components/ProfileOverviewTab'
import { ProfileSkillsTab } from '@/features/agent-config/components/ProfileSkillsTab'
import { ProfileRuntimeTab } from '@/features/agent-config/components/ProfileRuntimeTab'
import { ProfileAdvancedTab } from '@/features/agent-config/components/ProfileAdvancedTab'
import { SkillMatrixView } from '@/features/agent-config/components/SkillMatrixView'
import { ConfigurationChangesModal } from '@/features/agent-config/components/ConfigurationChangesModal'
import { RecommendedConfigModal } from '@/features/agent-config/components/RecommendedConfigModal'
import { useDraftStore } from '@/features/agent-config/draft-store'
import { useAgents, useSkills } from '@/api/hooks'

export const AgentConfigPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: agents = [] } = useAgents()
  const { data: skills = [] } = useSkills()

  const { draftChanges, discardProfileDraft, getEffectiveSkills } = useDraftStore()

  // State from URL
  const selectedProfileId = searchParams.get('profile') || (agents[0]?.id ?? '')
  const activeTab = searchParams.get('tab') || 'overview'

  // Local UI filters
  const [profileSearch, setProfileSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState('ALL')
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isRecommendedOpen, setIsRecommendedOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'profile' | 'matrix'>('profile')

  // Selected agent
  const selectedAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedProfileId) || agents[0] || null
  }, [agents, selectedProfileId])

  // Sync selected profile if not in params
  useEffect(() => {
    if (!searchParams.get('profile') && agents.length > 0) {
      const next = new URLSearchParams(searchParams)
      next.set('profile', agents[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [agents, searchParams, setSearchParams])

  const handleSelectProfile = (profileId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('profile', profileId)
    setSearchParams(next)
  }

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next)
  }

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return agents.filter((a) => {
      if (profileSearch.trim()) {
        const q = profileSearch.toLowerCase()
        const matchName = a.definition.name.toLowerCase().includes(q)
        const matchId = a.id.toLowerCase().includes(q)
        const matchRole = a.definition.role?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchRole) return false
      }
      if (healthFilter === 'DRAFT') {
        const hasDraft = draftChanges.some((c) => c.profileId === a.id)
        if (!hasDraft) return false
      }
      return true
    })
  }, [agents, profileSearch, healthFilter, draftChanges])

  const selectedProfileDrafts = useMemo(() => {
    return draftChanges.filter((c) => c.profileId === selectedAgent?.id)
  }, [draftChanges, selectedAgent])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Agent & Profile Configuration"
        description="Manage profile definitions, capabilities, skill assignments, and operational configuration."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Single Profile vs Matrix */}
            <div className="flex items-center border border-border rounded-md bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('profile')}
                className={`px-2.5 py-1 text-xs font-mono-tech rounded flex items-center gap-1.5 transition-colors ${
                  viewMode === 'profile'
                    ? 'bg-surface-raised text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Profiles
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-2.5 py-1 text-xs font-mono-tech rounded flex items-center gap-1.5 transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-surface-raised text-text-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                Skill Matrix
              </button>
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsRecommendedOpen(true)}
              className="font-mono-tech text-xs min-h-8 gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load Recommended Config
            </Button>

            <Button
              size="xs"
              onClick={() => setIsReviewOpen(true)}
              className={`font-mono-tech text-xs min-h-8 gap-1.5 ${
                draftChanges.length > 0
                  ? 'bg-interactive text-interactive-foreground hover:bg-interactive-hover animate-pulse'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Review Changes {draftChanges.length > 0 && `(${draftChanges.length})`}
            </Button>
          </div>
        }
      />

      {/* Local Draft Notice Banner */}
      {draftChanges.length > 0 && (
        <div className="p-3.5 rounded-xl border border-interactive/40 bg-interactive/10 text-interactive text-xs font-mono-tech flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              <strong>Local draft active:</strong> {draftChanges.length} staged change{draftChanges.length === 1 ? '' : 's'} held locally. Configuration is NOT yet applied to Sagara production manifests.
            </span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsReviewOpen(true)}
            className="text-interactive hover:bg-interactive/20 font-semibold uppercase text-[10px]"
          >
            Review Staged Diff →
          </Button>
        </div>
      )}

      {/* Main View: Matrix or Profile 2-Column */}
      {viewMode === 'matrix' ? (
        <SkillMatrixView
          agents={agents}
          skills={skills}
          onSelectProfile={(pId) => {
            handleSelectProfile(pId)
            setViewMode('profile')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Selector List (4 cols on desktop) */}
          <div className="md:col-span-4 border border-border rounded-xl bg-surface flex flex-col overflow-hidden shadow-xs">
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-border bg-surface-subtle space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search profiles..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-surface border-border font-mono-tech"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value)}
                  className="h-7 px-2 rounded bg-surface border border-border text-[11px] text-text-secondary focus:outline-none font-mono-tech w-full"
                >
                  <option value="ALL">All Profiles ({agents.length})</option>
                  <option value="DRAFT">Has Staged Drafts ({draftChanges.length})</option>
                </select>
              </div>
            </div>

            {/* Profile List Rows */}
            <div className="p-2 space-y-1 overflow-y-auto max-h-155">
              {filteredProfiles.map((agent) => {
                const isSelected = agent.id === selectedAgent?.id
                const changes = draftChanges.filter((c) => c.profileId === agent.id)
                const origSkills = agent.skills?.map((s) => s.id) || []
                const effectiveSkills = getEffectiveSkills(agent.id, origSkills)

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => handleSelectProfile(agent.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-interactive/40 bg-interactive/10 shadow-xs'
                        : 'border-transparent bg-transparent hover:bg-surface-hover/70'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-text-primary truncate">
                          {agent.definition.name}
                        </span>
                        {changes.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-interactive/40 text-interactive text-[9px] font-mono-tech"
                          >
                            {changes.length} draft
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {agent.definition.role || agent.id}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono-tech text-text-muted">
                        <span>{effectiveSkills.length} skills</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Complete</span>
                      </div>
                    </div>

                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected ? 'text-interactive translate-x-0.5' : 'text-text-muted/40'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Profile Details & Tabs (8 cols on desktop) */}
          <div className="md:col-span-8 border border-border rounded-xl bg-surface flex flex-col overflow-hidden shadow-xs">
            {selectedAgent ? (
              <>
                {/* Header for Selected Profile */}
                <div className="p-5 sm:p-6 border-b border-border bg-surface-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-lg bg-interactive/10 border border-interactive/30 flex items-center justify-center text-interactive">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-semibold text-text-primary tracking-tight">
                          {selectedAgent.definition.name}
                        </h2>
                        <span className="text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                          {selectedAgent.id}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 font-mono-tech">
                        {selectedAgent.definition.role || 'Specialist Profile'} • Source: Sagara ProfileRegistry
                      </p>
                    </div>
                  </div>

                  {selectedProfileDrafts.length > 0 && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => discardProfileDraft(selectedAgent.id)}
                      className="border-border text-text-muted hover:text-status-danger text-xs font-mono-tech gap-1 self-start sm:self-center"
                    >
                      <Trash2 className="h-3 w-3" />
                      Discard Draft ({selectedProfileDrafts.length})
                    </Button>
                  )}
                </div>

                {/* Navigation Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
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
                        value="skills"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
                      >
                        Skills Assignment
                      </TabsTrigger>
                      <TabsTrigger
                        value="runtime"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
                      >
                        Runtime & Model
                      </TabsTrigger>
                      <TabsTrigger
                        value="advanced"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-interactive data-[state=active]:text-interactive text-text-muted hover:text-text-primary rounded-none px-1 text-xs font-mono-tech"
                      >
                        Advanced Spec
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Panels */}
                  <div className="p-5 sm:p-6 overflow-y-auto">
                    <TabsContent value="overview" className="m-0 focus-visible:outline-none">
                      <ProfileOverviewTab agent={selectedAgent} />
                    </TabsContent>

                    <TabsContent value="skills" className="m-0 focus-visible:outline-none">
                      <ProfileSkillsTab agent={selectedAgent} />
                    </TabsContent>

                    <TabsContent value="runtime" className="m-0 focus-visible:outline-none">
                      <ProfileRuntimeTab agent={selectedAgent} />
                    </TabsContent>

                    <TabsContent value="advanced" className="m-0 focus-visible:outline-none">
                      <ProfileAdvancedTab agent={selectedAgent} />
                    </TabsContent>
                  </div>
                </Tabs>
              </>
            ) : (
              <div className="p-12 text-center text-text-muted text-xs font-mono-tech">
                No profile selected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staged Changes Modal */}
      <ConfigurationChangesModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        agents={agents}
      />

      {/* Recommended Configuration Blueprint Modal */}
      <RecommendedConfigModal
        isOpen={isRecommendedOpen}
        onClose={() => setIsRecommendedOpen(false)}
        agents={agents}
      />
    </div>
  )
}
