import type { MissionControlSnapshot } from '@/types/mission-control'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
import type { ProfileDefinition } from '@/types/profile'
import type {
  GatewayTelemetry,
  SessionProjection,
  DelegationProjection,
  RuntimeUsageOverview,
  RuntimeEvent,
  RuntimeOverview,
} from '@/types/runtime'
import type { TaskProjection, CreateTaskInput, UpdateTaskInput, TaskQuery } from '@/types/task'
import type { ApprovalProjection, ApprovalDecisionInput, ApprovalQuery } from '@/types/approval'
import type { ActivityProjection, ActivityQuery } from '@/types/activity'
import type { AuditRecord, AuditQuery } from '@/types/audit'
import type { GovernanceSnapshot } from '@/types/governance'
import type { ArtifactProjection } from '@/types/artifact'
import type {
  MissionControlSnapshotDto,
  AgentDto,
  SkillDto,
  ProfileDto,
  RuntimeOverviewDto,
  GatewayDto,
  SessionDto,
  DelegationDto,
  RuntimeEventDto,
  TaskDto,
  ApprovalDto,
  ActivityDto,
  AuditRecordDto,
  GovernanceSnapshotDto,
  ArtifactDto,
} from './dto'
import {
  mapMissionControlSnapshotDtoToDomain,
  mapAgentDtoToDomain,
  mapSkillDtoToDomain,
  mapProfileDtoToDomain,
  mapRuntimeOverviewDtoToDomain,
  mapGatewayDtoToDomain,
  mapSessionDtoToDomain,
  mapDelegationDtoToDomain,
  mapRuntimeEventDtoToDomain,
  mapTaskDtoToDomain,
  mapCreateTaskInputToDto,
  mapUpdateTaskInputToDto,
  mapApprovalDtoToDomain,
  mapApprovalDecisionInputToDto,
  mapActivityDtoToDomain,
  mapAuditRecordDtoToDomain,
  mapGovernanceSnapshotDtoToDomain,
  mapArtifactDtoToDomain,
} from './mappers'

import { MOCK_MISSION_CONTROL_SNAPSHOT } from '@/mocks/mission-control'
import { MOCK_AGENTS } from '@/mocks/agents'
import { MOCK_SKILLS } from '@/mocks/skills'
import { MOCK_SESSIONS } from '@/mocks/sessions'
import { MOCK_DELEGATIONS } from '@/mocks/delegations'
import { MOCK_GATEWAY, MOCK_RUNTIME_OVERVIEW, MOCK_RUNTIME_USAGE } from '@/mocks/runtime'
import { MOCK_RUNTIME_EVENTS } from '@/mocks/runtime-events'
import { MOCK_TASKS } from '@/mocks/tasks'
import { MOCK_APPROVALS } from '@/mocks/approvals'
import { MOCK_ACTIVITY_STREAM } from '@/mocks/activity-expanded'
import { MOCK_AUDIT_RECORDS } from '@/mocks/audit'
import { MOCK_GOVERNANCE_SNAPSHOT } from '@/mocks/governance'
import { apiClient, ApiError } from './client'

const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'mock'

export const isMockMode = (): boolean => {
  return DATA_MODE === 'mock'
}

export function handleApiError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err
  }
  throw new ApiError(503, 'Mission Control API is not connected.', { original: err })
}

// In-memory prototype state for optimistic / pessimistic testing
let tasksState: TaskProjection[] = [...MOCK_TASKS]
let approvalsState: ApprovalProjection[] = [...MOCK_APPROVALS]

export const dataProvider = {
  // Snapshot
  getSnapshot: async (): Promise<MissionControlSnapshot> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 80))
      return {
        ...MOCK_MISSION_CONTROL_SNAPSHOT,
        timestamp: new Date().toISOString(),
      }
    }
    try {
      const dto = await apiClient.get<MissionControlSnapshotDto>('/api/v1/mission-control/snapshot')
      return mapMissionControlSnapshotDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Profiles
  getProfiles: async (): Promise<ProfileDefinition[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      return MOCK_AGENTS.map((a) => ({
        id: a.id,
        name: a.definition.name,
        role: a.definition.role,
        description: a.definition.description,
        enabled: a.definition.enabled,
        memoryNamespace: a.definition.memoryNamespace,
      }))
    }
    try {
      const dtos = await apiClient.get<ProfileDto[]>('/api/v1/profiles')
      return dtos.map(mapProfileDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getProfileById: async (id: string): Promise<ProfileDefinition | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 30))
      const agent = MOCK_AGENTS.find((a) => a.id === id)
      if (!agent) return null
      return {
        id: agent.id,
        name: agent.definition.name,
        role: agent.definition.role,
        description: agent.definition.description,
        enabled: agent.definition.enabled,
        memoryNamespace: agent.definition.memoryNamespace,
      }
    }
    try {
      const dto = await apiClient.get<ProfileDto>(`/api/v1/profiles/${id}`)
      return dto ? mapProfileDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Agents
  getAgents: async (): Promise<AgentProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_AGENTS]
    }
    try {
      const dtos = await apiClient.get<AgentDto[]>('/api/v1/agents')
      return dtos.map(mapAgentDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getAgentById: async (id: string): Promise<AgentProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_AGENTS.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<AgentDto>(`/api/v1/agents/${id}`)
      return dto ? mapAgentDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Skills
  getSkills: async (): Promise<SkillProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_SKILLS]
    }
    try {
      const dtos = await apiClient.get<SkillDto[]>('/api/v1/skills')
      return dtos.map(mapSkillDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getSkillById: async (id: string): Promise<SkillProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_SKILLS.find((s) => s.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<SkillDto>(`/api/v1/skills/${id}`)
      return dto ? mapSkillDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Runtime Overview
  getRuntimeOverview: async (): Promise<RuntimeOverview> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 70))
      return { ...MOCK_RUNTIME_OVERVIEW }
    }
    try {
      const dto = await apiClient.get<RuntimeOverviewDto>('/api/v1/runtime')
      return mapRuntimeOverviewDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Gateway
  getGatewayTelemetry: async (): Promise<GatewayTelemetry> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { ...MOCK_GATEWAY }
    }
    try {
      const dto = await apiClient.get<GatewayDto>('/api/v1/runtime/gateway')
      return mapGatewayDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Sessions
  getSessions: async (): Promise<SessionProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_SESSIONS]
    }
    try {
      const dtos = await apiClient.get<SessionDto[]>('/api/v1/sessions')
      return dtos.map(mapSessionDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getSessionById: async (id: string): Promise<SessionProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_SESSIONS.find((s) => s.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<SessionDto>(`/api/v1/sessions/${id}`)
      return dto ? mapSessionDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Delegations
  getDelegations: async (): Promise<DelegationProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_DELEGATIONS]
    }
    try {
      const dtos = await apiClient.get<DelegationDto[]>('/api/v1/delegations')
      return dtos.map(mapDelegationDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getDelegationById: async (id: string): Promise<DelegationProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_DELEGATIONS.find((d) => d.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<DelegationDto>(`/api/v1/delegations/${id}`)
      return dto ? mapDelegationDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Usage
  getRuntimeUsage: async (): Promise<RuntimeUsageOverview> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return { ...MOCK_RUNTIME_USAGE }
    }
    try {
      return await apiClient.get<RuntimeUsageOverview>('/api/v1/runtime/usage')
    } catch (err) {
      handleApiError(err)
    }
  },

  // Events
  getRuntimeEvents: async (): Promise<RuntimeEvent[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return [...MOCK_RUNTIME_EVENTS]
    }
    try {
      const dtos = await apiClient.get<RuntimeEventDto[]>('/api/v1/runtime/events')
      return dtos.map(mapRuntimeEventDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Tasks
  getTasks: async (filters?: TaskQuery): Promise<TaskProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 70))
      let result = [...tasksState]

      if (filters?.search) {
        const q = filters.search.toLowerCase()
        result = result.filter((t) => {
          const agent = MOCK_AGENTS.find((a) => a.id === t.assignedAgentId)
          return (
            t.id.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (agent && agent.definition.name.toLowerCase().includes(q))
          )
        })
      }

      if (filters?.state && filters.state !== 'ALL') {
        result = result.filter((t) => t.state === filters.state)
      }

      if (filters?.priority && filters.priority !== 'ALL') {
        result = result.filter((t) => t.priority === filters.priority)
      }

      if (filters?.agentId && filters.agentId !== 'ALL') {
        if (filters.agentId === 'UNASSIGNED') {
          result = result.filter((t) => !t.assignedAgentId)
        } else {
          result = result.filter((t) => t.assignedAgentId === filters.agentId)
        }
      }

      if (filters?.attention && filters.attention !== 'ALL') {
        if (filters.attention === 'APPROVAL') {
          result = result.filter((t) => t.state === 'AWAITING_APPROVAL')
        } else if (filters.attention === 'BLOCKED') {
          result = result.filter((t) => t.state === 'BLOCKED')
        } else if (filters.attention === 'FAILED') {
          result = result.filter((t) => t.state === 'FAILED')
        }
      }

      if (filters?.skill && filters.skill !== 'ALL') {
        result = result.filter(
          (t) =>
            t.requestedSkills?.includes(filters.skill!) ||
            t.capabilityRequirements?.includes(filters.skill!)
        )
      }

      return result
    }

    try {
      const dtos = await apiClient.get<TaskDto[]>('/api/v1/tasks', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
      return dtos.map(mapTaskDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getTaskById: async (id: string): Promise<TaskProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = tasksState.find((t) => t.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<TaskDto>(`/api/v1/tasks/${id}`)
      return dto ? mapTaskDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  createTask: async (input: CreateTaskInput): Promise<TaskProjection> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 90))
      const newId = `tsk-${String(tasksState.length + 1).padStart(2, '0')}`
      const initialStage = input.state || 'DRAFT'
      const newTask: TaskProjection = {
        id: newId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        state: initialStage,
        assignedAgentId: input.assignedAgentId,
        requestedSkills: input.requestedSkills,
        capabilityRequirements: input.capabilityRequirements,
        dueAt: input.dueAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
          {
            id: `evt-${Date.now()}`,
            type: 'CREATED',
            timestamp: new Date().toISOString(),
            actor: 'Operator (Current)',
            detail: `Created new task as ${initialStage}`,
          },
        ],
      }
      tasksState = [newTask, ...tasksState]
      return { ...newTask }
    }
    try {
      const dto = await apiClient.post<TaskDto>('/api/v1/tasks', mapCreateTaskInputToDto(input), {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      return mapTaskDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  updateTask: async (id: string, input: UpdateTaskInput): Promise<TaskProjection> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 80))
      const index = tasksState.findIndex((t) => t.id === id)
      if (index === -1) throw new ApiError(404, `Task ${id} not found`, null)
      const current = tasksState[index]
      const updated: TaskProjection = {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      }
      tasksState[index] = updated
      return { ...updated }
    }
    try {
      const dto = await apiClient.patch<TaskDto>(`/api/v1/tasks/${id}`, mapUpdateTaskInputToDto(input))
      return mapTaskDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  dispatchTask: async (id: string): Promise<TaskProjection> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 110))
      const index = tasksState.findIndex((t) => t.id === id)
      if (index === -1) throw new ApiError(404, `Task ${id} not found`, null)
      const current = tasksState[index]
      if (['DISPATCHING', 'RUNNING', 'COMPLETED'].includes(current.state)) {
        throw new ApiError(400, `Task ${id} is already ${current.state.toLowerCase()}`, null)
      }

      const now = new Date().toISOString()
      const updated: TaskProjection = {
        ...current,
        state: 'DISPATCHING',
        updatedAt: now,
        timeline: [
          ...(current.timeline || []),
          {
            id: `evt-${Date.now()}-1`,
            type: 'DISPATCH_REQUESTED',
            timestamp: now,
            actor: 'Operator (Current)',
            detail: 'Explicit dispatch review confirmed by operator',
          },
          {
            id: `evt-${Date.now()}-2`,
            type: 'QUEUED',
            timestamp: now,
            actor: 'Runtime Dispatcher',
            detail: 'Task queued for autonomous worker execution',
          },
        ],
      }
      tasksState[index] = updated
      return { ...updated }
    }
    try {
      const dto = await apiClient.post<TaskDto>(`/api/v1/tasks/${id}/dispatch`, {}, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      return mapTaskDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Approvals
  getApprovals: async (filters?: ApprovalQuery): Promise<ApprovalProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      let result = [...approvalsState]

      if (filters?.search) {
        const q = filters.search.toLowerCase()
        result = result.filter(
          (a) =>
            a.id.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            (a.description && a.description.toLowerCase().includes(q)) ||
            (a.target?.label && a.target.label.toLowerCase().includes(q)) ||
            (a.agentId && a.agentId.toLowerCase().includes(q)) ||
            (a.taskId && a.taskId.toLowerCase().includes(q))
        )
      }

      if (filters?.risk && filters.risk !== 'ALL') {
        result = result.filter((a) => a.risk === filters.risk)
      }

      if (filters?.actionType && filters.actionType !== 'ALL') {
        result = result.filter((a) => a.actionType === filters.actionType)
      }

      if (filters?.state && filters.state !== 'ALL') {
        result = result.filter((a) => a.state === filters.state)
      }

      return result
    }
    try {
      const dtos = await apiClient.get<ApprovalDto[]>('/api/v1/approvals', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
      return dtos.map(mapApprovalDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getApprovalById: async (id: string): Promise<ApprovalProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = approvalsState.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<ApprovalDto>(`/api/v1/approvals/${id}`)
      return dto ? mapApprovalDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  approveAction: async (id: string, input?: ApprovalDecisionInput): Promise<ApprovalProjection> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 120))
      // Predictable failure test for Section 72
      if (id === 'appr-08') {
        throw new ApiError(500, 'Decision was not confirmed. No approval state was changed.', null)
      }

      const index = approvalsState.findIndex((a) => a.id === id)
      if (index === -1) throw new ApiError(404, `Approval ${id} not found`, null)
      const current = approvalsState[index]

      const now = new Date().toISOString()
      const updated: ApprovalProjection = {
        ...current,
        state: 'APPROVED',
        decision: {
          decidedAt: now,
          decisionMaker: 'Operator (Current)',
          reason: input?.reason || 'Approved by human operator',
        },
        audit: [
          ...(current.audit || []),
          {
            stage: 'Approved',
            timestamp: now,
            actor: 'Operator (Current)',
            note: input?.reason || 'Action authorized by human operator',
          },
        ],
      }
      approvalsState[index] = updated

      // Cross-update related task if waiting approval
      if (current.taskId) {
        const tIndex = tasksState.findIndex((t) => t.id === current.taskId)
        if (tIndex !== -1 && tasksState[tIndex].state === 'AWAITING_APPROVAL') {
          tasksState[tIndex] = {
            ...tasksState[tIndex],
            state: 'RUNNING',
            updatedAt: now,
            timeline: [
              ...(tasksState[tIndex].timeline || []),
              {
                id: `evt-${Date.now()}-appr-res`,
                type: 'APPROVAL_RESOLVED',
                timestamp: now,
                actor: 'Operator (Current)',
                detail: `Approval ${id} approved. Autonomous execution resumed.`,
              },
            ],
          }
        }
      }

      return { ...updated }
    }
    try {
      const dto = await apiClient.post<ApprovalDto>(
        `/api/v1/approvals/${id}/approve`,
        input ? mapApprovalDecisionInputToDto(input) : {},
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return mapApprovalDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  rejectAction: async (id: string, input: ApprovalDecisionInput): Promise<ApprovalProjection> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 120))
      // Predictable failure test for Section 72
      if (id === 'appr-08') {
        throw new ApiError(500, 'Decision was not confirmed. No approval state was changed.', null)
      }

      const index = approvalsState.findIndex((a) => a.id === id)
      if (index === -1) throw new ApiError(404, `Approval ${id} not found`, null)
      const current = approvalsState[index]

      const now = new Date().toISOString()
      const updated: ApprovalProjection = {
        ...current,
        state: 'REJECTED',
        decision: {
          decidedAt: now,
          decisionMaker: 'Operator (Current)',
          reason: input.reason || 'Rejected by human operator',
        },
        audit: [
          ...(current.audit || []),
          {
            stage: 'Rejected',
            timestamp: now,
            actor: 'Operator (Current)',
            note: input.reason || 'Action denied by human operator',
          },
        ],
      }
      approvalsState[index] = updated

      // Cross-update related task if waiting approval
      if (current.taskId) {
        const tIndex = tasksState.findIndex((t) => t.id === current.taskId)
        if (tIndex !== -1 && tasksState[tIndex].state === 'AWAITING_APPROVAL') {
          tasksState[tIndex] = {
            ...tasksState[tIndex],
            state: 'BLOCKED',
            updatedAt: now,
            failure: {
              code: 'APPROVAL_REJECTED',
              message: `Action rejected by operator: ${input.reason || 'Denied'}`,
              stage: 'Approval Gate',
            },
            timeline: [
              ...(tasksState[tIndex].timeline || []),
              {
                id: `evt-${Date.now()}-appr-rej`,
                type: 'APPROVAL_RESOLVED',
                timestamp: now,
                actor: 'Operator (Current)',
                detail: `Approval ${id} rejected: ${input.reason || 'No reason provided'}`,
              },
            ],
          }
        }
      }

      return { ...updated }
    }
    try {
      const dto = await apiClient.post<ApprovalDto>(
        `/api/v1/approvals/${id}/reject`,
        mapApprovalDecisionInputToDto(input),
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return mapApprovalDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Activity Stream
  getActivity: async (filters?: ActivityQuery): Promise<ActivityProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      let result = [...MOCK_ACTIVITY_STREAM]
      const REF_TIME = new Date('2026-09-09T05:30:00Z').getTime()

      if (filters?.search) {
        const q = filters.search.toLowerCase()
        result = result.filter(
          (a) =>
            a.id.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            (a.description && a.description.toLowerCase().includes(q)) ||
            (a.entity?.label && a.entity.label.toLowerCase().includes(q)) ||
            (a.entity?.id && a.entity.id.toLowerCase().includes(q)) ||
            (a.actor?.label && a.actor.label.toLowerCase().includes(q)) ||
            (a.actor?.id && a.actor.id.toLowerCase().includes(q)) ||
            (a.correlationId && a.correlationId.toLowerCase().includes(q))
        )
      }

      if (filters?.category && filters.category !== 'ALL') {
        result = result.filter((a) => a.category === filters.category)
      }

      if (filters?.severity && filters.severity !== 'ALL') {
        result = result.filter((a) => a.severity === filters.severity)
      }

      if (filters?.correlationId) {
        result = result.filter((a) => a.correlationId === filters.correlationId)
      }

      if (filters?.timeRange && filters.timeRange !== 'ALL') {
        const maxAgeMs =
          filters.timeRange === '1h'
            ? 60 * 60 * 1000
            : filters.timeRange === '24h'
              ? 24 * 60 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000

        result = result.filter((a) => {
          const itemTime = new Date(a.timestamp).getTime()
          return REF_TIME - itemTime <= maxAgeMs
        })
      }

      return result
    }
    try {
      const dtos = await apiClient.get<ActivityDto[]>('/api/v1/activity', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
      return dtos.map(mapActivityDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getActivityEvent: async (id: string): Promise<ActivityProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_ACTIVITY_STREAM.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<ActivityDto>(`/api/v1/activity/${id}`)
      return dto ? mapActivityDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Audit Records
  getAuditRecords: async (filters?: AuditQuery): Promise<AuditRecord[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      let result = [...MOCK_AUDIT_RECORDS]
      const REF_TIME = new Date('2026-09-09T05:30:00Z').getTime()

      if (filters?.search) {
        const q = filters.search.toLowerCase()
        result = result.filter(
          (a) =>
            a.id.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            (a.target?.label && a.target.label.toLowerCase().includes(q)) ||
            (a.target?.id && a.target.id.toLowerCase().includes(q)) ||
            (a.actor.label && a.actor.label.toLowerCase().includes(q)) ||
            (a.actor.id && a.actor.id.toLowerCase().includes(q)) ||
            (a.reason && a.reason.toLowerCase().includes(q)) ||
            (a.correlationId && a.correlationId.toLowerCase().includes(q))
        )
      }

      if (filters?.actorType && filters.actorType !== 'ALL') {
        result = result.filter((a) => a.actor.type === filters.actorType)
      }

      if (filters?.outcome && filters.outcome !== 'ALL') {
        result = result.filter((a) => a.outcome === filters.outcome)
      }

      if (filters?.correlationId) {
        result = result.filter((a) => a.correlationId === filters.correlationId)
      }

      if (filters?.timeRange && filters.timeRange !== 'ALL') {
        const maxAgeMs =
          filters.timeRange === '1h'
            ? 60 * 60 * 1000
            : filters.timeRange === '24h'
              ? 24 * 60 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000

        result = result.filter((a) => {
          const itemTime = new Date(a.timestamp).getTime()
          return REF_TIME - itemTime <= maxAgeMs
        })
      }

      return result
    }
    try {
      const dtos = await apiClient.get<AuditRecordDto[]>('/api/v1/audit', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
      return dtos.map(mapAuditRecordDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getAuditRecord: async (id: string): Promise<AuditRecord | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_AUDIT_RECORDS.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      const dto = await apiClient.get<AuditRecordDto>(`/api/v1/audit/${id}`)
      return dto ? mapAuditRecordDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },

  // Governance Snapshot
  getGovernanceSnapshot: async (): Promise<GovernanceSnapshot> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { ...MOCK_GOVERNANCE_SNAPSHOT }
    }
    try {
      const dto = await apiClient.get<GovernanceSnapshotDto>('/api/v1/governance')
      return mapGovernanceSnapshotDtoToDomain(dto)
    } catch (err) {
      handleApiError(err)
    }
  },

  // Artifacts
  getArtifacts: async (taskId?: string, sessionId?: string): Promise<ArtifactProjection[]> => {
    if (isMockMode()) {
      return []
    }
    try {
      const dtos = await apiClient.get<ArtifactDto[]>('/api/v1/artifacts', {
        params: { task_id: taskId, session_id: sessionId },
      })
      return dtos.map(mapArtifactDtoToDomain)
    } catch (err) {
      handleApiError(err)
    }
  },

  getArtifactById: async (id: string): Promise<ArtifactProjection | null> => {
    if (isMockMode()) {
      return null
    }
    try {
      const dto = await apiClient.get<ArtifactDto>(`/api/v1/artifacts/${id}`)
      return dto ? mapArtifactDtoToDomain(dto) : null
    } catch (err) {
      handleApiError(err)
    }
  },
}


