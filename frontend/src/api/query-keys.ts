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
  },
  approvals: {
    all: ['approvals'] as const,
    pending: () => ['approvals', 'pending'] as const,
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
} as const;
