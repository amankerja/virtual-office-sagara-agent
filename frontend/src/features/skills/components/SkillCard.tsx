import React from 'react'
import type { SkillProjection } from '@/types/skill'
import { Card, CardContent } from '@/components/ui/card'
import { EvidenceBadge } from '@/components/shared/EvidenceBadge'
import { formatTimestampRelative } from '@/lib/formatters'
import { Bot, ChevronRight, Layers } from 'lucide-react'

interface SkillCardProps {
  skill: SkillProjection;
  onSelect: (id: string) => void;
  className?: string;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onSelect, className }) => {
  return (
    <Card
      onClick={() => onSelect(skill.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(skill.id)
        }
      }}
      className={`border-border bg-surface cursor-pointer transition-colors hover:border-border-strong focus:outline-none focus:ring-1 focus:ring-interactive ${className || ''}`}
    >
      <CardContent className="p-3.5 space-y-3">
        {/* Header: Name, Category, Icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-surface-raised border border-border text-text-muted shrink-0 mt-0.5">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-sm tracking-tight truncate">
                {skill.name}
              </h3>
              <p className="text-[11px] text-text-secondary font-mono-tech truncate">
                {skill.category || 'General'} • {skill.id}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted shrink-0 mt-1" />
        </div>

        {/* Description if present */}
        {skill.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {skill.description}
          </p>
        )}

        {/* State Badges Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono-tech text-xs">
          <div>
            <span className="text-[10px] text-text-muted block mb-0.5">Health</span>
            <EvidenceBadge type="health" value={skill.health} />
          </div>
          <div>
            <span className="text-[10px] text-text-muted block mb-0.5">Installation</span>
            <EvidenceBadge type="installation" value={skill.installation} />
          </div>
        </div>

        {/* Execution & Bound Profiles Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] font-mono-tech">
          <div className="flex items-center gap-1 text-text-secondary">
            <Bot className="h-3 w-3 text-text-muted" />
            <span>{skill.boundProfiles?.length ?? 0} profiles bound</span>
          </div>

          <span className="text-text-muted">
            {formatTimestampRelative(skill.lastUsedTimestamp)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
