/**
 * Minimal Canonical Artifact Contract
 * Conforms to Prompt 07 Section 40.
 */
export type ArtifactStatus =
  | 'AVAILABLE'
  | 'PROCESSING'
  | 'MISSING'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface ArtifactProjection {
  id: string;

  taskId?: string;
  sessionId?: string;

  name: string;
  mediaType?: string;
  sizeBytes?: number;

  createdAt: string;

  status?: ArtifactStatus;
}
