/**
 * Sagara Activity API DTO (snake_case)
 * Conforms to Prompt 07 Section 30, 32.
 */

export interface ActivityActorDto {
  type?: string | null;
  id?: string | null;
  label?: string | null;
}

export interface ActivityEntityDto {
  type?: string | null;
  id?: string | null;
  label?: string | null;
}

export interface ActivityRelatedEntitiesDto {
  task_id?: string | null;
  agent_id?: string | null;
  session_id?: string | null;
  delegation_id?: string | null;
  approval_id?: string | null;
  skill_id?: string | null;
}

export interface ActivityDto {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  title: string;
  description?: string | null;
  actor?: ActivityActorDto | null;
  entity?: ActivityEntityDto | null;
  correlation_id?: string | null;
  related?: ActivityRelatedEntitiesDto | null;
}
