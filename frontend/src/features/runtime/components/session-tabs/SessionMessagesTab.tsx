import React, { useState } from 'react'
import type { SessionMessage } from '@/types/runtime'
import { MessageSquare, ShieldAlert, ChevronDown, ChevronUp, Wrench, User, Bot, Terminal } from 'lucide-react'
import { formatTimestampRelative } from '@/lib/formatters'

interface SessionMessagesTabProps {
  messages?: SessionMessage[];
}

export const SessionMessagesTab: React.FC<SessionMessagesTabProps> = ({ messages = [] }) => {
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center space-y-2 font-mono-tech">
        <MessageSquare className="h-8 w-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">
          No Transcript Messages Found
        </h4>
        <p className="text-[11px] text-text-muted max-w-xs mx-auto font-sans leading-relaxed">
          Transcript records are not yet ingested or have been evicted by session memory limits.
        </p>
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const getRoleConfig = (role: SessionMessage['role']) => {
    switch (role) {
      case 'user':
        return {
          icon: User,
          label: 'User',
          class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        }
      case 'assistant':
        return {
          icon: Bot,
          label: 'Assistant',
          class: 'bg-interactive/10 text-interactive border-interactive/20',
        }
      case 'tool':
        return {
          icon: Wrench,
          label: 'Tool Response',
          class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        }
      case 'system':
      default:
        return {
          icon: Terminal,
          label: 'System',
          class: 'bg-slate-500/10 text-text-muted border-border',
        }
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-3 font-mono-tech text-xs">
      <div className="p-3 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
        <span className="font-semibold font-mono-tech text-text-primary block mb-0.5">
          Transcript Inspection View:
        </span>
        Normalized message timeline. Sensitive data, passwords, and private API keys are filtered by supervisor policy.
      </div>

      <div className="space-y-2.5">
        {messages.map((msg) => {
          const roleConfig = getRoleConfig(msg.role)
          const RoleIcon = roleConfig.icon
          const isExpanded = expandedMessages[msg.id] ?? false

          return (
            <div
              key={msg.id}
              className="rounded-lg border border-border bg-surface overflow-hidden transition-colors"
            >
              {/* Message Header */}
              <div className="p-2.5 bg-surface-subtle/70 border-b border-border-subtle flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${roleConfig.class}`}
                  >
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleConfig.label}
                  </span>

                  {msg.toolAssociation && (
                    <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border truncate max-w-[140px]">
                      {msg.toolAssociation}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-text-muted">
                  {formatTimestampRelative(msg.timestamp)}
                </span>
              </div>

              {/* Message Body */}
              <div className="p-3 space-y-2">
                {msg.isSensitive ? (
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs font-sans">
                      <span className="font-semibold font-mono-tech block text-[11px]">
                        Sensitive Content Redacted by Policy
                      </span>
                      <p className="text-[11px] text-rose-600/90 dark:text-rose-300/90">
                        {msg.redactedReason || 'Credential or token pattern hidden for safety.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="font-sans text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {isExpanded
                      ? msg.contentPreview
                      : msg.contentPreview.length > 200
                      ? `${msg.contentPreview.slice(0, 200)}...`
                      : msg.contentPreview}
                  </div>
                )}

                {/* Expansion CTA if long */}
                {!msg.isSensitive && msg.contentPreview.length > 200 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(msg.id)}
                    className="text-[11px] text-interactive hover:underline flex items-center gap-1 font-mono-tech pt-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" /> Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" /> Show full message
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
