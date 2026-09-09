import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}) => {
  return (
    <Card className={cn('bg-surface border-border shadow-xs transition-colors', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 sm:px-5 py-3.5 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-text-primary tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-text-secondary mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className={cn('p-4 sm:p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
