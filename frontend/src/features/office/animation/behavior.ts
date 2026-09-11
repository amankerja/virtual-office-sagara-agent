import type { AgentProjection } from '@/types/agent'
import type { ApprovalProjection } from '@/types/approval'
import type { DelegationProjection, DelegationState } from '@/types/runtime'
import type { TaskProjection } from '@/types/task'

export type OfficeBehaviorState =
  | 'WORK_TYPING' | 'WORK_MOUSE' | 'WORK_READING' | 'WORK_MONITORING'
  | 'WORK_SUPERVISING' | 'WORK_COLLABORATING' | 'THINKING'
  | 'IDLE_SEATED' | 'IDLE_LOOK_AROUND' | 'BREAK_COFFEE' | 'BREAK_STRETCH'
  | 'BREAK_STANDING' | 'WALKING' | 'WAITING_APPROVAL' | 'TROUBLESHOOTING'
  | 'ERROR_REVIEW' | 'CONFIGURING' | 'OFFLINE_AWAY' | 'UNKNOWN_NEUTRAL'

export type CharacterOrientation = 'NORTH_EAST' | 'NORTH_WEST' | 'SOUTH_EAST' | 'SOUTH_WEST'
export type AnimationQuality = 'FULL' | 'BALANCED' | 'LITE'
export type CharacterPosture = 'SEATED' | 'STAND_UP' | 'STANDING' | 'WALKING' | 'SIT_DOWN'
export interface Point { x: number; y: number }

export function presentationSeed(id: string): number {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export const isActiveDelegation = (state: DelegationState) =>
  state === 'RUNNING' || state === 'QUEUED' || state === 'CLAIMED'

interface BehaviorInput {
  agent: AgentProjection
  task?: TaskProjection
  delegations?: DelegationProjection[]
  approvals?: ApprovalProjection[]
  /** True only for a task-linked, currently active group from the scene projection. */
  collaborating?: boolean
  elapsedSeconds: number
}

/** Pure presentation mapper. Runtime state takes precedence over every related record. */
export function resolveOfficeBehavior({ agent, task, delegations = [], approvals = [], collaborating = false, elapsedSeconds }: BehaviorInput): OfficeBehaviorState {
  const seed = presentationSeed(agent.id)
  const window = Math.floor(Math.max(0, elapsedSeconds) / (45 + seed % 31))
  const pick = (choices: OfficeBehaviorState[]) => choices[presentationSeed(`${agent.id}:${agent.runtime.state}:${window}`) % choices.length]
  switch (agent.runtime.state) {
    case 'ACTIVE': {
      // A related approval can pause cosmetic work, but never rewrites the ACTIVE label.
      const blockedTask = task?.state === 'AWAITING_APPROVAL' || approvals.some(a =>
        a.state === 'PENDING' && (a.agentId === agent.id || (task && a.taskId === task.id)))
      if (blockedTask) return 'WAITING_APPROVAL'
      if (collaborating) return 'WORK_COLLABORATING'
      if (delegations.some(d => d.originAgentId === agent.id && d.state === 'RUNNING')) return 'WORK_SUPERVISING'
      if (task?.state === 'RUNNING') return pick(['WORK_TYPING', 'WORK_MOUSE', 'WORK_READING', 'WORK_MONITORING', 'THINKING'])
      return pick(['WORK_MONITORING', 'THINKING'])
    }
    case 'IDLE': return pick(['IDLE_SEATED', 'IDLE_LOOK_AROUND', 'BREAK_STRETCH', 'BREAK_COFFEE', 'BREAK_STANDING'])
    case 'RECENTLY_ACTIVE': return pick(['IDLE_SEATED', 'BREAK_STANDING'])
    case 'AWAITING_APPROVAL': return 'WAITING_APPROVAL'
    case 'DEGRADED': return 'TROUBLESHOOTING'
    case 'ERROR': return 'ERROR_REVIEW'
    case 'CONFIGURATION_INCOMPLETE': return 'CONFIGURING'
    case 'OFFLINE': return 'OFFLINE_AWAY'
    case 'UNKNOWN': return 'UNKNOWN_NEUTRAL'
    default: return 'UNKNOWN_NEUTRAL'
  }
}

export function resolveWorkerBehavior(state: DelegationState, id: string): OfficeBehaviorState {
  switch (state) {
    case 'RUNNING': return presentationSeed(id) % 2 ? 'WORK_TYPING' : 'WORK_READING'
    case 'QUEUED': case 'CLAIMED': return 'IDLE_SEATED'
    case 'FAILED': return 'ERROR_REVIEW'
    case 'COMPLETED': case 'CANCELLED': return 'BREAK_STANDING'
    default: return 'UNKNOWN_NEUTRAL'
  }
}

export function behaviorLabel(behavior: OfficeBehaviorState): string {
  return behavior.toLowerCase().replace(/^work_/, '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
}

export function qualityForWidth(width: number): AnimationQuality {
  return width < 640 ? 'LITE' : width < 1100 ? 'BALANCED' : 'FULL'
}
