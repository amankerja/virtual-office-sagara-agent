import pytest


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
