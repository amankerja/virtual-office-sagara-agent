import type {
  MissionControlSnapshotDto,
  AttentionItemDto,
  SystemPulseDto,
} from '../dto/mission-control.dto';
import type {
  MissionControlSnapshot,
  AttentionItem,
  SystemPulseData,
  AttentionType,
  AttentionSeverity,
} from '@/types/mission-control';
import { mapUnknownEnum } from './common.mapper';

const ALLOWED_ATTENTION_TYPES: readonly AttentionType[] = [
  'APPROVAL',
  'ERROR',
  'DEPENDENCY',
  'CONFIGURATION',
  'CAPABILITY',
  'OFFLINE',
  'BUDGET',
];

const ALLOWED_SEVERITIES: readonly AttentionSeverity[] = ['critical', 'high', 'medium', 'low'];

export function mapAttentionItemDtoToDomain(dto: AttentionItemDto): AttentionItem {
  const ts = dto.created_at || dto.timestamp || new Date().toISOString();
  return {
    id: dto.id,
    type: mapUnknownEnum(dto.type, ALLOWED_ATTENTION_TYPES, 'CONFIGURATION'),
    severity: mapUnknownEnum(dto.severity, ALLOWED_SEVERITIES, 'medium'),
    title: dto.title,
    description: dto.description,
    timestamp: ts,
    createdAt: ts,
    entityType: dto.entity_type ?? undefined,
    entityId: dto.entity_id ?? undefined,
    entityName: dto.entity_name ?? undefined,
    actionLabel: dto.action_label ?? undefined,
    metadata: dto.metadata ?? undefined,
  };
}

export function mapSystemPulseDtoToDomain(dto: SystemPulseDto): SystemPulseData {
  return {
    gateway: {
      status: mapUnknownEnum(dto.gateway.status, ['HEALTHY', 'DEGRADED', 'ERROR', 'OFFLINE', 'UNKNOWN'] as const, 'UNKNOWN'),
      detail: dto.gateway.detail,
    },
    profiles: {
      registered: dto.profiles.registered,
      enabled: dto.profiles.enabled,
      incomplete: dto.profiles.incomplete,
    },
    activeAgents: {
      active: dto.active_agents.active,
      enabledTotal: dto.active_agents.enabled_total,
    },
    sessions: {
      active: dto.sessions.active,
      totalAgents: dto.sessions.total_agents,
    },
    skills: {
      healthy: dto.skills.healthy,
      degraded: dto.skills.degraded,
      missing: dto.skills.missing,
    },
    attention: {
      count: dto.attention.count,
      criticalCount: dto.attention.critical_count,
      highCount: dto.attention.high_count,
    },
  };
}

export function mapMissionControlSnapshotDtoToDomain(dto: MissionControlSnapshotDto): MissionControlSnapshot {
  const items = (dto.attention || dto.attention_queue || []).map(mapAttentionItemDtoToDomain);
  const pulse = dto.pulse
    ? mapSystemPulseDtoToDomain(dto.pulse)
    : {
        gateway: { status: 'HEALTHY' as const, detail: 'Operational' },
        profiles: { registered: 0, enabled: 0, incomplete: 0 },
        activeAgents: { active: 0, enabledTotal: 0 },
        sessions: { active: 0, totalAgents: 0 },
        skills: { healthy: 0, degraded: 0, missing: 0 },
        attention: { count: items.length, criticalCount: 0, highCount: 0 },
      };

  return {
    isMock: Boolean(dto.is_mock),
    timestamp: dto.generated_at,
    pulse,
    attentionQueue: items,
    recentActivity: [],
  };
}
