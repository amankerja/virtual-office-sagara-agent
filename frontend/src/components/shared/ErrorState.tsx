import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operation Failed',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-lg border border-rose-500/20 bg-rose-950/10',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30 mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-rose-200 mb-1">{title}</h3>
      <p className="text-xs text-rose-300/70 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry Connection
        </Button>
      )}
    </div>
  )
}
