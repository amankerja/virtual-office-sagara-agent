import React, { useState } from 'react'
import { AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react'
import { ModalShell } from '@/components/modal/ModalShell'
import { DetailHeader } from '@/components/modal/DetailHeader'
import { Button } from '@/components/ui/button'
import { useDraftStore } from '../draft-store'
import type { AgentProjection } from '@/types/agent'

export interface ConfigurationChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentProjection[];
}

export const ConfigurationChangesModal: React.FC<ConfigurationChangesModalProps> = ({
  isOpen,
  onClose,
  agents,
}) => {
  const { draftChanges, discardAllDrafts, discardProfileDraft } = useDraftStore()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const [isApplying, setIsApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)

  const handleDiscardAll = () => {
    discardAllDrafts()
    setConfirmDiscard(false)
    onClose()
  }

  const handleApplyToProduction = async () => {
    setIsApplying(true)
    try {
      for (const [profileId, changes] of byProfile.entries()) {
        const agent = agents.find((a) => a.id === profileId)
        let currentSkills = agent?.skills ? agent.skills.map((s) => s.id) : []

        for (const ch of changes) {
          if (ch.action === 'ADD_SKILL' && !currentSkills.includes(ch.targetValue)) {
            currentSkills.push(ch.targetValue)
          } else if (ch.action === 'REMOVE_SKILL') {
            currentSkills = currentSkills.filter((id) => id !== ch.targetValue)
          }
        }

        await fetch(`/api/v1/profiles/${profileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowed_skills: currentSkills }),
        })
      }

      discardAllDrafts()
      setApplySuccess(true)
      setTimeout(() => {
        setApplySuccess(false)
        onClose()
        window.location.reload()
      }, 1000)
    } catch (e) {
      console.error('Failed to apply profile changes:', e)
    } finally {
      setIsApplying(false)
    }
  }

  // Group changes by profile
  const byProfile = new Map<string, typeof draftChanges>()
  for (const c of draftChanges) {
    const list = byProfile.get(c.profileId) || []
    list.push(c)
    byProfile.set(c.profileId, list)
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Review Staged Configuration Changes"
      size="default"
    >
      <DetailHeader
        title="Configuration Changes Review"
        subtitle={`${draftChanges.length} staged change${draftChanges.length === 1 ? '' : 's'} across ${byProfile.size} profile${byProfile.size === 1 ? '' : 's'}`}
        icon={<ShieldCheck className="h-5 w-5" />}
        onClose={onClose}
      />

      <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
        {/* Safety Notification */}
        <div className="p-3.5 rounded-lg border border-border bg-surface-subtle flex items-start gap-2.5 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-interactive mt-0.5" />
          <div>
            <span className="font-semibold text-text-primary block">
              Draft Configuration Changeset
            </span>
            <span className="text-text-muted text-[11px]">
              These staged modifications are held in operator session memory. Target agent configuration files will not be mutated without explicit policy validation.
            </span>
          </div>
        </div>

        {draftChanges.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs border border-border rounded-lg bg-surface">
            No staged configuration changes.
          </div>
        ) : (
          Array.from(byProfile.entries()).map(([profileId, changes]) => {
            const agent = agents.find((a) => a.id === profileId)
            const agentName = agent?.definition.name || profileId

            return (
              <div
                key={profileId}
                className="border border-border rounded-xl bg-surface overflow-hidden space-y-2 p-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-text-primary font-mono-tech">
                      {agentName}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono-tech uppercase px-2 py-0.5 rounded bg-surface-subtle border border-border">
                      {profileId}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => discardProfileDraft(profileId)}
                    className="text-text-muted hover:text-status-danger text-[11px] font-mono-tech h-6 px-2"
                  >
                    Discard for Profile
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {changes.map((ch) => (
                    <div
                      key={ch.id}
                      className={`p-2 rounded-md border text-xs font-mono-tech flex items-center justify-between ${
                        ch.action === 'ADD_SKILL'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {ch.action === 'ADD_SKILL' ? '+' : '–'}
                        </span>
                        <span>
                          {ch.action === 'ADD_SKILL' ? 'Assign Skill' : 'Remove Skill'}:
                        </span>
                        <span className="font-semibold">{ch.targetLabel || ch.targetValue}</span>
                      </div>
                      <span className="text-[10px] opacity-75">
                        {new Date(ch.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-surface-subtle shrink-0">
        <div>
          {confirmDiscard ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-status-danger font-mono-tech">Confirm clear all drafts?</span>
              <Button
                variant="destructive"
                size="xs"
                onClick={handleDiscardAll}
                className="h-7 text-xs font-mono-tech"
              >
                Yes, Discard All
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConfirmDiscard(false)}
                className="h-7 text-xs font-mono-tech"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="xs"
              disabled={draftChanges.length === 0}
              onClick={() => setConfirmDiscard(true)}
              className="border-border text-text-muted hover:text-status-danger h-8 text-xs font-mono-tech gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Discard All Drafts
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={onClose}
            className="border-border text-text-secondary h-8 text-xs font-mono-tech"
          >
            Close
          </Button>

          <Button
            size="xs"
            disabled={draftChanges.length === 0 || isApplying}
            onClick={handleApplyToProduction}
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs font-mono-tech gap-1.5"
          >
            {applySuccess ? (
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
            ) : isApplying ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {applySuccess ? 'Applied Successfully!' : isApplying ? 'Applying...' : 'Apply to Production'}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
