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
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-[#1e2436] bg-[#0f121a]/60',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#161a26] text-[#64748b] ring-1 ring-[#1e2436] mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-[#f1f5f9] tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-[#94a3b8] max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
