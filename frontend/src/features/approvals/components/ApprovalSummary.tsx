import React from 'react'
import type { ApprovalProjection } from '@/types/approval'
import { Clock, ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalSummaryProps {
  approvals: ApprovalProjection[]
  activeRiskFilter?: string
  onSelectRiskFilter?: (risk: string) => void
  isLoading?: boolean
}

// Deterministic reference timestamp aligned with 2026-09-09 mock fixtures
const REFERENCE_TIME_MS = new Date('2026-09-09T05:00:00Z').getTime()

export const ApprovalSummary: React.FC<ApprovalSummaryProps> = ({
  approvals,
  activeRiskFilter,
  onSelectRiskFilter,
  isLoading = false,
}) => {
  const pendingApprovals = approvals.filter((a) => a.state === 'PENDING')
  const pendingCount = pendingApprovals.length
  const highRiskCount = pendingApprovals.filter((a) => a.risk === 'HIGH' || a.risk === 'CRITICAL').length

  // Expiring soon: pending and expires within 2 hours
  const expiringSoonCount = pendingApprovals.filter((a) => {
    if (!a.expiresAt) return false
    const diff = new Date(a.expiresAt).getTime() - REFERENCE_TIME_MS
    return diff > 0 && diff < 2 * 60 * 60 * 1000
  }).length

  const approvedCount = approvals.filter((a) => a.state === 'APPROVED').length
  const rejectedCount = approvals.filter((a) => a.state === 'REJECTED').length

  const stats = [
    {
      label: 'Pending Reviews',
      value: pendingCount,
      riskFilter: 'ALL',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/20',
    },
    {
      label: 'High / Critical Risk',
      value: highRiskCount,
      riskFilter: 'CRITICAL',
      icon: ShieldAlert,
      color: 'text-rose-600 dark:text-rose-400',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/20',
    },
    {
      label: 'Expiring Soon',
      value: expiringSoonCount,
      riskFilter: 'ALL',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/20',
    },
    {
      label: 'Approved Today',
      value: approvedCount,
      riskFilter: 'ALL',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20',
    },
    {
      label: 'Rejected Today',
      value: rejectedCount,
      riskFilter: 'ALL',
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface border border-border animate-pulse p-3" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        const isSelected = activeRiskFilter === stat.riskFilter && stat.riskFilter !== 'ALL'

        return (
          <button
            key={stat.label}
            type="button"
            onClick={() => onSelectRiskFilter?.(stat.riskFilter)}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border bg-surface text-left transition-all',
              'hover:border-border-strong hover:bg-surface-hover cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-interactive/30',
              isSelected ? 'border-interactive/60 ring-1 ring-interactive/30 bg-surface-subtle' : 'border-border'
            )}
          >
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider font-mono-tech truncate">
                {stat.label}
              </div>
              <div className={cn('text-lg font-bold font-mono-tech mt-0.5', stat.color)}>
                {stat.value}
              </div>
            </div>
            <div className={cn('p-1.5 rounded-md border shrink-0 ml-2', stat.badgeClass)}>
              <IconComponent className="h-3.5 w-3.5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
