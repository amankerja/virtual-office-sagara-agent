import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Loader2,
  Send,
  Lock,
  Play,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import { DetailHeader } from './DetailHeader';
import { DetailSection } from './DetailSection';
import { MetadataGrid } from './MetadataGrid';
import { ExecutionConfirmModal } from './ExecutionConfirmModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActionIntent } from '@/types/action-safety';

export interface ActionReviewModalProps {
  intent: ActionIntent | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestApproval?: (intentId: string) => Promise<unknown>;
  onOpenExecuteModal?: (intent: ActionIntent) => void;
}

export const ActionReviewModal: React.FC<ActionReviewModalProps> = ({
  intent,
  isOpen,
  onClose,
  onRequestApproval,
  onOpenExecuteModal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!intent) return null;

  const preflight = intent.preflightResult;
  const isBlocked = preflight?.result === 'BLOCKED' || intent.status === 'PREFLIGHT_FAILED';
  const isReadyToExecute = intent.status === 'READY_TO_EXECUTE';

  const handleRequestApproval = async () => {
    if (!onRequestApproval) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onRequestApproval(intent.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to request approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const truncatedFingerprint = intent.payloadHash ? `${intent.payloadHash.slice(0, 12)}...` : 'N/A';

  const riskBadgeClass = {
    LOW: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    CRITICAL: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200',
  }[intent.risk] || 'bg-slate-100 text-slate-700';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Action Intent: ${intent.actionType}`}
      size="default"
    >
      <DetailHeader
        title={`Intent: ${intent.actionType}`}
        subtitle={
          <div className="flex items-center gap-2 flex-wrap font-mono-tech text-text-muted text-xs">
            <span>Target: {intent.targetId} ({intent.targetType})</span>
            <span>•</span>
            <span>Fingerprint: {truncatedFingerprint}</span>
          </div>
        }
        icon={<ShieldAlert className="h-5 w-5 text-interactive" />}
        idToCopy={intent.id}
        badge={
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`font-mono-tech text-[10px] ${riskBadgeClass}`}>
              RISK: {intent.risk}
            </Badge>
            <Badge variant="outline" className="font-mono-tech text-[10px] bg-surface text-text-primary">
              {intent.status}
            </Badge>
          </div>
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-lg border border-status-danger/40 bg-status-danger/10 text-status-danger text-xs font-mono-tech flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Ready to Execute Disclaimer (Section 61 & 116) */}
        {isReadyToExecute && (
          <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold font-mono-tech">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Approved and ready.</span>
            </div>
            <p className="font-sans text-[11px] leading-relaxed">
              Production execution is disabled until Controlled Dispatch is enabled (Prompt 14).
            </p>
          </div>
        )}

        {/* Section 81 & 82: Preflight Checklist UI */}
        <DetailSection title="Preflight Safety Checklist">
          <div className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-2.5 font-mono-tech text-xs">
            {/* 1. Requirements (Verified Passed) */}
            {preflight?.requirements && preflight.requirements.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                  Verified Requirements
                </span>
                {preflight.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Warnings (Non-blocking) */}
            {preflight?.warnings && preflight.warnings.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-border">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                  Warnings (Non-blocking)
                </span>
                {preflight.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-text-secondary">
                    <Minus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Blocking Reasons */}
            {preflight?.blockingReasons && preflight.blockingReasons.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-border">
                <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">
                  Blocking Preconditions (Must Resolve Before Execution)
                </span>
                {preflight.blockingReasons.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                    <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {(!preflight?.requirements?.length && !preflight?.blockingReasons?.length) && (
              <div className="text-text-muted italic text-[11px]">
                Preflight evaluation pending or not performed.
              </div>
            )}
          </div>
        </DetailSection>

        {/* Metadata & Intent Details */}
        <MetadataGrid
          columns={2}
          items={[
            { label: 'Action Type', value: intent.actionType },
            { label: 'Requested By', value: intent.requestedBy },
            { label: 'Created At', value: new Date(intent.createdAt).toLocaleString() },
            { label: 'Expires At', value: new Date(intent.expiresAt).toLocaleString() },
            { label: 'Preflight Revision', value: String(intent.preflightRevision) },
            { label: 'Requires Approval', value: intent.requiresApproval ? 'Yes' : 'No' },
          ]}
        />

        {/* Action Payload Context (Section 85) */}
        <DetailSection title="Payload Context">
          <pre className="p-3 rounded-lg border border-border bg-surface-subtle text-[11px] font-mono-tech overflow-x-auto text-text-secondary">
            {JSON.stringify(intent.payload, null, 2)}
          </pre>
        </DetailSection>

        {/* Modal Action Controls */}
        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono-tech">
            Close
          </Button>

          {intent.status === 'READY_FOR_APPROVAL' && !isBlocked && (
            <Button
              variant="default"
              size="sm"
              disabled={isSubmitting}
              onClick={handleRequestApproval}
              className="bg-interactive text-white hover:bg-interactive-hover text-xs font-mono-tech gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit for Approval
            </Button>
          )}

          {isReadyToExecute && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (onOpenExecuteModal) {
                  onOpenExecuteModal(intent);
                } else {
                  setShowConfirmModal(true);
                }
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-mono-tech gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Execute Task
            </Button>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <ExecutionConfirmModal
          intent={intent}
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onExecuted={() => {
            setShowConfirmModal(false);
            onClose();
          }}
        />
      )}
    </ModalShell>
  );
};
