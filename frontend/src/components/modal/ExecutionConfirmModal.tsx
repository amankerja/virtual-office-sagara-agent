import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  Terminal,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import { DetailHeader } from './DetailHeader';
import { DetailSection } from './DetailSection';
import { MetadataGrid } from './MetadataGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActionIntent, ExecutionResponse } from '@/types/action-safety';
import { executeActionIntent } from '@/api/actionSafety';

export interface ExecutionConfirmModalProps {
  intent: ActionIntent | null;
  isOpen: boolean;
  onClose: () => void;
  onExecuted?: (response: ExecutionResponse) => void;
  onNavigateToSession?: (sessionId: string) => void;
}

const REQUIRED_CONFIRMATION_PHRASE = 'EXECUTE APPROVED TASK';

export const ExecutionConfirmModal: React.FC<ExecutionConfirmModalProps> = ({
  intent,
  isOpen,
  onClose,
  onExecuted,
  onNavigateToSession,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!intent) return null;

  const isConfirmed = confirmationInput.trim() === REQUIRED_CONFIRMATION_PHRASE;
  const taskId = String(intent.payload?.task_id || intent.targetId);
  const profileId = String(intent.payload?.target_profile_id || intent.targetId);
  const promptSummary = typeof intent.payload?.prompt === 'string'
    ? (intent.payload.prompt.length > 120 ? `${intent.payload.prompt.slice(0, 120)}...` : intent.payload.prompt)
    : `Dispatch task ${taskId}`;

  const handleExecute = async () => {
    if (!isConfirmed || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await executeActionIntent(intent.id, undefined, intent.preflightRevision);
      setExecutionResult(response);
      if (onExecuted) {
        onExecuted(response);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution submission failed.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    if (onNavigateToSession) {
      onNavigateToSession(sessionId);
    } else {
      window.location.href = `/runtime?session=${encodeURIComponent(sessionId)}`;
    }
    onClose();
  };

  const truncatedFingerprint = intent.payloadHash ? `${intent.payloadHash.slice(0, 12)}...` : 'N/A';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Controlled Execution Review"
      size="default"
    >
      <DetailHeader
        title="Execute Approved Action Intent"
        subtitle={
          <div className="flex items-center gap-2 flex-wrap font-mono-tech text-text-muted text-xs">
            <span>Target: {profileId}</span>
            <span>•</span>
            <span>Task: {taskId}</span>
            <span>•</span>
            <span>Fingerprint: {truncatedFingerprint}</span>
          </div>
        }
        icon={<Terminal className="h-5 w-5 text-interactive" />}
        idToCopy={intent.id}
        badge={
          <Badge variant="outline" className="font-mono-tech text-[10px] bg-blue-50 text-blue-800 border-blue-200">
            {intent.status}
          </Badge>
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-status-danger/40 bg-status-danger/10 text-status-danger text-xs font-mono-tech flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Execution Blocked / Failed</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Execution Result Displays */}
        {executionResult && (
          <div className="space-y-3">
            {executionResult.status === 'ACKNOWLEDGED' && executionResult.hermes_session_id && (
              <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 space-y-2.5">
                <div className="flex items-center gap-2 font-mono-tech text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Hermes Execution Acknowledged</span>
                </div>
                <div className="font-mono-tech text-xs space-y-1">
                  <div><strong>Session ID:</strong> {executionResult.hermes_session_id}</div>
                  <div><strong>Receipt ID:</strong> {executionResult.receipt_id}</div>
                  <div><strong>Submitted:</strong> {executionResult.submitted_at}</div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenSession(executionResult.hermes_session_id!)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-mono-tech text-xs gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Runtime Session
                </Button>
              </div>
            )}

            {executionResult.status === 'OUTCOME_UNKNOWN' && (
              <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-mono-tech text-xs font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Execution Outcome Unknown</span>
                </div>
                <p className="text-xs font-sans leading-relaxed">
                  The execution request was submitted to Hermes, but no authoritative session response was acknowledged in time.
                </p>
                <div className="p-2 rounded bg-amber-100/70 border border-amber-200 text-[11px] font-mono-tech font-semibold">
                  DO NOT RETRY AUTOMATICALLY. Reconciliation with authoritative Hermes session evidence is required.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action & Task Execution Metadata */}
        {!executionResult && (
          <>
            <DetailSection title="Execution Target & Review">
              <MetadataGrid
                columns={2}
                items={[
                  { label: 'Action Type', value: intent.actionType },
                  { label: 'Target Profile ID', value: profileId },
                  { label: 'Task ID', value: taskId },
                  { label: 'Task Revision', value: String(intent.resourceRevision || 1) },
                  { label: 'Intent Expiration', value: new Date(intent.expiresAt).toLocaleTimeString() },
                  { label: 'Risk Rating', value: intent.risk },
                ]}
              />
            </DetailSection>

            {/* Task Prompt Summary */}
            <DetailSection title="Sanitized Task Summary">
              <div className="p-3 rounded-lg border border-border bg-surface-subtle text-xs font-mono-tech text-text-secondary">
                {promptSummary}
              </div>
            </DetailSection>

            {/* Confirmation Input Box */}
            <DetailSection title="Safety Confirmation Required">
              <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Controlled task dispatch will invoke the canonical Hermes runtime adapter with exact profile targeting. To proceed, please type <code className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-interactive font-bold font-mono-tech">{REQUIRED_CONFIRMATION_PHRASE}</code> below:
                </p>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={`Type "${REQUIRED_CONFIRMATION_PHRASE}" to confirm`}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 text-xs font-mono-tech rounded border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-interactive"
                />
              </div>
            </DetailSection>
          </>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-mono-tech">
            {executionResult ? 'Done' : 'Cancel'}
          </Button>

          {!executionResult && (
            <Button
              variant="default"
              size="sm"
              disabled={!isConfirmed || isSubmitting}
              onClick={handleExecute}
              className="bg-interactive text-white hover:bg-interactive-hover text-xs font-mono-tech gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting to Hermes...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Execute Approved Task
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
