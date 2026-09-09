import React from 'react'
import type { AttentionItem, AttentionSeverity } from '@/types/mission-control'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttentionItemCardProps {
  item: AttentionItem;
  onReview?: (item: AttentionItem) => void;
}

const SEVERITY_CONFIG_MAP: Record<AttentionSeverity, { label: string; badgeClass: string; cardBorder: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: {
    label: 'Critical',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-600/30',
    cardBorder: 'border-rose-500/30 dark:border-rose-500/20 hover:border-rose-500/50',
    icon: ShieldAlert,
  },
  high: {
    label: 'High',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-600/30',
    cardBorder: 'border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/50',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-600/30',
    cardBorder: 'border-border hover:border-border-strong',
    icon: AlertCircle,
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-600/30',
    cardBorder: 'border-border hover:border-border-strong',
    icon: Info,
  },
}

export const AttentionItemCard: React.FC<AttentionItemCardProps> = ({ item, onReview }) => {
  const severityConfig = SEVERITY_CONFIG_MAP[item.severity] || SEVERITY_CONFIG_MAP.medium
  const IconComponent = severityConfig.icon

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg border bg-surface transition-all space-y-2.5',
        severityConfig.cardBorder
      )}
    >
      {/* Header: Severity, Type, Age */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase font-mono-tech',
              severityConfig.badgeClass
            )}
          >
            <IconComponent className="h-3 w-3" />
            {severityConfig.label}
          </span>
          <Badge variant="outline" className="border-border bg-surface-subtle text-[10px] font-mono-tech text-text-muted">
            {item.type}
          </Badge>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-mono-tech text-text-muted">
          <Clock className="h-3 w-3" />
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Title and Explanation */}
      <div>
        <h4 className="text-xs font-semibold text-text-primary tracking-tight leading-snug">
          {item.title}
        </h4>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Footer: Related Entity & Action */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle gap-2">
        <span className="text-[11px] font-mono-tech text-text-muted truncate">
          Entity: <span className="text-text-primary font-medium">{item.entityName || item.entityId || 'Global'}</span>
        </span>

        <Button
          variant="outline"
          size="xs"
          onClick={() => onReview?.(item)}
          className="border-border bg-surface-subtle text-text-primary hover:bg-surface-hover text-[11px] font-mono-tech min-h-[32px] sm:min-h-[26px]"
        >
          {item.actionLabel || 'Review'}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
