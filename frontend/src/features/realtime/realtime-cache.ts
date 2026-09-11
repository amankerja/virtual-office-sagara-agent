import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import type { AgentProjection } from '@/types/agent';
import type { AttentionItem, MissionControlSnapshot } from '@/types/mission-control';
import type { RealtimeDeltaPayloadDto, RealtimeSnapshotPayloadDto } from './realtime-protocol';
import {
  mapRealtimeAgent,
  mapRealtimeAttentionItem,
  mapRealtimeDelegation,
  mapRealtimeGateway,
  mapRealtimeRuntimeOverview,
} from './realtime-mappers';

/**
 * Hydrates TanStack Query cache from a complete canonical realtime snapshot.
 */
export function applyRealtimeSnapshot(
  queryClient: QueryClient,
  snapshot: RealtimeSnapshotPayloadDto
): void {
  // 1. Map and set all agents
  const agents: AgentProjection[] = (snapshot.agents || []).map(mapRealtimeAgent);
  queryClient.setQueryData<AgentProjection[]>(queryKeys.agents.all, agents);

  // Set individual agent detail queries for warm cache
  for (const agent of agents) {
    queryClient.setQueryData(queryKeys.agents.detail(agent.id), agent);
  }

  // 2. Gateway telemetry
  const gateway = mapRealtimeGateway(snapshot.gateway);
  queryClient.setQueryData(queryKeys.runtime.gateway(), gateway);

  // 3. Runtime overview
  const overview = mapRealtimeRuntimeOverview(snapshot.runtime_summary);
  queryClient.setQueryData(queryKeys.runtime.overview(), overview);

  // 4. Active delegations
  const delegations = (snapshot.active_delegations || []).map(mapRealtimeDelegation);
  queryClient.setQueryData(queryKeys.delegations.all, delegations);

  // 5. Mission Control Snapshot / Pulse
  const attentionItems: AttentionItem[] = (snapshot.attention || []).map(mapRealtimeAttentionItem);

  queryClient.setQueryData<MissionControlSnapshot | undefined>(queryKeys.pulse, (prev) => {
    const isGwHealthy = snapshot.gateway?.status === 'HEALTHY' || snapshot.gateway?.connected === true;
    return {
      isMock: prev?.isMock ?? false,
      timestamp: snapshot.generated_at,
      pulse: {
        gateway: {
          status: isGwHealthy ? 'HEALTHY' : 'DEGRADED',
          detail: `Latency: ${snapshot.gateway?.latency_ms ?? 0}ms`,
        },
        profiles: prev?.pulse?.profiles ?? { registered: 0, enabled: 0, incomplete: 0 },
        activeAgents: {
          active: agents.filter((a) => a.runtime.state === 'ACTIVE').length,
          enabledTotal: agents.length,
        },
        sessions: {
          active: snapshot.runtime_summary?.active_sessions_count ?? 0,
          totalAgents: agents.length,
        },
        skills: prev?.pulse?.skills ?? { healthy: 0, degraded: 0, missing: 0 },
        attention: {
          count: attentionItems.length,
          criticalCount: attentionItems.filter((i) => i.severity === 'critical').length,
          highCount: attentionItems.filter((i) => i.severity === 'high').length,
        },
      },
      attentionQueue: attentionItems,
      recentActivity: prev?.recentActivity ?? [],
    };
  });
}

/**
 * Patches TanStack Query cache from a minimal realtime delta.
 */
export function applyRealtimeDelta(
  queryClient: QueryClient,
  delta: RealtimeDeltaPayloadDto
): void {
  const { changes } = delta;
  if (!changes) return;

  // 1. Patch Gateway
  if (changes.gateway) {
    const gw = mapRealtimeGateway(changes.gateway);
    queryClient.setQueryData(queryKeys.runtime.gateway(), gw);
    queryClient.setQueryData<MissionControlSnapshot | undefined>(queryKeys.pulse, (prev) => {
      if (!prev) return undefined;
      const isGwHealthy = changes.gateway?.status === 'HEALTHY' || changes.gateway?.connected === true;
      return {
        ...prev,
        pulse: {
          ...prev.pulse,
          gateway: {
            status: isGwHealthy ? 'HEALTHY' : 'DEGRADED',
            detail: `Latency: ${changes.gateway?.latency_ms ?? 0}ms`,
          },
        },
      };
    });
  }

  // 2. Patch Runtime Overview
  if (changes.runtime_summary) {
    const ov = mapRealtimeRuntimeOverview(changes.runtime_summary);
    queryClient.setQueryData(queryKeys.runtime.overview(), ov);
    queryClient.setQueryData<MissionControlSnapshot | undefined>(queryKeys.pulse, (prev) => {
      if (!prev) return undefined;
      return {
        ...prev,
        pulse: {
          ...prev.pulse,
          sessions: {
            ...prev.pulse.sessions,
            active: changes.runtime_summary?.active_sessions_count ?? prev.pulse.sessions.active,
          },
        },
      };
    });
  }

  // 3. Patch Agents
  if (changes.agents) {
    const upserted = (changes.agents.upsert || []).map(mapRealtimeAgent);
    const removedIds = new Set(changes.agents.remove || []);

    queryClient.setQueryData<AgentProjection[]>(queryKeys.agents.all, (oldAgents = []) => {
      const map = new Map<string, AgentProjection>();
      for (const a of oldAgents) {
        if (!removedIds.has(a.id)) {
          map.set(a.id, a);
        }
      }
      for (const a of upserted) {
        map.set(a.id, a);
        queryClient.setQueryData(queryKeys.agents.detail(a.id), a);
      }
      for (const rid of removedIds) {
        queryClient.removeQueries({ queryKey: queryKeys.agents.detail(rid) });
      }
      const updatedList = Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));

      // Update pulse activeAgents
      queryClient.setQueryData<MissionControlSnapshot | undefined>(queryKeys.pulse, (prev) => {
        if (!prev) return undefined;
        return {
          ...prev,
          pulse: {
            ...prev.pulse,
            activeAgents: {
              active: updatedList.filter((a) => a.runtime.state === 'ACTIVE').length,
              enabledTotal: updatedList.length,
            },
          },
        };
      });

      return updatedList;
    });
  }

  // 4. Task summary changed -> invalidate tasks list
  if (changes.task_summary) {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  }

  // 5. Approval summary changed -> invalidate approvals
  if (changes.approval_summary) {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }

  // 6. Active delegations changed -> invalidate delegations query
  if (changes.active_delegations) {
    queryClient.invalidateQueries({ queryKey: queryKeys.delegations.all });
  }

  // 7. Attention items changed
  if (changes.attention) {
    const upsertedAtt = (changes.attention.upsert || []).map(mapRealtimeAttentionItem);
    const removedAttIds = new Set(changes.attention.remove || []);

    queryClient.setQueryData<MissionControlSnapshot | undefined>(queryKeys.pulse, (prev) => {
      if (!prev) return undefined;
      const current = prev.attentionQueue || [];
      const map = new Map<string, AttentionItem>(current.map((att: AttentionItem) => [att.id, att]));
      for (const rid of removedAttIds) map.delete(rid);
      for (const att of upsertedAtt) map.set(att.id, att);
      const queue = Array.from(map.values());
      return {
        ...prev,
        pulse: {
          ...prev.pulse,
          attention: {
            count: queue.length,
            criticalCount: queue.filter((i) => i.severity === 'critical').length,
            highCount: queue.filter((i) => i.severity === 'high').length,
          },
        },
        attentionQueue: queue,
      };
    });
  }
}
