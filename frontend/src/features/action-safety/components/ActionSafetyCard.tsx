import React, { useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Database, KeyRound, Lock } from 'lucide-react';
import { useActionSafetyStatus, useVerifyAuditLedger } from '@/api/hooks';

export const ActionSafetyCard: React.FC = () => {
  const { data: status } = useActionSafetyStatus();
  const verifyAuditMutation = useVerifyAuditLedger();
  const [verificationFeedback, setVerificationFeedback] = useState<{
    valid: boolean;
    detail: string;
    checkedAt: string;
  } | null>(null);

  const handleVerifyLedger = async () => {
    try {
      const res = await verifyAuditMutation.mutateAsync();
      setVerificationFeedback({
        valid: res.valid,
        detail: res.detail,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      setVerificationFeedback({
        valid: false,
        detail: err instanceof Error ? err.message : 'Audit verification failed',
        checkedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const isExecutionDisabled =
    status?.executionMode === 'DISABLED' ||
    status?.killSwitchStatus === 'LOCKED' ||
    !status?.executionFeatureEnabled;

  return (
    <SectionCard
      title="Action Safety & Execution Gate"
      description="Production control boundary: persistent intents, cryptographic signatures, preflight validation, tamper-evident audit, and controlled Hermes dispatch."
      className="md:col-span-2"
    >
      <div className="space-y-4 font-mono-tech text-xs">
        {/* Top Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Execution Gate Mode */}
          <div className="p-3 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-[10px] uppercase tracking-wider">Execution Gate</span>
              <Lock className="h-3.5 w-3.5 text-text-muted" />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  isExecutionDisabled
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 text-[10px] font-mono-tech'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 text-[10px] font-mono-tech'
                }
              >
                {isExecutionDisabled ? `LOCKED (${status?.killSwitchStatus || 'LOCKED'})` : 'UNLOCKED / ARMED'}
              </Badge>
            </div>
            <p className="text-[10px] text-text-muted font-sans mt-1">
              Controlled Hermes Dispatch with persistent kill switch & preflight.
            </p>
          </div>

          {/* Action Signing Key */}
          <div className="p-3 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-[10px] uppercase tracking-wider">Intent Integrity</span>
              <KeyRound className="h-3.5 w-3.5 text-text-muted" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">
                {status?.actionSigning === 'CONFIGURED' ? 'HMAC-SHA256 Signed' : 'Development Key'}
              </span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 text-[9px]">
                {status?.actionSigning || 'CONFIGURED'}
              </Badge>
            </div>
            <p className="text-[10px] text-text-muted font-sans mt-1">
              Server-side cryptographic payload binding.
            </p>
          </div>

          {/* Persistent Idempotency & Database */}
          <div className="p-3 rounded-lg border border-border bg-surface-subtle space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-[10px] uppercase tracking-wider">Control Database</span>
              <Database className="h-3.5 w-3.5 text-text-muted" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">SQLite (WAL)</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50 text-[9px]">
                PERSISTENT
              </Badge>
            </div>
            <p className="text-[10px] text-text-muted font-sans mt-1">
              Mission Control owned storage; separate from Hermes DB.
            </p>
          </div>
        </div>

        {/* Audit Ledger Verification Bar */}
        <div className="p-3.5 rounded-lg border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-text-primary text-xs font-mono-tech">
                Tamper-Evident Audit Ledger
              </span>
              <Badge
                variant="outline"
                className={
                  status?.auditChain === 'VALID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 text-[10px]'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50 text-[10px]'
                }
              >
                {status?.auditChain || 'VALID'}
              </Badge>
            </div>
            <p className="text-[11px] text-text-secondary font-sans">
              Cryptographically chained SHA-256 hash sequence from genesis block. Any database alteration causes instant verification failure.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyLedger}
            disabled={verifyAuditMutation.isPending}
            className="text-xs font-mono-tech h-8 border-border bg-surface hover:bg-surface-hover shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${verifyAuditMutation.isPending ? 'animate-spin' : ''}`} />
            {verifyAuditMutation.isPending ? 'Verifying Chain...' : 'Verify Audit Integrity'}
          </Button>
        </div>

        {/* Audit Verification Result Feedback Banner */}
        {verificationFeedback && (
          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
              verificationFeedback.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-200'
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
                <span className="text-[10px] text-text-muted font-normal ml-2">
                  (checked at {verificationFeedback.checkedAt})
                </span>
              </div>
              <p className="text-[11px] font-sans leading-relaxed">
                {verificationFeedback.detail}
              </p>
            </div>
          </div>
        )}

        {/* Detailed Safety Gates Matrix (Prompt 14 Section 123) */}
        <div className="border-t border-border pt-3 space-y-2 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Execution Feature:</span>
            <span className={status?.executionFeatureEnabled ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {status?.executionFeatureEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Kill Switch:</span>
            <span className={status?.killSwitchStatus === 'UNLOCKED' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {status?.killSwitchStatus || 'LOCKED'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Executor:</span>
            <span className="text-text-primary font-semibold">
              {status?.executor || 'HERMES_TASK_DISPATCH'} (TASK_DISPATCH only)
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Hermes Interface:</span>
            <span className={status?.hermesInterfaceAvailable ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {status?.hermesInterfaceAvailable ? 'Canonical CLI Subprocess (-Q)' : 'UNAVAILABLE / BLOCKED'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Direct Session Receipt:</span>
            <span className="text-emerald-600 font-semibold">
              {status?.directSessionReceiptSupported ? 'Authoritative Exit Parsing' : 'UNAVAILABLE'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border">
            <span className="text-text-muted">Audit Integrity:</span>
            <span className={status?.auditChain === 'VALID' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {status?.auditChain || 'VALID'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-text-muted">Auth Boundary:</span>
            <span className={status?.trustedAuthConfigured ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {status?.trustedAuthConfigured ? 'Trusted Proxy Verified' : 'FAIL-CLOSED (Untrusted)'}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
