import type { AgentProjection, AgentStatus } from '@/types/agent'
import type { DelegationProjection, DelegationState, GatewayState, RuntimeOverview } from '@/types/runtime'
import type { ApprovalProjection, ApprovalRisk } from '@/types/approval'
import type { TaskProjection, TaskArtifact } from '@/types/task'

export type OfficeZoneType =
  | 'COMMAND'
  | 'SPECIALIST'
  | 'DEV_ZONE'
  | 'CAREER_ZONE'
  | 'MARKETING_ZONE'
  | 'COLLABORATION'
  | 'APPROVAL'
  | 'RUNTIME'
  | 'VAULT'

export interface OfficeDeskProjection {
  agentId: string
  agent: AgentProjection
  zone: OfficeZoneType
  position: {
    x: number
    y: number
  }
  orientation?: 'N' | 'S' | 'E' | 'W'
  visual?: {
    avatarVariant?: string
    deskVariant?: string
  }
  currentTask?: TaskProjection
  activeDelegations: DelegationProjection[]
}

export interface OfficeWorkerProjection {
  id: string
  delegationId: string
  parentAgentId: string
  position: {
    x: number
    y: number
  }
  state: DelegationState
  taskTitle: string
  workerPid?: number | string
  startedAt: string
}

export interface OfficeZoneProjection {
  id: string
  name: string
  subtitle?: string
  type: OfficeZoneType
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  description: string
  agentCount: number
}

export interface OfficeApprovalProjection {
  pendingCount: number
  highestRisk?: ApprovalRisk
  oldestPending?: ApprovalProjection
  items: ApprovalProjection[]
  byRisk: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface HardwareMetrics {
  cpuPercent?: number
  memoryUsedMb?: number
  memoryTotalMb?: number
  memoryPercent?: number
}

export interface OfficeRuntimeProjection {
  gatewayState: GatewayState
  activeSessions: number
  activeDelegations: number
  health: RuntimeOverview['health']
  host: string
  backendId: string
  statusMessage?: string
  heartbeatAgeSeconds?: number
  hardwareMetrics?: HardwareMetrics
}

export interface OfficeVaultItem {
  taskId: string
  taskTitle: string
  completedAt?: string
  assignedAgentId?: string
  artifacts: TaskArtifact[]
}

export interface OfficeVaultProjection {
  totalArtifacts: number
  completedTasksWithArtifacts: OfficeVaultItem[]
}

export interface OfficeCollaborationItem {
  id: string
  taskTitle: string
  taskId: string
  agentIds: string[]
  delegations: DelegationProjection[]
  state: string
}

export interface OfficeSceneProjection {
  /** Existing domain records, retained only to observe terminal worker transitions. */
  delegationRecords: DelegationProjection[]
  zones: OfficeZoneProjection[]
  desks: OfficeDeskProjection[]
  workers: OfficeWorkerProjection[]
  approvalSummary: OfficeApprovalProjection
  runtimeSummary: OfficeRuntimeProjection
  vaultSummary: OfficeVaultProjection
  collaborationItems: OfficeCollaborationItem[]
}

export interface OfficeZoneConfig {
  id: string
  name: string
  subtitle?: string
  type: OfficeZoneType
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  description: string
}

export interface OfficePresentationConfig {
  version: number
  zones: OfficeZoneConfig[]
  assignments?: {
    agentId: string
    preferredZone?: OfficeZoneType
  }[]
}

export interface OfficeFilterState {
  stateFilter: 'ALL' | AgentStatus | 'NEEDS_ATTENTION'
  zoneFilter: 'ALL' | OfficeZoneType
  searchQuery: string
}
