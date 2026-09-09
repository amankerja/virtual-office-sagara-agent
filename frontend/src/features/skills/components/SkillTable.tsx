import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { EvidenceBadge } from '@/components/shared/EvidenceBadge'
import { formatTimestampRelative } from '@/lib/formatters'
import { Bot, ChevronRight, Layers } from 'lucide-react'

interface SkillTableProps {
  skills: SkillProjection[];
  onSelectSkill: (id: string) => void;
  selectedSkillId?: string | null;
  isLoading?: boolean;
}

export const SkillTable: React.FC<SkillTableProps> = ({
  skills,
  onSelectSkill,
  selectedSkillId,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-subtle animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono-tech border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-text-muted font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Skill / ID</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Registration</th>
              <th className="py-2.5 px-3">Installation</th>
              <th className="py-2.5 px-3">Health</th>
              <th className="py-2.5 px-3">Execution</th>
              <th className="py-2.5 px-3">Profiles</th>
              <th className="py-2.5 px-3 text-right">Last Evidence</th>
              <th className="py-2.5 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {skills.map((skill) => {
              const isSelected = skill.id === selectedSkillId
              return (
                <tr
                  key={skill.id}
                  onClick={() => onSelectSkill(skill.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectSkill(skill.id)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={`group cursor-pointer transition-colors hover:bg-surface-hover focus:outline-none focus:bg-surface-hover ${
                    isSelected ? 'bg-interactive/10 border-interactive' : ''
                  }`}
                >
                  {/* Skill Name & ID */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-surface-raised border border-border text-text-muted shrink-0 group-hover:text-text-primary">
                        <Layers className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-text-primary block truncate font-sans text-xs sm:text-sm">
                          {skill.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono-tech block truncate">
                          {skill.id} {skill.version ? `v${skill.version}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                    {skill.category || 'General'}
                  </td>

                  {/* Registration */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <EvidenceBadge type="registration" value={skill.registration} />
                  </td>

                  {/* Installation */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <EvidenceBadge type="installation" value={skill.installation} />
                  </td>

                  {/* Health */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <EvidenceBadge type="health" value={skill.health} />
                  </td>

                  {/* Execution */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <EvidenceBadge type="execution" value={skill.execution} />
                  </td>

                  {/* Profiles Bound */}
                  <td className="py-3 px-3 text-text-secondary whitespace-nowrap">
                    {skill.boundProfiles && skill.boundProfiles.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-text-primary bg-surface-subtle px-1.5 py-0.5 rounded border border-border-subtle">
                        <Bot className="h-3 w-3 text-text-muted" />
                        {skill.boundProfiles.length} bound
                      </span>
                    ) : (
                      <span className="text-text-muted">None</span>
                    )}
                  </td>

                  {/* Last Evidence */}
                  <td className="py-3 px-3 text-right text-text-muted whitespace-nowrap">
                    {formatTimestampRelative(skill.lastUsedTimestamp)}
                  </td>

                  {/* Arrow Action */}
                  <td className="py-3 px-2 text-right">
                    <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
