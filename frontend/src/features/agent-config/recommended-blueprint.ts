/**
 * Canonical Recommended Profile Blueprint for Sagara AI Fleet.
 * Derived from canonical seeds in config/seeds/.
 * Strict invariant: Used for previewing diffs and staging local drafts.
 * Never mutates production without explicit authorization.
 */

export interface RecommendedProfileBlueprint {
  id: string;
  name: string;
  role: string;
  recommendedSkills: string[];
  modelTier: string;
  channels: string[];
  zone: string;
}

export const CANONICAL_RECOMMENDED_BLUEPRINT: Record<string, RecommendedProfileBlueprint> = {
  lead: {
    id: 'lead',
    name: 'Lead Coordinator',
    role: 'Lead Agent / AI Team Manager',
    recommendedSkills: ['skill-hermes-agent', 'skill-systematic-debugging'],
    modelTier: 'flagship',
    channels: ['sagara-command', 'cron'],
    zone: 'command',
  },
  personal: {
    id: 'personal',
    name: 'Personal Assistant',
    role: 'Personal Assistant / Secretary',
    recommendedSkills: ['skill-google-workspace'],
    modelTier: 'balanced',
    channels: ['assistant', 'reminders', 'career', 'personal-finance'],
    zone: 'personal',
  },
  business: {
    id: 'business',
    name: 'Business Analyst',
    role: 'Business & Product Management',
    recommendedSkills: ['skill-unreferenced-tool'],
    modelTier: 'flagship',
    channels: ['products'],
    zone: 'business',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Specialist',
    role: 'Marketing / Content / Posting',
    recommendedSkills: ['skill-baoyu-infographic'],
    modelTier: 'balanced',
    channels: ['marketing', 'content', 'posting'],
    zone: 'creative',
  },
  cs: {
    id: 'cs',
    name: 'Customer Service Specialist',
    role: 'Customer Service & Order Operations',
    recommendedSkills: ['skill-google-workspace'],
    modelTier: 'fast',
    channels: ['orders', 'customer-service'],
    zone: 'support',
  },
  'it-support': {
    id: 'it-support',
    name: 'IT Support Specialist',
    role: 'Systems / Infrastructure / Monitoring',
    recommendedSkills: ['skill-systematic-debugging', 'skill-unreferenced-tool'],
    modelTier: 'balanced',
    channels: ['agent-status', 'alerts', 'gateway-status', 'system-alerts'],
    zone: 'support',
  },
  'it-coding': {
    id: 'it-coding',
    name: 'IT Coding Specialist',
    role: 'Software Development / Debugging / Code Review',
    recommendedSkills: ['skill-systematic-debugging'],
    modelTier: 'coding',
    channels: ['agent-coding-1'],
    zone: 'engineering',
  },
  'sagara-lab': {
    id: 'sagara-lab',
    name: 'Sagara Lab Researcher',
    role: 'Research / Experimentation / Prototyping',
    recommendedSkills: ['skill-hermes-agent'],
    modelTier: 'research',
    channels: ['sagara-lab', 'deep-search-engine'],
    zone: 'lab',
  },
}

export interface ProfileDiffSummary {
  profileId: string;
  name: string;
  role: string;
  currentCount: number;
  recommendedCount: number;
  resultCount: number;
  skillsToAdd: string[];
  skillsToRemove: string[];
  resultSkills: string[];
  isDifferent: boolean;
}

export function computeProfileDiff(
  profileId: string,
  profileName: string,
  currentSkillIds: string[],
  blueprint = CANONICAL_RECOMMENDED_BLUEPRINT
): ProfileDiffSummary {
  const rec = blueprint[profileId]
  const recSkills = rec ? rec.recommendedSkills : []
  const skillsToAdd = recSkills.filter((s) => !currentSkillIds.includes(s))
  const skillsToRemove = currentSkillIds.filter((s) => !recSkills.includes(s))
  const resultSkills = Array.from(
    new Set([...currentSkillIds.filter((s) => !skillsToRemove.includes(s)), ...skillsToAdd])
  )
  return {
    profileId,
    name: profileName || rec?.name || profileId,
    role: rec?.role || 'Specialist Profile',
    currentCount: currentSkillIds.length,
    recommendedCount: recSkills.length,
    resultCount: resultSkills.length,
    skillsToAdd,
    skillsToRemove,
    resultSkills,
    isDifferent: skillsToAdd.length > 0 || skillsToRemove.length > 0,
  }
}
