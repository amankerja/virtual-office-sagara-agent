# SAGARA MISSION CONTROL REALTIME PROTOCOL V1

**Identifier:** `SAGARA_MISSION_CONTROL_REALTIME_PROTOCOL_V1`  
**Protocol Version:** `"1"`  
**Endpoint:** `/api/v1/realtime/ws`  
**Transport:** FastAPI Native WebSocket  

---

## 1. Scope & Invariants

The Sagara Mission Control Realtime Layer provides efficient, low-latency state delivery to client applications.
* **Delivery Only:** Realtime is a transport delivery mechanism. It is strictly **NOT** an independent source of truth.
* **No Direct Hermes Gateway WebSocket:** Browsers connect exclusively to the Mission Control backend WebSocket endpoint, never directly to the Hermes Gateway.
* **Canonical Derivation:** All state streamed over the WebSocket originates from the canonical Mission Control projection pipeline:
  `Hermes Runtime Readers -> RuntimeEvidenceService -> RuntimeCorrelationService -> AgentProjectionService -> Canonical Realtime Snapshot -> RealtimeDeltaService`.
* **Zero Database Writes:** The realtime subsystem operates purely on read-only evidence and in-memory caches.

---

## 2. Separate Contract Policy

The existing HTTP OpenAPI contract `SAGARA_MISSION_CONTROL_API_CONTRACT_V1` is frozen and remains unchanged. This document defines the independent realtime protocol specification.

---

## 3. Connection Lifecycle

1. **Client Handshake:**
   The client opens a WebSocket connection to `/api/v1/realtime/ws`.
   Supported query parameters:
   - `protocol_version`: Must be `"1"` (default: `"1"`).
   - `from_sequence`: Optional integer indicating the last sequence number successfully processed by the client.
   - `server_instance_id`: Optional opaque identifier of the server instance previously connected to.
2. **Origin Verification:**
   The server validates the `Origin` header against configured CORS origins (`MISSION_CONTROL_CORS_ORIGINS`). Disallowed origins are rejected with code `1008` (Policy Violation).
3. **Capacity Check:**
   The server enforces a configurable connection ceiling (`MISSION_CONTROL_REALTIME_MAX_CONNECTIONS`, default: 50). If at capacity, an error envelope is sent and the connection is closed with code `1013` (Try Again Later).
4. **Initial Synchronization:**
   - If the client supplies a matching `server_instance_id` and the `from_sequence` is within the retained replay buffer, the server replays the missing `delta` messages in order.
   - If the sequence is evicted or unknown, the server issues a `resync_required` message followed by a full `snapshot`.
   - On fresh connections (or when `server_instance_id` has changed due to a backend restart), the server immediately transmits a full `snapshot`.
5. **Continuous Streaming:**
   The single shared sampler samples runtime state at a configurable interval (default: 2.0s). When meaningful state changes are detected, a pure `delta` is broadcast to all connected clients.
6. **Transport Heartbeats:**
   Every 15–30 seconds (default: 20s), the server broadcasts a lightweight `heartbeat` message.
7. **Clean Disconnect:**
   When the client or server terminates the connection, internal queues are drained, writer tasks are cancelled, and the client session is deregistered without leaking memory or orphan tasks.

---

## 4. Message Envelope Specification

Every message sent from server to client conforms to the canonical envelope:

```json
{
  "protocol_version": "1",
  "type": "snapshot | delta | heartbeat | resync_required | error",
  "sequence": 105,
  "generated_at": "2026-09-10T05:00:00.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {}
}
```

### Fields

* `protocol_version`: Always `"1"`.
* `type`: One of `"snapshot"`, `"delta"`, `"heartbeat"`, `"resync_required"`, `"error"`.
* `sequence`: Monotonically increasing positive integer within the backend server process lifetime.
* `generated_at`: UTC ISO 8601 timestamp (`YYYY-MM-DDTHH:MM:SS.sssZ`) representing snapshot generation time, not receipt time.
* `server_instance_id`: Unique identifier generated at server startup (e.g., `mc-xxxxxxxx`). When backend restarts, sequence restarts, and clients recognize the new instance ID to reset sequence assumptions.
* `payload`: Type-specific payload data.

---

## 5. Message Types & Payloads

### 5.1 Snapshot (`type: "snapshot"`)

Transmitted immediately upon connection or full resync. Contains complete operational state needed for realtime views:

```json
{
  "protocol_version": "1",
  "type": "snapshot",
  "sequence": 1,
  "generated_at": "2026-09-10T05:00:00.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {
    "generated_at": "2026-09-10T05:00:00.000Z",
    "revision": 1,
    "gateway": { ...GatewayDto... },
    "runtime_summary": { ...RuntimeOverviewDto... },
    "agents": [ ...AgentDto... ],
    "task_summary": {
      "total": 12,
      "running": 2,
      "ready": 3,
      "blocked": 1,
      "awaiting_approval": 1,
      "completed": 5
    },
    "approval_summary": {
      "total": 4,
      "pending": 2,
      "high_risk": 1
    },
    "active_delegations": [ ...DelegationDto... ],
    "attention": [ ...AttentionItemDto... ]
  }
}
```

### 5.2 Delta (`type: "delta"`)

Transmitted when a sampler iteration discovers differences from the previous snapshot. Only modified entities are included:

```json
{
  "protocol_version": "1",
  "type": "delta",
  "sequence": 2,
  "generated_at": "2026-09-10T05:00:02.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {
    "base_revision": 1,
    "revision": 2,
    "generated_at": "2026-09-10T05:00:02.000Z",
    "changes": {
      "gateway": null,
      "runtime_summary": null,
      "agents": {
        "upsert": [ ...AgentDto... ],
        "remove": []
      },
      "task_summary": null,
      "approval_summary": {
        "total": 4,
        "pending": 3,
        "high_risk": 2
      },
      "active_delegations": {
        "upsert": [],
        "remove": ["del-09"]
      },
      "attention": null
    }
  }
}
```

### 5.3 Heartbeat (`type: "heartbeat"`)

Lightweight transport liveness message:

```json
{
  "protocol_version": "1",
  "type": "heartbeat",
  "sequence": 15,
  "generated_at": "2026-09-10T05:00:20.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {}
}
```

### 5.4 Resync Required (`type: "resync_required"`)

Instructs the client that its sequence is out of sync or evicted:

```json
{
  "protocol_version": "1",
  "type": "resync_required",
  "sequence": 50,
  "generated_at": "2026-09-10T05:01:00.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {
    "reason": "sequence_gap_evicted | slow_client_backpressure"
  }
}
```

### 5.5 Error (`type: "error"`)

Safe operational errors without stack traces:

```json
{
  "protocol_version": "1",
  "type": "error",
  "sequence": 0,
  "generated_at": "2026-09-10T05:00:00.000Z",
  "server_instance_id": "mc-a1b2c3d4",
  "payload": {
    "code": "REALTIME_PROTOCOL_UNSUPPORTED | REALTIME_CAPACITY_EXCEEDED",
    "message": "Human-readable description"
  }
}
```

---

## 6. Shared Sampler & Single-Flight Execution

1. **One Sampler for All Clients:**
   A single background task produces snapshots. Polling load on SQLite or adapters never scales with client count.
2. **Single-Flight Guard:**
   An `asyncio.Lock` ensures that if a projection sample cycle takes longer than the interval (e.g. 2.0s), overlapping samples are skipped and delayed, preventing cascading database locks.
3. **Volatile Counter Suppression:**
   Fields such as `heartbeat_age_seconds` are ignored during change detection. Only real state transitions trigger deltas.

---

## 7. Replay Buffer & Backpressure

1. **In-Memory Ring Buffer:**
   Retains the last 256 messages in memory. No secondary database is used.
2. **Bounded Client Queues:**
   Each client has an `asyncio.Queue` bounded to 64 messages.
3. **Slow Client Protection:**
   If a client's queue fills, older replaceable deltas are dropped, a `resync_required` message is enqueued, and persistently stalled clients are disconnected to preserve server memory.

---

## 8. Privacy & Data Minimization

* **Transcripts Excluded:** Raw conversation transcripts and session message bodies are strictly excluded from realtime messages. Detailed transcripts remain accessible only via paginated HTTP endpoints.
* **Secrets Excluded:** Tokens, secrets, private keys, and environment variables are never transmitted.
* **System Prompts Excluded:** Agent definitions in realtime convey operational metadata (name, role, enabled, capabilities), not raw system prompts.

---

## 9. Frontend Integration & HTTP Fallback

* **Server State Ownership:** TanStack Query remains the sole owner of server state. WebSocket updates patch or invalidate existing TanStack Query caches (`queryClient.setQueryData`, `queryClient.invalidateQueries`).
* **HTTP Fallback:** If WebSocket is disconnected, the UI remains 100% functional via HTTP polling/refetches. Disconnect shows an unobtrusive status indicator rather than breaking views.
* **Renderer Parity:** Agents Directory, Virtual Office 3D, Virtual Office 2.5D, and Accessible List views consume the shared cache. Agent transitions update smoothly without resetting the 3D Canvas.
