import type { ArtifactDto } from '../dto/artifact.dto';
import type { ArtifactProjection, ArtifactStatus } from '@/types/artifact';
import { mapUnknownEnum, preserveNumber } from './common.mapper';

const ALLOWED_STATUSES: readonly ArtifactStatus[] = [
  'AVAILABLE',
  'PROCESSING',
  'MISSING',
  'EXPIRED',
  'UNKNOWN',
];

export function mapArtifactDtoToDomain(dto: ArtifactDto): ArtifactProjection {
  return {
    id: dto.id,
    taskId: dto.task_id ?? undefined,
    sessionId: dto.session_id ?? undefined,
    name: dto.name,
    mediaType: dto.media_type ?? undefined,
    sizeBytes: preserveNumber(dto.size_bytes),
    createdAt: dto.created_at,
    status: dto.status ? mapUnknownEnum(dto.status, ALLOWED_STATUSES, 'UNKNOWN') : undefined,
  };
}
