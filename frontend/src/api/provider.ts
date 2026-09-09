import type { MissionControlSnapshot } from '@/types/mission-control'
import type { AgentProjection } from '@/types/agent'
import type { SkillProjection } from '@/types/skill'
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

import { MOCK_MISSION_CONTROL_SNAPSHOT } from '@/mocks/mission-control'
import { MOCK_AGENTS } from '@/mocks/agents'
import { MOCK_SKILLS } from '@/mocks/skills'
import { MOCK_SESSIONS } from '@/mocks/sessions'
import { MOCK_DELEGATIONS } from '@/mocks/delegations'
import { MOCK_GATEWAY, MOCK_RUNTIME_OVERVIEW, MOCK_RUNTIME_USAGE } from '@/mocks/runtime'
import { MOCK_RUNTIME_EVENTS } from '@/mocks/runtime-events'
import { MOCK_TASKS } from '@/mocks/tasks'
import { MOCK_APPROVALS } from '@/mocks/approvals'
import { apiClient, ApiError } from './client'

const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'mock'

export const isMockMode = (): boolean => {
  return DATA_MODE === 'mock'
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
      return await apiClient.get<MissionControlSnapshot>('/api/snapshot')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Agents
  getAgents: async (): Promise<AgentProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_AGENTS]
    }
    try {
      return await apiClient.get<AgentProjection[]>('/api/agents')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getAgentById: async (id: string): Promise<AgentProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_AGENTS.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<AgentProjection>(`/api/agents/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Skills
  getSkills: async (): Promise<SkillProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_SKILLS]
    }
    try {
      return await apiClient.get<SkillProjection[]>('/api/skills')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getSkillById: async (id: string): Promise<SkillProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_SKILLS.find((s) => s.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<SkillProjection>(`/api/skills/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Runtime Overview
  getRuntimeOverview: async (): Promise<RuntimeOverview> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 70))
      return { ...MOCK_RUNTIME_OVERVIEW }
    }
    try {
      return await apiClient.get<RuntimeOverview>('/api/runtime/overview')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Gateway
  getGatewayTelemetry: async (): Promise<GatewayTelemetry> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { ...MOCK_GATEWAY }
    }
    try {
      return await apiClient.get<GatewayTelemetry>('/api/runtime/gateway')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Sessions
  getSessions: async (): Promise<SessionProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_SESSIONS]
    }
    try {
      return await apiClient.get<SessionProjection[]>('/api/runtime/sessions')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getSessionById: async (id: string): Promise<SessionProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_SESSIONS.find((s) => s.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<SessionProjection>(`/api/runtime/sessions/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Delegations
  getDelegations: async (): Promise<DelegationProjection[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return [...MOCK_DELEGATIONS]
    }
    try {
      return await apiClient.get<DelegationProjection[]>('/api/runtime/delegations')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getDelegationById: async (id: string): Promise<DelegationProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = MOCK_DELEGATIONS.find((d) => d.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<DelegationProjection>(`/api/runtime/delegations/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Usage
  getRuntimeUsage: async (): Promise<RuntimeUsageOverview> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return { ...MOCK_RUNTIME_USAGE }
    }
    try {
      return await apiClient.get<RuntimeUsageOverview>('/api/runtime/usage')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  // Events
  getRuntimeEvents: async (): Promise<RuntimeEvent[]> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return [...MOCK_RUNTIME_EVENTS]
    }
    try {
      return await apiClient.get<RuntimeEvent[]>('/api/runtime/events')
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.get<TaskProjection[]>('/api/tasks', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getTaskById: async (id: string): Promise<TaskProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = tasksState.find((t) => t.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<TaskProjection>(`/api/tasks/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.post<TaskProjection>('/api/tasks', input)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.patch<TaskProjection>(`/api/tasks/${id}`, input)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.post<TaskProjection>(`/api/tasks/${id}/dispatch`, {})
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.get<ApprovalProjection[]>('/api/approvals', {
        params: filters as unknown as Record<string, string | number | boolean | undefined | null>,
      })
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },

  getApprovalById: async (id: string): Promise<ApprovalProjection | null> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      const found = approvalsState.find((a) => a.id === id)
      return found ? { ...found } : null
    }
    try {
      return await apiClient.get<ApprovalProjection>(`/api/approvals/${id}`)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.post<ApprovalProjection>(`/api/approvals/${id}/approve`, input)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
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
      return await apiClient.post<ApprovalProjection>(`/api/approvals/${id}/reject`, input)
    } catch (err) {
      throw new ApiError(503, 'Mission Control backend not connected', { original: err })
    }
  },
}

