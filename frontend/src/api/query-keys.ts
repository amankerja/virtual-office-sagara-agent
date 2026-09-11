/**
 * Standardized TanStack Query Keys for Sagara Mission Control
 */
export const queryKeys = {
  pulse: ['system', 'pulse'] as const,
  agents: {
    all: ['agents'] as const,
    list: (filters?: Record<string, unknown>) => ['agents', 'list', filters] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: () => ['profiles', 'list'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: Record<string, unknown>) => ['tasks', 'list', filters] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  approvals: {
    all: ['approvals'] as const,
    list: (filters?: Record<string, unknown>) => ['approvals', 'list', filters] as const,
    pending: () => ['approvals', 'pending'] as const,
    detail: (id: string) => ['approvals', 'detail', id] as const,
  },
  skills: {
    all: ['skills'] as const,
    list: (filters?: Record<string, unknown>) => ['skills', 'list', filters] as const,
    detail: (id: string) => ['skills', 'detail', id] as const,
  },
  runtime: {
    overview: () => ['runtime', 'overview'] as const,
    gateway: () => ['runtime', 'gateway'] as const,
    usage: () => ['runtime', 'usage'] as const,
    events: (filters?: Record<string, unknown>) => ['runtime', 'events', filters] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (filters?: Record<string, unknown>) => ['sessions', 'list', filters] as const,
    detail: (id: string) => ['sessions', 'detail', id] as const,
  },
  delegations: {
    all: ['delegations'] as const,
    list: (filters?: Record<string, unknown>) => ['delegations', 'list', filters] as const,
    detail: (id: string) => ['delegations', 'detail', id] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (filters?: Record<string, unknown>) => ['activity', 'list', filters] as const,
    detail: (id: string) => ['activity', 'detail', id] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (filters?: Record<string, unknown>) => ['audit', 'list', filters] as const,
    detail: (id: string) => ['audit', 'detail', id] as const,
  },
  governance: {
    snapshot: () => ['governance', 'snapshot'] as const,
  },
  actionSafety: {
    status: () => ['actionSafety', 'status'] as const,
    intents: (filters?: Record<string, unknown>) => ['actionSafety', 'intents', filters] as const,
    intent: (id: string) => ['actionSafety', 'intent', id] as const,
  },
} as const;
