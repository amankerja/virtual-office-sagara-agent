/**
 * Profile projection schema.
 * Represents dynamic Sagara agent profiles (no hardcoded profile names).
 */
export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  category?: string;
  assignedAgentsCount?: number;
  tags?: string[];
  isSystem?: boolean;
}
