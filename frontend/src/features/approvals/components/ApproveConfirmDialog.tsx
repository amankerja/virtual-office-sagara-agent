import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react'
import type { ApprovalProjection } from '@/types/approval'

interface ApproveConfirmDialogProps {
  approval: ApprovalProjection | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export const ApproveConfirmDialog: React.FC<ApproveConfirmDialogProps> = ({
  approval,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!approval) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-6 bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-interactive/10 text-interactive border border-interactive/25">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-semibold text-text-primary">
              Approve High-Risk External Action?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary mt-1 leading-relaxed">
            This will authorize the agent to continue the requested operation against external systems.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1.5 text-xs font-mono-tech">
          <div className="text-text-muted text-[10px] uppercase">Action Target</div>
          <div className="font-semibold text-text-primary truncate">
            {approval.target?.label || approval.title}
          </div>
          <div className="text-[11px] text-text-secondary">
            Risk Tier: <span className="font-bold text-rose-600 dark:text-rose-400">{approval.risk}</span>
          </div>
        </div>

        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="text-xs h-9 font-mono-tech"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Submitting Approval...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Approve Action
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
