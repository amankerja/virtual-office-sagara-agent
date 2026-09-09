import React from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { Badge } from '@/components/ui/badge'

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Mission Control system preferences, API endpoints, and operator credentials."
        badge={
          <Badge variant="outline" className="border-[#1e2436] bg-[#0f121a] text-[#94a3b8] font-mono-tech text-[10px]">
            LOCAL ENVIRONMENT
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="API Configuration"
          description="Endpoint boundary for communicating with Sagara Mission Control backend."
        >
          <div className="space-y-3 font-mono-tech text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[#1e2436]">
              <span className="text-[#94a3b8]">Backend Endpoint:</span>
              <span className="text-[#f1f5f9] bg-[#090b10] px-2 py-0.5 rounded border border-[#1e2436]">
                {import.meta.env.VITE_MISSION_CONTROL_API_URL || 'http://localhost:8000'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1e2436]">
              <span className="text-[#94a3b8]">Direct Hermes Access:</span>
              <span className="text-amber-400">DISABLED (Architecture Guard)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#94a3b8]">Connection Mode:</span>
              <span className="text-blue-400">Local Sandbox</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Security & Isolation"
          description="Operational scope and execution boundaries."
        >
          <div className="space-y-3 font-mono-tech text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[#1e2436]">
              <span className="text-[#94a3b8]">Production VPS Link:</span>
              <span className="text-emerald-400">ISOLATED</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1e2436]">
              <span className="text-[#94a3b8]">Telemetry Protocol:</span>
              <span className="text-[#64748b]">HTTP/REST + SSE (Pending)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#94a3b8]">Operator Role:</span>
              <span className="text-[#f1f5f9]">Local Engineer</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
