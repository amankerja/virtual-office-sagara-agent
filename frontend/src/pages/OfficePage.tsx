import React from 'react'
import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const OfficePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Virtual Office"
        description="Interactive spatial visualizer of autonomous agent workstations, communication channels, and active collaboration."
        badge={
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            2.5D ENGINE STANDBY
          </Badge>
        }
      />

      <EmptyState
        icon={Building2}
        title="Virtual Office Visualization Standby"
        description="The 2.5D operational visualization will appear here once the graphical workstation engine is initialized in subsequent milestones."
        className="py-24"
      />
    </div>
  )
}
