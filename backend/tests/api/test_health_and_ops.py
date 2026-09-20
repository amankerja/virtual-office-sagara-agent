import pytest

pytestmark = [pytest.mark.smoke]


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "X-Correlation-ID" in response.headers


@pytest.mark.asyncio
async def test_readiness_endpoint(client):
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["data_mode"] == "mock"


@pytest.mark.asyncio
async def test_api_v1_root(client):
    response = await client.get("/api/v1")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sagara Mission Control API"
    assert data["version"] == "v1"
    assert data["data_mode"] == "mock"


@pytest.mark.asyncio
async def test_custom_correlation_id_passthrough(client):
    custom_corr = "corr-custom-test-12345"
    response = await client.get("/health", headers={"X-Correlation-ID": custom_corr})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == custom_corr


@pytest.mark.asyncio
async def test_canonical_error_format_on_404(client):
    response = await client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert "correlation_id" in data["error"]


@pytest.mark.asyncio
async def test_operations_readiness_endpoint(client):
    """Prompt 14.9A.9 Section 22-32: Consolidated read-only operational status model."""
    response = await client.get("/api/v1/operations/readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["infrastructure_ready"] is True
    assert isinstance(data["execution_armed"], bool)
    assert data["policy_diagnostics"]["active_policy_version"] in ("PRODUCTION_EXECUTION_POLICY_V2", "PRODUCTION_EXECUTION_POLICY_V3")
    assert data["policy_diagnostics"]["tool_policy_version"] == "TOOL_SECURITY_POLICY_V1"
    assert "tool_broker_health" in data
    assert "resource_registry_health" in data
    assert "rate_limit_state" in data
    assert "concurrency_state" in data
    assert "last_execution_summary" in data
    assert data["telemetry"]["session_metrics"]["central_store_sessions"] >= 0
    assert data["telemetry"]["session_metrics"]["profile_local_sessions"] >= 0
