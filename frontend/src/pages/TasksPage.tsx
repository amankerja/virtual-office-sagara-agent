import React from 'react'
import { CheckSquare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const TasksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Autonomous task pipelines, subtask delegation, and cross-agent execution tracking."
        badge={
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            QUEUED: 0
          </Badge>
        }
      />

      <EmptyState
        icon={CheckSquare}
        title="Task Orchestration Inactive"
        description="Task orchestration will appear here once connected to the Mission Control workflow engine."
        className="py-20"
      />
    </div>
  )
}
