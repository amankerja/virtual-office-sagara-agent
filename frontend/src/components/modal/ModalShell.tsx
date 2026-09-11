import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'default' | 'large' | 'compact';
  children: React.ReactNode;
  className?: string;
  'aria-describedby'?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'default',
  children,
  className,
}) => {
  const sizeClasses = {
    compact: 'sm:max-w-xl md:max-w-2xl',
    default: 'sm:max-w-3xl md:max-w-4xl lg:w-[900px]',
    large: 'sm:max-w-4xl md:max-w-5xl lg:w-[1050px]',
  }[size]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'w-full max-h-[calc(100vh-48px)] h-[calc(100vh-48px)] sm:h-auto sm:max-h-[85vh]',
          'p-0 gap-0 overflow-hidden flex flex-col',
          'bg-surface border-border shadow-2xl rounded-t-xl sm:rounded-xl',
          'fixed bottom-0 sm:bottom-auto sm:top-[50%] sm:left-[50%]',
          'translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%]',
          sizeClasses,
          className
        )}
      >
        {/* Hidden accessible header if not rendered in children */}
        <div className="sr-only">
          <DialogTitle>{title || 'Entity Details'}</DialogTitle>
          {description && <p>{description}</p>}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  )
}
