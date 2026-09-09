import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataProvider, isMockMode } from './provider'
import { queryKeys } from './query-keys'
import type { TaskQuery, CreateTaskInput, UpdateTaskInput } from '@/types/task'
import type { ApprovalQuery, ApprovalDecisionInput } from '@/types/approval'
import type { ActivityQuery } from '@/types/activity'
import type { AuditQuery } from '@/types/audit'

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

// Tasks
export function useTasks(filters?: TaskQuery) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters as Record<string, unknown>),
    queryFn: () => dataProvider.getTasks(filters),
    staleTime: 1000 * 30,
  })
}

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.tasks.detail(id) : ['tasks', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getTaskById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => dataProvider.createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.pulse })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      dataProvider.updateTask(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) })
    },
  })
}

export function useDispatchTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataProvider.dispatchTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.pulse })
    },
  })
}

// Approvals
export function useApprovals(filters?: ApprovalQuery) {
  return useQuery({
    queryKey: queryKeys.approvals.list(filters as Record<string, unknown>),
    queryFn: () => dataProvider.getApprovals(filters),
    staleTime: 1000 * 30,
  })
}

export function useApproval(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.approvals.detail(id) : ['approvals', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getApprovalById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

export function useApproveAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ApprovalDecisionInput }) =>
      dataProvider.approveAction(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.pulse })
    },
  })
}

export function useRejectAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApprovalDecisionInput }) =>
      dataProvider.rejectAction(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.pulse })
    },
  })
}

// Activity
export function useActivity(filters?: ActivityQuery) {
  return useQuery({
    queryKey: queryKeys.activity.list(filters as Record<string, unknown>),
    queryFn: () => dataProvider.getActivity(filters),
    staleTime: 1000 * 30,
  })
}

export function useActivityEvent(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.activity.detail(id) : ['activity', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getActivityEvent(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

// Audit
export function useAuditRecords(filters?: AuditQuery) {
  return useQuery({
    queryKey: queryKeys.audit.list(filters as Record<string, unknown>),
    queryFn: () => dataProvider.getAuditRecords(filters),
    staleTime: 1000 * 30,
  })
}

export function useAuditRecord(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.audit.detail(id) : ['audit', 'detail', 'null'],
    queryFn: () => (id ? dataProvider.getAuditRecord(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  })
}

// Governance
export function useGovernanceSnapshot() {
  return useQuery({
    queryKey: queryKeys.governance.snapshot(),
    queryFn: () => dataProvider.getGovernanceSnapshot(),
    staleTime: 1000 * 30,
  })
}

export { isMockMode }

