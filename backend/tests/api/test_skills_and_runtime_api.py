import pytest


@pytest.mark.asyncio
async def test_skills_api(client):
    response = await client.get("/api/v1/skills")
    assert response.status_code == 200
    skills = response.json()
    assert isinstance(skills, list)
    assert len(skills) >= 1

    first = skills[0]
    assert "id" in first
    assert "registration" in first
    assert "installation" in first
    assert "health" in first
    assert "execution" in first

    single_res = await client.get(f"/api/v1/skills/{first['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first["id"]


@pytest.mark.asyncio
async def test_runtime_endpoints(client):
    # Overview
    overview = await client.get("/api/v1/runtime")
    assert overview.status_code == 200
    data = overview.json()
    assert "status" in data
    assert "uptime_seconds" in data
    assert "active_sessions_count" in data

    # Gateway
    gateway = await client.get("/api/v1/runtime/gateway")
    assert gateway.status_code == 200
    gw_data = gateway.json()
    assert "connected" in gw_data
    assert "latency_ms" in gw_data
    assert "last_heartbeat_at" in gw_data

    # Events
    events = await client.get("/api/v1/runtime/events")
    assert events.status_code == 200
    assert isinstance(events.json(), list)


@pytest.mark.asyncio
async def test_sessions_and_delegations(client):
    # Sessions
    sessions = await client.get("/api/v1/sessions")
    assert sessions.status_code == 200
    sess_list = sessions.json()
    assert len(sess_list) >= 1
    assert "message_count" in sess_list[0]

    # Delegations
    delegations = await client.get("/api/v1/delegations")
    assert delegations.status_code == 200
    del_list = delegations.json()
    assert len(del_list) >= 1
    assert "task_title" in del_list[0]


@pytest.mark.asyncio
async def test_mission_control_snapshot(client):
    response = await client.get("/api/v1/mission-control/snapshot")
    assert response.status_code == 200
    snapshot = response.json()
    assert "generated_at" in snapshot
    assert "system_pulse" in snapshot
    assert "agent_counts" in snapshot
    assert "task_counts" in snapshot
    assert "approval_counts" in snapshot
    assert "attention_items" in snapshot
