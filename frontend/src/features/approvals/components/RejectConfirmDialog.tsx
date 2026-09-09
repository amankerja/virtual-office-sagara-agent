import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2 } from 'lucide-react'
import type { ApprovalProjection } from '@/types/approval'

interface RejectConfirmDialogProps {
  approval: ApprovalProjection | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isSubmitting?: boolean
}

export const RejectConfirmDialog: React.FC<RejectConfirmDialogProps> = ({
  approval,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!approval) return null

  const isHighRisk = approval.risk === 'HIGH' || approval.risk === 'CRITICAL'

  const handleReject = () => {
    if (isHighRisk && !reason.trim()) {
      setValidationError('A rejection reason is strictly required for High and Critical risk actions.')
      return
    }

    setValidationError(null)
    onConfirm(reason.trim())
  }

  const handleClose = () => {
    setReason('')
    setValidationError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && handleClose()}>
      <DialogContent className="max-w-md p-6 bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
              <XCircle className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-semibold text-text-primary">
              Reject Approval Request
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary mt-1 leading-relaxed">
            Deny operator authorization. This will cancel the pending external invocation and notify the agent.
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
            {validationError}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="rejection-reason" className="text-xs font-semibold text-text-primary font-mono-tech flex items-center justify-between">
            <span>
              Reason for Rejection {isHighRisk && <span className="text-rose-500">*</span>}
            </span>
            {isHighRisk && (
              <span className="text-[10px] text-rose-500 font-normal">Mandatory for {approval.risk} risk</span>
            )}
          </label>
          <textarea
            id="rejection-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (validationError) setValidationError(null)
            }}
            placeholder="Specify reason for denial (e.g., Security policy violation, Invalid recipient, Stale payload)..."
            className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-rose-500/40 leading-relaxed"
          />
        </div>

        <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting || (isHighRisk && !reason.trim())}
            className="text-xs h-9 font-mono-tech"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Submitting Rejection...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Reject Action
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
