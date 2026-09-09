import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-border transition-colors', className)}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  )
}
