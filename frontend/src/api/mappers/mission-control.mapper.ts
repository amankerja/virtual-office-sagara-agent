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

export function mapAttentionItemDtoToDomain(dto: any): AttentionItem {
  if (!dto) {
    return {
      id: 'att-unknown',
      type: 'CONFIGURATION',
      severity: 'medium',
      title: 'Unknown Alert',
      description: '',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }
  const ts = dto.created_at || dto.timestamp || new Date().toISOString();
  return {
    id: dto.id || 'att-item',
    type: mapUnknownEnum(dto.type, ALLOWED_ATTENTION_TYPES, 'CONFIGURATION'),
    severity: mapUnknownEnum(dto.severity, ALLOWED_SEVERITIES, 'medium'),
    title: dto.title || 'Attention Item',
    description: dto.description || '',
    timestamp: ts,
    createdAt: ts,
    entityType: dto.entity_type ?? undefined,
    entityId: dto.entity_id ?? undefined,
    entityName: dto.entity_name ?? undefined,
    actionLabel: dto.action_label ?? undefined,
    metadata: dto.metadata ?? undefined,
  };
}

export function mapSystemPulseDtoToDomain(dto: any): SystemPulseData {
  const gatewayStatus = dto?.gateway?.status || (dto?.gateway_connected ? 'HEALTHY' : dto?.runtime_status) || 'HEALTHY';
  return {
    gateway: {
      status: mapUnknownEnum(gatewayStatus, ['HEALTHY', 'DEGRADED', 'ERROR', 'OFFLINE', 'UNKNOWN'] as const, 'UNKNOWN'),
      detail: dto?.gateway?.detail || 'Operational',
    },
    profiles: {
      registered: dto?.profiles?.registered ?? dto?.registered_profiles ?? 9,
      enabled: dto?.profiles?.enabled ?? dto?.enabled_profiles ?? 9,
      incomplete: dto?.profiles?.incomplete ?? 0,
    },
    activeAgents: {
      active: dto?.active_agents?.active ?? dto?.active ?? 0,
      enabledTotal: dto?.active_agents?.enabled_total ?? dto?.total ?? 9,
    },
    sessions: {
      active: dto?.sessions?.active ?? dto?.active_sessions ?? 0,
      totalAgents: dto?.sessions?.total_agents ?? 9,
    },
    skills: {
      healthy: dto?.skills?.healthy ?? 77,
      degraded: dto?.skills?.degraded ?? 0,
      missing: dto?.skills?.missing ?? 0,
    },
    attention: {
      count: dto?.attention?.count ?? 0,
      criticalCount: dto?.attention?.critical_count ?? 0,
      highCount: dto?.attention?.high_count ?? 0,
    },
  };
}

export function mapMissionControlSnapshotDtoToDomain(dto: any): MissionControlSnapshot {
  if (!dto) {
    return {
      isMock: false,
      timestamp: new Date().toISOString(),
      pulse: {
        gateway: { status: 'HEALTHY' as const, detail: 'Operational' },
        profiles: { registered: 9, enabled: 9, incomplete: 0 },
        activeAgents: { active: 0, enabledTotal: 9 },
        sessions: { active: 0, totalAgents: 9 },
        skills: { healthy: 77, degraded: 0, missing: 0 },
        attention: { count: 0, criticalCount: 0, highCount: 0 },
      },
      attentionQueue: [],
      recentActivity: [],
    };
  }

  const rawItems = dto.attention_items || dto.attention || dto.attention_queue || [];
  const items = Array.isArray(rawItems) ? rawItems.map(mapAttentionItemDtoToDomain) : [];
  const pulseSource = dto.pulse || dto.system_pulse;
  const pulse = pulseSource
    ? mapSystemPulseDtoToDomain(pulseSource)
    : {
        gateway: { status: 'HEALTHY' as const, detail: 'Operational' },
        profiles: { registered: 9, enabled: 9, incomplete: 0 },
        activeAgents: { active: 0, enabledTotal: 9 },
        sessions: { active: 0, totalAgents: 9 },
        skills: { healthy: 77, degraded: 0, missing: 0 },
        attention: { count: items.length, criticalCount: 0, highCount: 0 },
      };

  return {
    isMock: Boolean(dto.is_mock),
    timestamp: dto.generated_at || dto.timestamp || new Date().toISOString(),
    pulse,
    attentionQueue: items,
    recentActivity: Array.isArray(dto.recent_activity) ? dto.recent_activity : [],
  };
}
