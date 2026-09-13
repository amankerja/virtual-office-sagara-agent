/**
 * Sagara Runtime Operations Domain Contracts
 */

export type GatewayState = 'HEALTHY' | 'STALE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

export interface GatewayTelemetry {
  state: GatewayState;
  backendId: string;
  pid?: number;
  host: string;
  startedAt?: string;
  lastHeartbeat?: string;
  lastHeartbeatAt?: string;
  heartbeatAgeSeconds?: number;
  restartCount?: number;
  statusMessage?: string;
}

export type SessionState = 'ACTIVE' | 'RECENT' | 'COMPLETED' | 'FAILED' | 'ARCHIVED' | 'UNKNOWN';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: string;
  contentPreview: string;
  isSensitive?: boolean;
  redactedReason?: string;
  toolAssociation?: string;
}

export interface SessionToolActivity {
  id: string;
  toolName: string;
  state: 'running' | 'completed' | 'failed' | 'unknown';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  resultSummary?: string;
}

export interface SessionUsage {
  apiCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  billingStatus?: 'estimated' | 'settled' | 'unknown';
}

export interface SessionProjection {
  id: string;
  profileId?: string;
  agentId: string;
  agentName: string;
  source: string;
  model?: string;
  provider?: string;
  startedAt: string;
  lastActivityAt: string;
  state: SessionState;
  messagesCount: number;
  messageCount?: number;
  toolsCount: number;
  toolCallCount?: number;
  parentSessionId?: string;
  childSessionIds?: string[];
  delegationIds?: string[];
  endReason?: string;
  usage?: SessionUsage;
  messages?: SessionMessage[];
  tools?: SessionToolActivity[];
}

export type DelegationState =
  | 'QUEUED'
  | 'CLAIMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface DelegationTimelineEvent {
  stage: 'Queued' | 'Claimed' | 'Started' | 'Updated' | 'Completed' | 'Delivered';
  timestamp: string;
  details?: string;
}

export interface DelegationProjection {
  id: string;
  taskTitle: string;
  taskDescription?: string;
  originAgentId: string;
  originAgentName: string;
  originSessionId: string;
  parentSessionId?: string;
  state: DelegationState;
  ownerPid?: number; // Available only when confirmed
  deliveryState?: 'PENDING' | 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED' | 'UNKNOWN';
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  resultSummary?: string;
  timeline: DelegationTimelineEvent[];
}

export interface UsageMetricBreakdown {
  name: string;
  apiCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
}

export interface RuntimeUsageOverview {
  totalApiCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  byAgent: UsageMetricBreakdown[];
  byModel: UsageMetricBreakdown[];
  byProvider: UsageMetricBreakdown[];
}

export type EventCategory =
  | 'GATEWAY'
  | 'SESSION'
  | 'DELEGATION'
  | 'USAGE'
  | 'SKILL'
  | 'PROFILE'
  | 'SYSTEM';

export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface RuntimeEvent {
  id: string;
  timestamp: string;
  category: EventCategory;
  severity: EventSeverity;
  entity: string;
  entityId?: string;
  message: string;
  correlationId?: string;
}

export interface SystemLoadMetrics {
  cpuPercent?: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  memoryPercent?: number;
  swapUsedMb?: number;
  swapTotalMb?: number;
  diskUsedGb?: number;
  diskTotalGb?: number;
  diskFreeGb?: number;
  diskPercent?: number;
  load1m?: number;
  load5m?: number;
  load15m?: number;
  loadAvg?: string;
  uptimeSeconds?: number;
  hostname?: string;
}

export interface VpsHealth {
  hostname: string;
  uptimeSeconds: number;
  cpuPercent?: number;
  load1m?: number;
  load5m?: number;
  load15m?: number;
  ramTotalMb?: number;
  ramUsedMb?: number;
  ramPercent?: number;
  swapTotalMb?: number;
  swapUsedMb?: number;
  diskTotalGb?: number;
  diskUsedGb?: number;
  diskFreeGb?: number;
  diskPercent?: number;
  observedAt: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface ServiceHealth {
  name: string;
  activeState: string;
  subState: string;
  mainPid?: number;
  restartCount?: number;
  activeSince?: string;
  observedAt: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface NineRouterHealth {
  available: boolean;
  endpoint: string;
  statusCode?: number;
  modelsCount?: number;
  activeState?: string;
  mainPid?: number;
  observedAt: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface SagaraSourceStatus {
  configured: boolean;
  discovered: boolean;
  sourceVersion?: string;
  commit?: string;
  freezeCommit: string;
  profilesLoaded: number;
  skillsLoaded: number;
  channelsLoaded: number;
  observedAt: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface HermesSourceStatus {
  configured: boolean;
  discovered: boolean;
  version?: string;
  gateway?: string;
  stateStore?: string;
  profileStores: number;
  observedAt: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface SourceDiscoveryStatus {
  sagara: SagaraSourceStatus;
  hermes: HermesSourceStatus;
  runtimeContract: string;
  observedAt: string;
}

export interface ReleaseMetadata {
  platform: string;
  missionControlVersion: string;
  missionControlCommit?: string;
  sagaraDeployedCommit?: string;
  sagaraFreezeCommit: string;
  hermesVersion?: string;
  runtimeContract: string;
  productionPolicy: string;
  policyHash: string;
  observedAt: string;
}

export interface RuntimeOverview {
  health: {
    gateway: GatewayState;
    runtimeData: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN';
    sessions: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN';
    delegations: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN';
    usage: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN';
  };
  gateway: GatewayTelemetry;
  activeSessionsCount?: number;
  runningDelegationsCount?: number;
  totalCostEstimateUsd?: number;
  recentEvents: RuntimeEvent[];
  systemLoad?: SystemLoadMetrics;
  centralStoreSessions?: number;
  profileLocalSessions?: number;
  aggregateDistinctSessions?: number;
  currentModel?: string;
  currentProvider?: string;
  platforms?: Record<string, string>;
  vpsHealth?: VpsHealth;
  servicesHealth?: ServiceHealth[];
  routerHealth?: NineRouterHealth;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'DEBUG' | 'ERROR';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

