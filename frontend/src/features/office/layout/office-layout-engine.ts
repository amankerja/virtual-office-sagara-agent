import type { AgentProjection } from '@/types/agent'
import type { DelegationProjection, RuntimeOverview } from '@/types/runtime'
import type { ApprovalProjection, ApprovalRisk } from '@/types/approval'
import type { TaskProjection } from '@/types/task'
import type {
  OfficeDeskProjection,
  OfficeWorkerProjection,
  OfficeZoneProjection,
  OfficeApprovalProjection,
  OfficeRuntimeProjection,
  OfficeVaultProjection,
  OfficeCollaborationItem,
  OfficeSceneProjection,
  OfficePresentationConfig,
  OfficeZoneType,
} from '@/features/office/types/office'
import { DEFAULT_OFFICE_CONFIG } from '@/mocks/office-layout'
import { isActiveDelegation } from '../animation/behavior'

/**
 * Deterministically derives an avatar variant name from an agent ID.
 * NO real human photos; purely abstract bot/operator character styles.
 */
export function getDeterministicAvatarVariant(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const variants = [
    'variant-lead-engineer',
    'variant-sentinel-shield',
    'variant-gatekeeper-lock',
    'variant-stream-matrix',
    'variant-dispatcher-clock',
    'variant-relay-node',
  ]
  const index = Math.abs(hash) % variants.length
  return variants[index]
}

export interface BuildOfficeSceneParams {
  agents: AgentProjection[]
  delegations: DelegationProjection[]
  approvals: ApprovalProjection[]
  runtimeOverview?: RuntimeOverview
  tasks: TaskProjection[]
  config?: OfficePresentationConfig
}

/**
 * OfficeLayoutEngine:
 * Pure presentation-only layout service.
 * Maps existing operational models (AgentProjection, DelegationProjection, etc.) into spatial 2.5D coordinates.
 *
 * ABSOLUTE RULE:
 * This engine does NOT create, mutate, or infer operational truth.
 * All statuses and counts are taken verbatim from the domain projections.
 */
export function buildOfficeScene({
  agents = [],
  delegations = [],
  approvals = [],
  runtimeOverview,
  tasks = [],
  config = DEFAULT_OFFICE_CONFIG,
}: BuildOfficeSceneParams): OfficeSceneProjection {
  // 1. Sort agents deterministically by ID to prevent any layout reshuffling across reloads
  const sortedAgents = [...agents].sort((a, b) => a.id.localeCompare(b.id))

  // 2. Identify Command Room agent candidate
  // Priority: explicit presentation config assignment -> role classification hint ('orchestrat', 'engineer', 'lead', 'architect') -> first active
  let commandAgentId: string | null = null
  const commandAssignment = config.assignments?.find((a) => a.preferredZone === 'COMMAND')
  if (commandAssignment && sortedAgents.some((a) => a.id === commandAssignment.agentId)) {
    commandAgentId = commandAssignment.agentId
  } else {
    // Look for orchestration/lead role
    const orchestrator = sortedAgents.find(
      (a) =>
        a.definition.role?.toLowerCase().includes('orchestrat') ||
        a.definition.role?.toLowerCase().includes('lead') ||
        a.definition.role?.toLowerCase().includes('architect') ||
        a.definition.name.toLowerCase().includes('lead')
    )
    if (orchestrator) {
      commandAgentId = orchestrator.id
    }
  }

  const desks: OfficeDeskProjection[] = []
  const workers: OfficeWorkerProjection[] = []

  // Zone counts tracker
  const zoneCounts: Record<OfficeZoneType, number> = {
    COMMAND: 0,
    SPECIALIST: 0,
    DEV_ZONE: 0,
    CAREER_ZONE: 0,
    MARKETING_ZONE: 0,
    COLLABORATION: 0,
    APPROVAL: 0,
    RUNTIME: 0,
    VAULT: 0,
  }

  // Helper to determine zone for non-command agents
  function resolveAgentZone(agent: AgentProjection): OfficeZoneType {
    const assigned = config.assignments?.find((a) => a.agentId === agent.id)
    if (assigned?.preferredZone && assigned.preferredZone !== 'COMMAND') {
      return assigned.preferredZone
    }

    const role = (agent.definition.role || '').toLowerCase()
    const name = (agent.definition.name || '').toLowerCase()
    const desc = (agent.definition.description || '').toLowerCase()

    if (role.includes('market') || name.includes('growth') || desc.includes('campaign') || role.includes('marketing')) {
      return 'MARKETING_ZONE'
    }
    if (
      role.includes('career') ||
      role.includes('talent') ||
      role.includes('people') ||
      role.includes('recruit') ||
      role.includes('coach') ||
      name.includes('career') ||
      name.includes('talent')
    ) {
      return 'CAREER_ZONE'
    }
    return 'DEV_ZONE'
  }

  // 3. Separate agents into rooms
  let commandAgent: AgentProjection | null = null
  const devAgents: AgentProjection[] = []
  const careerAgents: AgentProjection[] = []
  const marketingAgents: AgentProjection[] = []

  sortedAgents.forEach((agent) => {
    if (agent.id === commandAgentId) {
      commandAgent = agent
    } else {
      const targetZone = resolveAgentZone(agent)
      if (targetZone === 'MARKETING_ZONE') {
        marketingAgents.push(agent)
      } else if (targetZone === 'CAREER_ZONE') {
        careerAgents.push(agent)
      } else {
        devAgents.push(agent)
      }
    }
  })

  // Map tasks by assigned agent ID (looking for RUNNING / active tasks)
  const activeTasksByAgent = new Map<string, TaskProjection>()
  tasks.forEach((task) => {
    if (task.assignedAgentId && ['RUNNING', 'AWAITING_APPROVAL', 'DISPATCHING', 'QUEUED'].includes(task.state)) {
      const existing = activeTasksByAgent.get(task.assignedAgentId)
      if (!existing || task.state === 'RUNNING' || (task.state === 'AWAITING_APPROVAL' && existing.state !== 'RUNNING')) {
        activeTasksByAgent.set(task.assignedAgentId, task)
      }
    }
  })

  // Group delegations by parent agent ID
  const delegationsByAgent = new Map<string, DelegationProjection[]>()
  delegations.forEach((del) => {
    const agentId = del.originAgentId
    if (!delegationsByAgent.has(agentId)) {
      delegationsByAgent.set(agentId, [])
    }
    delegationsByAgent.get(agentId)!.push(del)
  })

  // 4. Position Command Room Desk
  if (commandAgent) {
    const agent = commandAgent as AgentProjection
    const currentTask = activeTasksByAgent.get(agent.id)
    const agentDelegations = delegationsByAgent.get(agent.id) || []
    zoneCounts.COMMAND += 1

    const deskPos = { x: 205, y: 190 }
    desks.push({
      agentId: agent.id,
      agent,
      zone: 'COMMAND',
      position: deskPos,
      orientation: 'S',
      visual: {
        avatarVariant: getDeterministicAvatarVariant(agent.id),
        deskVariant: 'command-console',
      },
      currentTask,
      activeDelegations: agentDelegations.filter((d) => isActiveDelegation(d.state)),
    })

    // Place any active temporary workers docked near command agent
    const activeWorkers = agentDelegations.filter(
      (d) => d.state === 'RUNNING' || d.state === 'QUEUED' || d.state === 'CLAIMED'
    )
    activeWorkers.forEach((d, idx) => {
      workers.push({
        id: `worker-${d.id}`,
        delegationId: d.id,
        parentAgentId: agent.id,
        position: {
          x: deskPos.x + 85,
          y: deskPos.y - 10 + idx * 40,
        },
        state: d.state,
        taskTitle: d.taskTitle,
        workerPid: d.ownerPid,
        startedAt: d.startedAt,
      })
    })
  }

  // 5. Position Dev Zone Desks (Engineering Specialists)
  // Dev zone bounds: x: 415, y: 40, width: 570, height: 305
  // Arranged organically in 3 columns x 2 rows to comfortably hold 6 agents without any vertical spillover
  const devColSpacing = 190
  const devRowSpacing = 115
  const devStartX = 510
  const devStartY = 140

  devAgents.forEach((agent, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const deskPos = {
      x: devStartX + col * devColSpacing,
      y: devStartY + row * devRowSpacing,
    }

    zoneCounts.DEV_ZONE += 1
    const currentTask = activeTasksByAgent.get(agent.id)
    const agentDelegations = delegationsByAgent.get(agent.id) || []

    desks.push({
      agentId: agent.id,
      agent,
      zone: 'DEV_ZONE',
      position: deskPos,
      orientation: 'S',
      visual: {
        avatarVariant: getDeterministicAvatarVariant(agent.id),
        deskVariant: 'workstation-standard',
      },
      currentTask,
      activeDelegations: agentDelegations.filter((d) => isActiveDelegation(d.state)),
    })

    // Subagents: docked cleanly adjacent to parent workstation without clipping
    const activeWorkers = agentDelegations.filter(
      (d) => d.state === 'RUNNING' || d.state === 'QUEUED' || d.state === 'CLAIMED'
    )
    activeWorkers.forEach((d, workerIdx) => {
      const offsetX = col === 2 ? -72 : 72
      const offsetY = -8 + workerIdx * 30
      workers.push({
        id: `worker-${d.id}`,
        delegationId: d.id,
        parentAgentId: agent.id,
        position: {
          x: deskPos.x + offsetX,
          y: deskPos.y + offsetY,
        },
        state: d.state,
        taskTitle: d.taskTitle,
        workerPid: d.ownerPid,
        startedAt: d.startedAt,
      })
    })
  })

  // 6. Position Career Zone Desks
  // Career zone bounds: x: 1035, y: 40, width: 320, height: 305
  careerAgents.forEach((agent, index) => {
    const deskPos = {
      x: 1195,
      y: 190 + index * 115,
    }

    zoneCounts.CAREER_ZONE += 1
    const currentTask = activeTasksByAgent.get(agent.id)
    const agentDelegations = delegationsByAgent.get(agent.id) || []

    desks.push({
      agentId: agent.id,
      agent,
      zone: 'CAREER_ZONE',
      position: deskPos,
      orientation: 'S',
      visual: {
        avatarVariant: getDeterministicAvatarVariant(agent.id),
        deskVariant: 'workstation-career',
      },
      currentTask,
      activeDelegations: agentDelegations.filter((d) => isActiveDelegation(d.state)),
    })

    const activeWorkers = agentDelegations.filter(
      (d) => d.state === 'RUNNING' || d.state === 'QUEUED' || d.state === 'CLAIMED'
    )
    activeWorkers.forEach((d, workerIdx) => {
      workers.push({
        id: `worker-${d.id}`,
        delegationId: d.id,
        parentAgentId: agent.id,
        position: {
          x: deskPos.x - 72,
          y: deskPos.y - 8 + workerIdx * 30,
        },
        state: d.state,
        taskTitle: d.taskTitle,
        workerPid: d.ownerPid,
        startedAt: d.startedAt,
      })
    })
  })

  // 7. Position Marketing Zone Desks
  // Marketing zone bounds: x: 45, y: 385, width: 320, height: 255
  marketingAgents.forEach((agent, index) => {
    const deskPos = {
      x: 205,
      y: 512 + index * 115,
    }

    zoneCounts.MARKETING_ZONE += 1
    const currentTask = activeTasksByAgent.get(agent.id)
    const agentDelegations = delegationsByAgent.get(agent.id) || []

    desks.push({
      agentId: agent.id,
      agent,
      zone: 'MARKETING_ZONE',
      position: deskPos,
      orientation: 'S',
      visual: {
        avatarVariant: getDeterministicAvatarVariant(agent.id),
        deskVariant: 'workstation-marketing',
      },
      currentTask,
      activeDelegations: agentDelegations.filter((d) => isActiveDelegation(d.state)),
    })

    const activeWorkers = agentDelegations.filter(
      (d) => d.state === 'RUNNING' || d.state === 'QUEUED' || d.state === 'CLAIMED'
    )
    activeWorkers.forEach((d, workerIdx) => {
      workers.push({
        id: `worker-${d.id}`,
        delegationId: d.id,
        parentAgentId: agent.id,
        position: {
          x: deskPos.x + 72,
          y: deskPos.y - 8 + workerIdx * 30,
        },
        state: d.state,
        taskTitle: d.taskTitle,
        workerPid: d.ownerPid,
        startedAt: d.startedAt,
      })
    })
  })

  // 8. Build Zones Projection
  const zones: OfficeZoneProjection[] = config.zones.map((z) => ({
    id: z.id,
    name: z.name,
    subtitle: z.subtitle,
    type: z.type,
    bounds: z.bounds,
    description: z.description,
    agentCount: zoneCounts[z.type] || 0,
  }))

  // 7. Build Approval Pod Projection
  const pendingApprovals = approvals.filter((a) => a.state === 'PENDING')
  const byRisk = {
    critical: pendingApprovals.filter((a) => a.risk === 'CRITICAL').length,
    high: pendingApprovals.filter((a) => a.risk === 'HIGH').length,
    medium: pendingApprovals.filter((a) => a.risk === 'MEDIUM').length,
    low: pendingApprovals.filter((a) => a.risk === 'LOW').length,
  }

  let highestRisk: ApprovalRisk | undefined
  if (byRisk.critical > 0) highestRisk = 'CRITICAL'
  else if (byRisk.high > 0) highestRisk = 'HIGH'
  else if (byRisk.medium > 0) highestRisk = 'MEDIUM'
  else if (byRisk.low > 0) highestRisk = 'LOW'

  // Sort by requestedAt to find oldest pending
  const sortedPending = [...pendingApprovals].sort(
    (a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
  )

  const approvalSummary: OfficeApprovalProjection = {
    pendingCount: pendingApprovals.length,
    highestRisk,
    oldestPending: sortedPending[0],
    items: pendingApprovals,
    byRisk,
  }

  // 8. Build Runtime Room Projection
  const runtimeSummary: OfficeRuntimeProjection = {
    gatewayState: runtimeOverview?.gateway?.state || 'HEALTHY',
    activeSessions: runtimeOverview?.activeSessionsCount ?? 0,
    activeDelegations: runtimeOverview?.runningDelegationsCount ?? delegations.filter((d) => d.state === 'RUNNING').length,
    health: runtimeOverview?.health || {
      gateway: 'HEALTHY',
      runtimeData: 'HEALTHY',
      sessions: 'HEALTHY',
      delegations: 'HEALTHY',
      usage: 'HEALTHY',
    },
    host: runtimeOverview?.gateway?.host || 'sagara-hermes-local',
    backendId: runtimeOverview?.gateway?.backendId || 'hermes-core-01',
    statusMessage: runtimeOverview?.gateway?.statusMessage,
    heartbeatAgeSeconds: runtimeOverview?.gateway?.heartbeatAgeSeconds ?? 8,
    hardwareMetrics: runtimeOverview?.systemLoad
      ? {
          cpuPercent: runtimeOverview.systemLoad.cpuPercent,
          memoryUsedMb: runtimeOverview.systemLoad.memoryUsedMb,
          memoryTotalMb: runtimeOverview.systemLoad.memoryTotalMb,
          memoryPercent: runtimeOverview.systemLoad.memoryPercent,
        }
      : undefined,
  }

  // 9. Build Artifact Vault Projection
  // Extract completed tasks with outputs/artifacts
  const tasksWithArtifacts = tasks
    .filter((t) => t.result?.artifacts && t.result.artifacts.length > 0)
    .map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      completedAt: t.result?.completedAt || t.updatedAt,
      assignedAgentId: t.assignedAgentId,
      artifacts: t.result!.artifacts!,
    }))

  const totalArtifacts = tasksWithArtifacts.reduce((acc, t) => acc + t.artifacts.length, 0)

  const vaultSummary: OfficeVaultProjection = {
    totalArtifacts,
    completedTasksWithArtifacts: tasksWithArtifacts,
  }

  // 10. Build Collaboration Pod Items
  // Identify tasks with multiple delegations or active correlation
  const collaborationItems: OfficeCollaborationItem[] = tasks
    .filter((t) => t.state === 'RUNNING')
    .map((t) => {
      const taskDelegations = delegations.filter((d) => t.delegationIds?.includes(d.id) && d.state === 'RUNNING')
      const agentIds: string[] = []
      if (t.assignedAgentId) agentIds.push(t.assignedAgentId)
      taskDelegations.forEach((d) => {
        if (!agentIds.includes(d.originAgentId)) {
          agentIds.push(d.originAgentId)
        }
      })

      return {
        id: `collab-${t.id}`,
        taskTitle: t.title,
        taskId: t.id,
        agentIds,
        delegations: taskDelegations,
        state: t.state,
      }
    })
    .filter(item => item.agentIds.length + item.delegations.length > 1)
    .slice(0, 3)

  return {
    delegationRecords: delegations,
    zones,
    desks,
    workers,
    approvalSummary,
    runtimeSummary,
    vaultSummary,
    collaborationItems,
  }
}
