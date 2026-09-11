import type { OfficeDeskProjection, OfficeSceneProjection, OfficeWorkerProjection } from '../types/office'
import { isActiveDelegation, presentationSeed, resolveOfficeBehavior, resolveWorkerBehavior, type AnimationQuality, type OfficeBehaviorState, type Point } from './behavior'
import { advanceMotion, chairPosition, createMotion, OFFICE_ANCHORS, officeRoute, requestMotion, returnRoute, samePoint, type OfficeMotion } from './navigation'

export interface OfficeCharacterProjection {
  id: string
  agentId: string
  desk?: OfficeDeskProjection
  worker?: OfficeWorkerProjection
  deskPosition: Point
  motion: OfficeMotion
  behavior: OfficeBehaviorState
  journey: 'HOME' | 'OUTBOUND' | 'VISITING' | 'RETURNING' | 'ARRIVING' | 'LEAVING'
  phaseStarted: number
  nextTripAfter: number
}

export interface AnimationSettings { quality: AnimationQuality; reducedMotion: boolean }

export function meetingParticipants(scene: OfficeSceneProjection, elapsed: number): { agents: string[]; workers: string[] } {
  const item = scene.collaborationItems[0]
  if (!item || (elapsed + presentationSeed(item.id) % 120) % 120 < 40 || (elapsed + presentationSeed(item.id) % 120) % 120 > 90) return { agents: [], workers: [] }
  return { agents: item.agentIds.slice(0, 3), workers: item.delegations.map(d => d.id).slice(0, 2) }
}

/** All retained values here describe visual travel, never agent/delegation lifecycle. */
export function stepOfficeCharacters(previous: OfficeCharacterProjection[], scene: OfficeSceneProjection, elapsed: number, dt: number, settings: AnimationSettings, pausedIds = new Set<string>()): OfficeCharacterProjection[] {
  const prior = new Map(previous.map(p => [p.id, p]))
  const result: OfficeCharacterProjection[] = []
  const meeting = meetingParticipants(scene, elapsed)
  const canTravel = settings.quality !== 'LITE' && !settings.reducedMotion
  const activeIds = new Set(scene.desks.map(d => d.agentId))

  for (const desk of scene.desks) {
    const id = `agent:${desk.agentId}`
    const home = chairPosition(desk.position)
    const collaborating = meeting.agents.includes(desk.agentId)
    const behavior = resolveOfficeBehavior({ agent: desk.agent, task: desk.currentTask, delegations: desk.activeDelegations, approvals: scene.approvalSummary.items, collaborating, elapsedSeconds: elapsed })
    let actor: OfficeCharacterProjection = { ...(prior.get(id) ?? {
      id, agentId: desk.agentId, deskPosition: desk.position, motion: createMotion(home), journey: 'HOME' as const, phaseStarted: elapsed, nextTripAfter: 8 + presentationSeed(desk.agentId) % 18,
    }), desk, deskPosition: desk.position, behavior }
    if (behavior === 'OFFLINE_AWAY' || settings.reducedMotion) {
      actor.motion = createMotion(home, !['BREAK_STRETCH', 'BREAK_STANDING'].includes(behavior))
      actor.journey = 'HOME'
      result.push(actor)
      continue
    }
    const isBreak = behavior === 'BREAK_COFFEE'
    const wantsMeeting = behavior === 'WORK_COLLABORATING'
    const wantsTrip = canTravel && (isBreak || wantsMeeting)
    if (actor.journey === 'HOME' && wantsTrip && elapsed >= actor.nextTripAfter && actor.motion.posture === 'SEATED') {
      const index = Math.max(0, meeting.agents.indexOf(desk.agentId))
      const destination = isBreak
        ? { x: OFFICE_ANCHORS[1].x - (presentationSeed(desk.agentId) % 3) * 26, y: OFFICE_ANCHORS[1].y }
        : { x: 310 + index * 25, y: 463 + index * 14 }
      actor.motion = requestMotion({ ...actor.motion, breadcrumbs: [home] }, officeRoute(id, desk.position, destination), false, false)
      actor.journey = 'OUTBOUND'
      actor.phaseStarted = elapsed
    }
    if ((actor.journey === 'OUTBOUND' || actor.journey === 'VISITING') && (!wantsTrip || actor.journey === 'VISITING' && elapsed - actor.phaseStarted > 9)) {
      actor.motion = requestMotion(actor.motion, returnRoute(actor.motion, home), true, false)
      actor.journey = 'RETURNING'
    }
    if (actor.journey === 'HOME') {
      const standing = behavior === 'BREAK_STRETCH' || behavior === 'BREAK_STANDING'
      actor.motion = requestMotion(actor.motion, [home], !standing, false)
    }
    if (!pausedIds.has(id)) actor.motion = advanceMotion(actor.motion, dt)
    if (actor.journey === 'OUTBOUND' && !actor.motion.route.length && actor.motion.posture === 'STANDING') {
      actor.journey = 'VISITING'
      actor.phaseStarted = elapsed
    }
    if (actor.journey === 'RETURNING' && actor.motion.posture === 'SEATED' && samePoint(actor.motion.position, home)) {
      actor.journey = 'HOME'
      actor.nextTripAfter = elapsed + 35
      actor.motion = { ...actor.motion, breadcrumbs: [home] }
    }
    // A coffee pose belongs at the lounge; while seated it is a quiet idle pose.
    if (behavior === 'BREAK_COFFEE' && actor.journey !== 'VISITING') actor.behavior = 'IDLE_SEATED'
    // Lite retains truthful collaboration gestures at the workstation.
    result.push(actor)
  }

  for (const worker of scene.workers) {
    const id = `worker:${worker.delegationId}`
    const old = prior.get(id)
    const deskPosition = old?.deskPosition ?? worker.position
    const home = chairPosition(deskPosition)
    const entrance = { x: deskPosition.x, y: deskPosition.y + 56 }
    let motion = old?.motion ?? (canTravel ? requestMotion(createMotion(entrance, false), [entrance, home], true, false) : createMotion(home))
    let journey = old?.journey ?? (canTravel ? 'ARRIVING' : 'HOME')
    let phaseStarted = old?.phaseStarted ?? elapsed
    const collaborating = meeting.workers.includes(worker.delegationId) && worker.state === 'RUNNING'
    if (journey === 'HOME' && collaborating && canTravel && elapsed > (old?.nextTripAfter ?? 0)) {
      const slot = meeting.workers.indexOf(worker.delegationId)
      const destination = { x: 275 + slot * 28, y: 498 }
      motion = requestMotion({ ...motion, breadcrumbs: [home] }, [home, entrance, { x: 400, y: entrance.y }, { x: 400, y: 520 }, { x: destination.x, y: 520 }, destination], false, false)
      journey = 'OUTBOUND'
    }
    if ((journey === 'OUTBOUND' || journey === 'VISITING') && (!collaborating || !canTravel || journey === 'VISITING' && elapsed - phaseStarted > 9)) {
      motion = requestMotion(motion, returnRoute(motion, home), true, settings.reducedMotion)
      journey = 'RETURNING'
    }
    if (settings.reducedMotion) motion = createMotion(home)
    else if (!pausedIds.has(id)) motion = advanceMotion(motion, dt)
    if (journey === 'OUTBOUND' && motion.posture === 'STANDING' && !motion.route.length) { journey = 'VISITING'; phaseStarted = elapsed }
    const justArrived = (journey === 'RETURNING' || journey === 'ARRIVING') && motion.posture === 'SEATED'
    if (justArrived) journey = 'HOME'
    result.push({ id, agentId: worker.parentAgentId, worker, deskPosition, motion, behavior: collaborating ? 'WORK_COLLABORATING' : resolveWorkerBehavior(worker.state, worker.delegationId), journey, phaseStarted, nextTripAfter: justArrived ? elapsed + 35 : old?.nextTripAfter ?? 0 })
  }

  // Retain a visual exit only for observed terminal transitions, never for filtering,
  // missing query results or newly loaded historical delegations.
  const currentWorkers = new Set(scene.workers.map(w => w.delegationId))
  for (const old of previous) {
    if (!old.worker || currentWorkers.has(old.worker.delegationId) || !activeIds.has(old.agentId)) continue
    const record = scene.delegationRecords.find(d => d.id === old.worker!.delegationId)
    if (!record || isActiveDelegation(record.state) || settings.reducedMotion || settings.quality === 'LITE') continue
    let actor = { ...old, worker: { ...old.worker, state: record.state }, behavior: resolveWorkerBehavior(record.state, record.id) }
    if (actor.journey !== 'LEAVING') {
      const home = chairPosition(actor.deskPosition)
      const entrance = { x: home.x, y: home.y + 29 }
      actor.motion = requestMotion(actor.motion, [...returnRoute(actor.motion, home), entrance], false, false)
      actor.journey = 'LEAVING'
      actor.phaseStarted = elapsed
    }
    // Short finishing pause shows the confirmed terminal label before leaving.
    if (elapsed - actor.phaseStarted > 1.2 && !pausedIds.has(actor.id)) actor.motion = advanceMotion(actor.motion, dt)
    if (actor.motion.route.length || actor.motion.posture === 'STAND_UP' || elapsed - actor.phaseStarted < 1.2) result.push(actor)
  }
  return result
}
