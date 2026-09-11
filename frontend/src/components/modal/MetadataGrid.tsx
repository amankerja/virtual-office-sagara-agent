import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MetadataItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}

export interface MetadataGridProps {
  items: MetadataItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const MetadataGrid: React.FC<MetadataGridProps> = ({
  items,
  columns = 2,
  className,
}) => {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid gap-3.5', colClass, className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className={cn(
            'p-3 rounded-lg bg-surface-subtle border border-border/70 flex flex-col justify-between gap-1',
            item.className
          )}
        >
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider font-mono-tech truncate">
            {item.label}
          </span>
          <div className="text-xs sm:text-sm font-medium text-text-primary wrap-break-word">
            {item.value ?? '—'}
          </div>
          {item.hint && (
            <span className="text-[10px] text-text-muted">{item.hint}</span>
          )}
        </div>
      ))}
    </div>
  )
}
