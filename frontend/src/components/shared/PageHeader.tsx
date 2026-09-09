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
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1e2436]', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-[#f1f5f9]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-[#94a3b8] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
