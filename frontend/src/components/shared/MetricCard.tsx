import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  statusTone?: 'default' | 'active' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  statusTone = 'default',
  className,
}) => {
  const toneClasses = {
    default: 'text-text-primary',
    active: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-text-muted',
  }[statusTone]

  return (
    <Card className={cn('bg-surface border-border shadow-xs hover:border-border-strong transition-colors', className)}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span className="font-medium tracking-tight uppercase font-mono-tech">{label}</span>
          {Icon && <Icon className="h-4 w-4 text-text-muted" />}
        </div>
        <div className="flex flex-col">
          <div className={cn('text-xl sm:text-2xl font-semibold tracking-tight font-mono-tech', toneClasses)}>
            {value}
          </div>
          {subtext && (
            <p className="text-[11px] text-text-muted mt-1 font-mono-tech tracking-wide truncate">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
