import type { TaskDto, CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import type { TaskProjection, TaskState, TaskPriority, CreateTaskInput, UpdateTaskInput } from '@/types/task';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_TASK_STATES: readonly TaskState[] = [
  'DRAFT',
  'READY',
  'QUEUED',
  'DISPATCHING',
  'RUNNING',
  'AWAITING_APPROVAL',
  'BLOCKED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

const ALLOWED_TASK_PRIORITIES: readonly TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function mapTaskDtoToDomain(dto: TaskDto): TaskProjection {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? undefined,

    state: mapUnknownEnum(dto.state, ALLOWED_TASK_STATES, 'QUEUED'),
    priority: mapUnknownEnum(dto.priority, ALLOWED_TASK_PRIORITIES, 'MEDIUM'),

    createdAt: dto.created_at,
    updatedAt: dto.updated_at ?? undefined,
    dueAt: dto.due_at ?? undefined,

    assignedAgentId: dto.assigned_agent_id ?? undefined,
    requestedSkills: dto.requested_skills ?? undefined,
    capabilityRequirements: dto.capability_requirements ?? undefined,

    sessionId: dto.session_id ?? undefined,
    delegationIds: dto.delegation_ids ?? undefined,
    approvalIds: dto.approval_ids ?? undefined,

    progress: dto.progress
      ? {
          completed: preserveNumber(dto.progress.completed),
          total: preserveNumber(dto.progress.total),
          label: dto.progress.label ?? undefined,
        }
      : undefined,

    failure: dto.failure
      ? {
          code: dto.failure.code ?? undefined,
          message: dto.failure.message ?? undefined,
          stage: dto.failure.stage ?? undefined,
        }
      : undefined,

    result: dto.result
      ? {
          summary: dto.result.summary ?? undefined,
          artifactCount: preserveNumber(dto.result.artifact_count),
          completedAt: dto.result.completed_at ?? undefined,
          artifacts: dto.result.artifacts
            ? dto.result.artifacts.map((a) => ({
                id: a.id,
                name: a.name,
                type: a.media_type || 'file',
                size: a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : undefined,
              }))
            : undefined,
        }
      : undefined,

    timeline: dto.timeline
      ? dto.timeline.map((t) => ({
          id: t.id,
          type: (t.type as any) || 'STARTED',
          timestamp: t.timestamp,
          actor: t.actor ?? undefined,
          detail: t.detail ?? undefined,
        }))
      : undefined,

    revision: preserveNumber(dto.revision ?? dto.version),
    version: preserveNumber(dto.version ?? dto.revision),

    taskClass: dto.task_class ?? undefined,
    executionPolicy: dto.execution_policy ?? undefined,
    executionMode: dto.execution_mode ?? undefined,
    receiptId: dto.receipt_id ?? undefined,
    correlation: dto.correlation ?? undefined,
  };
}

export function mapTaskDomainToCreateDto(input: CreateTaskInput): CreateTaskDto {
  return {
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    state: input.state ?? 'DRAFT',
    assigned_agent_id: input.assignedAgentId ?? null,
    requested_skills: input.requestedSkills ?? null,
    capability_requirements: input.capabilityRequirements ?? null,
    due_at: input.dueAt ?? null,
  };
}
export const mapCreateTaskInputToDto = mapTaskDomainToCreateDto;

export function mapTaskDomainToUpdateDto(input: UpdateTaskInput): UpdateTaskDto {
  return {
    title: input.title,
    description: input.description,
    priority: input.priority,
    state: input.state,
    assigned_agent_id: input.assignedAgentId,
    requested_skills: input.requestedSkills,
    capability_requirements: input.capabilityRequirements,
    due_at: input.dueAt,
  };
}
export const mapUpdateTaskInputToDto = mapTaskDomainToUpdateDto;
