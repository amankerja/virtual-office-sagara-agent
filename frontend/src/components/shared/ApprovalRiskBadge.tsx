import React from 'react'
import { ShieldAlert, AlertTriangle, AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApprovalRisk } from '@/types/approval'

interface ApprovalRiskBadgeProps {
  risk: ApprovalRisk
  showIcon?: boolean
  className?: string
}

interface RiskConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
}

const RISK_CONFIG_MAP: Record<ApprovalRisk, RiskConfig> = {
  CRITICAL: {
    label: 'Critical Risk',
    icon: ShieldAlert,
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/35 dark:border-rose-500/35',
  },
  HIGH: {
    label: 'High Risk',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/30 dark:border-amber-500/30',
  },
  MEDIUM: {
    label: 'Medium Risk',
    icon: AlertCircle,
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-600/30 dark:border-blue-500/30',
  },
  LOW: {
    label: 'Low Risk',
    icon: Shield,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40 dark:border-slate-600/40',
  },
}

export const ApprovalRiskBadge: React.FC<ApprovalRiskBadgeProps> = ({
  risk,
  showIcon = true,
  className,
}) => {
  const config = RISK_CONFIG_MAP[risk] || RISK_CONFIG_MAP.MEDIUM
  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider font-mono-tech transition-colors shrink-0',
        config.badgeClass,
        className
      )}
      title={`Risk Assessment: ${config.label}`}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  )
}
