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
    list: () => ['skills', 'list'] as const,
  },
  runtime: {
    telemetry: () => ['runtime', 'telemetry'] as const,
    activity: (limit?: number) => ['runtime', 'activity', limit] as const,
  },
} as const;
