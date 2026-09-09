import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading operational telemetry...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
      <span className="text-xs text-[#94a3b8] font-mono-tech">{message}</span>
    </div>
  )
}
