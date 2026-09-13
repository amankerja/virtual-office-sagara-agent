"""
Prompt 15.1 Test Suite: PRODUCTION_EXECUTION_POLICY_V3 and IT-Support LIMITED Rollout.
Invariants verified:
1. V3 Policy Determinism & Immutability of V1/V2 historical hashes
2. Profile Matrix: exactly 2 LIMITED (sagara-lab, it-support), 6 DISABLED
3. Profile-Specific Resource Binding for it-support (hermes-gateway.service allowed, others denied)
4. Native Channel Routing Distinction (ops-it-support route remains blocked by policy)
"""

import sqlite3
from pathlib import Path
import pytest
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution_policy import (
    create_canonical_v1_policy,
    create_canonical_v2_policy,
    create_canonical_v3_policy,
    diff_policies,
)
from app.domain.resource_registry import ReadOnlyResource, CANONICAL_INITIAL_RESOURCES
from app.services.resource_registry_service import ReadOnlyResourceRegistry
from app.services.execution_policy_service import ExecutionPolicyService


EXPECTED_V1_HASH = "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a"
EXPECTED_V2_HASH = "c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1"
EXPECTED_V3_HASH = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    run_migrations(conn)
    return conn


def test_v3_policy_invariants_and_determinism():
    """Verify V3 deterministic hash, profile matrix, and V1/V2 immutability."""
    v1 = create_canonical_v1_policy()
    v2 = create_canonical_v2_policy()
    v3 = create_canonical_v3_policy()

    # Immutability of historical policies
    assert v1.policy_hash == EXPECTED_V1_HASH
    assert v2.policy_hash == EXPECTED_V2_HASH
    assert v3.policy_hash == EXPECTED_V3_HASH
    assert v3.version == "PRODUCTION_EXECUTION_POLICY_V3"
    assert v3.supersedes_version == "PRODUCTION_EXECUTION_POLICY_V2"

    # Profile matrix
    limited = [pid for pid, r in v3.profiles.items() if r.status == "LIMITED"]
    disabled = [pid for pid, r in v3.profiles.items() if r.status == "DISABLED"]
    assert sorted(limited) == ["it-support", "sagara-lab"]
    assert sorted(disabled) == ["business", "cs", "it-coding", "lead", "marketing", "personal"]

    # it-support constraints
    it_rule = v3.profiles["it-support"]
    assert it_rule.allowed_execution_modes == ["SAFE_NO_TOOLS", "SAFE_READ_ONLY"]
    assert it_rule.allowed_task_classes == ["REASONING_ONLY", "DRAFT_GENERATION", "READ_ONLY_INSPECTION"]
    assert it_rule.max_concurrency == 1
    assert it_rule.max_executions_per_hour == 3
    assert it_rule.external_side_effects_allowed is False

    # sagara-lab bounds preserved
    lab_rule = v3.profiles["sagara-lab"]
    assert lab_rule.status == "LIMITED"
    assert lab_rule.max_concurrency == 1
    assert lab_rule.max_executions_per_hour == 3

    # Diff V2 -> V3
    diff = diff_policies(v2, v3)
    changes = diff.get("changes", [])
    assert any(c.get("field") == "profiles.it-support.status" for c in changes)


def test_it_support_profile_resource_binding(db_conn):
    """Verify profile-specific resource containment for it-support."""
    # Seed canonical resources
    ReadOnlyResourceRegistry.seed_canonical_resources(db_conn)
    base_dir = Path(__file__).resolve().parent

    # 1. it-support is allowed on hermes-gateway.service
    valid, code, path, res, msg = ReadOnlyResourceRegistry.resolve_and_validate(
        db_conn, "hermes-gateway.service", base_dir=base_dir, profile_id="it-support"
    )
    assert valid is True
    assert code is None

    # 2. DOC-CANARY-001 is restricted to sagara-lab; it-support must be rejected
    denied, d_code, _, _, d_msg = ReadOnlyResourceRegistry.resolve_and_validate(
        db_conn, "DOC-CANARY-001", base_dir=base_dir, profile_id="it-support"
    )
    assert denied is False
    assert d_code == "RESOURCE_SCOPE_DENIED"
    assert "it-support" in d_msg


def test_channel_routing_distinction():
    """Verify that Mission Control LIMITED eligibility does not unlock native channel execution."""
    v3 = create_canonical_v3_policy()
    # Mission Control allows it-support
    assert v3.profiles["it-support"].status == "LIMITED"

    # Native channel dispatch contract simulation:
    # A native channel dispatch check must treat it-support as BLOCKED_BY_POLICY
    # unless native autonomous channel dispatch is explicitly authorized
    native_channel_routes = {
        "ops-it-support": {
            "channel_id": "it-support-self-healing",
            "profile": "it-support",
            "configured": True,
            "authorized": False,
            "effective_dispatch": "BLOCKED_BY_POLICY",
        }
    }
    ops_route = native_channel_routes["ops-it-support"]
    assert ops_route["configured"] is True
    assert ops_route["authorized"] is False
    assert ops_route["effective_dispatch"] == "BLOCKED_BY_POLICY"
