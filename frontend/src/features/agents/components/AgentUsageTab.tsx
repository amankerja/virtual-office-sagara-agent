import React from 'react'
import type { AgentProjection } from '@/types/agent'
import { Coins, Database, Zap, Cpu } from 'lucide-react'

interface AgentUsageTabProps {
  agent: AgentProjection;
}

export const AgentUsageTab: React.FC<AgentUsageTabProps> = ({ agent }) => {
  const usage = agent.usage || {}

  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const cacheReadTokens = usage.cacheReadTokens ?? 0
  const reasoningTokens = usage.reasoningTokens ?? 0
  const cost = usage.estimatedCostUsd ?? 0

  return (
    <div className="space-y-4 text-xs font-mono-tech">
      {/* Cost Highlight Card */}
      <div className="p-4 rounded-lg border border-border bg-surface flex items-center justify-between">
        <div>
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">
            Estimated Token Cost
          </span>
          <span className="text-2xl font-bold text-text-primary tracking-tight mt-0.5 block">
            ${cost.toFixed(2)}
          </span>
          <span className="text-[11px] text-text-muted mt-1 block font-sans">
            Calculated from model context rates in local sandbox
          </span>
        </div>
        <div className="h-10 w-10 rounded-lg bg-interactive/10 border border-interactive/30 flex items-center justify-center text-interactive">
          <Coins className="h-5 w-5" />
        </div>
      </div>

      {/* Token Distribution Metrics */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Token Volume Breakdown
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-1.5 text-text-muted mb-1 text-[11px]">
              <Zap className="h-3.5 w-3.5 text-interactive" />
              Input Tokens
            </div>
            <span className="text-base font-semibold text-text-primary">
              {inputTokens.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-1.5 text-text-muted mb-1 text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-emerald-500" />
              Output Tokens
            </div>
            <span className="text-base font-semibold text-text-primary">
              {outputTokens.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-1.5 text-text-muted mb-1 text-[11px]">
              <Database className="h-3.5 w-3.5 text-cyan-500" />
              Cache Read
            </div>
            <span className="text-base font-semibold text-text-primary">
              {cacheReadTokens.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-1.5 text-text-muted mb-1 text-[11px]">
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              Reasoning Tokens
            </div>
            <span className="text-base font-semibold text-text-primary">
              {reasoningTokens.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
