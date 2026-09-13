import React from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { useToolSecurityPolicy } from '@/api/hooks';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Ban,
  FileSearch,
  Activity,
  Lock,
  Cpu,
  Globe,
  Database,
  Terminal,
} from 'lucide-react';

export const ToolSecurityPolicyCard: React.FC = () => {
  const { data: policy } = useToolSecurityPolicy();

  return (
    <SectionCard
      title="Tool Security Policy (SAFE_READ_ONLY Security Boundary)"
      description="Server-authoritative tool capability allowlist, risk classification, resource scoping, and fail-closed preflight broker (Prompt 14.9A)."
      action={
        <Badge
          variant="outline"
          className="border-[#e2e8f0] bg-[#e0f2fe] text-[#0369a1] rounded-full text-[10px] font-mono px-2.5 py-0.5"
        >
          {policy ? policy.version : 'TOOL_SECURITY_POLICY_V1'}
        </Badge>
      }
    >
      <div className="space-y-6">
        {/* Top Status & Verification Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-mono">
          <div>
            <span className="text-[#64748b] block text-[11px]">Production Execution Mode</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-[#0f172a]">
              <Lock className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>SAFE_NO_TOOLS (ACTIVE)</span>
            </div>
          </div>
          <div>
            <span className="text-[#64748b] block text-[11px]">SAFE_READ_ONLY Status</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-[#15803d]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
              <span>VERIFIED — NOT ENABLED</span>
            </div>
          </div>
          <div>
            <span className="text-[#64748b] block text-[11px]">Future Canary Candidates</span>
            <span className="font-semibold text-[#0f172a] block mt-0.5">
              2 CAPABILITIES (MAX &le; 2)
            </span>
          </div>
          <div>
            <span className="text-[#64748b] block text-[11px]">Policy SHA-256 Hash</span>
            <span className="font-semibold text-[#0f172a] block mt-0.5 truncate" title={policy?.policy_hash}>
              {policy?.policy_hash ? `${policy.policy_hash.substring(0, 16)}...` : 'Computing...'}
            </span>
          </div>
        </div>

        {/* Approved Read-Only Tool Capabilities (Max 2 for Future Canary) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            <span>Approved Candidate Read-Only Capabilities (Strict Server Broker)</span>
            <span>Security Guarantees & Resource Scope</span>
          </div>

          <div className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-xl bg-white overflow-hidden text-xs">
            {/* Capability 1: runtime_status */}
            <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
              <div className="space-y-1 min-w-65">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-bold font-mono text-[#0f172a]">runtime_status</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                    READ_ONLY VERIFIED
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                    FUTURE CANARY
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b]">
                  Server-controlled systemd inspection via fixed argv <code className="font-mono text-[#0f172a]">/usr/bin/systemctl --user show</code>.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748b]">
                  <span>Unit: hermes-gateway.service</span>
                  <span>•</span>
                  <span>shell=False</span>
                  <span>•</span>
                  <span>Fingerprint: d7befb92...</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <div className="bg-[#f1f5f9] px-2 py-1 rounded-lg border border-[#e2e8f0] text-[#0f172a]">
                  Op: inspect_service
                </div>
                <div className="bg-[#f1f5f9] px-2 py-1 rounded-lg border border-[#e2e8f0] text-[#0f172a]">
                  Bound: 8KB / 100 lines
                </div>
                <div className="bg-[#fee2e2] text-[#b91c1c] px-2 py-1 rounded-lg border border-[#fecaca]">
                  Mutations: BLOCKED
                </div>
              </div>
            </div>

            {/* Capability 2: document_inspection */}
            <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
              <div className="space-y-1 min-w-65">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-bold font-mono text-[#0f172a]">document_inspection</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                    READ_ONLY VERIFIED
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                    FUTURE CANARY
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b]">
                  Bounded plain text reading with path traversal check, symlink escape check, and secret redaction.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748b]">
                  <span>Scope: docs/, artifacts/</span>
                  <span>•</span>
                  <span>Deny: .env, keys, tokens</span>
                  <span>•</span>
                  <span>Fingerprint: 74ae804f...</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <div className="bg-[#f1f5f9] px-2 py-1 rounded-lg border border-[#e2e8f0] text-[#0f172a]">
                  Op: read_text
                </div>
                <div className="bg-[#f1f5f9] px-2 py-1 rounded-lg border border-[#e2e8f0] text-[#0f172a]">
                  Bound: 32KB / 500 lines
                </div>
                <div className="bg-[#fef9c3] text-[#854d0e] px-2 py-1 rounded-lg border border-[#fef08a]">
                  Redaction: REQUIRED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strictly Denied Categories Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            <span>Explicitly Denied Tool Categories (Fail-Closed Architecture)</span>
            <span>Reason Code & Enforcement</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <Terminal className="h-4 w-4 text-[#b91c1c]" />
                  <span>Generic Shell</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                bash, sh, powershell, cmd, run_command, generic subprocess strictly prohibited.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <Globe className="h-4 w-4 text-[#b91c1c]" />
                  <span>Network Access</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                HTTP, GET, curl, fetch, SSRF, and cloud link-local metadata endpoints (169.254.169.254) blocked.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <Cpu className="h-4 w-4 text-[#b91c1c]" />
                  <span>Model Context Protocol</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                Dynamic unverified MCP servers and third-party tools disabled in V1.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <Database className="h-4 w-4 text-[#b91c1c]" />
                  <span>Database Mutations</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                Raw SQL strings, INSERT, UPDATE, DELETE, DROP, ALTER, and PRAGMA mutations fail closed.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <Ban className="h-4 w-4 text-[#b91c1c]" />
                  <span>Filesystem Mutation</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                File write, file deletion, directory creation, chmod, and symlink creation forbidden.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                  <ShieldAlert className="h-4 w-4 text-[#b91c1c]" />
                  <span>Cross-Profile Memory</span>
                </div>
                <span className="font-mono text-[10px] bg-[#fee2e2] text-[#b91c1c] px-1.5 py-0.5 rounded-full border border-[#fecaca]">
                  DENIED
                </span>
              </div>
              <p className="text-[11px] text-[#64748b]">
                Cross-profile session and transcript access strictly denied; profile memory isolation enforced.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Invariants Notice (Prompt 14.9A Section 94-95) */}
        <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-start gap-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-[#854d0e] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#0f172a]">
              Zero Live Production Tool Invocations Authorized in Prompt 14.9A
            </span>
            <p className="text-[#64748b] text-[11px]">
              The active production execution policy remains <code className="font-mono text-[#0f172a]">SAFE_NO_TOOLS</code>.
              Tool capabilities are verified cryptographically and structurally in isolation. No live tool invocations will occur until Prompt 14.9A.5 single safe read-only canary validation.
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
