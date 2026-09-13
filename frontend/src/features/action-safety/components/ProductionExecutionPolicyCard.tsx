import React, { useState } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { useExecutionPolicy, useToolSecurityPolicy, useReadOnlyResources } from '@/api/hooks';
import {
  Shield,
  Lock,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Database,
  FileText,
  Eye,
  Ban,
  Activity,
} from 'lucide-react';

const CANONICAL_PROFILES_ORDER = [
  'sagara-lab',
  'lead',
  'personal',
  'business',
  'marketing',
  'cs',
  'it-support',
  'it-coding',
];

const FALLBACK_RESOURCES = [
  {
    resource_id: 'DOC-CANARY-001',
    display_name: 'Docs Architecture Overview',
    resource_type: 'DOCUMENT',
    classification: 'RESTRICTED_READ_ONLY',
    max_bytes: 32768,
    max_lines: 500,
    enabled: true,
    allow_redaction: true,
    owner_policy: 'PRODUCTION_EXECUTION_POLICY_V2',
  },
  {
    resource_id: 'DOC-CANARY-ARTIFACT-001',
    display_name: 'Phase Completion Artifact (Read-Only)',
    resource_type: 'DOCUMENT',
    classification: 'RESTRICTED_READ_ONLY',
    max_bytes: 32768,
    max_lines: 500,
    enabled: true,
    allow_redaction: true,
    owner_policy: 'PRODUCTION_EXECUTION_POLICY_V2',
  },
  {
    resource_id: 'hermes-gateway.service',
    display_name: 'Hermes Gateway Service Status',
    resource_type: 'SYSTEMD_UNIT',
    classification: 'SYSTEM_STATUS_READ_ONLY',
    max_bytes: 8192,
    max_lines: 100,
    enabled: true,
    allow_redaction: false,
    owner_policy: 'PRODUCTION_EXECUTION_POLICY_V2',
  },
];

export const ProductionExecutionPolicyCard: React.FC = () => {
  const { data: policy } = useExecutionPolicy();
  const { data: toolPolicy } = useToolSecurityPolicy();
  const { data: serverResources } = useReadOnlyResources();

  const resources = (serverResources && serverResources.length > 0) ? serverResources : FALLBACK_RESOURCES;
  const [selectedResourceId, setSelectedResourceId] = useState<string>(resources[0]?.resource_id || 'DOC-CANARY-001');

  const selectedResource = resources.find((r) => r.resource_id === selectedResourceId) || resources[0];

  return (
    <SectionCard
      title="Production Execution Policy V2 (Limited Safe Read-Only)"
      description="Server-authoritative execution policy: Dual-mode Sagara Lab support (SAFE_NO_TOOLS + SAFE_READ_ONLY), single-tool budget, exact Tool Security Policy V1 cryptographic binding, and server-side Read-Only Resource Registry."
      action={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#bae6fd] bg-[#e0f2fe] text-[#0369a1] rounded-full text-[10px] font-mono px-2.5 py-0.5"
          >
            Active Policy: {policy ? policy.version : 'PRODUCTION_EXECUTION_POLICY_V2'}
          </Badge>
          <Badge
            variant="outline"
            className="border-[#e2e8f0] bg-[#f1f5f9] text-[#475569] rounded-full text-[10px] font-mono px-2.5 py-0.5"
          >
            Tool Policy: {toolPolicy ? toolPolicy.version : 'TOOL_SECURITY_POLICY_V1'}
          </Badge>
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        {/* Top Summary Bar - Policy Version Separations & Lock Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs font-mono">
          <div>
            <span className="text-[#64748b] block text-[11px]">Active Production Policy</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-[#0f172a]">
              <Shield className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>{policy?.version || 'PRODUCTION_EXECUTION_POLICY_V2'}</span>
            </div>
            <span className="text-[10px] text-[#64748b] truncate block mt-0.5" title={policy?.policy_hash}>
              Hash: {policy?.policy_hash ? `${policy.policy_hash.substring(0, 12)}...` : 'c5dc6df112e5...'}
            </span>
          </div>

          <div>
            <span className="text-[#64748b] block text-[11px]">Bound Tool Security Policy</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-[#0f172a]">
              <Lock className="h-3.5 w-3.5 text-[#0369a1]" />
              <span>{toolPolicy?.version || 'TOOL_SECURITY_POLICY_V1'}</span>
            </div>
            <span className="text-[10px] text-[#64748b] truncate block mt-0.5" title={toolPolicy?.policy_hash}>
              Hash: {toolPolicy?.policy_hash ? `${toolPolicy.policy_hash.substring(0, 12)}...` : '9bdd1d541022...'}
            </span>
          </div>

          <div>
            <span className="text-[#64748b] block text-[11px]">Sagara Lab Profile State</span>
            <span className="font-semibold text-[#0369a1] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-0.5 rounded-full inline-block mt-0.5 text-[10px]">
              LIMITED (2 MODES ELIGIBLE)
            </span>
            <span className="text-[10px] text-[#64748b] block mt-0.5">
              SAFE_NO_TOOLS + SAFE_READ_ONLY
            </span>
          </div>

          <div>
            <span className="text-[#64748b] block text-[11px]">Production Execution State</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-[#b91c1c]">
              <span className="h-2 w-2 rounded-full bg-[#b91c1c]" />
              <span>LOCKED (KILL SWITCH ACTIVE)</span>
            </div>
            <span className="text-[10px] text-[#64748b] block mt-0.5">
              Zero active windows • Not executing
            </span>
          </div>
        </div>

        {/* Sagara Lab Capabilities & Read-Only Tools (Section 62, 63) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            <span>Sagara Lab Capabilities & Read-Only Tool Eligibility</span>
            <span className="font-mono text-[10px] text-[#2563eb]">Max 1 Tool Call / Execution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Mode 1: SAFE_NO_TOOLS */}
            <div className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#15803d]" />
                  <span className="font-bold text-[#0f172a]">SAFE_NO_TOOLS</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                  ENABLED BY POLICY
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] font-sans">
                Permitted Task Classes: <span className="font-mono font-semibold text-[#0f172a]">REASONING_ONLY</span>, <span className="font-mono font-semibold text-[#0f172a]">DRAFT_GENERATION</span>.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#64748b] bg-[#f8fafc] p-2 rounded-lg border border-[#f1f5f9]">
                <Ban className="h-3.5 w-3.5 text-[#b91c1c] shrink-0" />
                <span>Zero tools authorized under this mode. Strict global tool deny.</span>
              </div>
            </div>

            {/* Mode 2: SAFE_READ_ONLY */}
            <div className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#0369a1]" />
                  <span className="font-bold text-[#0f172a]">SAFE_READ_ONLY</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                  ENABLED BY POLICY
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] font-sans">
                Permitted Task Class: <span className="font-mono font-semibold text-[#0f172a]">READ_ONLY_INSPECTION</span>. Multi-tool tasks denied.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#64748b] bg-[#f8fafc] p-2 rounded-lg border border-[#f1f5f9]">
                <Lock className="h-3.5 w-3.5 text-[#0369a1] shrink-0" />
                <span>Single-tool budget: Exactly 1 read-only tool invocation per execution.</span>
              </div>
            </div>
          </div>

          {/* Approved Read-Only Tools Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Tool 1: runtime_status */}
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-bold text-[#0f172a]">runtime_status</span>
                  <span className="text-[10px] text-[#64748b]">v1.0.0</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                  LIMITED / READ_ONLY
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] space-y-1 font-sans">
                <div>Operation: <span className="font-mono font-semibold text-[#0f172a]">inspect_service</span></div>
                <div>Fixed Service: <span className="font-mono font-semibold text-[#0f172a]">hermes-gateway.service</span></div>
                <div className="text-[10px] text-[#0369a1] bg-white p-1.5 rounded-lg border border-[#e2e8f0]">
                  No freeform service parameter permitted. Preflight binds to policy-defined unit.
                </div>
              </div>
            </div>

            {/* Tool 2: document_inspection */}
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-bold text-[#0f172a]">document_inspection</span>
                  <span className="text-[10px] text-[#64748b]">v1.0.0</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                  LIMITED / READ_ONLY
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] space-y-1 font-sans">
                <div>Operation: <span className="font-mono font-semibold text-[#0f172a]">read_text</span></div>
                <div>Target Resolution: <span className="font-mono font-semibold text-[#0f172a]">Logical Resource Registry</span></div>
                <div className="text-[10px] text-[#0369a1] bg-white p-1.5 rounded-lg border border-[#e2e8f0]">
                  No freeform file paths. Resolves strictly through server-side canonical registry.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Resource Registry Table & Logical Selector (Sections 64, 65, 66) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>Server-Authoritative Read-Only Resource Registry</span>
            </div>
            <span className="font-mono text-[10px] text-[#15803d]">
              {resources.filter((r) => r.enabled).length} Active / {resources.length} Registered
            </span>
          </div>

          <div className="border border-[#e2e8f0] rounded-xl bg-white overflow-hidden text-xs">
            <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-semibold text-[#0f172a]">Registered Logical Resources (Safe Metadata Only)</span>
                <p className="text-[11px] text-[#64748b]">
                  Operators select registered logical resource IDs. Absolute filesystem paths are never accepted from clients.
                </p>
              </div>

              {/* Resource Selector Dropdown (No Freeform Path Input) */}
              <div className="flex items-center gap-2">
                <label htmlFor="resource-selector" className="text-[11px] text-[#64748b] font-mono whitespace-nowrap">
                  Select Resource:
                </label>
                <select
                  id="resource-selector"
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="font-mono text-xs bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1 text-[#0f172a] focus:outline-none focus:border-[#2563eb]"
                >
                  {resources.map((res) => (
                    <option key={res.resource_id} value={res.resource_id}>
                      {res.resource_id} ({res.display_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resource Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="bg-[#f8fafc]/80 border-b border-[#f1f5f9] text-[#64748b]">
                    <th className="py-2.5 px-3 font-semibold">Resource ID</th>
                    <th className="py-2.5 px-3 font-semibold">Display Name</th>
                    <th className="py-2.5 px-3 font-semibold">Classification</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Max Limits</th>
                    <th className="py-2.5 px-3 font-semibold">Redaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {resources.map((res) => {
                    const isSelected = res.resource_id === selectedResource?.resource_id;
                    return (
                      <tr
                        key={res.resource_id}
                        onClick={() => setSelectedResourceId(res.resource_id)}
                        className={`cursor-pointer hover:bg-[#f8fafc] transition-colors ${
                          isSelected ? 'bg-[#f1f5f9]/80 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-[#2563eb] flex items-center gap-1.5">
                          <Eye className="h-3 w-3 text-[#64748b]" />
                          <span>{res.resource_id}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#0f172a] font-sans">{res.display_name}</td>
                        <td className="py-2.5 px-3 text-[#64748b]">{res.classification}</td>
                        <td className="py-2.5 px-3">
                          {res.enabled ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                              ENABLED
                            </span>
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]">
                              REVOKED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748b]">
                          {Math.round(res.max_bytes / 1024)} KB / {res.max_lines} lines
                        </td>
                        <td className="py-2.5 px-3 text-[#64748b]">
                          {res.allow_redaction ? 'Mandatory' : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Resource Safe Preview */}
            {selectedResource && (
              <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b]">Selected for SAFE_READ_ONLY Inspection:</span>
                  <span className="font-mono font-bold text-[#0f172a]">{selectedResource.resource_id}</span>
                  <span className="text-[#64748b]">({selectedResource.display_name})</span>
                </div>
                <div className="text-[#64748b] font-mono text-[10px]">
                  Owner Policy: {selectedResource.owner_policy} • SHA-256 bound at Preflight
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8-Profile Policy Matrix */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            <span>Profile Execution Matrix (8 Canonical Profiles)</span>
            <span>Policy Status & Allowed Modes</span>
          </div>

          <div className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-xl bg-white overflow-hidden text-xs">
            {CANONICAL_PROFILES_ORDER.map((profileId) => {
              const rule = policy?.profiles?.[profileId];
              const isLimited = rule?.status === 'LIMITED';

              return (
                <div
                  key={profileId}
                  className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                    isLimited ? 'bg-[#f8fafc]/60' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1 min-w-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[#0f172a]">{profileId}</span>
                      {isLimited ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                          LIMITED ROLLOUT
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]">
                          DISABLED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748b]">
                      {isLimited
                        ? 'Permitted workloads: SAFE_NO_TOOLS (reasoning, draft) + SAFE_READ_ONLY (inspection). 7 other profiles strictly disabled.'
                        : rule?.disabled_reason || 'Production execution disabled by policy.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#0f172a]">
                    {isLimited ? (
                      <>
                        <div className="flex items-center gap-1 bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded-lg border border-[#bbf7d0]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>REASONING / DRAFT / INSPECTION</span>
                        </div>
                        <div className="bg-[#e0f2fe] text-[#0369a1] px-2 py-0.5 rounded-lg border border-[#bae6fd]">
                          Modes: SAFE_NO_TOOLS + SAFE_READ_ONLY
                        </div>
                        <div className="bg-[#f1f5f9] px-2 py-0.5 rounded-lg border border-[#e2e8f0] text-[#64748b]">
                          Concurrency: 1
                        </div>
                        <div className="bg-[#f1f5f9] px-2 py-0.5 rounded-lg border border-[#e2e8f0] text-[#64748b]">
                          Rate: 3/hr
                        </div>
                        <div className="bg-[#fef9c3] text-[#854d0e] px-2 py-0.5 rounded-lg border border-[#fef08a]">
                          Approval: REQUIRED
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-[#94a3b8]">
                        <AlertCircle className="h-3.5 w-3.5 text-[#b91c1c]" />
                        <span>All task classes & tools blocked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Policy Retention & Safety Guardrails */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0f172a]">
              <Shield className="h-4 w-4 text-[#2563eb]" />
              <span>Policy Evolution & V1 Historical Retention</span>
            </div>
            <ul className="text-[11px] text-[#64748b] space-y-1 list-disc pl-4 font-sans">
              <li><span className="font-mono font-semibold text-[#0f172a]">V1 Preserved:</span> bda47521c788... remains immutable for historical receipts.</li>
              <li><span className="font-mono font-semibold text-[#0f172a]">V2 Supersedes:</span> c5dc6df112e5... applies strictly to new production tasks.</li>
              <li><span className="font-mono font-semibold text-[#0f172a]">Tool Policy Binding:</span> Bound to exact ToolSecurityPolicy V1 (9bdd1d541022...).</li>
              <li><span className="font-mono font-semibold text-[#0f172a]">Rollback Guaranteed:</span> Audited rollback to V1 instantly revokes SAFE_READ_ONLY.</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#e2e8f0] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0f172a]">
              <FileCode className="h-4 w-4 text-[#0369a1]" />
              <span>Strict Execution Boundaries</span>
            </div>
            <ul className="text-[11px] text-[#64748b] space-y-1 list-disc pl-4 font-sans">
              <li>Single-Tool Budget: Maximum 1 read-only tool invocation per execution window.</li>
              <li>Channels Denied: Network (DENY), MCP (DENY), Generic Shell (DENY).</li>
              <li>Untrusted Tool Data: Read-only results cannot alter permissions or scopes.</li>
              <li>Production Locked: Mission Control execution remains locked by default.</li>
            </ul>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
