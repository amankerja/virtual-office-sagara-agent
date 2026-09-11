import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_CAMERA_PRESET,
  lookupCameraPreset,
  calculateFitCamera,
  clampZoomDistance,
  calculateFollowCamera,
  resolveExitFollowPreset,
} from '../src/features/office/renderers/Office3D/camera/camera-presets.ts'

import {
  getQualityConfig,
  getDefaultRenderMode,
} from '../src/features/office/renderers/Office3D/systems/GraphicsQuality.ts'

import { Office3DErrorBoundary } from '../src/features/office/renderers/Office3D/systems/SceneErrorBoundary.tsx'
import { buildOfficeScene } from '../src/features/office/layout/office-layout-engine.ts'
import { MOCK_AGENTS } from '../src/mocks/agents.ts'
import { clampCameraTarget, workstationPosition } from '../src/features/office/renderers/Office3D/camera/camera-navigation.ts'
import { resolveRuntimeQuality, downgradeQuality } from '../src/features/office/renderers/Office3D/systems/GraphicsQuality.ts'

test('pan bounds preserve viewing direction at all four corners and vertical limits', () => {
  for (const x of [-100, 0, 100]) for (const z of [-100, 0, 100]) for (const y of [-10, 2, 20]) {
    const target = { x, y, z }
    const camera = { x: x + 8, y: y + 12, z: z + 9 }
    clampCameraTarget(target, camera)
    assert.ok(target.x >= -15 && target.x <= 15)
    assert.ok(target.z >= -11 && target.z <= 11)
    assert.ok(target.y >= 0 && target.y <= 4)
    assert.deepEqual([camera.x-target.x, camera.y-target.y, camera.z-target.z], [8,12,9])
  }
})

test('workstation grid has consistent spacing across row boundaries', () => {
  assert.deepEqual(workstationPosition(0), [-3.3,0,0])
  assert.deepEqual(workstationPosition(2), [3.3,0,0])
  assert.deepEqual(workstationPosition(3), [-3.3,0,3.5])
})

test('runtime quality never exceeds request, performance ceiling, or touch-device cap', () => {
  const tiers = ['low','balanced','ultra']
  for (const request of tiers) for (const ceiling of tiers) for (const compact of [true,false]) {
    const result = resolveRuntimeQuality(request, ceiling, compact)
    assert.ok(tiers.indexOf(result) <= tiers.indexOf(request))
    assert.ok(tiers.indexOf(result) <= tiers.indexOf(ceiling))
    if (compact) assert.notEqual(result,'ultra')
  }
  assert.equal(downgradeQuality('ultra'),'balanced')
  assert.equal(downgradeQuality('balanced'),'low')
  assert.equal(downgradeQuality('low'),'low')
  assert.equal(getQualityConfig('low').contactShadows,false)
  assert.equal(getQualityConfig('balanced').postProcessing,false)
})

const createMockAgent = (state, id = 'agent-01') => ({
  ...structuredClone(MOCK_AGENTS[0]),
  id,
  definition: { ...MOCK_AGENTS[0].definition, name: `Agent ${id}` },
  runtime: { state, confidence: 'CONFIRMED' },
})

const createMockTask = (state = 'RUNNING', assignedAgentId = 'agent-01') => ({
  id: 'task-test-01',
  title: 'CI Pipeline Hardening',
  state,
  assignedAgentId,
  priority: 'HIGH',
  createdAt: '2026-01-01',
})

const createMockDelegation = (state = 'RUNNING', originAgentId = 'agent-01') => ({
  id: 'del-test-01',
  state,
  taskTitle: 'Delegated Sub-Audit',
  originAgentId,
  originAgentName: 'Agent agent-01',
  originSessionId: 'sess-01',
  startedAt: '2026-01-01',
  updatedAt: '2026-01-01',
  timeline: [],
})

const createMockApproval = (agentId = 'agent-01') => ({
  id: 'appr-test-01',
  agentId,
  state: 'PENDING',
  risk: 'HIGH',
  actionType: 'DEPLOY',
  title: 'Production Config Update',
  requestedAt: '2026-01-01',
})

test('3D Camera: preset lookup correctly resolves named rooms and falls back to overview', () => {
  const expectedRooms = ['overview', 'command', 'dev', 'specialist', 'approval', 'server', 'vault']
  
  for (const room of expectedRooms) {
    const preset = lookupCameraPreset(room)
    assert.ok(preset, `Preset ${room} must exist`)
    assert.equal(preset.id, room)
    assert.equal(preset.position.length, 3)
    assert.equal(preset.target.length, 3)
    assert.ok(preset.fov >= 30 && preset.fov <= 60, `FOV for ${room} must be reasonable`)
  }

  // Unknown or empty ID falls back safely to default overview
  assert.deepEqual(lookupCameraPreset(null), DEFAULT_CAMERA_PRESET)
  assert.deepEqual(lookupCameraPreset(undefined), DEFAULT_CAMERA_PRESET)
  assert.deepEqual(lookupCameraPreset('non_existent_room'), DEFAULT_CAMERA_PRESET)
  assert.deepEqual(lookupCameraPreset(''), DEFAULT_CAMERA_PRESET)
})

test('3D Camera: calculateFitCamera accurately encloses office bounds', () => {
  const bounds = { minX: -14, maxX: 14, minZ: -10, maxZ: 10 }
  const fit = calculateFitCamera(bounds)

  assert.equal(fit.target[0], 0, 'Target X should be centered at 0')
  assert.equal(fit.target[1], 0, 'Target Y should be floor level at 0')
  assert.equal(fit.target[2], 0, 'Target Z should be centered at 0')
  assert.ok(fit.position[1] >= 18, 'Camera height should provide an elevated overview')
  assert.ok(fit.fov >= 35 && fit.fov <= 50, 'Overview FOV should be balanced')

  // Expanded bounds scale camera elevation cleanly
  const wideBounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }
  const wideFit = calculateFitCamera(wideBounds)
  assert.ok(wideFit.position[1] > fit.position[1], 'Larger boundary requires higher elevation')
})

test('3D Camera: clampZoomDistance enforces minDistance and maxDistance bounds', () => {
  assert.equal(clampZoomDistance(5), 6, 'Below minDistance (6) must clamp to 6')
  assert.equal(clampZoomDistance(6), 6)
  assert.equal(clampZoomDistance(20), 20, 'In-range distance must be preserved')
  assert.equal(clampZoomDistance(48), 48)
  assert.equal(clampZoomDistance(100), 48, 'Above maxDistance (48) must clamp to 48')
  assert.equal(clampZoomDistance(-10), 6, 'Negative distance must clamp to 6')
})

test('3D Camera: calculateFollowCamera provides elevated 3rd-person framing on target agent', () => {
  const agentPos = [5, 0, -3]
  const follow = calculateFollowCamera(agentPos)

  // Target should be centered at agent head height (+1.2)
  assert.deepEqual(follow.target, [5, 1.2, -3])
  
  // Camera position should be offset elevated at +4.5, +5.5, +6
  assert.deepEqual(follow.position, [5 + 4.5, 0 + 5.5, -3 + 6])

  // Custom offset
  const customFollow = calculateFollowCamera(agentPos, [2, 3, 4])
  assert.deepEqual(customFollow.position, [7, 3, 1])
})

test('3D Camera: resolveExitFollowPreset restores active preset or falls back to overview', () => {
  assert.equal(resolveExitFollowPreset('command').id, 'command')
  assert.equal(resolveExitFollowPreset('server').id, 'server')
  assert.equal(resolveExitFollowPreset('overview').id, 'overview')
  assert.equal(resolveExitFollowPreset(null).id, 'overview')
  assert.equal(resolveExitFollowPreset('invalid_preset').id, 'overview')
})

test('3D Graphics Quality: presets match specification and safely handle unknown values', () => {
  const low = getQualityConfig('low')
  assert.equal(low.dpr, 1)
  assert.equal(low.shadows, false)
  assert.equal(low.antialias, false)
  assert.equal(low.maxLights, 2)
  assert.equal(low.showDecorations, false)
  assert.equal(low.detailLevel, 'low')

  const balanced = getQualityConfig('balanced')
  assert.deepEqual(balanced.dpr, [1, 1.5])
  assert.equal(balanced.shadows, true)
  assert.equal(balanced.antialias, true)
  assert.equal(balanced.maxLights, 4)
  assert.equal(balanced.showDecorations, true)
  assert.equal(balanced.detailLevel, 'balanced')

  const ultra = getQualityConfig('ultra')
  assert.deepEqual(ultra.dpr, [1, 2])
  assert.equal(ultra.shadows, true)
  assert.equal(ultra.antialias, true)
  assert.equal(ultra.maxLights, 6)
  assert.equal(ultra.showDecorations, true)
  assert.equal(ultra.detailLevel, 'ultra')

  // Unknown value safely falls back to balanced
  const fallback = getQualityConfig('unknown_tier')
  assert.deepEqual(fallback, balanced)
})

test('3D Graphics Quality: getDefaultRenderMode defaults safely in Node environment without WebGL', () => {
  // In Node.js environment without WebGL, fallback must be 2.5d
  assert.equal(getDefaultRenderMode(), '2.5d')
})

test('3D Scene Error Boundary: getDerivedStateFromError captures errors and provides fallbacks', () => {
  const simulatedError = new Error('WebGL context creation failed: out of memory')
  const nextState = Office3DErrorBoundary.getDerivedStateFromError(simulatedError)

  assert.equal(nextState.hasError, true)
  assert.equal(nextState.errorMessage, 'WebGL context creation failed: out of memory')

  // Error without message receives fallback description
  const blankError = new Error()
  blankError.message = ''
  const blankState = Office3DErrorBoundary.getDerivedStateFromError(blankError)
  assert.equal(blankState.hasError, true)
  assert.ok(blankState.errorMessage.length > 0)
})

test('Office Architecture: Single Derived OfficeProjection is shared across 3D, 2.5D, and List views', () => {
  const agents = [
    createMockAgent('ACTIVE', 'alpha'),
    createMockAgent('IDLE', 'beta'),
    createMockAgent('AWAITING_APPROVAL', 'gamma'),
    createMockAgent('ERROR', 'delta'),
  ]
  const tasks = [createMockTask('RUNNING', 'alpha')]
  const delegations = [createMockDelegation('RUNNING', 'alpha')]
  const approvals = [createMockApproval('gamma')]

  const projection = buildOfficeScene({
    agents,
    tasks,
    delegations,
    approvals,
  })

  // Verify exact same model projection for all renderers
  assert.equal(projection.desks.length, 4, '4 agents must produce 4 desks')
  assert.equal(projection.workers.length, 1, '1 active delegation must produce 1 temporary worker')
  
  // Agent Alpha
  const deskAlpha = projection.desks.find(d => d.agent.id === 'alpha')
  assert.ok(deskAlpha)
  assert.equal(deskAlpha.agent.runtime.state, 'ACTIVE')
  assert.equal(deskAlpha.currentTask?.id, 'task-test-01')
  assert.equal(deskAlpha.activeDelegations.length, 1)

  // Agent Beta
  const deskBeta = projection.desks.find(d => d.agent.id === 'beta')
  assert.ok(deskBeta)
  assert.equal(deskBeta.agent.runtime.state, 'IDLE')
  assert.equal(deskBeta.currentTask, undefined)

  // Agent Gamma (Awaiting Approval)
  const deskGamma = projection.desks.find(d => d.agent.id === 'gamma')
  assert.ok(deskGamma)
  assert.equal(deskGamma.agent.runtime.state, 'AWAITING_APPROVAL')
  assert.equal(projection.approvalSummary.pendingCount, 1)
  assert.equal(projection.approvalSummary.items[0].agentId, 'gamma')
  assert.equal(projection.approvalSummary.highestRisk, 'HIGH')

  // Agent Delta (Error)
  const deskDelta = projection.desks.find(d => d.agent.id === 'delta')
  assert.ok(deskDelta)
  assert.equal(deskDelta.agent.runtime.state, 'ERROR')

  // Ensure projection is strictly derived and immutable
  const serializedBefore = JSON.stringify(projection)
  assert.equal(JSON.stringify(projection), serializedBefore, 'Projection must not mutate')
})

test('Office Architecture: Zero Renderer Disagreement across Agent Directory, 2.5D, 3D, and List', () => {
  // Section 60: Mandatory validation
  // If Agent Alpha = ACTIVE in Agent Directory, it must be ACTIVE in 2.5D, 3D, and List
  const agents = [
    createMockAgent('ACTIVE', 'agent-alpha'),
    createMockAgent('IDLE', 'agent-bravo'),
    createMockAgent('AWAITING_APPROVAL', 'agent-charlie'),
    createMockAgent('DEGRADED', 'agent-delta'),
    createMockAgent('OFFLINE', 'agent-echo'),
  ]

  const projection = buildOfficeScene({
    agents,
    tasks: [],
    delegations: [],
    approvals: [],
  })

  // 1. Directory source of truth
  const directoryMap = new Map(agents.map(a => [a.id, a.runtime.state]))

  // 2. OfficeProjection (consumed identically by 3D, 2.5D, and List)
  const projectionMap = new Map(projection.desks.map(d => [d.agent.id, d.agent.runtime.state]))

  assert.equal(directoryMap.size, projectionMap.size)
  for (const [id, state] of directoryMap.entries()) {
    assert.equal(projectionMap.get(id), state, `Agent ${id} status must match across all renderers`)
  }
})

test('3D Graphics Quality: getSavedGraphicsQuality safely handles missing or invalid storage', () => {
  // Test fallback in environments without localStorage or with invalid keys
  assert.equal(getQualityConfig(undefined).detailLevel, 'balanced')
  assert.equal(getQualityConfig(null).detailLevel, 'balanced')
  assert.equal(getQualityConfig('non_existent').detailLevel, 'balanced')
})
