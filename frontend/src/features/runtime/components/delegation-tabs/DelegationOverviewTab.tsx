import React from 'react'
import type { DelegationProjection } from '@/types/runtime'
import { Hash, Radio, Cpu, Clock, ShieldCheck, AlertCircle } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface DelegationOverviewTabProps {
  delegation: DelegationProjection;
  onNavigateSession?: (id: string) => void;
}

export const DelegationOverviewTab: React.FC<DelegationOverviewTabProps> = ({
  delegation,
  onNavigateSession,
}) => {
  return (
    <div className="p-4 sm:p-5 space-y-5 text-xs font-mono-tech">
      {/* Important Owner PID Boundary Notice */}
      <div className="p-3.5 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Process Supervisor Notice:
        </span>
        An owner PID indicates host process runtime confirmation. It demonstrates process supervisor ownership but does not automatically infer that specific capability sub-tasks are actively executing.
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Delegation Parameters
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Hash className="h-3 w-3" /> Delegation ID
            </span>
            <span className="font-medium text-text-primary mt-1 block truncate">
              {delegation.id}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Host Worker PID
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {delegation.ownerPid ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  PID {delegation.ownerPid} (Confirmed)
                </span>
              ) : (
                <span className="text-text-muted">Unassigned / Terminated</span>
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Radio className="h-3 w-3" /> Origin Session
            </span>
            <button
              type="button"
              onClick={() => onNavigateSession?.(delegation.originSessionId)}
              className="font-medium text-interactive mt-1 block truncate hover:underline text-left"
            >
              {delegation.originSessionId}
            </button>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Delivery State
            </span>
            <span className="font-medium text-text-primary mt-1 block uppercase">
              {delegation.deliveryState || '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Started At
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {formatTimestampRelative(delegation.startedAt)}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last Checkpoint
            </span>
            <span className="font-medium text-text-primary mt-1 block">
              {formatTimestampRelative(delegation.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Result Preview */}
      {delegation.resultSummary && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase text-text-muted font-semibold tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Latest Checkpoint Summary
          </span>
          <div className="p-3 rounded-md bg-surface-subtle border border-border text-text-secondary font-sans leading-relaxed text-xs">
            {delegation.resultSummary}
          </div>
        </div>
      )}
    </div>
  )
}
