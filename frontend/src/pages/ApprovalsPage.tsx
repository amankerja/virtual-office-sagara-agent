import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'

export const ApprovalsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Human-in-the-loop validation checkpoints for sensitive actions and capability invocations."
        badge={
          <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
            PENDING: 0
          </Badge>
        }
      />

      <EmptyState
        icon={ShieldCheck}
        title="No Approvals Pending"
        description="Human-in-the-loop approvals will appear here when an agent encounters an action boundary requiring operator confirmation."
        className="py-16 sm:py-20"
      />
    </div>
  )
}
