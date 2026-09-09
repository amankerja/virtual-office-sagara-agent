import React from 'react'
import type { AttentionItem, AttentionSeverity } from '@/types/mission-control'
import { SectionCard } from '@/components/shared/SectionCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { AttentionItemCard } from './AttentionItemCard'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AttentionQueueProps {
  items: AttentionItem[];
  onReviewItem?: (item: AttentionItem) => void;
  isLoading?: boolean;
}

const SEVERITY_WEIGHT: Record<AttentionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export const AttentionQueue: React.FC<AttentionQueueProps> = ({
  items,
  onReviewItem,
  isLoading = false,
}) => {
  // Sort critical > high > medium > low, then newest
  const sortedItems = [...items].sort((a, b) => {
    const weightA = SEVERITY_WEIGHT[a.severity] || 0
    const weightB = SEVERITY_WEIGHT[b.severity] || 0
    if (weightB !== weightA) return weightB - weightA
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div id="attention-queue-section" className="scroll-mt-6">
      <SectionCard
        title="Attention Queue"
        description="High-priority approval gates, configuration blocks, and capability diagnostics requiring review."
        action={
          <Badge
            variant="outline"
            className="border-border bg-surface text-text-muted font-mono-tech text-[10px]"
          >
            {sortedItems.length} PENDING
          </Badge>
        }
        contentClassName="p-4 sm:p-5"
      >
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-surface-subtle animate-pulse border border-border" />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Attention Queue Clear"
            description="No agent interventions, approvals, or configuration warnings currently require operator action."
            className="py-12"
          />
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item) => (
              <AttentionItemCard
                key={item.id}
                item={item}
                onReview={onReviewItem}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
