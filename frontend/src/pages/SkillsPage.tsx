import React, { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Layers } from 'lucide-react'
import { SkillSummary } from '@/features/skills/components/SkillSummary'
import { SkillHealthDistribution } from '@/features/skills/components/SkillHealthDistribution'
import { SkillFilters } from '@/features/skills/components/SkillFilters'
import { SkillTable } from '@/features/skills/components/SkillTable'
import { SkillCard } from '@/features/skills/components/SkillCard'
import { SkillDetailModal } from '@/components/modal/SkillDetailModal'
import { useSkills, useSkill } from '@/api/hooks'

export const SkillsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedSkillId = searchParams.get('skill')
  const searchQuery = searchParams.get('search') || ''
  const healthFilter = searchParams.get('health') || 'All'
  const installationFilter = searchParams.get('install') || 'All'
  const executionFilter = searchParams.get('exec') || 'All'
  const profileFilter = searchParams.get('profile') || 'All'

  const {
    data: skills = [],
    isLoading,
    error,
    refetch,
  } = useSkills()

  const { data: activeSkill } = useSkill(selectedSkillId)

  // Dynamically derive unique profile names/ids from skills data
  const availableProfiles = useMemo(() => {
    const set = new Set<string>()
    skills.forEach((s) => {
      s.profiles?.forEach((p) => {
        if (p.profileName) set.add(p.profileName)
      })
      s.boundProfiles?.forEach((bp) => set.add(bp))
    })
    return Array.from(set).sort()
  }, [skills])

  // Multi-dimensional client-side filtering
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = skill.name.toLowerCase().includes(q)
        const matchId = skill.id.toLowerCase().includes(q)
        const matchDesc = skill.description?.toLowerCase().includes(q)
        const matchCat = skill.category?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchDesc && !matchCat) return false
      }

      // 2. Health Filter
      if (healthFilter !== 'All' && skill.health?.toLowerCase() !== healthFilter.toLowerCase()) {
        return false
      }

      // 3. Installation Filter
      if (installationFilter !== 'All' && skill.installation?.toLowerCase() !== installationFilter.toLowerCase()) {
        return false
      }

      // 4. Execution Filter
      if (executionFilter !== 'All' && skill.execution?.toLowerCase() !== executionFilter.toLowerCase()) {
        return false
      }

      // 5. Profile Filter
      if (profileFilter !== 'All') {
        const matchesProfile =
          skill.boundProfiles?.includes(profileFilter) ||
          skill.profiles?.some(
            (p) => p.profileName === profileFilter || p.profileId === profileFilter
          )
        if (!matchesProfile) return false
      }

      return true
    })
  }, [skills, searchQuery, healthFilter, installationFilter, executionFilter, profileFilter])

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === 'All' || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }

  const handleSelectSkill = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('skill', id)
      return next
    })
  }

  const handleCloseDrawer = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('skill')
      return next
    })
  }

  const handleResetFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('search')
      next.delete('health')
      next.delete('install')
      next.delete('exec')
      next.delete('profile')
      return next
    })
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
      healthFilter !== 'All' ||
      installationFilter !== 'All' ||
      executionFilter !== 'All' ||
      profileFilter !== 'All'
  )

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="Skills Registry Offline"
          message="Unable to ingest capability manifest. Ensure Mission Control API is active."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Skills"
        description="Registered Sagara capabilities, installation state, health, and observed execution evidence."
        badge={
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
        }
      />

      {/* Summary Strip */}
      <SkillSummary skills={skills} isLoading={isLoading} />

      {/* Health Distribution Bars */}
      {!isLoading && skills.length > 0 && (
        <SkillHealthDistribution skills={skills} />
      )}

      {/* Search & Filters */}
      <SkillFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => updateParam('search', q)}
        healthFilter={healthFilter}
        onHealthChange={(h) => updateParam('health', h)}
        installationFilter={installationFilter}
        onInstallationChange={(i) => updateParam('install', i)}
        executionFilter={executionFilter}
        onExecutionChange={(e) => updateParam('exec', e)}
        profileFilter={profileFilter}
        onProfileChange={(p) => updateParam('profile', p)}
        availableProfiles={availableProfiles}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Content: Desktop Table vs Mobile Cards */}
      {filteredSkills.length === 0 && !isLoading ? (
        <EmptyState
          icon={Layers}
          title="No Capabilities Found"
          description={
            hasActiveFilters
              ? 'No registered skills match the selected filter criteria. Try resetting filters.'
              : 'No capability manifests discovered in the registry.'
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="min-h-8 text-xs font-mono-tech"
              >
                Reset Filters
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      ) : (
        <>
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block">
            <SkillTable
              skills={filteredSkills}
              onSelectSkill={handleSelectSkill}
              selectedSkillId={selectedSkillId}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onSelect={handleSelectSkill}
              />
            ))}
          </div>
        </>
      )}

      {/* Skill Detail Modal */}
      <SkillDetailModal
        skill={activeSkill || skills.find((s) => s.id === selectedSkillId) || null}
        isOpen={Boolean(selectedSkillId)}
        onClose={handleCloseDrawer}
        onNavigateAgent={(profileId) => navigate(`/agent-config?profile=${profileId}&tab=skills`)}
        onNavigateSession={(sessionId) => navigate(`/runtime?tab=sessions&session=${sessionId}`)}
      />
    </div>
  )
}
