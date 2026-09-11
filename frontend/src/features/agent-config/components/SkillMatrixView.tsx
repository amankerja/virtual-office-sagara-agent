import React, { useState, useMemo } from 'react'
import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import { useDraftStore } from '../draft-store'

export interface SkillMatrixViewProps {
  agents: AgentProjection[];
  skills: SkillProjection[];
  onSelectProfile?: (profileId: string) => void;
}

export const SkillMatrixView: React.FC<SkillMatrixViewProps> = ({
  agents,
  skills,
  onSelectProfile,
}) => {
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('ALL')
  const { getEffectiveSkills } = useDraftStore()

  // Dynamic domains
  const domains = useMemo(() => {
    const set = new Set<string>()
    skills.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return Array.from(set).sort()
  }, [skills])

  // Map each profile to its effective skill set
  const profileSkillsMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const ag of agents) {
      const orig = ag.skills?.map((s) => s.id) || []
      const eff = getEffectiveSkills(ag.id, orig)
      map.set(ag.id, new Set(eff))
    }
    return map
  }, [agents, getEffectiveSkills])

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = s.name.toLowerCase().includes(q)
        const matchId = s.id.toLowerCase().includes(q)
        const matchCat = s.category?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchCat) return false
      }
      if (domainFilter !== 'ALL' && s.category !== domainFilter) return false
      return true
    })
  }, [skills, search, domainFilter])

  return (
    <div className="space-y-4">
      {/* Search and Domain Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <Input
              placeholder="Search skills in matrix..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-surface-subtle border-border font-mono-tech"
            />
          </div>

          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="h-8 px-2 rounded-md bg-surface-subtle border border-border text-xs text-text-primary focus:outline-none focus:border-interactive font-mono-tech"
          >
            <option value="ALL">All Domains ({skills.length})</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[11px] font-mono-tech text-text-muted">
          Showing {filteredSkills.length} of {skills.length} skills across {agents.length} profiles
        </span>
      </div>

      {/* Matrix Table with Sticky Column & Header */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-150 overflow-y-auto relative">
          <table className="w-full border-collapse text-left text-xs font-mono-tech">
            <thead className="bg-surface-subtle sticky top-0 z-20 border-b border-border">
              <tr>
                <th className="p-3 font-semibold text-text-muted uppercase text-[10px] tracking-wider sticky left-0 z-30 bg-surface-subtle border-r border-border min-w-55">
                  Skill Specification
                </th>
                {agents.map((ag) => (
                  <th
                    key={ag.id}
                    onClick={() => onSelectProfile && onSelectProfile(ag.id)}
                    className="p-3 font-semibold text-text-primary uppercase text-[10px] tracking-wider text-center min-w-30 cursor-pointer hover:bg-surface-hover/70 transition-colors border-r border-border/60 last:border-r-0"
                    title={`Click to inspect ${ag.definition.name}`}
                  >
                    <span className="block truncate">{ag.definition.name}</span>
                    <span className="text-[9px] text-text-muted font-normal block">{ag.id}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredSkills.map((skill) => {
                return (
                  <tr key={skill.id} className="hover:bg-surface-hover/50 transition-colors">
                    {/* Sticky Skill Name Column */}
                    <td className="p-3 font-medium text-text-primary sticky left-0 z-10 bg-surface border-r border-border">
                      <div className="truncate font-sans font-semibold text-xs text-text-primary">
                        {skill.name}
                      </div>
                      <div className="text-[10px] text-text-muted font-mono-tech flex items-center gap-1.5 mt-0.5">
                        <span className="px-1 py-0.2 rounded bg-surface-subtle border border-border/80">
                          {skill.category || 'General'}
                        </span>
                        <span className="truncate">{skill.id}</span>
                      </div>
                    </td>

                    {/* Agent columns */}
                    {agents.map((ag) => {
                      const agentSkills = profileSkillsMap.get(ag.id)
                      const isAssigned = agentSkills?.has(skill.id)

                      return (
                        <td
                          key={ag.id}
                          className="p-3 text-center border-r border-border/60 last:border-r-0"
                        >
                          {isAssigned ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="text-text-muted/40 font-bold">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
