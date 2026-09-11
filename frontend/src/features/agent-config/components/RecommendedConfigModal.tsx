import React, { useMemo } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CANONICAL_RECOMMENDED_BLUEPRINT,
  computeProfileDiff,
  type ProfileDiffSummary,
} from '../recommended-blueprint'
import { useDraftStore } from '../draft-store'
import type { AgentProjection } from '@/types/agent'

interface RecommendedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentProjection[];
}

export const RecommendedConfigModal: React.FC<RecommendedConfigModalProps> = ({
  isOpen,
  onClose,
  agents,
}) => {
  const { stageRecommendedBlueprint } = useDraftStore()

  // Compute diffs across all current agents vs recommended blueprint
  const diffSummaries = useMemo<ProfileDiffSummary[]>(() => {
    return agents.map((agent) => {
      const origSkills = agent.skills?.map((s: { id: string }) => s.id) || []
      return computeProfileDiff(agent.id, agent.definition.name, origSkills)
    })
  }, [agents])

  const totalDifferences = useMemo(() => {
    return diffSummaries.filter((d) => d.isDifferent).length
  }, [diffSummaries])

  const totalAdditions = useMemo(() => {
    return diffSummaries.reduce((acc, d) => acc + d.skillsToAdd.length, 0)
  }, [diffSummaries])

  const totalRemovals = useMemo(() => {
    return diffSummaries.reduce((acc, d) => acc + d.skillsToRemove.length, 0)
  }, [diffSummaries])

  if (!isOpen) return null

  const handleStageDraft = () => {
    const currentPayload = agents.map((a) => ({
      id: a.id,
      skillIds: a.skills?.map((s: { id: string }) => s.id) || [],
    }))
    stageRecommendedBlueprint(CANONICAL_RECOMMENDED_BLUEPRINT, currentPayload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">
                Load Recommended Configuration
              </h3>
              <p className="text-xs text-text-muted">
                Canonical Blueprint v1.0.0 • Profile & Skill Allocation Proposal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono-tech flex-1">
          {/* Safety Notice Banner */}
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Zero Production Mutations Guarantee:</span>
              <p className="text-[11px] leading-relaxed">
                Applying this blueprint creates a <strong>local draft changeset</strong> held strictly in your browser session. No production manifests, YAML profiles, or Hermes environments are mutated without explicit operator review.
              </p>
            </div>
          </div>

          {/* Diff Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-lg border border-border bg-surface-raised space-y-1">
              <span className="text-[10px] text-text-muted uppercase">Profiles with Diff</span>
              <div className="text-base font-bold text-text-primary">{totalDifferences} / {agents.length}</div>
            </div>
            <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">Skills to Add</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">+{totalAdditions}</div>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase">Skills to Remove</span>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">-{totalRemovals}</div>
            </div>
          </div>

          {/* Diff Comparison Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-[10px] text-text-muted uppercase">
                  <th className="p-2.5">Profile</th>
                  <th className="p-2.5">Current Skills</th>
                  <th className="p-2.5">Recommended</th>
                  <th className="p-2.5">Result</th>
                  <th className="p-2.5">Proposed Modifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {diffSummaries.map((d) => (
                  <tr key={d.profileId} className="hover:bg-surface-hover/50">
                    <td className="p-2.5 font-semibold text-text-primary">
                      <div>{d.name}</div>
                      <div className="text-[10px] text-text-muted font-normal">{d.role}</div>
                    </td>
                    <td className="p-2.5 text-text-secondary">{d.currentCount} skills</td>
                    <td className="p-2.5 text-text-primary">{d.recommendedCount} skills</td>
                    <td className="p-2.5 font-semibold text-blue-600 dark:text-blue-400">{d.resultCount} skills</td>
                    <td className="p-2.5">
                      {!d.isDifferent ? (
                        <span className="text-text-muted flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Identical
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {d.skillsToAdd.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
                            >
                              +{s}
                            </Badge>
                          ))}
                          {d.skillsToRemove.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px]"
                            >
                              -{s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-border bg-surface-subtle flex items-center justify-between">
          <div className="text-[11px] text-text-muted font-mono-tech flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Stages changes into local draft only.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onClose}
              className="text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={handleStageDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Stage into Local Draft
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
