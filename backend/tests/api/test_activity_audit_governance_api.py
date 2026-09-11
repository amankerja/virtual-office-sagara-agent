import uuid
import pytest


@pytest.mark.asyncio
async def test_activity_and_audit_stream(client):
    # Activity
    act_res = await client.get("/api/v1/activity")
    assert act_res.status_code == 200
    activities = act_res.json()
    assert isinstance(activities, list)
    assert len(activities) >= 1
    assert "timestamp" in activities[0]
    assert "category" in activities[0]

    # Audit
    audit_res = await client.get("/api/v1/audit")
    assert audit_res.status_code == 200
    audits = audit_res.json()
    assert isinstance(audits, list)
    assert len(audits) >= 1
    assert "actor" in audits[0]
    assert "action" in audits[0]
    assert "outcome" in audits[0]

    # Read-only audit verification: POST /api/v1/audit is not allowed (405 Method Not Allowed)
    audit_mutation = await client.post("/api/v1/audit", json={})
    assert audit_mutation.status_code in [404, 405]


@pytest.mark.asyncio
async def test_governance_and_cost_distinction(client):
    gov_res = await client.get("/api/v1/governance")
    assert gov_res.status_code == 200
    gov = gov_res.json()
    assert "usage" in gov
    assert "budget" in gov

    cost = gov["usage"]["cost"]
    # Verify strict distinction between estimated and actual
    assert "estimated_cost_usd" in cost
    assert "actual_cost_usd" in cost
    assert cost["estimated_cost_usd"] != cost["actual_cost_usd"]


@pytest.mark.asyncio
async def test_artifacts_api(client):
    art_res = await client.get("/api/v1/artifacts")
    assert art_res.status_code == 200
    artifacts = art_res.json()
    assert len(artifacts) >= 1

    first = artifacts[0]
    single_res = await client.get(f"/api/v1/artifacts/{first['id']}")
    assert single_res.status_code == 200
    assert single_res.json()["name"] == first["name"]


@pytest.mark.asyncio
async def test_task_mutation_audit_correlation_generation(client):
    corr_id = f"corr-test-audit-{uuid.uuid4().hex[:8]}"

    # Create task with correlation ID
    task_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Audit Test Task", "priority": "MEDIUM", "state": "READY"},
        headers={"X-Correlation-ID": corr_id},
    )
    assert task_res.status_code == 201

    # Check that audit log contains the created event with matching correlation ID
    audit_res = await client.get(f"/api/v1/audit?correlation_id={corr_id}")
    assert audit_res.status_code == 200
    audits = audit_res.json()
    assert len(audits) >= 1
    assert audits[0]["action"] == "TASK_CREATED"
    assert audits[0]["correlation_id"] == corr_id

    # Check that activity stream contains the event with matching correlation ID
    act_res = await client.get(f"/api/v1/activity?correlation_id={corr_id}")
    assert act_res.status_code == 200
    acts = act_res.json()
    assert len(acts) >= 1
    assert acts[0]["correlation_id"] == corr_id
