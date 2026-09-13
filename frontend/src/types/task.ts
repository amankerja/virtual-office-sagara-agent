export type TaskState =
  | 'DRAFT'
  | 'READY'
  | 'QUEUED'
  | 'DISPATCHING'
  | 'RUNNING'
  | 'AWAITING_APPROVAL'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type KanbanColumnId = 'TODO' | 'IN_PROGRESS' | 'NEEDS_ATTENTION' | 'DONE'

export interface TaskProgress {
  completed?: number
  total?: number
  label?: string
}

export interface TaskFailure {
  code?: string
  message?: string
  stage?: string
}

export interface TaskArtifact {
  id: string
  name: string
  type: string
  size?: string
}

export interface TaskResult {
  summary?: string
  artifactCount?: number
  completedAt?: string
  artifacts?: TaskArtifact[]
}

export interface TaskActivityEvent {
  id: string
  type:
    | 'CREATED'
    | 'MARKED_READY'
    | 'ASSIGNED'
    | 'DISPATCH_REQUESTED'
    | 'QUEUED'
    | 'STARTED'
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_RESOLVED'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
  timestamp: string
  actor?: string
  detail?: string
}

export interface TaskProjection {
  id: string
  title: string
  description?: string

  state: TaskState
  priority: TaskPriority

  createdAt: string
  updatedAt?: string
  dueAt?: string

  assignedAgentId?: string

  requestedSkills?: string[]
  capabilityRequirements?: string[]

  sessionId?: string
  delegationIds?: string[]
  approvalIds?: string[]

  progress?: TaskProgress
  failure?: TaskFailure
  result?: TaskResult

  timeline?: TaskActivityEvent[]

  revision?: number
  version?: number

  taskClass?: string
  executionPolicy?: string
  executionMode?: string
  receiptId?: string
  correlation?: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority: TaskPriority
  state?: 'DRAFT' | 'READY'
  assignedAgentId?: string
  requestedSkills?: string[]
  capabilityRequirements?: string[]
  dueAt?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: TaskPriority
  state?: TaskState
  assignedAgentId?: string
  requestedSkills?: string[]
  capabilityRequirements?: string[]
  dueAt?: string
}

export interface TaskQuery {
  search?: string
  state?: TaskState | 'ALL'
  priority?: TaskPriority | 'ALL'
  agentId?: string | 'ALL'
  attention?: 'ALL' | 'APPROVAL' | 'BLOCKED' | 'FAILED'
  skill?: string | 'ALL'
}

/**
 * Maps canonical task internal state to 4 primary Kanban columns.
 */
export function mapStateToKanbanColumn(state: TaskState): KanbanColumnId {
  switch (state) {
    case 'DRAFT':
    case 'READY':
      return 'TODO'
    case 'QUEUED':
    case 'DISPATCHING':
    case 'RUNNING':
      return 'IN_PROGRESS'
    case 'AWAITING_APPROVAL':
    case 'BLOCKED' :
    case 'FAILED':
      return 'NEEDS_ATTENTION'
    case 'COMPLETED':
    case 'CANCELLED':
      return 'DONE'
    default:
      return 'TODO'
  }
}

export interface KanbanColumnConfig {
  id: KanbanColumnId
  label: string
  description: string
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive'
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'TODO',
    label: 'To Do',
    description: 'Drafting & readiness preparation',
    badgeVariant: 'outline',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    description: 'Active queuing & autonomous dispatch',
    badgeVariant: 'secondary',
  },
  {
    id: 'NEEDS_ATTENTION',
    label: 'Needs Attention',
    description: 'Approval gates, blockers & failures',
    badgeVariant: 'destructive',
  },
  {
    id: 'DONE',
    label: 'Done',
    description: 'Completed pipelines & terminal records',
    badgeVariant: 'default',
  },
]
