import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/shared/SectionCard';
import { SystemSafetySummaryCard } from '@/features/action-safety/components/SystemSafetySummaryCard';
import { ActionSafetyCard } from '@/features/action-safety/components/ActionSafetyCard';
import { ProductionExecutionPolicyCard } from '@/features/action-safety/components/ProductionExecutionPolicyCard';
import { ToolSecurityPolicyCard } from '@/features/action-safety/components/ToolSecurityPolicyCard';
import { SecondProfileReadinessCard } from '@/features/action-safety/components/SecondProfileReadinessCard';
import { ShieldCheck, AlertOctagon, CheckCircle, FileText, Ban } from 'lucide-react';

export const ActionSafetyPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Safety & Gate"
        description="Mission Control production control boundary: persistent intent lifecycle, HMAC-SHA256 integrity, preflight verification, and tamper-evident audit ledger."
        badge={
          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 rounded-full font-mono-tech text-[10px] px-2.5 py-0.5">
            EXECUTION LOCKED (SAFE_READ_ONLY LIMITED POLICY V3)
          </Badge>
        }
      />

      <div className="space-y-6">
        {/* Consolidated System Safety Summary (Prompt 14.9A.9 Section 33-38) */}
        <SystemSafetySummaryCard />

        {/* Core Status & Audit Verification Card */}
        <ActionSafetyCard />

        {/* Production Execution Policy V1/V2 Card */}
        <ProductionExecutionPolicyCard />

        {/* Tool Security Policy V1 Card */}
        <ToolSecurityPolicyCard />

        {/* Second Limited Profile Readiness (Prompt 14.9B Advisory) */}
        <SecondProfileReadinessCard />

        {/* Safety Guardrails Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono-tech text-xs">
          {/* Strict Allow-List */}
          <SectionCard
            title="Allowed Action Types (Strict Allow-List)"
            description="Only explicitly registered action types can be evaluated. Generic command/tool execution is forbidden."
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">TASK_DISPATCH</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                  HIGH RISK • APPROVAL REQ
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">TASK_CANCEL</span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/40">
                  MEDIUM RISK • SINGLE APPROVAL
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">PROFILE_CHANGE_APPLY</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                  HIGH RISK • APPROVAL REQ
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">SKILL_ASSIGNMENT_CHANGE</span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/40">
                  MEDIUM RISK • PREFLIGHT REQ
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">SCHEDULE_* (CREATE/UPDATE/PAUSE)</span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/40">
                  MEDIUM RISK • DRAFT ONLY
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                <span className="font-semibold text-text-primary">SAFETY_GATE_SELF_TEST</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                  LOW RISK • NO SIDE EFFECT
                </span>
              </div>
              <div className="p-2 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-800/40 flex items-center gap-2">
                <Ban className="h-4 w-4 shrink-0" />
                <span>FORBIDDEN: RUN_COMMAND, EXECUTE_TOOL, CUSTOM (No generic escape hatch)</span>
              </div>
            </div>
          </SectionCard>

          {/* Hard Safety Boundaries */}
          <SectionCard
            title="Core Architecture Boundaries"
            description="Non-negotiable invariants governing the Prompt 13 safety control plane."
          >
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary font-mono-tech">APPROVAL ≠ EXECUTION</span>
                  <p className="text-text-secondary text-[11px]">
                    An approved intent certifies that operator authorization and preflight passed. It does not invoke any Hermes agent or runtime tools.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary font-mono-tech">TARGET RESOLUTION FAILS CLOSED</span>
                  <p className="text-text-secondary text-[11px]">
                    Live verification discovered 69 unresolved sessions and 0 profile-mapped sessions. Target profiles with UNKNOWN runtime presence are blocked during execution preflight.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary font-mono-tech">CONTROL-PLANE DATABASE INDEPENDENCE</span>
                  <p className="text-text-secondary text-[11px]">
                    Mission Control stores intents, approvals, and the audit ledger in its own SQLite database (<code className="text-xs">data/mission-control.db</code>) in WAL mode. Hermes <code className="text-xs">state.db</code> is strictly read-only.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary font-mono-tech">TAMPER-EVIDENT AUDIT CHAIN</span>
                  <p className="text-text-secondary text-[11px]">
                    Every mutation appends a cryptographically linked SHA-256 record. Verifier checks the entire chain sequentially from the deterministic genesis block.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
