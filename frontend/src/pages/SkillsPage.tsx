import React from 'react'
import { Cpu } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const SkillsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Catalog of integrated tools, agent skill manifests, and provider capability mappings."
        badge={
          <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
            ACTIVE: 0
          </Badge>
        }
      />

      <EmptyState
        icon={Cpu}
        title="Capability Registry Inactive"
        description="Registered Sagara capabilities will appear here once the skill manifest is retrieved from the Mission Control API."
        className="py-16 sm:py-20"
      />
    </div>
  )
}
