import pytest
from starlette.testclient import TestClient
from app.adapters.router_health import NineRouterHealthAdapter
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
from app.adapters.sagara_source import SourceDiscoveryAdapter
from app.adapters.service_health import ServiceHealthAdapter
from app.adapters.vps_telemetry import VpsTelemetryAdapter
from app.main import create_app


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.mark.asyncio
async def test_vps_telemetry_adapter_contract():
    adapter = VpsTelemetryAdapter(ttl_seconds=5.0)
    data = await adapter.get_telemetry()

    assert data.hostname
    assert data.uptime_seconds >= 0
    assert data.observed_at
    assert data.health in ("HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN")

    # Cache test
    data2 = await adapter.get_telemetry()
    assert data2.observed_at == data.observed_at


@pytest.mark.asyncio
async def test_service_health_adapter_contract():
    adapter = ServiceHealthAdapter(ttl_seconds=5.0)
    services = await adapter.list_services()

    assert len(services) == 3
    names = [s.name for s in services]
    assert "sagara-mission-control.service" in names
    assert "hermes-gateway.service" in names
    assert "9router.service" in names

    for s in services:
        assert s.health in ("HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN")
        assert s.active_state in ("active", "inactive", "failed", "UNKNOWN", "UNAVAILABLE")


@pytest.mark.asyncio
async def test_9router_health_adapter_no_credentials_leak():
    adapter = NineRouterHealthAdapter(ttl_seconds=5.0)
    health = await adapter.get_health()

    assert health.endpoint == "http://127.0.0.1:20128"
    assert health.health in ("HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN")

    # Security invariant: No credentials or tokens in the DTO
    dump = health.model_dump()
    assert "api_key" not in dump
    assert "token" not in dump
    assert "credential" not in dump
    assert "secret" not in dump


@pytest.mark.asyncio
async def test_source_discovery_adapter_contract():
    adapter = SourceDiscoveryAdapter(ttl_seconds=5.0)
    sources = await adapter.get_source_status()

    assert sources.runtime_contract == "SAGARA_HERMES_RUNTIME_CONTRACT_V1"
    assert sources.sagara.freeze_commit == "babbd61618f6eb3db99109ba24e0d49b2c9b97d7"
    assert sources.sagara.health in ("HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN")
    assert sources.hermes.health in ("HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN")

    release = await adapter.get_release_metadata()
    assert release.production_policy == "PRODUCTION_EXECUTION_POLICY_V3"
    assert release.policy_hash == "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"
    assert release.sagara_freeze_commit == "babbd61618f6eb3db99109ba24e0d49b2c9b97d7"


def test_runtime_vps_endpoints(client):
    # 1. /api/v1/health
    r_health = client.get("/api/v1/health")
    assert r_health.status_code == 200
    assert r_health.json() == {"status": "ok"}

    # 2. /api/v1/runtime/vps
    r_vps = client.get("/api/v1/runtime/vps")
    assert r_vps.status_code == 200
    vps_data = r_vps.json()
    assert "hostname" in vps_data
    assert "uptime_seconds" in vps_data
    assert "health" in vps_data

    # 3. /api/v1/runtime/services
    r_svc = client.get("/api/v1/runtime/services")
    assert r_svc.status_code == 200
    svcs = r_svc.json()
    assert isinstance(svcs, list)
    assert len(svcs) == 3

    # 4. /api/v1/runtime/9router
    r_router = client.get("/api/v1/runtime/9router")
    assert r_router.status_code == 200
    router_data = r_router.json()
    assert router_data["endpoint"] == "http://127.0.0.1:20128"

    # 5. /api/v1/runtime/sources
    r_sources = client.get("/api/v1/runtime/sources")
    assert r_sources.status_code == 200
    sources_data = r_sources.json()
    assert sources_data["runtime_contract"] == "SAGARA_HERMES_RUNTIME_CONTRACT_V1"
    assert "sagara" in sources_data
    assert "hermes" in sources_data

    # 6. /api/v1/runtime/release
    r_release = client.get("/api/v1/runtime/release")
    assert r_release.status_code == 200
    release_data = r_release.json()
    assert release_data["production_policy"] == "PRODUCTION_EXECUTION_POLICY_V3"
    assert release_data["policy_hash"] == "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"
