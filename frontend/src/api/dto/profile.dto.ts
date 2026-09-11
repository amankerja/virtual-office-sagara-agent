/**
 * Sagara Profile API DTO (snake_case)
 * Conforms to Prompt 07 Section 8, 30, 32.
 */

export interface ProfileDto {
  id: string;
  name: string;
  role?: string | null;
  description?: string | null;
  enabled: boolean;
  memory_namespace?: string | null;
  allowed_skills?: string[] | null;
  category?: string | null;
  assigned_agents_count?: number | null;
  tags?: string[] | null;
  is_system?: boolean | null;
}
