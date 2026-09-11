import pytest
from starlette.testclient import TestClient
from app.main import create_app


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as tc:
        yield tc


def test_action_safety_status_endpoint(client):
    """Verify /api/v1/action-safety/status reports expected safety controls."""
    resp = client.get("/api/v1/action-safety/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["execution_mode"] == "DISABLED"
    assert data["persistent_idempotency"] == "HEALTHY"
    assert data["audit_chain"] in ("VALID", "TAMPER_DETECTED")
    assert data["executor"] == "DISABLED"
    assert data["control_db"] == "CONNECTED"


def test_audit_verify_endpoint(client):
    """Verify /api/v1/action-safety/audit/verify performs read-only ledger check."""
    resp = client.post("/api/v1/action-safety/audit/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["status"] == "VALID"
    assert data["records_checked"] >= 1


def test_execute_endpoint_requires_idempotency_and_fails_closed(client):
    """Prompt 14 Section 32: POST /action-intents/{id}/execute requires Idempotency-Key and fails closed."""
    resp = client.post("/api/v1/action-intents/act-int-123/execute")
    assert resp.status_code == 422  # Missing required Idempotency-Key header

    resp2 = client.post(
        "/api/v1/action-intents/act-int-123/execute",
        headers={"Idempotency-Key": "key-exec-test-1"},
    )
    assert resp2.status_code == 404  # Intent not found


def test_create_and_query_action_intent(client):
    """Verify ActionIntent creation, preflight, and querying via HTTP API."""
    payload = {
        "action_type": "SAFETY_GATE_SELF_TEST",
        "target_type": "SYSTEM",
        "target_id": "test-target",
        "payload": {"ping": "pong"},
        "reason": "Verify action intent creation via HTTP",
    }
    resp = client.post("/api/v1/action-intents", json=payload, headers={"Idempotency-Key": "key-http-1"})
    assert resp.status_code == 201
    intent = resp.json()
    assert intent["action_type"] == "SAFETY_GATE_SELF_TEST"
    assert intent["status"] == "READY_TO_EXECUTE"  # LOW risk reaches ready_to_execute
    assert "ETag" in resp.headers

    # List intents
    list_resp = client.get("/api/v1/action-intents")
    assert list_resp.status_code == 200
    intents = list_resp.json()
    assert any(i["id"] == intent["id"] for i in intents)

    # Dry-run preflight
    pf_resp = client.post(f"/api/v1/action-intents/{intent['id']}/preflight?dry_run=true")
    assert pf_resp.status_code == 200
    pf_data = pf_resp.json()
    assert pf_data["result"] == "PASS"
    assert pf_data["runtime_evidence"]["dry_run"] is True
