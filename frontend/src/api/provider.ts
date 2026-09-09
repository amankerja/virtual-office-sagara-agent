import type { MissionControlSnapshot } from '@/types/mission-control'
import type { AgentProjection } from '@/types/agent'
import { MOCK_MISSION_CONTROL_SNAPSHOT } from '@/mocks/mission-control'
import { MOCK_AGENTS } from '@/mocks/agents'
import { apiClient, ApiError } from './client'

const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'mock'

export const isMockMode = (): boolean => {
  return DATA_MODE === 'mock'
}

export const dataProvider = {
  getSnapshot: async (): Promise<MissionControlSnapshot> => {
    if (isMockMode()) {
      // Small simulated latency for realistic UI state
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
}
