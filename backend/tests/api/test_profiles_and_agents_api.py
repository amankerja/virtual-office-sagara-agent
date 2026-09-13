import pytest

pytestmark = [pytest.mark.smoke]


@pytest.mark.asyncio
async def test_list_and_get_profiles(client):
    response = await client.get("/api/v1/profiles")
    assert response.status_code == 200
    profiles = response.json()
    assert isinstance(profiles, list)
    assert len(profiles) >= 1

    first = profiles[0]
    assert "id" in first
    assert "name" in first
    assert "enabled" in first

    # Get by ID
    single_res = await client.get(f"/api/v1/profiles/{first['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first["id"]

    # Not found
    not_found = await client.get("/api/v1/profiles/prof-nonexistent-99")
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "RESOURCE_NOT_FOUND"


@pytest.mark.asyncio
async def test_list_and_filter_agents(client):
    response = await client.get("/api/v1/agents")
    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, list)
    assert len(agents) >= 1

    first = agents[0]
    assert "id" in first
    assert "definition" in first
    assert "runtime" in first
    assert "capabilities" in first

    # Filter by state
    filtered = await client.get("/api/v1/agents?state=ACTIVE")
    assert filtered.status_code == 200
    for a in filtered.json():
        assert a["runtime"]["state"] == "ACTIVE"

    # Get by ID
    single_res = await client.get(f"/api/v1/agents/{first['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == first["id"]
