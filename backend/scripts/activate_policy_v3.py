"""
Script: activate_policy_v3.py
Purpose: Audited activation of PRODUCTION_EXECUTION_POLICY_V3 in the live control database.
Guarantees:
- Zero live Hermes submissions.
- V1 and V2 preserved with status SUPERSEDED and unchanged immutable hashes.
- V3 installed with deterministic hash 13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e.
- ReadOnlyResourceRegistry updated with profile-specific bindings (sagara-lab, it-support).
- Production ends LOCKED with zero active windows.
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution_policy import (
    create_canonical_v3_policy,
    diff_policies,
    compute_policy_hash,
)
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.resource_registry_service import ReadOnlyResourceRegistry
from app.services.execution_lock_service import ExecutionLockService
from app.services.audit_verifier import verify_audit_chain

CANONICAL_V1_HASH = "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a"
CANONICAL_V2_HASH = "c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1"
CANONICAL_V3_HASH = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"


def main():
    print("=== PROMPT 15.1: AUDITED V3 POLICY ACTIVATION ===")
    
    # 1. Connect to production control DB
    db_path = Path(__file__).parent.parent / "data" / "mission-control.db"
    print(f"Target DB: {db_path}")
    conn = get_db_connection(str(db_path))

    # 2. Run schema migrations
    print("Running migrations...")
    run_migrations(conn)
    print("Migrations complete.")

    # 3. Seed canonical read-only resources with profile bindings
    print("Seeding canonical ReadOnlyResourceRegistry with profile bindings...")
    ReadOnlyResourceRegistry.seed_canonical_resources(conn)
    resources = ReadOnlyResourceRegistry.list_resources(conn)
    print(f"Seeded/Found {len(resources)} resources.")
    for r in resources:
        print(f"  - [{r.resource_id}] {r.display_name} ({r.resource_type}) allowed={getattr(r, 'allowed_profiles', [])} enabled={r.enabled}")

    # 4. Check current active policy
    current_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Current Active Policy: {current_policy.version}")
    print(f"Current Policy Hash: {current_policy.policy_hash}")

    # 5. Create canonical V3 policy
    v3_policy = create_canonical_v3_policy()
    computed_v3_hash = compute_policy_hash(v3_policy)
    assert computed_v3_hash == CANONICAL_V3_HASH, f"V3 Hash mismatch: {computed_v3_hash} != {CANONICAL_V3_HASH}"
    print(f"Prepared V3 Policy Version: {v3_policy.version}")
    print(f"V3 Deterministic Hash: {computed_v3_hash}")

    if current_policy.version != "PRODUCTION_EXECUTION_POLICY_V3":
        # 6. Diff current -> V3
        diff = diff_policies(current_policy, v3_policy)
        print(f"Semantic differences ({current_policy.version} -> V3): {len(diff['changes'])} items")
        for d in diff["changes"]:
            print(f"  - {d}")

        # 7. Apply V3 via ExecutionPolicyService
        print("Applying V3 policy changeset...")
        ExecutionPolicyService.apply_policy(
            conn,
            v3_policy,
            actor_id="operator:activation_v3",
            reason="Prompt 15.1 IT-Support Limited Rollout Policy V3 Activation"
        )
        print("V3 policy successfully applied.")
    else:
        print("V3 is already the active policy in database.")

    # 8. Verify active policy is V3
    new_active = ExecutionPolicyService.get_active_policy(conn)
    assert new_active.version == "PRODUCTION_EXECUTION_POLICY_V3", f"Expected V3, got {new_active.version}"
    assert new_active.policy_hash == CANONICAL_V3_HASH, f"Hash mismatch: {new_active.policy_hash}"
    assert new_active.profiles["it-support"].status == "LIMITED"
    assert new_active.profiles["sagara-lab"].status == "LIMITED"
    for pid in ["lead", "personal", "business", "marketing", "cs", "it-coding"]:
        assert new_active.profiles[pid].status == "DISABLED"
    print("Verification PASSED: Active policy is PRODUCTION_EXECUTION_POLICY_V3 with dual LIMITED profiles.")

    # 9. Verify V1 and V2 historical retention
    cursor = conn.cursor()
    cursor.execute("SELECT version, policy_hash, status FROM execution_policies ORDER BY created_at DESC;")
    history = [dict(r) for r in cursor.fetchall()]
    print(f"Total stored policies: {len(history)}")
    
    v1_record = next((p for p in history if p["version"] == "PRODUCTION_EXECUTION_POLICY_V1"), None)
    assert v1_record is not None
    assert v1_record["status"] == "SUPERSEDED"
    assert v1_record["policy_hash"] == CANONICAL_V1_HASH
    print("Verification PASSED: V1 retained as SUPERSEDED with original hash bda47521... (immutable).")

    v2_record = next((p for p in history if p["version"] == "PRODUCTION_EXECUTION_POLICY_V2"), None)
    assert v2_record is not None
    assert v2_record["status"] == "SUPERSEDED"
    assert v2_record["policy_hash"] == CANONICAL_V2_HASH
    print("Verification PASSED: V2 retained as SUPERSEDED with original hash c5dc6df1... (immutable).")

    # 10. Verify execution lock status remains LOCKED
    is_locked, lock_reason, active_window = ExecutionLockService.get_effective_status(conn)
    print(f"Lock Status: is_locked={is_locked}, reason={lock_reason}")
    assert is_locked is True
    assert active_window is None
    print("Verification PASSED: Execution remains LOCKED with zero active windows.")

    # 11. Verify audit ledger integrity
    valid, detail = verify_audit_chain(conn)
    print(f"Audit Ledger Verification: valid={valid}, detail={detail}")
    assert valid is True
    print("Verification PASSED: Audit ledger cryptographically intact.")

    print("\n=== V3 POLICY ACTIVATION COMPLETE AND VERIFIED ===")


if __name__ == "__main__":
    main()
