/**
 * Sagara capability and skill schema.
 */
export type SkillStatus = 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'UNAVAILABLE';

export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  status: SkillStatus;
  category: string;
  provider?: string;
  invocationsCount?: number;
  lastUsedTimestamp?: string | null;
}
