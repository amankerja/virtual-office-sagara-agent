/**
 * Canonical Sagara Mission Control Common API Types
 * Conforms to Prompt 07 Section 5, 18, 19, 42.
 */

export type GenericHealth =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'ERROR'
  | 'OFFLINE'
  | 'UNKNOWN'
  | 'NOT_CONNECTED';

export interface PageInfo {
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface PageResult<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
}

export interface MissionControlCapabilities {
  taskDispatch: boolean;
  approvals: boolean;
  realtime: boolean;
  artifactDownloads: boolean;
  profileManagement: boolean;
  skillManagement: boolean;
}

/**
 * Reusable lightweight entity reference (Prompt 07 Section 30).
 */
export interface EntityReference {
  type?: string;
  id?: string;
  label?: string;
}

/**
 * Reusable normalized cross-entity relation references (Prompt 07 Section 31).
 */
export interface RelatedEntities {
  taskId?: string;
  agentId?: string;
  profileId?: string;
  sessionId?: string;
  delegationId?: string;
  approvalId?: string;
  skillId?: string;
  artifactId?: string;
}

/**
 * Structured redaction representation (Prompt 07 Section 29).
 * The frontend must never guess secrets or offer "reveal" for server-redacted data.
 */
export interface RedactedValue<T = unknown> {
  value?: T;
  redacted: boolean;
}
