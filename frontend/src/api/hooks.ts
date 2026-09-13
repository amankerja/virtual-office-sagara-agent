import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataProvider, isMockMode } from './provider'
import { queryKeys } from './query-keys'
import type { TaskQuery, CreateTaskInput, UpdateTaskInput } from '@/types/task'
import type { ApprovalQuery, ApprovalDecisionInput } from '@/types/approval'
import type { ActivityQuery } from '@/types/activity'
import type { AuditQuery } from '@/types/audit'
import {
  fetchActionSafetyStatus,
  verifyAuditLedger,
  fetchActionIntents,
  fetchActionIntent,
  createActionIntent,
  evaluatePreflight,
  approveActionIntent,
  rejectActionIntent,
  getMyPrincipal,
  getExecutionReadiness,
  getExecutionLock,
  unlockExecution,
  emergencyLockExecution,
  getExecutionPolicy,
  getToolSecurityPolicy,
  getReadOnlyResources,
} from './actionSafety'


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

// Action Safety & Integrity Gates (Prompt 13)
export function useActionSafetyStatus() {
  return useQuery({
    queryKey: queryKeys.actionSafety.status(),
    queryFn: () => fetchActionSafetyStatus(),
    staleTime: 1000 * 15,
  })
}

export function useVerifyAuditLedger() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => verifyAuditLedger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all })
    },
  })
}

export function useActionIntents(filters?: {
  status?: string;
  risk?: string;
  action_type?: string;
  target_id?: string;
}) {
  return useQuery({
    queryKey: queryKeys.actionSafety.intents(filters),
    queryFn: () => fetchActionIntents(filters),
    staleTime: 1000 * 15,
  })
}

export function useActionIntent(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.actionSafety.intent(id) : ['actionSafety', 'intent', 'null'],
    queryFn: () => (id ? fetchActionIntent(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 15,
  })
}

export function useCreateActionIntent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: {
      action_type: string;
      target_type: string;
      target_id: string;
      payload?: Record<string, unknown>;
      resource_revision?: number;
      reason?: string;
    }) => createActionIntent(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.intents() })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
    },
  })
}

export function useEvaluatePreflight() {
  return useMutation({
    mutationFn: ({ id, dryRun }: { id: string; dryRun?: boolean }) =>
      evaluatePreflight(id, dryRun),
  })
}

export function useApproveActionIntent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
      expectedRevision,
    }: {
      id: string;
      payload?: { reason?: string; confirmation_phrase?: string };
      expectedRevision?: number;
    }) => approveActionIntent(id, payload, expectedRevision),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.intents() })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.intent(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all })
    },
  })
}

export function useRejectActionIntent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reason,
      expectedRevision,
    }: {
      id: string;
      reason: string;
      expectedRevision?: number;
    }) => rejectActionIntent(id, reason, expectedRevision),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.intents() })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.intent(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all })
    },
  })
}

// V1.1 Auth & Execution Readiness Hooks (Prompt 14.4)
export function useMyPrincipal() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => getMyPrincipal(),
    staleTime: 1000 * 60,
  })
}

export function useExecutionReadiness() {
  return useQuery({
    queryKey: ['execution', 'readiness'],
    queryFn: () => getExecutionReadiness(),
    staleTime: 1000 * 5,
  })
}

export function useExecutionLock() {
  return useQuery({
    queryKey: ['execution', 'lock'],
    queryFn: () => getExecutionLock(),
    staleTime: 1000 * 5,
  })
}

export function useUnlockExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      confirmation_phrase: string;
      reason: string;
      ttl_minutes?: number;
      max_executions?: number;
    }) => unlockExecution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution', 'lock'] })
      queryClient.invalidateQueries({ queryKey: ['execution', 'readiness'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
    },
  })
}

export function useLockExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => emergencyLockExecution(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution', 'lock'] })
      queryClient.invalidateQueries({ queryKey: ['execution', 'readiness'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.actionSafety.status() })
    },
  })
}

export function useExecutionPolicy() {
  return useQuery({
    queryKey: ['execution', 'policy'],
    queryFn: () => getExecutionPolicy(),
    staleTime: 1000 * 30,
  })
}

export function useToolSecurityPolicy() {
  return useQuery({
    queryKey: ['tool', 'security-policy'],
    queryFn: () => getToolSecurityPolicy(),
    staleTime: 1000 * 30,
  })
}

export function useReadOnlyResources() {
  return useQuery({
    queryKey: ['execution', 'resources'],
    queryFn: () => getReadOnlyResources(),
    staleTime: 1000 * 30,
  })
}

export { isMockMode }


