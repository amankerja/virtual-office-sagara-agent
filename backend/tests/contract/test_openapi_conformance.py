from pathlib import Path
import yaml
import pytest

pytestmark = [pytest.mark.smoke, pytest.mark.contract]


def load_frozen_openapi() -> dict:
    # Frontend openapi spec path relative to workspace
    candidates = [
        Path(__file__).parent.parent.parent.parent / "frontend" / "docs" / "api" / "mission-control-v1.openapi.yaml",
        Path("D:/SAGARA AI/MAIN DASHBOARD/sagara-mission-control/frontend/docs/api/mission-control-v1.openapi.yaml"),
        Path("D:/SAGARA/sagara-mission-control/frontend/docs/api/mission-control-v1.openapi.yaml"),
    ]
    for p in candidates:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
    raise FileNotFoundError("Could not find frozen mission-control-v1.openapi.yaml")


def test_frozen_contract_paths_conformance(app):
    frozen_spec = load_frozen_openapi()
    generated_spec = app.openapi()

    frozen_paths = frozen_spec.get("paths", {})
    generated_paths = generated_spec.get("paths", {})

    # The frozen spec uses paths relative to /api/v1 (from server url)
    for path, path_item in frozen_paths.items():
        v1_path = f"/api/v1{path}"
        assert v1_path in generated_paths, f"Missing frozen contract path: {v1_path}"

        gen_item = generated_paths[v1_path]
        for method in path_item.keys():
            if method.lower() in ["get", "post", "patch", "delete", "put"]:
                assert (
                    method.lower() in gen_item
                ), f"Missing method '{method.upper()}' on path '{v1_path}' defined in frozen contract"


def test_idempotency_headers_in_mutations(app):
    generated_spec = app.openapi()
    paths = generated_spec.get("paths", {})

    mutation_endpoints = [
        ("/api/v1/tasks", "post"),
        ("/api/v1/tasks/{task_id}/dispatch", "post"),
        ("/api/v1/tasks/{task_id}/cancel", "post"),
        ("/api/v1/approvals/{approval_id}/approve", "post"),
        ("/api/v1/approvals/{approval_id}/reject", "post"),
    ]

    for path, method in mutation_endpoints:
        assert path in paths, f"Missing mutation endpoint {path}"
        operation = paths[path].get(method, {})
        params = operation.get("parameters", [])
        param_names = [p.get("name") for p in params]
        assert (
            "Idempotency-Key" in param_names or "idempotency-key" in [p.lower() for p in param_names]
        ), f"Missing Idempotency-Key header on mutation {method.upper()} {path}"


def test_concurrency_if_match_headers(app):
    generated_spec = app.openapi()
    paths = generated_spec.get("paths", {})

    concurrency_endpoints = [
        ("/api/v1/tasks/{task_id}", "patch"),
        ("/api/v1/approvals/{approval_id}/approve", "post"),
        ("/api/v1/approvals/{approval_id}/reject", "post"),
    ]

    for path, method in concurrency_endpoints:
        assert path in paths
        operation = paths[path].get(method, {})
        params = operation.get("parameters", [])
        param_names = [p.get("name") for p in params]
        assert (
            "If-Match" in param_names or "if-match" in [p.lower() for p in param_names]
        ), f"Missing If-Match concurrency header on {method.upper()} {path}"


def test_openapi_spec_has_no_websocket_drift(app):
    """Confirm HTTP OpenAPI schema has no drift or accidental WebSocket route pollution."""
    generated_spec = app.openapi()
    paths = generated_spec.get("paths", {})

    # WebSocket route MUST NOT pollute HTTP OpenAPI paths
    assert "/api/v1/realtime/ws" not in paths, "WebSocket endpoint must not be exposed in HTTP OpenAPI specification"
    assert "/realtime/ws" not in paths

    # Verify frozen HTTP contract title and version
    assert generated_spec.get("info", {}).get("version") == "1.0.0"

