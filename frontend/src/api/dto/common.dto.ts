/**
 * Common API DTO contracts (snake_case)
 * Conforms to Prompt 07 Section 18, 19, 30, 32.
 */

export interface PageInfoDto {
  next_cursor?: string | null;
  has_more: boolean;
  total_count?: number | null;
}

export interface PageResultDto<T> {
  items: T[];
  page_info: PageInfoDto;
}

export interface ApiErrorDetailDto {
  code: string;
  message: string;
  details?: unknown;
  correlation_id?: string | null;
}

export interface ApiErrorDto {
  error: ApiErrorDetailDto;
}

export interface CapabilitiesDto {
  task_dispatch: boolean;
  approvals: boolean;
  realtime: boolean;
  artifact_downloads: boolean;
  profile_management: boolean;
  skill_management: boolean;
}
