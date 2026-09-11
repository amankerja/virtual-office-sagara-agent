import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldAlert, Loader2, Lock } from 'lucide-react';
import type { ApprovalProjection } from '@/types/approval';

interface ApproveConfirmDialogProps {
  approval: ApprovalProjection | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationPhrase?: string) => void;
  isSubmitting?: boolean;
}

export const ApproveConfirmDialog: React.FC<ApproveConfirmDialogProps> = ({
  approval,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');

  const isHighOrCritical = approval?.risk === 'HIGH' || approval?.risk === 'CRITICAL';
  const expectedPhrase = approval
    ? approval.risk === 'CRITICAL'
      ? `APPROVE CRITICAL ${approval.actionType.replace(/_/g, ' ')}`
      : `APPROVE ${approval.actionType.replace(/_/g, ' ')}`
    : '';

  useEffect(() => {
    if (isOpen) {
      setTypedPhrase('');
    }
  }, [isOpen]);

  if (!approval) return null;

  const isConfirmed = !isHighOrCritical || typedPhrase.trim().toUpperCase() === expectedPhrase;

  const handleConfirm = () => {
    if (!isConfirmed || isSubmitting) return;
    onConfirm(isHighOrCritical ? typedPhrase.trim().toUpperCase() : undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-6 bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-interactive/10 text-interactive border border-interactive/25">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-semibold text-text-primary">
              {isHighOrCritical ? 'Two-Step Explicit Approval' : 'Approve Action?'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary mt-1 leading-relaxed">
            {isHighOrCritical
              ? 'This action carries elevated risk. Review the exact parameters and type the confirmation phrase below.'
              : 'Review and confirm the requested action parameters.'}
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

        {/* Section 47 & 48: Typed Confirmation for High/Critical Risk */}
        {isHighOrCritical && (
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-mono-tech text-text-secondary block">
              Type <span className="font-bold text-text-primary uppercase select-all">{expectedPhrase}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={expectedPhrase}
              disabled={isSubmitting}
              className="w-full px-3 py-1.5 text-xs font-mono-tech bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-interactive uppercase tracking-wider text-text-primary"
            />
          </div>
        )}

        {/* Section 61 & 116: Ready to Execute Disclaimer */}
        <div className="p-2.5 rounded-md border border-border bg-surface text-[11px] text-text-muted font-mono-tech flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span>Execution is disabled in this phase (Prompt 14 boundary).</span>
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
            onClick={handleConfirm}
            disabled={!isConfirmed || isSubmitting}
            className="text-xs h-9 font-mono-tech bg-interactive text-white hover:bg-interactive-hover"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Authorizing...
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
  );
};
