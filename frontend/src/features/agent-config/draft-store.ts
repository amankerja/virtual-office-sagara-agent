import { create } from 'zustand'
import type { ProfileDraftChange } from './types'

const STORAGE_KEY = 'sagara-agent-config-drafts'

function loadSavedDrafts(): ProfileDraftChange[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function persistDrafts(drafts: ProfileDraftChange[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // ignore
  }
}

interface DraftStoreState {
  draftChanges: ProfileDraftChange[];
  addSkillDraft: (profileId: string, skillId: string, skillLabel?: string) => void;
  removeSkillDraft: (profileId: string, skillId: string, skillLabel?: string) => void;
  discardProfileDraft: (profileId: string) => void;
  discardAllDrafts: () => void;
  getEffectiveSkills: (profileId: string, originalSkillIds: string[]) => string[];
  getProfileDraftChanges: (profileId: string) => ProfileDraftChange[];
  stageRecommendedBlueprint: (
    blueprint: Record<string, { recommendedSkills: string[] }>,
    currentProfiles: Array<{ id: string; skillIds: string[] }>
  ) => void;
}

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  draftChanges: loadSavedDrafts(),

  addSkillDraft: (profileId, skillId, skillLabel) => {
    const current = get().draftChanges
    // If there is already a REMOVE_SKILL for this skill, cancel it out
    const existingRemove = current.find(
      (c) => c.profileId === profileId && c.action === 'REMOVE_SKILL' && c.targetValue === skillId
    )
    if (existingRemove) {
      const updated = current.filter((c) => c.id !== existingRemove.id)
      persistDrafts(updated)
      set({ draftChanges: updated })
      return
    }

    // Otherwise add ADD_SKILL
    const newChange: ProfileDraftChange = {
      id: `change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      profileId,
      field: 'skills',
      action: 'ADD_SKILL',
      targetValue: skillId,
      targetLabel: skillLabel || skillId,
      timestamp: new Date().toISOString(),
    }
    const updated = [...current, newChange]
    persistDrafts(updated)
    set({ draftChanges: updated })
  },

  removeSkillDraft: (profileId, skillId, skillLabel) => {
    const current = get().draftChanges
    // If there is an ADD_SKILL for this skill, cancel it out
    const existingAdd = current.find(
      (c) => c.profileId === profileId && c.action === 'ADD_SKILL' && c.targetValue === skillId
    )
    if (existingAdd) {
      const updated = current.filter((c) => c.id !== existingAdd.id)
      persistDrafts(updated)
      set({ draftChanges: updated })
      return
    }

    // Otherwise add REMOVE_SKILL
    const newChange: ProfileDraftChange = {
      id: `change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      profileId,
      field: 'skills',
      action: 'REMOVE_SKILL',
      targetValue: skillId,
      targetLabel: skillLabel || skillId,
      timestamp: new Date().toISOString(),
    }
    const updated = [...current, newChange]
    persistDrafts(updated)
    set({ draftChanges: updated })
  },

  discardProfileDraft: (profileId) => {
    const updated = get().draftChanges.filter((c) => c.profileId !== profileId)
    persistDrafts(updated)
    set({ draftChanges: updated })
  },

  discardAllDrafts: () => {
    persistDrafts([])
    set({ draftChanges: [] })
  },

  getEffectiveSkills: (profileId, originalSkillIds) => {
    const changes = get().draftChanges.filter((c) => c.profileId === profileId)
    const skillsSet = new Set(originalSkillIds)

    for (const ch of changes) {
      if (ch.action === 'ADD_SKILL') {
        skillsSet.add(ch.targetValue)
      } else if (ch.action === 'REMOVE_SKILL') {
        skillsSet.delete(ch.targetValue)
      }
    }
    return Array.from(skillsSet)
  },

  getProfileDraftChanges: (profileId) => {
    return get().draftChanges.filter((c) => c.profileId === profileId)
  },

  stageRecommendedBlueprint: (blueprint, currentProfiles) => {
    const newChanges: ProfileDraftChange[] = []
    const now = new Date().toISOString()

    for (const profile of currentProfiles) {
      const rec = blueprint[profile.id]
      if (!rec) continue
      const targetSkills = rec.recommendedSkills || []
      const currentSkills = profile.skillIds || []

      // Skills to add
      for (const sid of targetSkills) {
        if (!currentSkills.includes(sid)) {
          newChanges.push({
            id: `change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            profileId: profile.id,
            field: 'skills',
            action: 'ADD_SKILL',
            targetValue: sid,
            targetLabel: sid,
            timestamp: now,
          })
        }
      }

      // Skills to remove
      for (const sid of currentSkills) {
        if (!targetSkills.includes(sid)) {
          newChanges.push({
            id: `change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            profileId: profile.id,
            field: 'skills',
            action: 'REMOVE_SKILL',
            targetValue: sid,
            targetLabel: sid,
            timestamp: now,
          })
        }
      }
    }

    // Persist new staged changes
    persistDrafts(newChanges)
    set({ draftChanges: newChanges })
  },
}))
