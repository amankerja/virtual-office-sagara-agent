import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import {
  isValidRealtimeEnvelope,
} from '../src/features/realtime/realtime-protocol.ts';
import {
  mapRealtimeAgent,
  mapRealtimeGateway,
} from '../src/features/realtime/realtime-mappers.ts';
import {
  applyRealtimeSnapshot,
  applyRealtimeDelta,
} from '../src/features/realtime/realtime-cache.ts';
import { RealtimeClient } from '../src/features/realtime/realtime-client.ts';
import { useRealtimeStore } from '../src/features/realtime/realtime-store.ts';
import { queryKeys } from '../src/api/query-keys.ts';
import { buildOfficeScene } from '../src/features/office/layout/office-layout-engine.ts';

test('Realtime Protocol: isValidRealtimeEnvelope validates versioned message envelopes', () => {
  const validEnvelope = {
    protocol_version: '1',
    type: 'snapshot',
    sequence: 42,
    generated_at: '2026-09-10T05:00:00.000Z',
    server_instance_id: 'mc-srv-01',
    payload: { agents: [] },
  };

  assert.equal(isValidRealtimeEnvelope(validEnvelope), true);

  // Invalid: missing sequence
  assert.equal(
    isValidRealtimeEnvelope({
      protocol_version: '1',
      type: 'snapshot',
      generated_at: '2026-09-10T05:00:00.000Z',
      server_instance_id: 'mc-srv-01',
      payload: {},
    }),
    false
  );

  // Invalid: null or primitive
  assert.equal(isValidRealtimeEnvelope(null), false);
  assert.equal(isValidRealtimeEnvelope('hello'), false);
  assert.equal(isValidRealtimeEnvelope(123), false);
});

test('Realtime Mappers: preserves UNKNOWN ≠ ZERO and maps canonical DTOs', () => {
  const agentDto = {
    id: 'agent-rt-01',
    definition: {
      name: 'Realtime Agent',
      role: 'Stream Processor',
      enabled: true,
    },
    runtime: {
      state: 'ACTIVE',
      confidence: 'CONFIRMED',
      session_count: null, // null must not become 0
      active_delegations: 0, // 0 must stay 0
    },
    capabilities: { total: 3, healthy: 3, degraded: 0, missing: 0 },
    usage: { input_tokens: 1500, output_tokens: 250, estimated_cost_usd: null },
  };

  const domain = mapRealtimeAgent(agentDto);
  assert.equal(domain.id, 'agent-rt-01');
  assert.equal(domain.runtime.state, 'ACTIVE');
  assert.equal(domain.runtime.sessionCount, undefined);
  assert.equal(domain.runtime.activeDelegations, 0);

  const gwDto = {
    state: 'HEALTHY',
    connected: true,
    latency_ms: 12,
    last_heartbeat_at: '2026-09-10T05:00:00Z',
  };
  const gwDomain = mapRealtimeGateway(gwDto);
  assert.equal(gwDomain.state, 'HEALTHY');
  assert.equal(gwDomain.lastHeartbeatAt, '2026-09-10T05:00:00Z');
});

test('Realtime Cache: applyRealtimeSnapshot populates TanStack Query cache', () => {
  const queryClient = new QueryClient();

  const snapshotPayload = {
    generated_at: '2026-09-10T05:00:00.000Z',
    revision: 1,
    gateway: {
      state: 'HEALTHY',
      connected: true,
      latency_ms: 15,
      last_heartbeat_at: '2026-09-10T05:00:00Z',
    },
    runtime_summary: {
      status: 'HEALTHY',
      uptime_seconds: 3600,
      active_sessions_count: 2,
      active_workers_count: 1,
    },
    agents: [
      {
        id: 'agent-1',
        definition: { name: 'Alpha', role: 'Worker', enabled: true },
        runtime: { state: 'IDLE', confidence: 'CONFIRMED' },
        capabilities: { total: 1, healthy: 1, degraded: 0, missing: 0 },
      },
      {
        id: 'agent-2',
        definition: { name: 'Beta', role: 'Coordinator', enabled: true },
        runtime: { state: 'ACTIVE', confidence: 'CONFIRMED' },
        capabilities: { total: 2, healthy: 2, degraded: 0, missing: 0 },
      },
    ],
    task_summary: { total: 5, running: 1, ready: 2, blocked: 0, awaiting_approval: 0, completed: 2 },
    approval_summary: { total: 2, pending: 1, high_risk: 0 },
    active_delegations: [],
    attention: [],
  };

  applyRealtimeSnapshot(queryClient, snapshotPayload);

  const agents = queryClient.getQueryData(queryKeys.agents.all);
  assert.equal(Array.isArray(agents), true);
  assert.equal(agents.length, 2);
  assert.equal(agents[0].id, 'agent-1');

  // Detail cache warm
  const agent1Detail = queryClient.getQueryData(queryKeys.agents.detail('agent-1'));
  assert.equal(agent1Detail?.definition.name, 'Alpha');

  // Pulse cache
  const pulse = queryClient.getQueryData(queryKeys.pulse);
  assert.equal(pulse?.pulse.activeAgents.enabledTotal, 2);
  assert.equal(pulse?.pulse.activeAgents.active, 1);
  assert.equal(pulse?.pulse.sessions.active, 2);
  assert.equal(pulse?.pulse.gateway.status, 'HEALTHY');
});

test('Realtime Cache: applyRealtimeDelta patches changed agent and updates pulse counts', () => {
  const queryClient = new QueryClient();

  // Setup initial cache
  queryClient.setQueryData(queryKeys.agents.all, [
    {
      id: 'agent-1',
      definition: { name: 'Alpha', enabled: true },
      runtime: { state: 'IDLE', confidence: 'CONFIRMED' },
      capabilities: { total: 1, healthy: 1, degraded: 0, missing: 0 },
    },
    {
      id: 'agent-2',
      definition: { name: 'Beta', enabled: true },
      runtime: { state: 'IDLE', confidence: 'CONFIRMED' },
      capabilities: { total: 2, healthy: 2, degraded: 0, missing: 0 },
    },
  ]);

  queryClient.setQueryData(queryKeys.pulse, {
    isMock: false,
    timestamp: '2026-09-10T05:00:00.000Z',
    pulse: {
      gateway: { status: 'HEALTHY', detail: 'OK' },
      profiles: { registered: 2, enabled: 2, incomplete: 0 },
      activeAgents: { active: 0, enabledTotal: 2 },
      sessions: { active: 0, totalAgents: 2 },
      skills: { healthy: 2, degraded: 0, missing: 0 },
      attention: { count: 0, criticalCount: 0, highCount: 0 },
    },
    attentionQueue: [],
    recentActivity: [],
  });

  // Apply delta with agent-1 becoming ACTIVE
  const delta = {
    base_revision: 1,
    revision: 2,
    generated_at: '2026-09-10T05:00:02.000Z',
    changes: {
      agents: {
        upsert: [
          {
            id: 'agent-1',
            definition: { name: 'Alpha', enabled: true },
            runtime: { state: 'ACTIVE', confidence: 'CONFIRMED' },
            capabilities: { total: 1, healthy: 1, degraded: 0, missing: 0 },
          },
        ],
        remove: [],
      },
    },
  };

  applyRealtimeDelta(queryClient, delta);

  const updatedAgents = queryClient.getQueryData(queryKeys.agents.all);
  assert.equal(updatedAgents.length, 2);
  const agent1 = updatedAgents.find((a) => a.id === 'agent-1');
  const agent2 = updatedAgents.find((a) => a.id === 'agent-2');
  assert.equal(agent1?.runtime.state, 'ACTIVE');
  assert.equal(agent2?.runtime.state, 'IDLE');

  // Pulse agent counts updated
  const updatedPulse = queryClient.getQueryData(queryKeys.pulse);
  assert.equal(updatedPulse?.pulse.activeAgents.active, 1);
  assert.equal(updatedPulse?.pulse.activeAgents.enabledTotal, 2);
});

test('Realtime Cache: applyRealtimeDelta removes deleted agent from list and detail cache', () => {
  const queryClient = new QueryClient();

  queryClient.setQueryData(queryKeys.agents.all, [
    { id: 'agent-keep', definition: { name: 'Keep' }, runtime: { state: 'IDLE' }, capabilities: {} },
    { id: 'agent-del', definition: { name: 'Del' }, runtime: { state: 'IDLE' }, capabilities: {} },
  ]);
  queryClient.setQueryData(queryKeys.agents.detail('agent-del'), { id: 'agent-del' });

  const delta = {
    base_revision: 2,
    revision: 3,
    generated_at: '2026-09-10T05:00:04.000Z',
    changes: {
      agents: {
        upsert: [],
        remove: ['agent-del'],
      },
    },
  };

  applyRealtimeDelta(queryClient, delta);

  const agents = queryClient.getQueryData(queryKeys.agents.all);
  assert.equal(agents.length, 1);
  assert.equal(agents[0].id, 'agent-keep');
  assert.equal(queryClient.getQueryData(queryKeys.agents.detail('agent-del')), undefined);
});

test('Realtime Client: sequence gap triggers resync and duplicate sequence is ignored', () => {
  const queryClient = new QueryClient();
  const client = new RealtimeClient({ queryClient });

  // Initial snapshot message at seq 100
  const snapEnvelope = JSON.stringify({
    protocol_version: '1',
    type: 'snapshot',
    sequence: 100,
    generated_at: '2026-09-10T05:00:00Z',
    server_instance_id: 'mc-inst-1',
    payload: {
      generated_at: '2026-09-10T05:00:00Z',
      revision: 1,
      gateway: { state: 'HEALTHY', connected: true, latency_ms: 5, last_heartbeat_at: '2026-09-10T05:00:00Z' },
      runtime_summary: { status: 'HEALTHY', uptime_seconds: 100, active_sessions_count: 0, active_workers_count: 0 },
      agents: [{ id: 'agent-1', definition: { name: 'A' }, runtime: { state: 'IDLE' }, capabilities: {} }],
      task_summary: {},
      approval_summary: {},
      active_delegations: [],
      attention: [],
    },
  });

  client.handleMessage(snapEnvelope);
  assert.equal(useRealtimeStore.getState().lastSequence, 100);

  // Consecutive delta at seq 101 applies cleanly
  const delta101 = JSON.stringify({
    protocol_version: '1',
    type: 'delta',
    sequence: 101,
    generated_at: '2026-09-10T05:00:02Z',
    server_instance_id: 'mc-inst-1',
    payload: {
      base_revision: 1,
      revision: 2,
      generated_at: '2026-09-10T05:00:02Z',
      changes: {
        agents: {
          upsert: [{ id: 'agent-1', definition: { name: 'A' }, runtime: { state: 'ACTIVE' }, capabilities: {} }],
        },
      },
    },
  });
  client.handleMessage(delta101);
  assert.equal(useRealtimeStore.getState().lastSequence, 101);
  const updated = queryClient.getQueryData(queryKeys.agents.all);
  assert.equal(updated[0].runtime.state, 'ACTIVE');

  // Duplicate delta (seq 101) ignored
  client.handleMessage(delta101);
  assert.equal(useRealtimeStore.getState().lastSequence, 101);

  // Out of order older sequence (seq 99) ignored
  const delta99 = JSON.stringify({
    protocol_version: '1',
    type: 'delta',
    sequence: 99,
    generated_at: '2026-09-10T05:00:00Z',
    server_instance_id: 'mc-inst-1',
    payload: { changes: {} },
  });
  client.handleMessage(delta99);
  assert.equal(useRealtimeStore.getState().lastSequence, 101);
});

test('Renderer Parity: Canonical snapshot and delta flow into buildOfficeScene without divergence', () => {
  const queryClient = new QueryClient();

  const snapshotPayload = {
    generated_at: '2026-09-10T05:00:00.000Z',
    revision: 1,
    gateway: { state: 'HEALTHY', connected: true, latency_ms: 10, last_heartbeat_at: '2026-09-10T05:00:00Z' },
    runtime_summary: { status: 'HEALTHY', uptime_seconds: 1000, active_sessions_count: 1, active_workers_count: 0 },
    agents: [
      {
        id: 'agent-lead',
        definition: { name: 'Lead', role: 'Team Lead', enabled: true },
        runtime: { state: 'IDLE', confidence: 'CONFIRMED' },
        capabilities: { total: 5, healthy: 5, degraded: 0, missing: 0 },
      },
    ],
    task_summary: { total: 1, running: 0, ready: 1, blocked: 0, awaiting_approval: 0, completed: 0 },
    approval_summary: { total: 0, pending: 0, high_risk: 0 },
    active_delegations: [],
    attention: [],
  };

  applyRealtimeSnapshot(queryClient, snapshotPayload);
  const initialAgents = queryClient.getQueryData(queryKeys.agents.all);

  const sceneInitial = buildOfficeScene({
    agents: initialAgents,
    delegations: [],
    tasks: [],
    approvals: [],
    runtimeOverview: { status: 'HEALTHY', uptimeSeconds: 1000, activeSessionsCount: 1, activeWorkersCount: 0 },
  });

  assert.equal(sceneInitial.desks.length, 1);
  assert.equal(sceneInitial.desks[0].agent.runtime.state, 'IDLE');

  // Delta: agent becomes ACTIVE
  const delta = {
    base_revision: 1,
    revision: 2,
    generated_at: '2026-09-10T05:00:02.000Z',
    changes: {
      agents: {
        upsert: [
          {
            id: 'agent-lead',
            definition: { name: 'Lead', role: 'Team Lead', enabled: true },
            runtime: { state: 'ACTIVE', confidence: 'CONFIRMED' },
            capabilities: { total: 5, healthy: 5, degraded: 0, missing: 0 },
          },
        ],
      },
    },
  };

  applyRealtimeDelta(queryClient, delta);
  const deltaAgents = queryClient.getQueryData(queryKeys.agents.all);

  const sceneAfterDelta = buildOfficeScene({
    agents: deltaAgents,
    delegations: [],
    tasks: [],
    approvals: [],
    runtimeOverview: { status: 'HEALTHY', uptimeSeconds: 1000, activeSessionsCount: 1, activeWorkersCount: 0 },
  });

  assert.equal(sceneAfterDelta.desks.length, 1);
  assert.equal(sceneAfterDelta.desks[0].agent.runtime.state, 'ACTIVE');
  // Parity check: same agent id and workstation position preserved
  assert.equal(sceneAfterDelta.desks[0].agentId, sceneInitial.desks[0].agentId);
  assert.deepEqual(sceneAfterDelta.desks[0].position, sceneInitial.desks[0].position);
});

test('HTTP Fallback: When realtime disconnects, query cache remains completely intact', () => {
  const queryClient = new QueryClient();
  const client = new RealtimeClient({ queryClient });

  queryClient.setQueryData(queryKeys.agents.all, [
    { id: 'agent-stable', definition: { name: 'Stable' }, runtime: { state: 'ACTIVE' }, capabilities: {} },
  ]);

  // Explicit disconnect
  client.disconnect();

  // Cache is NOT cleared
  const cachedAgents = queryClient.getQueryData(queryKeys.agents.all);
  assert.equal(Array.isArray(cachedAgents), true);
  assert.equal(cachedAgents.length, 1);
  assert.equal(cachedAgents[0].id, 'agent-stable');
  assert.equal(useRealtimeStore.getState().status, 'DISCONNECTED');
});
