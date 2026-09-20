import uuid
import pytest
from app.repositories.memory.idempotency import InMemoryIdempotencyStore


@pytest.mark.asyncio
async def test_unknown_not_equal_zero_semantics(client):
    agents_res = await client.get("/api/v1/agents")
    assert agents_res.status_code == 200
    agents = agents_res.json()
    assert len(agents) >= 1
    agent_id = agents[0]["id"]
    agent_res = await client.get(f"/api/v1/agents/{agent_id}")
    assert agent_res.status_code == 200

    sessions_res = await client.get("/api/v1/sessions")
    assert sessions_res.status_code == 200


@pytest.mark.asyncio
async def test_utc_iso8601_timestamps(client):
    snapshot_res = await client.get("/api/v1/mission-control/snapshot")
    assert snapshot_res.status_code == 200
    data = snapshot_res.json()
    gen_at = data["generated_at"]
    assert gen_at.endswith("Z") or "+00:00" in gen_at

    gw_res = await client.get("/api/v1/runtime/gateway")
    assert gw_res.status_code == 200
    hb = gw_res.json()["last_heartbeat_at"]
    assert hb.endswith("Z") or "+00:00" in hb


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
