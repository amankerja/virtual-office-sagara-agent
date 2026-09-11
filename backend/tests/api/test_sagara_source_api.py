from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import reconfigure_dependencies
from app.config import settings
from app.main import create_app

FIXTURE_ROOT = str(Path(__file__).parent.parent / "fixtures" / "sagara_project")


@pytest.fixture
async def sagara_client():
    # Configure sagara mode with valid fixture root
    old_profile_source = settings.profile_source
    old_skill_source = settings.skill_source
    old_root = settings.sagara_project_root

    settings.profile_source = "sagara"
    settings.skill_source = "sagara"
    settings.sagara_project_root = FIXTURE_ROOT
    reconfigure_dependencies()

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Reset back to mock
    settings.profile_source = old_profile_source
    settings.skill_source = old_skill_source
    settings.sagara_project_root = old_root
    reconfigure_dependencies()


@pytest.mark.asyncio
async def test_ready_endpoint_with_sagara_source(sagara_client):
    """Section 33: Readiness validates configured Sagara sources."""
    res = await sagara_client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["sources"]["profile"] == "sagara"
    assert data["sources"]["skill"] == "sagara"


@pytest.mark.asyncio
async def test_real_profiles_endpoints(sagara_client):
    """Section 42: GET /api/v1/profiles and /profiles/{id} return real Sagara definitions."""
    res = await sagara_client.get("/api/v1/profiles")
    assert res.status_code == 200
    profiles = res.json()
    assert isinstance(profiles, list)
    assert len(profiles) >= 6

    # Verify dynamic profile is present
    ids = [p["id"] for p in profiles]
    assert "lead" in ids
    assert "dyn-custom-98765" in ids
    assert "personal" in ids

    # GET single profile
    lead_res = await sagara_client.get("/api/v1/profiles/lead")
    assert lead_res.status_code == 200
    assert lead_res.json()["name"] == "Lead Coordinator"
    assert lead_res.json()["role"] == "Operations Lead"

    # Profile without role has role=None (Section 48)
    pers_res = await sagara_client.get("/api/v1/profiles/personal")
    assert pers_res.status_code == 200
    assert pers_res.json()["role"] is None


@pytest.mark.asyncio
async def test_real_skills_endpoints_no_raw_scan(sagara_client):
    """Section 43: GET /api/v1/skills returns effective Sagara skill catalog, not raw file count."""
    res = await sagara_client.get("/api/v1/skills")
    assert res.status_code == 200
    skills = res.json()
    assert len(skills) == 5

    skill_ids = [s["id"] for s in skills]
    assert "skill-hermes-agent" in skill_ids
    assert "unregistered-skill-a" not in skill_ids

    # GET single skill
    single_res = await sagara_client.get("/api/v1/skills/skill-hermes-agent")
    assert single_res.status_code == 200
    data = single_res.json()
    assert data["registration"] == "REGISTERED"
    assert data["installation"] == "UNKNOWN"
    assert data["health"] == "UNKNOWN"
    assert data["execution"] == "NOT_OBSERVED"


@pytest.mark.asyncio
async def test_hybrid_agents_endpoints(sagara_client):
    """Section 44: GET /api/v1/agents derives definitions from real profiles while runtime remains unknown."""
    res = await sagara_client.get("/api/v1/agents")
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) >= 6

    lead_agent = next(a for a in agents if a["id"] == "lead")
    assert lead_agent["definition"]["name"] == "Lead Coordinator"
    assert lead_agent["runtime"]["state"] == "UNKNOWN"
    assert lead_agent["runtime"]["confidence"] == "UNKNOWN"
    assert lead_agent["runtime"]["session_count"] is None


@pytest.mark.asyncio
async def test_snapshot_with_real_catalogs(sagara_client):
    """Section 39 & 45: Snapshot derives profile/agent counts from real definitions."""
    res = await sagara_client.get("/api/v1/mission-control/snapshot")
    assert res.status_code == 200
    snap = res.json()
    assert snap["agent_counts"]["total"] >= 6


@pytest.mark.asyncio
async def test_invalid_sagara_source_fails_safely():
    """
    Section 30 & 32: If configured Sagara root does not exist:
    API fails safely with 503 SAGARA_SOURCE_UNAVAILABLE without leaking full local path.
    """
    old_profile_source = settings.profile_source
    old_root = settings.sagara_project_root

    settings.profile_source = "sagara"
    settings.sagara_project_root = "C:/totally_nonexistent_sagara_secret_path_12345"
    reconfigure_dependencies()

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # /ready endpoint fails with 503
        ready_res = await client.get("/ready")
        assert ready_res.status_code == 503
        ready_data = ready_res.json()
        assert ready_data["error"]["code"] == "SAGARA_SOURCE_UNAVAILABLE"
        assert "Configured Sagara source is unavailable." in ready_data["error"]["message"]
        # Error privacy: verify secret path is NOT leaked to user
        assert "totally_nonexistent_sagara_secret_path_12345" not in ready_data["error"]["message"]

        # /api/v1/profiles endpoint also fails with 503
        prof_res = await client.get("/api/v1/profiles")
        assert prof_res.status_code == 503
        prof_data = prof_res.json()
        assert prof_data["error"]["code"] == "SAGARA_SOURCE_UNAVAILABLE"
        assert "totally_nonexistent_sagara_secret_path_12345" not in prof_data["error"]["message"]

    # Restore
    settings.profile_source = old_profile_source
    settings.sagara_project_root = old_root
    reconfigure_dependencies()
