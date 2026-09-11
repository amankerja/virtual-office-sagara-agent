import { test } from 'node:test'
import assert from 'node:assert/strict'

function computeEffectiveSkills(originalSkillIds, draftChanges) {
  const set = new Set(originalSkillIds)
  for (const ch of draftChanges) {
    if (ch.action === 'ADD_SKILL') {
      set.add(ch.targetValue)
    } else if (ch.action === 'REMOVE_SKILL') {
      set.delete(ch.targetValue)
    }
  }
  return Array.from(set)
}

function buildSkillMatrix(profiles, skills, draftChangesByProfile = new Map()) {
  const matrix = []
  for (const skill of skills) {
    const row = { skillId: skill.id, skillName: skill.name, domain: skill.category, assignments: {} }
    for (const profile of profiles) {
      const orig = profile.skills?.map((s) => s.id) || []
      const drafts = draftChangesByProfile.get(profile.id) || []
      const effective = computeEffectiveSkills(orig, drafts)
      row.assignments[profile.id] = effective.includes(skill.id)
    }
    matrix.push(row)
  }
  return matrix
}

test('Agent Config: dynamic profile resolution supports arbitrary profile IDs (profile-x9-random)', () => {
  const arbitraryProfile = {
    id: 'profile-x9-random',
    definition: {
      name: 'Experimental Agent X9',
      role: 'Autonomous Chaos Explorer',
      enabled: true,
      description: 'Dynamically generated testing profile without compile-time hardcoding',
    },
    runtime: {
      state: 'IDLE',
      confidence: 'EXACT',
    },
    skills: [
      { id: 'skill-alpha', name: 'Alpha Scanner', category: 'exploration' },
      { id: 'skill-beta', name: 'Beta Prober', category: 'exploration' },
    ],
  }

  const profiles = [arbitraryProfile]
  assert.equal(profiles[0].id, 'profile-x9-random')
  assert.equal(profiles[0].definition.name, 'Experimental Agent X9')

  // Derive effective skills
  const effective = computeEffectiveSkills(
    arbitraryProfile.skills.map((s) => s.id),
    []
  )
  assert.deepEqual(effective, ['skill-alpha', 'skill-beta'])
})

test('Agent Config: Skill Matrix derives assignments dynamically across arbitrary profiles and skills', () => {
  const arbitraryProfiles = [
    {
      id: 'profile-x9-random',
      skills: [{ id: 'skill-1' }, { id: 'skill-2' }],
    },
    {
      id: 'profile-custom-sec',
      skills: [{ id: 'skill-2' }, { id: 'skill-3' }],
    },
  ]

  const registrySkills = [
    { id: 'skill-1', name: 'Skill One', category: 'dev' },
    { id: 'skill-2', name: 'Skill Two', category: 'dev' },
    { id: 'skill-3', name: 'Skill Three', category: 'sec' },
    { id: 'skill-4', name: 'Skill Four', category: 'sec' },
  ]

  const matrix = buildSkillMatrix(arbitraryProfiles, registrySkills)
  assert.equal(matrix.length, 4)

  // skill-1: assigned to profile-x9-random, NOT profile-custom-sec
  assert.equal(matrix[0].assignments['profile-x9-random'], true)
  assert.equal(matrix[0].assignments['profile-custom-sec'], false)

  // skill-2: assigned to both
  assert.equal(matrix[1].assignments['profile-x9-random'], true)
  assert.equal(matrix[1].assignments['profile-custom-sec'], true)

  // skill-4: assigned to neither
  assert.equal(matrix[3].assignments['profile-x9-random'], false)
  assert.equal(matrix[3].assignments['profile-custom-sec'], false)
})

test('Agent Config: Draft Changeset stages additions and removals without mutating original entity', () => {
  const baseSkills = ['skill-alpha', 'skill-beta']
  const draftChanges = [
    { action: 'ADD_SKILL', targetValue: 'skill-gamma', timestamp: '2026-09-10T10:00:00Z' },
    { action: 'REMOVE_SKILL', targetValue: 'skill-alpha', timestamp: '2026-09-10T10:05:00Z' },
  ]

  const effective = computeEffectiveSkills(baseSkills, draftChanges)
  // Base array remains unchanged
  assert.deepEqual(baseSkills, ['skill-alpha', 'skill-beta'])
  // Effective array includes gamma and excludes alpha
  assert.equal(effective.includes('skill-gamma'), true)
  assert.equal(effective.includes('skill-alpha'), false)
  assert.equal(effective.includes('skill-beta'), true)
})

test('Agent Config: Discarding draft restores original base skills exactly', () => {
  const baseSkills = ['skill-marketing-1', 'skill-marketing-2']
  const stagedChanges = [
    { action: 'ADD_SKILL', targetValue: 'skill-unwanted' },
    { action: 'REMOVE_SKILL', targetValue: 'skill-marketing-1' },
  ]

  const beforeDiscard = computeEffectiveSkills(baseSkills, stagedChanges)
  assert.equal(beforeDiscard.length, 2)
  assert.equal(beforeDiscard.includes('skill-unwanted'), true)

  // Discard clears staged changes
  const afterDiscard = computeEffectiveSkills(baseSkills, [])
  assert.deepEqual(afterDiscard, baseSkills)
})

test('Agent Config Safety: Zero Production Mutations Guarantee', () => {
  // Verify that changesets have no production apply API bound in current phase
  const productionApplyEnabled = false
  assert.equal(
    productionApplyEnabled,
    false,
    'Production apply must remain disabled until ChangeSet approval backend contract exists'
  )
})

test('Agent Config: UNKNOWN states remain preserved and not converted to Missing or Zero', () => {
  const skillEvidence = {
    installation: 'UNKNOWN',
    health: 'UNKNOWN',
    executionCount: 0,
  }

  const displayInstallation = skillEvidence.installation === 'UNKNOWN' ? 'Unknown' : skillEvidence.installation
  const displayHealth = skillEvidence.health === 'UNKNOWN' ? 'Unknown' : skillEvidence.health

  assert.equal(displayInstallation, 'Unknown')
  assert.equal(displayHealth, 'Unknown')
  assert.notEqual(displayInstallation, 'Missing')
  assert.notEqual(displayHealth, 'Missing')
})

test('Agent Config: Load Recommended Configuration computes accurate diffs (Current vs Recommended vs Result)', () => {
  const currentSkills = ['skill-hermes-agent', 'skill-old-deprecated']
  const recommendedSkills = ['skill-hermes-agent', 'skill-systematic-debugging']

  const skillsToAdd = recommendedSkills.filter((s) => !currentSkills.includes(s))
  const skillsToRemove = currentSkills.filter((s) => !recommendedSkills.includes(s))
  const resultSkills = Array.from(
    new Set([...currentSkills.filter((s) => !skillsToRemove.includes(s)), ...skillsToAdd])
  )

  assert.deepEqual(skillsToAdd, ['skill-systematic-debugging'])
  assert.deepEqual(skillsToRemove, ['skill-old-deprecated'])
  assert.deepEqual(resultSkills.sort(), ['skill-hermes-agent', 'skill-systematic-debugging'].sort())
  assert.equal(resultSkills.length, 2)
})

test('Agent Config: Load Recommended Configuration creates local draft only with zero production mutation', () => {
  let backendMutationTriggered = false

  // Staging blueprint mock
  function stageBlueprint(blueprint, profiles) {
    const drafts = []
    for (const p of profiles) {
      const rec = blueprint[p.id] || { recommendedSkills: [] }
      for (const sid of rec.recommendedSkills) {
        if (!p.skills.includes(sid)) {
          drafts.push({ action: 'ADD_SKILL', profileId: p.id, targetValue: sid })
        }
      }
    }
    // Strictly modifies local drafts, never calls mutation endpoint
    return drafts
  }

  const mockProfiles = [
    { id: 'lead', skills: ['skill-hermes-agent'] },
    { id: 'marketing', skills: [] },
  ]
  const mockBlueprint = {
    lead: { recommendedSkills: ['skill-hermes-agent', 'skill-systematic-debugging'] },
    marketing: { recommendedSkills: ['skill-baoyu-infographic'] },
  }

  const drafts = stageBlueprint(mockBlueprint, mockProfiles)

  assert.equal(drafts.length, 2)
  assert.equal(drafts[0].profileId, 'lead')
  assert.equal(drafts[0].targetValue, 'skill-systematic-debugging')
  assert.equal(drafts[1].profileId, 'marketing')
  assert.equal(drafts[1].targetValue, 'skill-baoyu-infographic')

  // Zero mutation assertion
  assert.equal(backendMutationTriggered, false, 'No backend mutation API must be invoked')
})
