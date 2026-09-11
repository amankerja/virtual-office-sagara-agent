import React, { useState, useMemo } from 'react'
import {
  Layers,
  Plus,
  Trash2,
  Search,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { AgentProjection } from '@/types/agent'
import { useSkills } from '@/api/hooks'
import { useDraftStore } from '../draft-store'

export interface ProfileSkillsTabProps {
  agent: AgentProjection;
}

export const ProfileSkillsTab: React.FC<ProfileSkillsTabProps> = ({ agent }) => {
  const { data: allSkills = [] } = useSkills()
  const {
    draftChanges,
    addSkillDraft,
    removeSkillDraft,
  } = useDraftStore()

  const [availableSearch, setAvailableSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('ALL')

  // Original and effective skills
  const originalSkillIds = useMemo(
    () => agent.skills?.map((s) => s.id) || [],
    [agent.skills]
  )

  const profileChanges = useMemo(
    () => draftChanges.filter((c) => c.profileId === agent.id),
    [draftChanges, agent.id]
  )

  const effectiveSkillIds = useMemo(() => {
    let list = [...originalSkillIds]
    for (const change of profileChanges) {
      if (change.action === 'ADD_SKILL') {
        if (!list.includes(change.targetValue)) list.push(change.targetValue)
      } else if (change.action === 'REMOVE_SKILL') {
        list = list.filter((s) => s !== change.targetValue)
      }
    }
    return list
  }, [originalSkillIds, profileChanges])

  // Staged additions and removals
  const pendingAddedSkillIds = useMemo(
    () =>
      new Set(
        profileChanges.filter((c) => c.action === 'ADD_SKILL').map((c) => c.targetValue)
      ),
    [profileChanges]
  )

  // List of assigned skills
  const assignedSkillItems = useMemo(() => {
    return effectiveSkillIds.map((id) => {
      const skillObj = allSkills.find((s) => s.id === id) || agent.skills?.find((s) => s.id === id)
      return {
        id,
        name: skillObj ? skillObj.name : id,
        category: skillObj?.category || 'General',
        isStagedAddition: pendingAddedSkillIds.has(id),
      }
    })
  }, [effectiveSkillIds, allSkills, agent.skills, pendingAddedSkillIds])

  // List of available skills to assign
  const availableSkillItems = useMemo(() => {
    return allSkills
      .filter((s) => !effectiveSkillIds.includes(s.id))
      .filter((s) => {
        if (availableSearch.trim()) {
          const q = availableSearch.toLowerCase()
          const matchName = s.name.toLowerCase().includes(q)
          const matchId = s.id.toLowerCase().includes(q)
          const matchCat = s.category?.toLowerCase().includes(q)
          if (!matchName && !matchId && !matchCat) return false
        }
        if (domainFilter !== 'ALL' && s.category !== domainFilter) return false
        return true
      })
  }, [allSkills, effectiveSkillIds, availableSearch, domainFilter])

  // Derive unique domains for filter
  const availableDomains = useMemo(() => {
    const domains = new Set<string>()
    allSkills.forEach((s) => {
      if (s.category) domains.add(s.category)
    })
    return Array.from(domains).sort()
  }, [allSkills])

  return (
    <div className="space-y-5">
      {/* Draft Banner if this profile has staged changes */}
      {profileChanges.length > 0 && (
        <div className="p-3 rounded-lg border border-interactive/40 bg-interactive/10 text-interactive text-xs font-mono-tech flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              {profileChanges.length} unsaved skill {profileChanges.length === 1 ? 'change' : 'changes'} staged for this profile.
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold">Local Draft</span>
        </div>
      )}

      {/* Hero Dual List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Assigned Skills */}
        <div className="border border-border rounded-xl bg-surface flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-border bg-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-interactive" />
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono-tech">
                Assigned Skills ({assignedSkillItems.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono-tech text-text-muted">
              Draft Editable
            </span>
          </div>

          <div className="p-3 space-y-2 overflow-y-auto max-h-125 flex-1">
            {assignedSkillItems.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-mono-tech">
                No skills assigned to this profile.
              </div>
            ) : (
              assignedSkillItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                    item.isStagedAddition
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-border bg-surface-subtle hover:bg-surface-hover/60'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {item.name}
                      </span>
                      {item.isStagedAddition && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-mono-tech uppercase"
                        >
                          Will be added
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono-tech text-text-muted">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span className="truncate">{item.id}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSkillDraft(agent.id, item.id, item.name)}
                    className="text-text-muted hover:text-status-danger h-7 w-7 shrink-0"
                    title="Remove skill from profile (draft)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Available Skills in SkillRegistry */}
        <div className="border border-border rounded-xl bg-surface flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-border bg-surface-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono-tech">
                Available Skills ({availableSkillItems.length})
              </h3>
              <span className="text-[10px] font-mono-tech text-text-muted">
                SkillRegistry Catalog
              </span>
            </div>

            {/* Search & Domain Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Filter available skills..."
                  value={availableSearch}
                  onChange={(e) => setAvailableSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-surface border-border font-mono-tech"
                />
              </div>

              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="h-8 px-2 rounded-md bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
              >
                <option value="ALL">All Domains</option>
                {availableDomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 space-y-2 overflow-y-auto max-h-115 flex-1">
            {availableSkillItems.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-mono-tech">
                No matching available skills found.
              </div>
            ) : (
              availableSkillItems.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 rounded-lg border border-border bg-surface-subtle hover:bg-surface-hover/60 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {skill.name}
                      </span>
                      <span className="text-[9px] font-mono-tech uppercase px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                        {skill.category || 'General'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      {skill.description || skill.id}
                    </p>
                  </div>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => addSkillDraft(agent.id, skill.id, skill.name)}
                    className="border-border bg-surface text-interactive hover:bg-interactive/10 h-7 text-xs font-mono-tech gap-1 shrink-0"
                    title="Stage skill assignment"
                  >
                    <Plus className="h-3 w-3" />
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
