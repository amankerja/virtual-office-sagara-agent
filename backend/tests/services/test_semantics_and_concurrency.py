import uuid
import pytest
from app.repositories.memory.idempotency import InMemoryIdempotencyStore


@pytest.mark.asyncio
async def test_unknown_not_equal_zero_semantics(client):
    # Agent Charlie has confirmed 0 sessions, while Agent Foxtrot has unknown/null session_count
    charlie_res = await client.get("/api/v1/agents/agent-charlie")
    assert charlie_res.status_code == 200
    charlie_rt = charlie_res.json()["runtime"]
    assert charlie_rt["session_count"] == 0
    assert charlie_rt["active_delegations"] == 0

    foxtrot_res = await client.get("/api/v1/agents/agent-foxtrot")
    assert foxtrot_res.status_code == 200
    foxtrot_rt = foxtrot_res.json()["runtime"]
    assert foxtrot_rt["session_count"] is None
    assert foxtrot_rt["active_delegations"] is None

    # Session 03 has confirmed 0 tool calls, Session 04 has unknown/null tool_call_count
    s3_res = await client.get("/api/v1/sessions/sess-03")
    assert s3_res.status_code == 200
    assert s3_res.json()["tool_call_count"] == 0

    s4_res = await client.get("/api/v1/sessions/sess-04")
    assert s4_res.status_code == 200
    assert s4_res.json()["tool_call_count"] is None


@pytest.mark.asyncio
async def test_utc_iso8601_timestamps(client):
    snapshot_res = await client.get("/api/v1/mission-control/snapshot")
    assert snapshot_res.status_code == 200
    data = snapshot_res.json()
    gen_at = data["generated_at"]
    assert gen_at.endswith("Z") or "+00:00" in gen_at

    gw_res = await client.get("/api/v1/runtime/gateway")
    assert gw_res.status_code == 200
    assert gw_res.json()["last_heartbeat_at"].endswith("Z")


@pytest.mark.asyncio
async def test_idempotency_different_payload_conflict(client):
    idem_key = str(uuid.uuid4())

    # First request
    res1 = await client.post(
        "/api/v1/tasks",
        json={"title": "Original Payload", "priority": "LOW"},
        headers={"Idempotency-Key": idem_key},
    )
    assert res1.status_code == 201

    # Second request with DIFFERENT payload but SAME key
    res2 = await client.post(
        "/api/v1/tasks",
        json={"title": "Different Conflicting Payload", "priority": "HIGH"},
        headers={"Idempotency-Key": idem_key},
    )
    assert res2.status_code == 409
    assert res2.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
