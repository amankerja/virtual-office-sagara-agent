import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DetailSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  description,
  actions,
  children,
  className,
}) => {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono-tech">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  )
}
