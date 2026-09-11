import uuid
import pytest


@pytest.mark.asyncio
async def test_task_lifecycle_and_mutations(client):
    # 1. Create Task
    task_payload = {
        "title": "Automated End-to-End Contract Verification",
        "description": "Verifying all API routes and headers",
        "priority": "HIGH",
        "state": "READY",
    }
    idem_key = str(uuid.uuid4())
    create_res = await client.post(
        "/api/v1/tasks",
        json=task_payload,
        headers={"Idempotency-Key": idem_key},
    )
    assert create_res.status_code == 201
    created_task = create_res.json()
    task_id = created_task["id"]
    assert created_task["title"] == task_payload["title"]
    assert created_task["state"] == "READY"
    assert created_task["revision"] == 1
    assert "ETag" in create_res.headers

    # 2. Idempotency replay on create
    replay_res = await client.post(
        "/api/v1/tasks",
        json=task_payload,
        headers={"Idempotency-Key": idem_key},
    )
    assert replay_res.status_code == 201
    assert replay_res.json()["id"] == task_id

    # 3. Update task with If-Match revision check
    update_payload = {"description": "Updated description for verification"}
    update_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json=update_payload,
        headers={"If-Match": '"v1"'},
    )
    assert update_res.status_code == 200
    updated_task = update_res.json()
    assert updated_task["description"] == update_payload["description"]
    assert updated_task["revision"] == 2

    # 4. Concurrency conflict on stale If-Match
    conflict_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Stale Attempt"},
        headers={"If-Match": '"v1"'},  # Expected v2
    )
    assert conflict_res.status_code == 409
    assert conflict_res.json()["error"]["code"] == "RESOURCE_CONFLICT"

    # 5. Dispatch task
    dispatch_idem = str(uuid.uuid4())
    dispatch_res = await client.post(
        f"/api/v1/tasks/{task_id}/dispatch",
        headers={"Idempotency-Key": dispatch_idem},
    )
    assert dispatch_res.status_code == 200
    dispatched_task = dispatch_res.json()
    assert dispatched_task["state"] == "DISPATCHING"

    # 6. Already dispatched conflict
    double_dispatch = await client.post(f"/api/v1/tasks/{task_id}/dispatch")
    assert double_dispatch.status_code == 409
    assert double_dispatch.json()["error"]["code"] == "TASK_ALREADY_DISPATCHED"


@pytest.mark.asyncio
async def test_approval_lifecycle_and_concurrency(client):
    # Get pending approval
    approvals_res = await client.get("/api/v1/approvals?state=PENDING")
    assert approvals_res.status_code == 200
    pending_list = approvals_res.json()
    assert len(pending_list) >= 1

    target_appr = pending_list[0]
    appr_id = target_appr["id"]
    current_rev = target_appr["revision"]

    # Concurrency conflict on stale revision
    stale_res = await client.post(
        f"/api/v1/approvals/{appr_id}/approve",
        json={"reason": "Stale attempt"},
        headers={"If-Match": f'"v{current_rev + 99}"'},
    )
    assert stale_res.status_code == 409
    assert stale_res.json()["error"]["code"] == "RESOURCE_CONFLICT"

    # Successful approval
    idem_key = str(uuid.uuid4())
    approve_res = await client.post(
        f"/api/v1/approvals/{appr_id}/approve",
        json={"reason": "Authorized by test operator"},
        headers={"If-Match": f'"v{current_rev}"', "Idempotency-Key": idem_key},
    )
    assert approve_res.status_code == 200
    approved_data = approve_res.json()
    assert approved_data["state"] == "APPROVED"
    assert approved_data["decision"]["reason"] == "Authorized by test operator"

    # Already resolved conflict
    double_res = await client.post(
        f"/api/v1/approvals/{appr_id}/approve",
        json={"reason": "Second try"},
    )
    assert double_res.status_code == 409
    assert double_res.json()["error"]["code"] == "APPROVAL_ALREADY_RESOLVED"
