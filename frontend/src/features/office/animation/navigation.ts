import type { CharacterOrientation, CharacterPosture, OfficeBehaviorState, Point } from './behavior'

export interface OfficeNavigationNode extends Point {
  id: string
  zone: string
  type: 'DESK' | 'CORRIDOR' | 'BREAK' | 'COLLABORATION' | 'APPROVAL' | 'ENTRANCE'
}

// Fixed lanes occupy gaps between furniture; desk ownership never moves.
export const OFFICE_ANCHORS: OfficeNavigationNode[] = [
  { id: 'spine', x: 400, y: 520, zone: 'CORRIDOR', type: 'CORRIDOR' },
  { id: 'break', x: 1285, y: 535, zone: 'BREAK', type: 'BREAK' },
  { id: 'collaboration', x: 340, y: 455, zone: 'COLLABORATION', type: 'COLLABORATION' },
  { id: 'approval', x: 375, y: 705, zone: 'APPROVAL', type: 'APPROVAL' },
]

export const chairPosition = (desk: Point): Point => ({ x: desk.x, y: desk.y + 27 })

export function deskNodes(id: string, desk: Point): OfficeNavigationNode[] {
  const chair = chairPosition(desk)
  return [
    { ...chair, id: `${id}:desk`, zone: 'DESK', type: 'DESK' },
    { x: desk.x - 92, y: chair.y, id: `${id}:aisle`, zone: 'CORRIDOR', type: 'CORRIDOR' },
    { x: desk.x - 92, y: desk.y + 109, id: `${id}:lane`, zone: 'CORRIDOR', type: 'CORRIDOR' },
    { x: 400, y: desk.y + 109, id: `${id}:spine`, zone: 'CORRIDOR', type: 'CORRIDOR' },
  ]
}

export function officeRoute(id: string, desk: Point, destination: Point): Point[] {
  const nodes = deskNodes(id, desk)
  return [...nodes, OFFICE_ANCHORS[0], { x: destination.x, y: 520 }, destination]
    .filter((p, i, arr) => i === 0 || distance(p, arr[i - 1]) > 0.1)
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export const samePoint = (a: Point, b: Point) => distance(a, b) < 0.1
export const orientationTo = (a: Point, b: Point): CharacterOrientation =>
  b.y < a.y ? (b.x < a.x ? 'NORTH_WEST' : 'NORTH_EAST') : (b.x < a.x ? 'SOUTH_WEST' : 'SOUTH_EAST')

export interface OfficeMotion {
  position: Point
  orientation: CharacterOrientation
  posture: CharacterPosture
  transitionProgress: number
  route: Point[]
  /** Breadcrumbs allow state changes to return along the same furniture-safe lane. */
  breadcrumbs: Point[]
  target: Point
  seatedAtTarget: boolean
}

export function createMotion(position: Point, seated = true): OfficeMotion {
  return { position: { ...position }, orientation: 'NORTH_EAST', posture: seated ? 'SEATED' : 'STANDING', transitionProgress: 1, route: [], breadcrumbs: [{ ...position }], target: { ...position }, seatedAtTarget: seated }
}

export function requestMotion(motion: OfficeMotion, route: Point[], seatedAtTarget: boolean, reducedMotion: boolean): OfficeMotion {
  const target = route.at(-1) ?? motion.position
  if (samePoint(target, motion.target) && seatedAtTarget === motion.seatedAtTarget) return motion
  if (reducedMotion) return createMotion(target, seatedAtTarget)
  const remaining = route.filter((p, i) => i !== 0 || !samePoint(p, motion.position))
  return { ...motion, target, seatedAtTarget, route: remaining,
    posture: motion.posture === 'SEATED' || motion.posture === 'SIT_DOWN' ? 'STAND_UP' : remaining.length ? 'WALKING' : 'STANDING',
    transitionProgress: 0 }
}

export function returnRoute(motion: OfficeMotion, home: Point): Point[] {
  const reversed = [...motion.breadcrumbs].reverse()
  return [motion.position, ...reversed, home].filter((p, i, arr) => i === 0 || !samePoint(p, arr[i - 1]))
}

/** Advances only presentation coordinates. No business state, writes, timers or random values. */
export function advanceMotion(motion: OfficeMotion, seconds: number): OfficeMotion {
  const dt = Math.max(0, Math.min(seconds, 0.1))
  if (motion.posture === 'STAND_UP' || motion.posture === 'SIT_DOWN') {
    const progress = Math.min(1, motion.transitionProgress + dt / 0.8)
    const posture = progress < 1 ? motion.posture : motion.posture === 'SIT_DOWN' ? 'SEATED' : motion.route.length ? 'WALKING' : 'STANDING'
    return { ...motion, transitionProgress: progress, posture }
  }
  if (!motion.route.length) {
    if (motion.seatedAtTarget && motion.posture !== 'SEATED') return { ...motion, posture: 'SIT_DOWN', transitionProgress: 0 }
    return motion
  }
  const next = motion.route[0]
  const length = distance(motion.position, next)
  const step = 105 * dt
  const arrived = length <= step
  const position = arrived ? next : { x: motion.position.x + (next.x - motion.position.x) / length * step, y: motion.position.y + (next.y - motion.position.y) / length * step }
  const route = arrived ? motion.route.slice(1) : motion.route
  return { ...motion, position, route, orientation: orientationTo(motion.position, next),
    posture: route.length ? 'WALKING' : motion.seatedAtTarget ? 'SIT_DOWN' : 'STANDING', transitionProgress: route.length ? 1 : 0,
    breadcrumbs: arrived ? [...motion.breadcrumbs, next].slice(-24) : motion.breadcrumbs }
}

export function visibleBehavior(resolved: OfficeBehaviorState, motion: OfficeMotion): OfficeBehaviorState {
  // Explicit negative/uncertain truth suppresses work immediately, even while returning.
  if (['OFFLINE_AWAY', 'ERROR_REVIEW', 'UNKNOWN_NEUTRAL', 'WAITING_APPROVAL', 'TROUBLESHOOTING', 'CONFIGURING'].includes(resolved)) return resolved
  if (motion.posture === 'WALKING') return 'WALKING'
  if (motion.posture === 'STAND_UP' || motion.posture === 'SIT_DOWN') return 'BREAK_STANDING'
  return resolved
}
