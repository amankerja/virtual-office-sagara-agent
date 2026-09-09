import React from 'react'
import type { DelegationProjection } from '@/types/runtime'
import { FileText, Bot } from 'lucide-react'

interface DelegationTaskTabProps {
  delegation: DelegationProjection;
}

export const DelegationTaskTab: React.FC<DelegationTaskTabProps> = ({ delegation }) => {
  return (
    <div className="p-4 sm:p-5 space-y-4 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border flex items-center gap-2">
        <Bot className="h-4 w-4 text-interactive shrink-0" />
        <div>
          <span className="text-[10px] text-text-muted uppercase block">Dispatched By</span>
          <span className="font-semibold text-text-primary text-xs block font-sans">
            {delegation.originAgentName} ({delegation.originAgentId})
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1">
          <FileText className="h-3 w-3" /> Task Title
        </h4>
        <div className="p-3 rounded-md bg-surface border border-border text-text-primary font-semibold text-sm font-sans">
          {delegation.taskTitle}
        </div>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Task Specification & Prompt Payload
        </h4>
        <div className="p-3.5 rounded-md bg-surface-subtle border border-border-subtle text-text-secondary font-sans text-xs leading-relaxed">
          {delegation.taskDescription || 'No description payload supplied with delegation envelope.'}
        </div>
      </div>
    </div>
  )
}
