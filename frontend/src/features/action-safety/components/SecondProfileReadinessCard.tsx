import React, { useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
} from 'lucide-react';

interface CandidateEvaluation {
  profileId: string;
  rolePurpose: string;
  safeNoTools: 'ELIGIBLE' | 'PARTIAL' | 'NOT_VIABLE';
  safeReadOnly: 'ELIGIBLE' | 'PARTIAL' | 'NOT_VIABLE';
  needsNewTools: boolean;
  sideEffectsNeeded: boolean;
  dataSensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  externalComms: boolean;
  mutationRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  score: number; // Max 24
  readiness: 'READY_FOR_LIMITED_POLICY_DESIGN' | 'CONDITIONALLY_READY' | 'NOT_READY';
  rationale: string;
}

const CANDIDATES: CandidateEvaluation[] = [
  {
    profileId: 'it-support',
    rolePurpose: 'System diagnostic inspection, log/service analysis, troubleshooting draft proposals',
    safeNoTools: 'ELIGIBLE',
    safeReadOnly: 'ELIGIBLE',
    needsNewTools: false,
    sideEffectsNeeded: false,
    dataSensitivity: 'LOW',
    externalComms: false,
    mutationRisk: 'NONE',
    score: 24,
    readiness: 'READY_FOR_LIMITED_POLICY_DESIGN',
    rationale: 'Perfect alignment with current 2 approved read-only capabilities. Zero mutations, zero external comms, no new tools needed.',
  },
  {
    profileId: 'it-coding',
    rolePurpose: 'Code architecture reasoning, syntax/spec review from supplied docs, draft patch generation',
    safeNoTools: 'ELIGIBLE',
    safeReadOnly: 'ELIGIBLE',
    needsNewTools: false,
    sideEffectsNeeded: false,
    dataSensitivity: 'MEDIUM',
    externalComms: false,
    mutationRisk: 'NONE',
    score: 20,
    readiness: 'CONDITIONALLY_READY',
    rationale: 'Useful for offline architectural and code review, but primary development workflows require git/fs write/shell execution.',
  },
  {
    profileId: 'business',
    rolePurpose: 'Commercial catalog, pricing, inventory sync, Shopee/online business workflows',
    safeNoTools: 'PARTIAL',
    safeReadOnly: 'NOT_VIABLE',
    needsNewTools: true,
    sideEffectsNeeded: true,
    dataSensitivity: 'CRITICAL',
    externalComms: true,
    mutationRisk: 'HIGH',
    score: 11,
    readiness: 'NOT_READY',
    rationale: 'Hard blocker: Requires marketplace API writes, inventory/price database mutation, and Google Workspace integrations.',
  },
  {
    profileId: 'lead',
    rolePurpose: 'Cross-profile dispatch, agent orchestration, autonomous delegation, operational direction',
    safeNoTools: 'PARTIAL',
    safeReadOnly: 'NOT_VIABLE',
    needsNewTools: true,
    sideEffectsNeeded: true,
    dataSensitivity: 'HIGH',
    externalComms: false,
    mutationRisk: 'HIGH',
    score: 10,
    readiness: 'NOT_READY',
    rationale: 'Hard blocker: Orchestration and delegation bypass risks. Lead must not become an execution policy circumventor.',
  },
  {
    profileId: 'cs',
    rolePurpose: 'Customer support response triage, transactional notifications, email drafts',
    safeNoTools: 'PARTIAL',
    safeReadOnly: 'NOT_VIABLE',
    needsNewTools: true,
    sideEffectsNeeded: true,
    dataSensitivity: 'CRITICAL',
    externalComms: true,
    mutationRisk: 'HIGH',
    score: 10,
    readiness: 'NOT_READY',
    rationale: 'Hard blocker: Customer PII sensitivity, outbound messaging/email risks. Dedicated outbound boundary required.',
  },
  {
    profileId: 'personal',
    rolePurpose: 'Personal email triage, private calendar, career applications, Obsidian personal vault',
    safeNoTools: 'PARTIAL',
    safeReadOnly: 'NOT_VIABLE',
    needsNewTools: true,
    sideEffectsNeeded: true,
    dataSensitivity: 'CRITICAL',
    externalComms: true,
    mutationRisk: 'HIGH',
    score: 10,
    readiness: 'NOT_READY',
    rationale: 'Hard blocker: High-sensitivity personal boundary (Obsidian vault, banking transactions, personal email credentials).',
  },
  {
    profileId: 'marketing',
    rolePurpose: 'Social media publishing, multiplatform broadcasting, campaign design and generation',
    safeNoTools: 'PARTIAL',
    safeReadOnly: 'NOT_VIABLE',
    needsNewTools: true,
    sideEffectsNeeded: true,
    dataSensitivity: 'HIGH',
    externalComms: true,
    mutationRisk: 'HIGH',
    score: 10,
    readiness: 'NOT_READY',
    rationale: 'Hard blocker: Public broadcast and brand damage exposure. Multiplatform posting skills require unconstrained network/API.',
  },
];

export const SecondProfileReadinessCard: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  const getReadinessBadge = (readiness: CandidateEvaluation['readiness']) => {
    switch (readiness) {
      case 'READY_FOR_LIMITED_POLICY_DESIGN':
        return (
          <Badge
            variant="outline"
            className="rounded-full bg-[#dcfce7] text-[#15803d] border-[#bbf7d0] font-mono text-[10px] px-2.5 py-0.5"
          >
            READY_FOR_LIMITED_POLICY_DESIGN
          </Badge>
        );
      case 'CONDITIONALLY_READY':
        return (
          <Badge
            variant="outline"
            className="rounded-full bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd] font-mono text-[10px] px-2.5 py-0.5"
          >
            CONDITIONALLY_READY
          </Badge>
        );
      case 'NOT_READY':
      default:
        return (
          <Badge
            variant="outline"
            className="rounded-full bg-[#fee2e2] text-[#b91c1c] border-[#fecaca] font-mono text-[10px] px-2.5 py-0.5"
          >
            NOT_READY
          </Badge>
        );
    }
  };

  return (
    <SectionCard
      title="SECOND LIMITED PROFILE READINESS"
      description="Evidence-based candidate evaluation for prospective LIMITED profile expansion (Prompt 14.9B advisory). Zero live execution, zero policy activation."
      className="border border-[#e2e8f0] bg-white rounded-[14px]"
      action={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] font-mono text-[10px] px-2.5 py-0.5 flex items-center gap-1"
          >
            <Lock className="h-3 w-3 text-[#64748b]" />
            <span>ACTIVATION: DISABLED (ADVISORY ONLY)</span>
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full bg-[#dcfce7] text-[#15803d] border-[#bbf7d0] font-mono text-[10px] px-2.5 py-0.5"
          >
            TOP: it-support (24/24)
          </Badge>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Top Summary Banner */}
        <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#15803d]" />
              <span className="font-semibold text-[#0f172a] text-sm">
                Evidence-Based Candidate Selection Result
              </span>
            </div>
            <p className="text-[#64748b] text-[11px] font-sans leading-relaxed">
              Candidate <strong className="font-mono text-[#0f172a]">it-support</strong> is uniquely viable to become the second LIMITED profile because its operational tasks fit 100% inside current SAFE_NO_TOOLS and existing SAFE_READ_ONLY tools (zero tool additions, zero side effects). All activation controls are strictly omitted.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="rounded-lg border-[#e2e8f0] text-[#0f172a] hover:bg-white text-xs font-mono shrink-0 flex items-center gap-1.5"
          >
            <span>{showDetails ? 'Hide Preconditions' : 'View Preconditions'}</span>
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#64748b]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" />
            )}
          </Button>
        </div>

        {/* Evaluation Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-[#f8fafc] text-[#64748b] border-b border-[#e2e8f0]">
              <tr>
                <th className="py-2.5 px-3">Profile</th>
                <th className="py-2.5 px-3 font-sans">Role Purpose</th>
                <th className="py-2.5 px-3">Tool Fit</th>
                <th className="py-2.5 px-3">Mutation Risk</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Readiness State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] bg-white">
              {CANDIDATES.map((c) => (
                <tr
                  key={c.profileId}
                  className={`hover:bg-[#f8fafc] transition-colors ${
                    c.readiness === 'READY_FOR_LIMITED_POLICY_DESIGN'
                      ? 'bg-[#f0fdf4]/50'
                      : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-[#0f172a]">
                    <div className="flex items-center gap-1.5">
                      {c.readiness === 'READY_FOR_LIMITED_POLICY_DESIGN' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
                      )}
                      {c.readiness === 'CONDITIONALLY_READY' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#0369a1]" />
                      )}
                      {c.readiness === 'NOT_READY' && (
                        <XCircle className="h-3.5 w-3.5 text-[#b91c1c]" />
                      )}
                      <span>{c.profileId}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[#475569] max-w-70">
                    {c.rolePurpose}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        !c.needsNewTools
                          ? 'bg-[#dcfce7] text-[#15803d]'
                          : 'bg-[#fee2e2] text-[#b91c1c]'
                      }`}
                    >
                      {c.needsNewTools ? 'NEEDS NEW TOOLS' : 'EXISTING TOOLS'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        c.mutationRisk === 'NONE'
                          ? 'bg-[#dcfce7] text-[#15803d]'
                          : 'bg-[#fee2e2] text-[#b91c1c]'
                      }`}
                    >
                      {c.mutationRisk}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#0f172a]">
                    {c.score}/24
                  </td>
                  <td className="py-2.5 px-3">{getReadinessBadge(c.readiness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Collapsible Preconditions & Proposed Policy Guidance */}
        {showDetails && (
          <div className="space-y-3 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] font-mono text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#0f172a]">
              <Info className="h-4 w-4 text-[#2563eb]" />
              <span>Mandatory Preconditions for Future V3 Policy Design</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[#475569]">
              <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f0] space-y-1">
                <span className="font-semibold text-[#0f172a] block">
                  1. Profile Scope Isolation
                </span>
                <p className="font-sans text-[11px] text-[#64748b]">
                  it-support must receive explicit, profile-scoped permissions. It does NOT automatically inherit sagara-lab resources or unrestricted document access.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f0] space-y-1">
                <span className="font-semibold text-[#0f172a] block">
                  2. Strict Side-Effect Denial
                </span>
                <p className="font-sans text-[11px] text-[#64748b]">
                  Prohibited: systemctl restart/stop, configuration mutation, shell execution, test execution, or deployment actions. Inspection and reasoning only.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f0] space-y-1">
                <span className="font-semibold text-[#0f172a] block">
                  3. Resource Registry Scoping
                </span>
                <p className="font-sans text-[11px] text-[#64748b]">
                  Document inspection for it-support must be bounded to explicitly approved troubleshooting guides and architecture docs. No access to secret configs.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#e2e8f0] space-y-1">
                <span className="font-semibold text-[#0f172a] block">
                  4. Rollout Cadence
                </span>
                <p className="font-sans text-[11px] text-[#64748b]">
                  Future activation must follow standard Sagara safety cadence: SAFE_NO_TOOLS reasoning canary first, followed by constrained read-only canaries.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};
