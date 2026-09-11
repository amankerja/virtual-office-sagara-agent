import * as React from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DetailHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  idToCopy?: string;
  badge?: React.ReactNode;
  extraActions?: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  subtitle,
  icon,
  idToCopy,
  badge,
  extraActions,
  onClose,
  className,
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    if (idToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border bg-surface-subtle shrink-0',
        className
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {icon && (
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-interactive/10 border border-interactive/30 text-interactive font-mono-tech font-bold text-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-semibold text-text-primary tracking-tight truncate">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {extraActions}
        {idToCopy && (
          <Button
            variant="outline"
            size="icon-xs"
            onClick={handleCopy}
            className="border-border bg-surface text-text-muted hover:text-text-primary min-h-8 min-w-8"
            title="Copy Identifier"
            aria-label="Copy Identifier"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary hover:bg-surface-raised min-h-8 min-w-8"
          title="Close Dialog"
          aria-label="Close Dialog"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
