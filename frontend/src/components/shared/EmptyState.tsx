import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-lg border border-dashed border-border bg-surface-subtle/40 transition-colors',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-text-muted ring-1 ring-border mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-text-primary tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
