import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveOfficeBehavior, resolveWorkerBehavior, qualityForWidth, presentationSeed } from '../src/features/office/animation/behavior.ts'
import { advanceMotion, createMotion, officeRoute, requestMotion, returnRoute, chairPosition, distance, visibleBehavior } from '../src/features/office/animation/navigation.ts'
import { stepOfficeCharacters } from '../src/features/office/animation/controller.ts'
import { buildOfficeScene } from '../src/features/office/layout/office-layout-engine.ts'
import { MOCK_AGENTS } from '../src/mocks/agents.ts'

// Test-only scenarios clone canonical fixtures; the application never imports these.
const agent = (state, id = 'test-agent') => ({ ...structuredClone(MOCK_AGENTS[0]), id, definition: { name: id, enabled: true }, runtime: { state, confidence: 'CONFIRMED' } })
const task = (state = 'RUNNING') => ({ id: 'task-a', title: 'Fixture task', state, assignedAgentId: 'test-agent', priority: 'LOW', createdAt: '2026-01-01' })
const delegation = (state = 'RUNNING', id = 'delegation-a') => ({ id, state, taskTitle: 'Fixture delegation', originAgentId: 'test-agent', originAgentName: 'Fixture agent', originSessionId: 'session-a', startedAt: '2026-01-01', updatedAt: '2026-01-01', timeline: [] })
const approval = { id: 'approval-a', agentId: 'test-agent', state: 'PENDING', risk: 'LOW', actionType: 'OTHER', title: 'Fixture approval', requestedAt: '2026-01-01' }
const sceneFor = (state = 'IDLE', extra = {}) => buildOfficeScene({ agents: [agent(state)], tasks: [task()], approvals: [], delegations: [], ...extra })
const full = { quality: 'FULL', reducedMotion: false }

test('every operational state remains semantically valid across 1000 deterministic windows', () => {
  const allowed = {
    ACTIVE: ['WORK_TYPING', 'WORK_MOUSE', 'WORK_READING', 'WORK_MONITORING', 'THINKING'],
    IDLE: ['IDLE_SEATED', 'IDLE_LOOK_AROUND', 'BREAK_STRETCH', 'BREAK_COFFEE', 'BREAK_STANDING'],
    RECENTLY_ACTIVE: ['IDLE_SEATED', 'BREAK_STANDING'],
    AWAITING_APPROVAL: ['WAITING_APPROVAL'], DEGRADED: ['TROUBLESHOOTING'], ERROR: ['ERROR_REVIEW'],
    CONFIGURATION_INCOMPLETE: ['CONFIGURING'], OFFLINE: ['OFFLINE_AWAY'], UNKNOWN: ['UNKNOWN_NEUTRAL'],
  }
  for (const [state, behaviors] of Object.entries(allowed)) {
    const seen = new Set()
    for (let window = 0; window < 1000; window++) {
      const input = { agent: agent(state), task: task(), elapsedSeconds: window * 80 }
      const result = resolveOfficeBehavior(input)
      assert.ok(behaviors.includes(result), `${state} produced ${result}`)
      assert.equal(resolveOfficeBehavior(input), result)
      seen.add(result)
    }
    assert.deepEqual([...seen].sort(), [...behaviors].sort())
  }
})

test('negative states override conflicting running task, delegation and approval data', () => {
  for (const state of ['IDLE', 'RECENTLY_ACTIVE', 'OFFLINE', 'UNKNOWN', 'ERROR', 'DEGRADED', 'CONFIGURATION_INCOMPLETE']) {
    for (let time = 0; time < 1000; time += 17) {
      const behavior = resolveOfficeBehavior({ agent: agent(state), task: task(), delegations: [delegation()], approvals: [approval], collaborating: true, elapsedSeconds: time })
      assert.ok(!behavior.startsWith('WORK_'), `${state} must not invent work`)
    }
  }
  const a = agent('ACTIVE'); a.capabilities = { degraded: 4 }
  assert.notEqual(resolveOfficeBehavior({ agent: a, task: task(), elapsedSeconds: 0 }), 'TROUBLESHOOTING')
})

test('only linked pending approvals pause active work; no inferred agent status', () => {
  const input = { agent: agent('ACTIVE'), task: task(), elapsedSeconds: 0 }
  assert.equal(resolveOfficeBehavior({ ...input, approvals: [approval] }), 'WAITING_APPROVAL')
  assert.notEqual(resolveOfficeBehavior({ ...input, approvals: [{ ...approval, agentId: 'unrelated' }] }), 'WAITING_APPROVAL')
  assert.notEqual(resolveOfficeBehavior({ ...input, approvals: [{ ...approval, state: 'APPROVED' }] }), 'WAITING_APPROVAL')
  assert.equal(input.agent.runtime.state, 'ACTIVE')
})

test('only own running delegations trigger supervision and terminal workers do not work', () => {
  const input = { agent: agent('ACTIVE'), elapsedSeconds: 0 }
  assert.equal(resolveOfficeBehavior({ ...input, delegations: [delegation()] }), 'WORK_SUPERVISING')
  for (const state of ['QUEUED', 'CLAIMED', 'COMPLETED', 'CANCELLED', 'FAILED', 'UNKNOWN']) {
    assert.notEqual(resolveOfficeBehavior({ ...input, delegations: [delegation(state)] }), 'WORK_SUPERVISING')
    assert.ok(!resolveWorkerBehavior(state, 'same-id').startsWith('WORK_'))
  }
  assert.notEqual(resolveOfficeBehavior({ ...input, delegations: [{ ...delegation(), originAgentId: 'other' }] }), 'WORK_SUPERVISING')
})

test('layout filters terminal current tasks and active delegation counts; correlation requires actual relationships', () => {
  const data = { agents: [agent('ACTIVE')], tasks: [task('COMPLETED')], delegations: [delegation('COMPLETED')], approvals: [] }
  const frozen = JSON.stringify(data)
  const scene = buildOfficeScene(data)
  assert.equal(scene.desks[0].currentTask, undefined)
  assert.equal(scene.desks[0].activeDelegations.length, 0)
  assert.equal(scene.workers.length, 0)
  assert.equal(scene.collaborationItems.length, 0)
  assert.equal(JSON.stringify(data), frozen)
  assert.equal(sceneFor('ACTIVE').collaborationItems.length, 0)
  assert.equal(sceneFor('ACTIVE', { tasks: [{ ...task(), delegationIds: ['delegation-a'] }], delegations: [delegation()] }).collaborationItems.length, 1)
})

test('path travel stands, walks, changes direction, returns and sits without teleporting', () => {
  const desk = { x: 1040, y: 110 }; const home = chairPosition(desk)
  const route = officeRoute('a', desk, { x: 1285, y: 535 })
  let motion = requestMotion(createMotion(home), route, false, false)
  assert.equal(motion.posture, 'STAND_UP')
  const postures = new Set(); const orientations = new Set()
  for (let i = 0; i < 2500 && motion.route.length; i++) {
    const next = advanceMotion(motion, 1 / 30)
    assert.ok(distance(next.position, motion.position) <= 3.51)
    postures.add(next.posture); orientations.add(next.orientation); motion = next
  }
  assert.equal(motion.posture, 'STANDING')
  assert.ok(postures.has('WALKING')); assert.ok(orientations.size >= 2)
  motion = requestMotion(motion, returnRoute(motion, home), true, false)
  for (let i = 0; i < 2500 && motion.posture !== 'SEATED'; i++) {
    const next = advanceMotion(motion, 1 / 30)
    assert.ok(distance(next.position, motion.position) <= 3.51)
    postures.add(next.posture); motion = next
  }
  assert.ok(postures.has('SIT_DOWN')); assert.deepEqual(motion.position, home)
  assert.equal(motion.posture, 'SEATED')
})

test('required operational transitions suppress stale loops even in the middle of a trip', () => {
  for (const [from, to] of [['IDLE', 'ACTIVE'], ['ACTIVE', 'IDLE'], ['ACTIVE', 'AWAITING_APPROVAL'], ['AWAITING_APPROVAL', 'ACTIVE'], ['ACTIVE', 'ERROR'], ['ERROR', 'ACTIVE'], ['ACTIVE', 'OFFLINE']]) {
    let actors = stepOfficeCharacters([], sceneFor(from), 0, 1 / 30, full)
    const originalDesk = { ...actors[0].deskPosition }
    actors[0].motion = requestMotion(actors[0].motion, officeRoute('test-agent', originalDesk, { x: 1285, y: 535 }), false, false)
    actors[0].journey = 'OUTBOUND'
    for (let i = 0; i < 100; i++) actors[0].motion = advanceMotion(actors[0].motion, 1 / 30)
    const prev = actors[0].motion.position
    actors = stepOfficeCharacters(actors, sceneFor(to), 5, 1 / 30, full)
    if (to !== 'OFFLINE') assert.ok(distance(prev, actors[0].motion.position) <= 3.51, `${from} -> ${to} teleported`)
    assert.deepEqual(actors[0].deskPosition, originalDesk)
    const visible = visibleBehavior(actors[0].behavior, actors[0].motion)
    if (to !== 'ACTIVE') assert.ok(!visible.startsWith('WORK_'))
    for (let i = 0; i < 4000 && actors[0].journey !== 'HOME'; i++) actors = stepOfficeCharacters(actors, sceneFor(to), 5 + i / 30, 1 / 30, full)
    assert.equal(actors[0].journey, 'HOME', `${from} -> ${to} never returned`)
  }
})

test('worker arrival and completion departure only follow provider changes', () => {
  const running = sceneFor('ACTIVE', { delegations: [delegation()] })
  let actors = stepOfficeCharacters([], running, 0, 1 / 30, full)
  assert.equal(actors.find(a => a.worker).journey, 'ARRIVING')
  for (let i = 1; i < 100; i++) actors = stepOfficeCharacters(actors, running, i / 30, 1 / 30, full)
  assert.equal(actors.find(a => a.worker).motion.posture, 'SEATED')
  assert.ok(actors.find(a => a.worker).behavior.startsWith('WORK_'))
  const completed = sceneFor('ACTIVE', { delegations: [delegation('COMPLETED')] })
  actors = stepOfficeCharacters(actors, completed, 4, 1 / 30, full)
  assert.equal(actors.find(a => a.worker).journey, 'LEAVING')
  assert.ok(!actors.find(a => a.worker).behavior.startsWith('WORK_'))
  for (let i = 1; i < 150; i++) actors = stepOfficeCharacters(actors, completed, 4 + i / 30, 1 / 30, full)
  assert.equal(actors.filter(a => a.worker).length, 0)
  assert.equal(completed.delegationRecords[0].state, 'COMPLETED')
  assert.equal(stepOfficeCharacters([], completed, 0, 1 / 30, full).filter(a => a.worker).length, 0)
})

test('filtering never creates fake departure and offscreen pause freezes travel', () => {
  const scene = sceneFor('ACTIVE', { delegations: [delegation()] })
  const actors = stepOfficeCharacters([], scene, 0, 1 / 30, full)
  const paused = new Set(actors.map(a => a.id))
  const next = stepOfficeCharacters(actors, scene, 1, 1 / 30, full, paused)
  for (let i = 0; i < actors.length; i++) assert.deepEqual(next[i].motion.position, actors[i].motion.position)
  assert.equal(stepOfficeCharacters(actors, { ...scene, desks: [], workers: [] }, 1, 1 / 30, full).length, 0)
})

test('1/4/8/12 agents and 12 + 20 workers stay deterministic, bounded, unique and immutable', () => {
  for (const count of [1, 4, 8, 12]) {
    const agents = Array.from({ length: count }, (_, i) => agent('ACTIVE', `agent-${i}`))
    const delegations = count === 12 ? Array.from({ length: 20 }, (_, i) => ({ ...delegation('RUNNING', `worker-${i}`), originAgentId: agents[i % count].id })) : []
    const input = { agents, delegations, approvals: [], tasks: [] }
    const original = JSON.stringify(input)
    const scene = buildOfficeScene(input)
    assert.deepEqual(buildOfficeScene(input), scene)
    assert.equal(scene.desks.length, count)
    assert.equal(scene.workers.length, delegations.length)
    const locations = [...scene.desks, ...scene.workers].map(item => `${item.position.x},${item.position.y}`)
    assert.equal(new Set(locations).size, locations.length)
    for (const item of [...scene.desks, ...scene.workers]) assert.ok(item.position.x > 0 && item.position.x < 1380 && item.position.y < 1000)
    let actors = []
    for (let i = 0; i < 90; i++) actors = stepOfficeCharacters(actors, scene, i / 30, 1 / 30, full)
    assert.equal(actors.length, count + delegations.length)
    assert.equal(JSON.stringify(input), original)
  }
})

test('quality tiers and reduced motion retain semantic information', () => {
  assert.equal(qualityForWidth(375), 'LITE'); assert.equal(qualityForWidth(768), 'BALANCED'); assert.equal(qualityForWidth(1440), 'FULL')
  for (const settings of [{ quality: 'LITE', reducedMotion: false }, { quality: 'FULL', reducedMotion: true }]) {
    const scene = sceneFor('ACTIVE', { delegations: [delegation()] })
    const actors = stepOfficeCharacters([], scene, 0, 1 / 30, settings)
    for (const actor of actors) assert.equal(actor.motion.posture, 'SEATED')
    assert.equal(actors.find(a => a.desk).behavior, 'WORK_SUPERVISING')
  }
  assert.notEqual(presentationSeed('agent-a'), presentationSeed('agent-b'))
})

test('Office2_5DPalette: 3-tone shading, zone configs, and semantic status colors', async () => {
  const { getOffice2_5DPalette, getZone2_5DConfig, getAgentStatusVisual } = await import('../src/features/office/renderers/Office2_5D/Office2_5DPalette.ts')

  for (const isDark of [true, false]) {
    const palette = getOffice2_5DPalette(isDark)
    // 3-Tone Shading on Desk
    assert.ok(palette.deskTop && palette.deskFaceLeft && palette.deskFaceRight)
    assert.notEqual(palette.deskTop, palette.deskFaceLeft)
    assert.notEqual(palette.deskFaceLeft, palette.deskFaceRight)

    // Facility Station facets
    assert.ok(palette.approvalPod.deskTop && palette.approvalPod.deskLeft && palette.approvalPod.deskRight)
    assert.ok(palette.runtimeRoom.rackTop && palette.runtimeRoom.rackLeft && palette.runtimeRoom.rackFront)
    assert.ok(palette.artifactVault.shelfTop && palette.artifactVault.shelfLeft && palette.artifactVault.shelfFront)
    assert.ok(palette.collaborationZone.tableTop && palette.collaborationZone.tableLeft && palette.collaborationZone.tableRight)

    // Zones
    for (const zoneType of ['COMMAND', 'DEV_ZONE', 'CAREER_ZONE', 'MARKETING_ZONE', 'COLLABORATION', 'APPROVAL', 'RUNTIME', 'VAULT', 'SPECIALIST']) {
      const zoneConfig = getZone2_5DConfig(zoneType, isDark)
      assert.ok(zoneConfig.accent)
      assert.ok(zoneConfig.wallTop)
      assert.ok(zoneConfig.wallFace)
    }

    // Status visuals preserve semantic differentiation
    const active = getAgentStatusVisual('ACTIVE', isDark)
    const approval = getAgentStatusVisual('AWAITING_APPROVAL', isDark)
    const error = getAgentStatusVisual('ERROR', isDark)
    const offline = getAgentStatusVisual('OFFLINE', isDark)

    assert.notEqual(active.screenFill, error.screenFill)
    assert.notEqual(active.screenFill, approval.screenFill)
    assert.notEqual(active.indicator, error.indicator)
    assert.notEqual(approval.indicator, offline.indicator)
  }
})

test('OfficeStatusColors: desk status accents, profile jacket palettes, and strict utilization tiers', async () => {
  const {
    getDeskStatusAccent,
    getProfileJacketColor,
    getProfileJacketPalette,
    getUtilizationStatus,
  } = await import('../src/features/office/systems/OfficeStatusColors.ts')

  for (const isDark of [true, false]) {
    // 1. Desk Status Accent
    const active = getDeskStatusAccent('ACTIVE', isDark)
    const recent = getDeskStatusAccent('RECENTLY_ACTIVE', isDark)
    const idle = getDeskStatusAccent('IDLE', isDark)
    const approval = getDeskStatusAccent('AWAITING_APPROVAL', isDark)
    const degraded = getDeskStatusAccent('DEGRADED', isDark)
    const error = getDeskStatusAccent('ERROR', isDark)
    const offline = getDeskStatusAccent('OFFLINE', isDark)
    const config = getDeskStatusAccent('CONFIGURATION_INCOMPLETE', isDark)
    const unknown = getDeskStatusAccent('UNKNOWN', isDark)

    // Active & recent should share green tone
    assert.equal(active.color, recent.color)
    // Idle & unknown share neutral gray tone
    assert.equal(idle.color, unknown.color)
    assert.equal(idle.color, config.color)

    // Distinct semantic statuses must have distinct colors
    assert.notEqual(active.color, idle.color)
    assert.notEqual(active.color, approval.color)
    assert.notEqual(approval.color, degraded.color)
    assert.notEqual(degraded.color, error.color)
    assert.notEqual(error.color, offline.color)

    // 2. Profile Jacket Colors by Zone
    const commandShades = getProfileJacketPalette('COMMAND', isDark)
    const devShades = getProfileJacketPalette('DEV_ZONE', isDark)
    const careerShades = getProfileJacketPalette('CAREER_ZONE', isDark)
    const marketingShades = getProfileJacketPalette('MARKETING_ZONE', isDark)
    const specialistShades = getProfileJacketPalette('SPECIALIST', isDark)

    assert.equal(commandShades.length, 3)
    assert.equal(devShades.length, 3)
    assert.equal(careerShades.length, 3)
    assert.equal(marketingShades.length, 3)
    assert.equal(specialistShades.length, 3)

    // Verify variants pick valid shades within zone
    for (let variant = 0; variant < 10; variant++) {
      const color = getProfileJacketColor('MARKETING_ZONE', isDark, variant)
      assert.ok(marketingShades.includes(color))
    }

    // Distinct zones must have distinct jacket colors
    assert.notEqual(getProfileJacketColor('COMMAND', isDark, 0), getProfileJacketColor('DEV_ZONE', isDark, 0))
    assert.notEqual(getProfileJacketColor('DEV_ZONE', isDark, 0), getProfileJacketColor('CAREER_ZONE', isDark, 0))
    assert.notEqual(getProfileJacketColor('CAREER_ZONE', isDark, 0), getProfileJacketColor('MARKETING_ZONE', isDark, 0))
    assert.notEqual(getProfileJacketColor('MARKETING_ZONE', isDark, 0), getProfileJacketColor('SPECIALIST', isDark, 0))
  }

  // 3. Strict Hardware Utilization Thresholds (<80% green, 80-99% orange, >=100% red)
  const lowLoad = getUtilizationStatus(0)
  assert.equal(lowLoad.tier, 'green')
  assert.equal(lowLoad.label, 'OPTIMAL')

  const midLoad = getUtilizationStatus(79.9)
  assert.equal(midLoad.tier, 'green')
  assert.equal(midLoad.label, 'OPTIMAL')

  const threshold80 = getUtilizationStatus(80)
  assert.equal(threshold80.tier, 'orange')
  assert.equal(threshold80.label, 'HIGH LOAD')

  const highLoad = getUtilizationStatus(99.4)
  assert.equal(highLoad.tier, 'orange')
  assert.equal(highLoad.label, 'HIGH LOAD')

  const threshold100 = getUtilizationStatus(100)
  assert.equal(threshold100.tier, 'red')
  assert.equal(threshold100.label, 'CRITICAL')

  const overload = getUtilizationStatus(145.2)
  assert.equal(overload.tier, 'red')
  assert.equal(overload.label, 'CRITICAL')
})

test('OfficeLayoutEngine: flows telemetry into hardwareMetrics without inventing data', () => {
  // Scenario 1: Telemetry is provided by backend
  const sceneWithHw = buildOfficeScene({
    agents: [],
    delegations: [],
    approvals: [],
    tasks: [],
    runtimeOverview: {
      health: { gateway: 'HEALTHY', runtimeData: 'HEALTHY', sessions: 'HEALTHY', delegations: 'HEALTHY', usage: 'HEALTHY' },
      gateway: { state: 'HEALTHY', backendId: 'b-01', host: 'h-01' },
      recentEvents: [],
      systemLoad: {
        cpuPercent: 14.2,
        memoryUsedMb: 420,
        memoryTotalMb: 16384,
        memoryPercent: 2.6,
      },
    },
  })

  assert.ok(sceneWithHw.runtimeSummary.hardwareMetrics)
  assert.equal(sceneWithHw.runtimeSummary.hardwareMetrics.cpuPercent, 14.2)
  assert.equal(sceneWithHw.runtimeSummary.hardwareMetrics.memoryPercent, 2.6)
  assert.equal(sceneWithHw.runtimeSummary.hardwareMetrics.memoryUsedMb, 420)
  assert.equal(sceneWithHw.runtimeSummary.hardwareMetrics.memoryTotalMb, 16384)

  // Scenario 2: Telemetry is absent / pending — MUST NOT fabricate fake numbers
  const sceneWithoutHw = buildOfficeScene({
    agents: [],
    delegations: [],
    approvals: [],
    tasks: [],
    runtimeOverview: {
      health: { gateway: 'HEALTHY', runtimeData: 'HEALTHY', sessions: 'HEALTHY', delegations: 'HEALTHY', usage: 'HEALTHY' },
      gateway: { state: 'HEALTHY', backendId: 'b-01', host: 'h-01' },
      recentEvents: [],
      // systemLoad is omitted
    },
  })

  assert.equal(sceneWithoutHw.runtimeSummary.hardwareMetrics, undefined)
})

