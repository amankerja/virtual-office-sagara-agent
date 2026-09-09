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

import { MOCK_MISSION_CONTROL_SNAPSHOT } from '@/mocks/mission-control'
import { MOCK_AGENTS } from '@/mocks/agents'
import { MOCK_SKILLS } from '@/mocks/skills'
import { MOCK_SESSIONS } from '@/mocks/sessions'
import { MOCK_DELEGATIONS } from '@/mocks/delegations'
import { MOCK_GATEWAY, MOCK_RUNTIME_OVERVIEW, MOCK_RUNTIME_USAGE } from '@/mocks/runtime'
import { MOCK_RUNTIME_EVENTS } from '@/mocks/runtime-events'
import { apiClient, ApiError } from './client'

const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'mock'

export const isMockMode = (): boolean => {
  return DATA_MODE === 'mock'
}

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
}
