/**
 * Sagara Artifact API DTO (snake_case)
 * Conforms to Prompt 07 Section 40.
 */

export interface ArtifactDto {
  id: string;
  task_id?: string | null;
  session_id?: string | null;
  name: string;
  media_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
  status?: string | null;
}
