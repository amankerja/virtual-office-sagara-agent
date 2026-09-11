/**
 * Canonical Sagara Profile Definition Contract
 * Conforms to Prompt 07 Section 8.
 */
export interface ProfileDefinition {
  id?: string;
  name: string;

  role?: string;
  description?: string;

  enabled: boolean;

  memoryNamespace?: string;
  allowedSkills?: string[];
  configurationState?: 'COMPLETE' | 'INCOMPLETE' | 'DISABLED';

  // Optional presentation metadata (kept optional for backward compatibility)
  category?: string;
  assignedAgentsCount?: number;
  tags?: string[];
  isSystem?: boolean;
}

// Backward-compatibility alias
export type AgentProfile = ProfileDefinition;
