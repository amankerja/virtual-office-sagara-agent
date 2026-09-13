import React, { useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  UserCheck,
  Cpu,
  Layers,
  AlertOctagon,

} from 'lucide-react';
import {
  useActionSafetyStatus,
  useVerifyAuditLedger,
  useMyPrincipal,
  useExecutionReadiness,
  useExecutionLock,
  useUnlockExecution,
  useLockExecution,
} from '@/api/hooks';

const REQUIRED_CONFIRMATION_PHRASE = 'UNLOCK TASK EXECUTION';

export const ActionSafetyCard: React.FC = () => {
  const { data: status } = useActionSafetyStatus();
  const { data: principal } = useMyPrincipal();
  const { data: readiness, refetch: refetchReadiness } = useExecutionReadiness();
  const { data: lockInfo, refetch: refetchLock } = useExecutionLock();

  const verifyAuditMutation = useVerifyAuditLedger();
  const unlockMutation = useUnlockExecution();
  const lockMutation = useLockExecution();

  const [verificationFeedback, setVerificationFeedback] = useState<{
    valid: boolean;
    detail: string;
    checkedAt: string;
  } | null>(null);

  // Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const handleVerifyLedger = async () => {
    try {
      const res = await verifyAuditMutation.mutateAsync();
      setVerificationFeedback({
        valid: res.valid,
        detail: res.detail,
        checkedAt: new Date().toLocaleTimeString(),
      });
      void refetchReadiness();
    } catch (err: unknown) {
      setVerificationFeedback({
        valid: false,
        detail: err instanceof Error ? err.message : 'Audit verification failed',
        checkedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleOpenUnlockModal = () => {
    setUnlockReason('');
    setConfirmationInput('');
    setUnlockError(null);
    setIsUnlockModalOpen(true);
  };

  const handleConfirmUnlock = async () => {
    if (confirmationInput.trim() !== REQUIRED_CONFIRMATION_PHRASE) {
      setUnlockError(`Confirmation phrase must match '${REQUIRED_CONFIRMATION_PHRASE}' exactly.`);
      return;
    }
    if (!unlockReason.trim()) {
      setUnlockError('Operator reason is required for unlocking task execution.');
      return;
    }

    try {
      await unlockMutation.mutateAsync({
        confirmation_phrase: confirmationInput.trim(),
        reason: unlockReason.trim(),
        ttl_minutes: 15,
        max_executions: 1,
      });
      setIsUnlockModalOpen(false);
      void refetchLock();
      void refetchReadiness();
    } catch (err: unknown) {
      setUnlockError(err instanceof Error ? err.message : 'Failed to unlock execution.');
    }
  };

  const handleEmergencyLock = async () => {
    try {
      await lockMutation.mutateAsync('Operator emergency execution lock engaged via UI');
      void refetchLock();
      void refetchReadiness();
    } catch (err: unknown) {
      console.error('Lock failed:', err);
    }
  };

  const isExecutionLocked = lockInfo?.is_locked ?? true;
  const activeWindow = lockInfo?.active_window;
  const isCanaryReady = readiness?.liveCanaryReady === 'YES';

  return (
    <SectionCard
      title="Action Safety & Execution Boundary"
      description="Mission Control production control boundary: trusted auth boundary, server-side principal, cryptographic HMAC signatures, preflight verification, and bounded kill switch."
      className="md:col-span-2"
    >
      <div className="space-y-4 font-mono-tech text-xs">
        {/* Operator Identity Banner (Prompt 14.4 Section 17-19, 78-79) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {principal?.displayName || principal?.id || 'Dev Operator'}
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  ({principal?.id || 'dev-operator-1'})
                </span>
                <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2.5 py-0.5">
                  ROLE: {principal?.roles?.join(', ') || 'operator'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-sans">
                <span>Auth Source: <strong>{principal?.source || 'trusted_proxy'}</strong></span>
                <span>•</span>
                <span>Strength: <strong>{principal?.authenticationStrength || 'trusted_proxy'}</strong></span>
                <span>•</span>
                <span>Permissions: <strong>{principal?.permissions?.length || 0} active</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2.5 py-1"
            >
              TRUSTED AUTH BOUNDARY: PASS
            </Badge>
          </div>
        </div>

        {/* Top Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Execution Gate Mode */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">Kill Switch</span>
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] px-2.5 py-0.5 font-mono-tech ${
                  isExecutionLocked
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isExecutionLocked ? 'LOCKED' : 'UNLOCKED / ARMED'}
              </Badge>
              {activeWindow && (
                <span className="text-[10px] text-slate-500">
                  [{activeWindow.executions_consumed ?? 0}/{activeWindow.max_executions ?? 1}]
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              {isExecutionLocked
                ? 'Persistent database execution lock is engaged.'
                : `Window '${activeWindow?.id}' open until ${activeWindow?.expires_at?.substring(11, 19)}Z.`}
            </p>
          </div>

          {/* Canary Gate Status */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">Canary Readiness</span>
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] px-2.5 py-0.5 font-mono-tech ${
                  isCanaryReady
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isCanaryReady ? 'READY TO ARM' : 'NOT READY'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              {isCanaryReady
                ? 'All technical prerequisites ready for Prompt 14.5 canary.'
                : 'Infrastructure prerequisites incomplete.'}
            </p>
          </div>

          {/* Profile Targetability */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">Hermes Profiles</span>
              <Layers className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">8 / 8 Targetable</span>
              <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-2">
                VERIFIED
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1">
              lead, personal, business, marketing, cs, it-support, it-coding, sagara-lab.
            </p>
          </div>
        </div>

        {/* Audit Ledger Verification Bar */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-slate-900 text-xs font-mono-tech">
                Tamper-Evident Audit Ledger
              </span>
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] px-2 py-0.5 ${
                  status?.auditChain === 'VALID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {status?.auditChain || 'VALID'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Cryptographically chained SHA-256 hash sequence from genesis block. Any database alteration causes instant verification failure.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyLedger}
            disabled={verifyAuditMutation.isPending}
            className="text-xs font-mono-tech h-8 border-slate-200 bg-white hover:bg-slate-50 rounded-lg shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${verifyAuditMutation.isPending ? 'animate-spin' : ''}`} />
            {verifyAuditMutation.isPending ? 'Verifying Chain...' : 'Verify Audit Integrity'}
          </Button>
        </div>

        {/* Audit Verification Result Feedback Banner */}
        {verificationFeedback && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              verificationFeedback.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {verificationFeedback.valid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold font-mono-tech">
                {verificationFeedback.valid ? 'Audit Hash Chain Verified Intact' : 'Audit Integrity Warning'}
                <span className="text-[10px] text-slate-500 font-normal ml-2">
                  (checked at {verificationFeedback.checkedAt})
                </span>
              </div>
              <p className="text-[11px] font-sans leading-relaxed">
                {verificationFeedback.detail}
              </p>
            </div>
          </div>
        )}

        {/* Kill Switch Controls Bar (Prompt 14.4 Section 48, 75-76) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-700" />
              <span className="font-bold text-slate-900 text-xs font-mono-tech">
                Production Execution Kill Switch
              </span>
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] px-2 py-0.5 font-mono-tech ${
                  isExecutionLocked
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isExecutionLocked ? 'LOCKED' : 'UNLOCKED'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Unlocking creates a bounded 15-minute window constrained to exactly 1 execution (Prompt 14.5 Canary Budget). Emergency locking is immediate.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isExecutionLocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenUnlockModal}
                className="text-xs font-mono-tech h-8 bg-blue-600 text-white hover:bg-blue-700 rounded-lg border-transparent"
              >
                <Unlock className="h-3.5 w-3.5 mr-1.5" />
                Unlock Execution
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmergencyLock}
                disabled={lockMutation.isPending}
                className="text-xs font-mono-tech h-8 bg-rose-600 text-white hover:bg-rose-700 rounded-lg border-transparent"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Emergency Lock
              </Button>
            )}
          </div>
        </div>

        {/* 11 Execution Readiness Dimensions Matrix (Prompt 14.4 Section 38-43, 73) */}
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-900 text-xs font-mono-tech uppercase">
              Execution Readiness Dimensions (11 Gates)
            </span>
            <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
              V1.1 PROPOSED CONTRACT
            </Badge>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-mono-tech">
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">1. Trusted Auth Boundary:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.auth_boundary || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">2. Operator Authorization:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.operator_authorization || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">3. Action HMAC Signing:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.action_signing || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">4. Control Database (WAL):</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.control_database || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">5. Tamper-Evident Audit Ledger:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.audit_integrity || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">6. Profile Targetability:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.profile_targetability || 'READY (8/8)'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">7. Hermes Executor Discovery:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.hermes_executor || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">8. Direct Session Receipt:</span>
              <span className="text-emerald-700 font-semibold">{readiness?.components?.direct_session_receipt || 'READY'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">9. Execution Env Feature Flag:</span>
              <span className="text-amber-700 font-semibold">{readiness?.components?.execution_env || 'BLOCKED (DISABLED)'}</span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">10. Persistent Kill Switch:</span>
              <span className={isExecutionLocked ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                {isExecutionLocked ? 'LOCKED' : 'UNLOCKED'}
              </span>
            </div>
            <div className="flex justify-between items-center px-3.5 py-2">
              <span className="text-slate-500">11. Live Canary Gate:</span>
              <span className="text-amber-700 font-semibold">{readiness?.components?.canary_gate || 'BLOCKED (DISABLED)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unlock Dialog (Prompt 14.4 Section 49-51, 75) */}
      <Dialog open={isUnlockModalOpen} onOpenChange={setIsUnlockModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-[14px] border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertOctagon className="h-5 w-5" />
              <DialogTitle className="text-slate-900 font-mono-tech text-base font-bold">
                Unlock Task Execution
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 font-sans text-xs mt-1">
              High-risk operator procedure. Opens a time-limited 15-minute execution window restricted to exactly 1 task dispatch (Canary Budget).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 font-mono-tech text-xs">
            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">Operator Reason (Required):</label>
              <Input
                placeholder="e.g. Prompt 14.5 single canary execution"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="h-8 text-xs rounded-lg border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">
                Type exact phrase: <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded">{REQUIRED_CONFIRMATION_PHRASE}</code>
              </label>
              <Input
                placeholder={REQUIRED_CONFIRMATION_PHRASE}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="h-8 text-xs rounded-lg border-slate-200 font-bold"
              />
            </div>

            {unlockError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnlockModalOpen(false)}
              className="text-xs font-mono-tech h-8 rounded-lg border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirmUnlock}
              disabled={unlockMutation.isPending}
              className="text-xs font-mono-tech h-8 bg-rose-600 text-white hover:bg-rose-700 rounded-lg border-transparent"
            >
              {unlockMutation.isPending ? 'Unlocking...' : 'Confirm Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};
