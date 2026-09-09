import React from 'react'
import type { DelegationProjection } from '@/types/runtime'
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface DelegationResultTabProps {
  delegation: DelegationProjection;
}

export const DelegationResultTab: React.FC<DelegationResultTabProps> = ({ delegation }) => {
  const isCompleted = delegation.state === 'COMPLETED'
  const isFailed = delegation.state === 'FAILED'

  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] text-text-muted uppercase block">Execution Result Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : isFailed ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            ) : (
              <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            )}
            <span className="font-bold text-text-primary text-xs uppercase">
              {delegation.state}
            </span>
          </div>
        </div>

        {delegation.completedAt && (
          <div className="text-right">
            <span className="text-[10px] text-text-muted uppercase block">Completed At</span>
            <span className="text-text-secondary text-[11px] mt-0.5 block">
              {formatTimestampRelative(delegation.completedAt)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Result Summary Payload
        </h4>
        <div className="p-3.5 rounded-md bg-surface-subtle border border-border text-text-secondary font-sans text-xs leading-relaxed">
          {delegation.resultSummary || 'No final result payload generated yet.'}
        </div>
      </div>
    </div>
  )
}
