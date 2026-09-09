import React from 'react'
import { Activity } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const ActivityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Unified real-time audit log, capability execution telemetry, and lifecycle events."
        badge={
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            EVENTS: 0
          </Badge>
        }
      />

      <EmptyState
        icon={Activity}
        title="No Activity Logged"
        description="Operational logs and event streams will appear here once connected to the Sagara Mission Control event bus."
        className="py-20"
      />
    </div>
  )
}
