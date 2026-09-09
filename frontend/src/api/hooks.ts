import { useQuery } from '@tanstack/react-query'
import { dataProvider, isMockMode } from './provider'
import { queryKeys } from './query-keys'

// Snapshot
export function useMissionControlSnapshot() {
  return useQuery({
    queryKey: queryKeys.pulse,
    queryFn: () => dataProvider.getSnapshot(),
    staleTime: 1000 * 30,
  })
}

// Agents
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => dataProvider.getAgents(),
    staleTime: 1000 * 30,
  })
}

export function useAgent(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.agents.detail(id) : ['agents', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getAgentById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

// Skills
export function useSkills() {
  return useQuery({
    queryKey: queryKeys.skills.all,
    queryFn: () => dataProvider.getSkills(),
    staleTime: 1000 * 30,
  })
}

export function useSkill(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.skills.detail(id) : ['skills', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getSkillById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

// Runtime
export function useRuntimeOverview() {
  return useQuery({
    queryKey: queryKeys.runtime.overview(),
    queryFn: () => dataProvider.getRuntimeOverview(),
    staleTime: 1000 * 30,
  })
}

export function useGatewayTelemetry() {
  return useQuery({
    queryKey: queryKeys.runtime.gateway(),
    queryFn: () => dataProvider.getGatewayTelemetry(),
    staleTime: 1000 * 15,
  })
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => dataProvider.getSessions(),
    staleTime: 1000 * 30,
  })
}

export function useSession(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.sessions.detail(id) : ['sessions', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getSessionById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

export function useDelegations() {
  return useQuery({
    queryKey: queryKeys.delegations.all,
    queryFn: () => dataProvider.getDelegations(),
    staleTime: 1000 * 30,
  })
}

export function useDelegation(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.delegations.detail(id) : ['delegations', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getDelegationById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

export function useRuntimeUsage() {
  return useQuery({
    queryKey: queryKeys.runtime.usage(),
    queryFn: () => dataProvider.getRuntimeUsage(),
    staleTime: 1000 * 30,
  })
}

export function useRuntimeEvents() {
  return useQuery({
    queryKey: queryKeys.runtime.events(),
    queryFn: () => dataProvider.getRuntimeEvents(),
    staleTime: 1000 * 15,
  })
}

export { isMockMode }
