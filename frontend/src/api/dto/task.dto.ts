/**
 * Sagara Task API DTO (snake_case)
 * Conforms to Prompt 07 Section 10, 22, 27, 30, 32.
 */

export interface TaskProgressDto {
  completed?: number | null;
  total?: number | null;
  label?: string | null;
}

export interface TaskFailureDto {
  code?: string | null;
  message?: string | null;
  stage?: string | null;
}

export interface TaskArtifactDto {
  id: string;
  name: string;
  media_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
}

export interface TaskResultDto {
  summary?: string | null;
  artifact_count?: number | null;
  completed_at?: string | null;
  artifacts?: TaskArtifactDto[] | null;
}

export interface TaskActivityEventDto {
  id: string;
  type: string;
  timestamp: string;
  actor?: string | null;
  detail?: string | null;
}

export interface TaskDto {
  id: string;
  title: string;
  description?: string | null;
  state: string;
  priority: string;
  created_at: string;
  updated_at?: string | null;
  due_at?: string | null;
  assigned_agent_id?: string | null;
  requested_skills?: string[] | null;
  capability_requirements?: string[] | null;
  session_id?: string | null;
  delegation_ids?: string[] | null;
  approval_ids?: string[] | null;
  progress?: TaskProgressDto | null;
  failure?: TaskFailureDto | null;
  result?: TaskResultDto | null;
  timeline?: TaskActivityEventDto[] | null;
  revision?: number | null;
  version?: number | null;
  task_class?: string | null;
  execution_policy?: string | null;
  execution_mode?: string | null;
  receipt_id?: string | null;
  correlation?: string | null;
}

export interface CreateTaskDto {
  title: string;
  description?: string | null;
  priority: string;
  state?: string | null;
  assigned_agent_id?: string | null;
  requested_skills?: string[] | null;
  capability_requirements?: string[] | null;
  due_at?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  priority?: string;
  state?: string;
  assigned_agent_id?: string | null;
  requested_skills?: string[] | null;
  capability_requirements?: string[] | null;
  due_at?: string | null;
}
