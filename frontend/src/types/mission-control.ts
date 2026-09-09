import type { ActivityEvent } from './runtime'

export type GatewayHealth = 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'OFFLINE' | 'UNKNOWN';

export type AttentionType =
  | 'APPROVAL'
  | 'ERROR'
  | 'DEPENDENCY'
  | 'CONFIGURATION'
  | 'CAPABILITY'
  | 'OFFLINE'
  | 'BUDGET';

export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AttentionItem {
  id: string;
  type: AttentionType;
  severity: AttentionSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityName?: string;
  createdAt: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemPulseData {
  gateway: {
    status: GatewayHealth;
    detail: string;
  };
  profiles: {
    registered: number;
    enabled: number;
    incomplete: number;
  };
  activeAgents: {
    active: number;
    enabledTotal: number;
  };
  sessions: {
    active: number;
    totalAgents: number;
  };
  skills: {
    healthy: number;
    degraded: number;
    missing: number;
  };
  attention: {
    count: number;
    criticalCount: number;
    highCount: number;
  };
}

export interface MissionControlSnapshot {
  isMock: boolean;
  timestamp: string;
  pulse: SystemPulseData;
  attentionQueue: AttentionItem[];
  recentActivity: ActivityEvent[];
}
