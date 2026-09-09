import React from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export const SettingsPage: React.FC = () => {
  const { preference, resolvedTheme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Mission Control system preferences, visual appearance, and operator environment boundaries."
        badge={
          <Badge variant="outline" className="border-border bg-surface text-text-muted font-mono-tech text-[10px]">
            LOCAL ENVIRONMENT
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Theme Setting */}
        <SectionCard
          title="Appearance & Theme"
          description="Select dashboard theme preference. Synchronized with the global header theme switcher."
          className="md:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-subtle border border-border">
              <div>
                <h3 className="text-xs font-semibold text-text-primary uppercase font-mono-tech tracking-wider">
                  Interface Theme
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Currently active: <span className="font-semibold text-interactive uppercase font-mono-tech">{resolvedTheme}</span>
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

        {/* API Configuration */}
        <SectionCard
          title="API Configuration"
          description="Endpoint boundary for communicating with Sagara Mission Control backend."
        >
          <div className="space-y-3 font-mono-tech text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Backend Endpoint:</span>
              <span className="text-text-primary bg-background px-2 py-0.5 rounded border border-border">
                {import.meta.env.VITE_MISSION_CONTROL_API_URL || 'http://localhost:8000'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Direct Hermes Access:</span>
              <span className="text-amber-600 dark:text-amber-400">DISABLED (Architecture Guard)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Connection Mode:</span>
              <span className="text-interactive">Local Sandbox</span>
            </div>
          </div>
        </SectionCard>

        {/* Security & Isolation */}
        <SectionCard
          title="Security & Isolation"
          description="Operational scope and execution boundaries."
        >
          <div className="space-y-3 font-mono-tech text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Production VPS Link:</span>
              <span className="text-emerald-600 dark:text-emerald-400">ISOLATED</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-text-muted">Telemetry Protocol:</span>
              <span className="text-text-muted">HTTP/REST + SSE (Pending)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-muted">Operator Role:</span>
              <span className="text-text-primary">Local Engineer</span>
            </div>
          </div>
        </SectionCard>

        {/* Governance & Policies Placeholder (Prompt 05 Section 47) */}
        <SectionCard
          title="Governance Policies & Quotas"
          description="Advisory budget ceilings, runtime concurrency limits, and human approval risk thresholds."
          className="md:col-span-2"
        >
          <div className="space-y-3 font-mono-tech text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-border">
              <div>
                <span className="font-semibold text-text-primary block">Monthly Token Budget Ceiling</span>
                <span className="text-[11px] text-text-muted font-sans">Enforces advisory warning state when cumulative spend reaches 70% threshold.</span>
              </div>
              <span className="text-text-muted bg-surface-subtle px-2.5 py-1 rounded border border-border self-start sm:self-auto text-[11px]">
                Not connected • Future backend policy
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-border">
              <div>
                <span className="font-semibold text-text-primary block">Runtime Concurrency Quota</span>
                <span className="text-[11px] text-text-muted font-sans">Limits simultaneous parallel subprocess execution across worker pool.</span>
              </div>
              <span className="text-text-muted bg-surface-subtle px-2.5 py-1 rounded border border-border self-start sm:self-auto text-[11px]">
                Not connected • Future backend policy
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
              <div>
                <span className="font-semibold text-text-primary block">Approval Escalation Policies</span>
                <span className="text-[11px] text-text-muted font-sans">Automated classification of high-risk socket, credential, or disk mutations.</span>
              </div>
              <span className="text-text-muted bg-surface-subtle px-2.5 py-1 rounded border border-border self-start sm:self-auto text-[11px]">
                Not connected • Future backend policy
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
