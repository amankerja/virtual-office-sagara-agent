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
    <Card className={cn('bg-[#0f121a] border-[#1e2436] shadow-none', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#1e2436] px-5 py-3.5 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-[#f1f5f9] tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-[#94a3b8] mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className={cn('p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
