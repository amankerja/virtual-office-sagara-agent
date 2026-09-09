import React from 'react'
import { Server } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const RuntimePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Runtime"
        description="Hermes execution engine telemetry, process supervisors, and memory management."
        badge={
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            HERMES TELEMETRY
          </Badge>
        }
      />

      <EmptyState
        icon={Server}
        title="Runtime Telemetry Offline"
        description="Hermes runtime telemetry will appear here when the telemetry stream is ingested via the Mission Control API."
        className="py-20"
      />
    </div>
  )
}
