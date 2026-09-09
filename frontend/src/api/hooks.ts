import { useQuery } from '@tanstack/react-query'
import { dataProvider, isMockMode } from './provider'
import { queryKeys } from './query-keys'

export function useMissionControlSnapshot() {
  return useQuery({
    queryKey: queryKeys.pulse,
    queryFn: () => dataProvider.getSnapshot(),
    staleTime: 1000 * 30,
  })
}

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => dataProvider.getAgents(),
    staleTime: 1000 * 30,
  })
}

export function useAgent(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.agents.detail(id) : ['agents', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getAgentById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

export { isMockMode }
