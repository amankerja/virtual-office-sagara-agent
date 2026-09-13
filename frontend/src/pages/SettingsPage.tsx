import React from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { useTheme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Monitor,
  Moon,
  Sun,
  Lock,
  CheckCircle2,
  Radio,
  GitBranch,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ActionSafetyCard } from '@/features/action-safety/components/ActionSafetyCard'
import { useRealtimeStore } from '@/features/realtime'
import {
  useGatewayTelemetry,
  useExecutionLock,
  useExecutionPolicy,
  useExecutionReadiness,
  useMyPrincipal,
  useReleaseMetadata,
} from '@/api/hooks'

export const SettingsPage: React.FC = () => {
  const { preference, resolvedTheme, setTheme } = useTheme()
  const realtimeStatus = useRealtimeStore((s) => s.status)
  const { data: gateway } = useGatewayTelemetry()
  const { data: lockInfo } = useExecutionLock()
  const { data: policy } = useExecutionPolicy()
  const { data: readiness, error: readinessError } = useExecutionReadiness()
  const { data: principal } = useMyPrincipal()
  const { data: release } = useReleaseMetadata()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Mission Control operational configuration, execution safety policies, and system status."
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              LIVE TELEMETRY
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Environment */}
        <SectionCard
          title="Environment"
          description="Operational context, deployment parameters, and backend routing."
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Environment Mode:</span>
              <span className="font-medium text-text-primary px-2 py-0.5 rounded bg-surface-subtle border border-border">
                PRODUCTION
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Access Tier:</span>
              <span className="text-text-primary px-2 py-0.5 rounded bg-surface-subtle border border-border">
                Private Access
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Backend Connection:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Connected (Same-Origin)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Realtime State:</span>
              <span className="font-mono-tech text-[11px] text-text-primary uppercase flex items-center gap-1.5">
                <Radio className={cn('h-3 w-3', realtimeStatus === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-amber-500')} />
                {realtimeStatus}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 2. Execution Safety Section */}
        <SectionCard
          title="Execution Safety"
          description="Enforced guardrails from ProductionExecutionPolicy and tool isolation contracts."
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Policy Name:</span>
              <span className="font-mono-tech text-[11px] font-semibold text-text-primary">
                {release?.productionPolicy || policy?.version || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Policy Hash:</span>
              <span className="font-mono-tech text-[11px] text-text-secondary" title={release?.policyHash || policy?.policy_hash}>
                {release?.policyHash ? `${release.policyHash.slice(0, 16)}...` : policy?.policy_hash ? `${policy.policy_hash.slice(0, 16)}...` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Execution Gate:</span>
              {lockInfo?.is_locked || lockInfo?.status === 'LOCKED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold text-[10px]">
                  <Lock className="h-3 w-3" />
                  LOCKED
                </span>
              ) : lockInfo?.status === 'UNLOCKED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                  <Lock className="h-3 w-3" />
                  UNLOCKED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border font-medium text-[10px]">
                  UNKNOWN
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Active Windows:</span>
              <span className="font-mono-tech text-[11px] text-text-primary">
                {lockInfo ? (lockInfo.active_window ? `1 (Active: ${lockInfo.active_window.id})` : '0 (Closed)') : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Profile Allowlist:</span>
              <span className="text-[11px] text-text-secondary">
                {policy?.profiles ? (
                  (() => {
                    const limited = Object.entries(policy.profiles).filter(([, p]) => p.status === 'LIMITED').map(([id]) => id)
                    return limited.length > 0 ? (
                      <>
                        <span className="text-interactive font-medium">{limited.join(', ')}</span> (LIMITED)
                      </>
                    ) : (
                      'None (LIMITED)'
                    )
                  })()
                ) : (
                  'UNKNOWN'
                )}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 3. Appearance & Theme Setting */}
        <SectionCard
          title="Appearance & Theme"
          description="Select dashboard theme preference. Synchronized with the global header theme switcher."
          className="md:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-subtle border border-border">
              <div>
                <h3 className="text-xs font-semibold text-text-primary">
                  Interface Theme
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Currently active: <span className="font-semibold text-interactive capitalize">{resolvedTheme}</span>
                  {preference === 'system' && <span className="text-text-muted"> (following OS scheme)</span>}
                </p>
              </div>

              {/* Theme Selector Buttons */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                <Button
                  variant={preference === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-h-10 sm:min-h-8 text-xs font-medium',
                    preference === 'light' ? 'bg-interactive text-white' : 'border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={preference === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-h-10 sm:min-h-8 text-xs font-medium',
                    preference === 'dark' ? 'bg-interactive text-white' : 'border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={preference === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-h-10 sm:min-h-8 text-xs font-medium',
                    preference === 'system' ? 'bg-interactive text-white' : 'border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>System</span>
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 4. Release & Engine Specifications */}
        <SectionCard
          title="Release & Engine"
          description="Authoritative build identifiers and runtime contracts."
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Mission Control Release:</span>
              <span className="font-semibold text-text-primary">
                {release?.platform || 'Mission Control'}{release?.missionControlVersion ? ` v${release.missionControlVersion}` : ' V1'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Mission Control Commit:</span>
              <span className="font-mono-tech text-[11px] text-text-primary flex items-center gap-1">
                <GitBranch className="h-3 w-3 text-text-muted" />
                {release?.missionControlCommit ? release.missionControlCommit.slice(0, 8) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Runtime Contract:</span>
              <span className="font-mono-tech text-[11px] text-text-primary">
                {release?.runtimeContract || 'SAGARA_HERMES_RUNTIME_CONTRACT_V1'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Sagara Deployed Commit:</span>
              <span className="font-mono-tech text-[11px] text-interactive flex items-center gap-1" title={release?.sagaraDeployedCommit}>
                <GitBranch className="h-3 w-3" />
                {release?.sagaraDeployedCommit ? `${release.sagaraDeployedCommit.slice(0, 8)} (Deployed)` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Sagara Freeze Baseline:</span>
              <span className="font-mono-tech text-[11px] text-text-secondary flex items-center gap-1" title={release?.sagaraFreezeCommit || 'babbd61618f6eb3db99109ba24e0d49b2c9b97d7'}>
                <GitBranch className="h-3 w-3" />
                {release?.sagaraFreezeCommit ? `${release.sagaraFreezeCommit.slice(0, 8)} (Historical Baseline)` : 'babbd616 (Historical Baseline)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Hermes Version:</span>
              <span className="font-mono-tech text-[11px] text-text-secondary">
                {release?.hermesVersion ? `v${release.hermesVersion}` : ''} {gateway?.backendId ? `(${gateway.backendId}${gateway.pid !== undefined ? `, PID ${gateway.pid}` : ''})` : 'UNAVAILABLE'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 5. API Configuration & Boundary */}
        <SectionCard
          title="API & Health"
          description="Endpoint configuration and architectural boundaries."
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">API Endpoint:</span>
              <span className="font-mono-tech text-[11px] text-text-primary bg-surface-subtle px-2 py-0.5 rounded border border-border">
                Same-Origin (/api/v1)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Backend Health:</span>
              {readinessError ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  UNAVAILABLE
                </span>
              ) : readiness?.infrastructureReady ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  HEALTHY
                </span>
              ) : readiness ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  DEGRADED
                </span>
              ) : (
                <span className="text-text-muted font-medium flex items-center gap-1">
                  CHECKING...
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Direct Hermes Access:</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                DISABLED (Architecture Guard)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Operator Principal:</span>
              <span className="font-medium text-text-primary">
                {principal?.displayName || principal?.id || 'Authorized Operator'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Full Action Safety Audit Ledger & Verification Card */}
        <div className="md:col-span-2">
          <ActionSafetyCard />
        </div>
      </div>
    </div>
  )
}
