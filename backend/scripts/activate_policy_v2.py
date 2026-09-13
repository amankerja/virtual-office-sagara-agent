"""
Script: activate_policy_v2.py
Purpose: Audited activation of PRODUCTION_EXECUTION_POLICY_V2 in the live control database.
Guarantees:
- Zero live Hermes submissions.
- V1 preserved with status SUPERSEDED and unchanged hash.
- V2 installed with deterministic hash c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1.
- ReadOnlyResourceRegistry initialized and seeded.
- Production ends LOCKED.
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution_policy import create_canonical_v2_policy, diff_policies, compute_policy_hash
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.resource_registry_service import ReadOnlyResourceRegistry
from app.services.execution_lock_service import ExecutionLockService
from app.services.audit_verifier import verify_audit_chain


def main():
    print("=== PROMPT 14.9A.7: AUDITED V2 POLICY ACTIVATION ===")
    
    # 1. Connect to production control DB
    db_path = Path(__file__).parent.parent / "data" / "mission-control.db"
    print(f"Target DB: {db_path}")
    conn = get_db_connection(str(db_path))

    # 2. Run schema migrations
    print("Running migrations...")
    run_migrations(conn)
    print("Migrations complete (schema v6 applied).")

    # 3. Seed canonical read-only resources
    print("Seeding canonical ReadOnlyResourceRegistry...")
    ReadOnlyResourceRegistry.seed_canonical_resources(conn)
    resources = ReadOnlyResourceRegistry.list_resources(conn)
    print(f"Seeded/Found {len(resources)} resources.")
    for r in ReadOnlyResourceRegistry.list_resources(conn):
        print(f"  - [{r.resource_id}] {r.display_name} ({r.resource_type}) enabled={r.enabled}")

    # 4. Check current active policy
    current_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Current Active Policy: {current_policy.version}")
    print(f"Current Policy Hash: {current_policy.policy_hash}")

    # 5. Create canonical V2 policy
    v2_policy = create_canonical_v2_policy()
    computed_v2_hash = compute_policy_hash(v2_policy)
    assert computed_v2_hash == "c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1"
    print(f"Prepared V2 Policy Version: {v2_policy.version}")
    print(f"V2 Deterministic Hash: {computed_v2_hash}")

    if current_policy.version == "PRODUCTION_EXECUTION_POLICY_V1":
        # 6. Diff V1 -> V2
        diffs = diff_policies(current_policy, v2_policy)
        print(f"Semantic differences (V1 -> V2): {len(diffs)} items")
        for d in diffs:
            print(f"  - {d}")

        # 7. Apply V2 via ExecutionPolicyService
        print("Applying V2 policy changeset...")
        ExecutionPolicyService.apply_policy(
            conn,
            v2_policy,
            actor_id="operator:activation_v2",
            reason="Prompt 14.9A.7 SAFE_READ_ONLY Limited Policy Activation"
        )
        print("V2 policy successfully applied.")
    else:
        print("V2 is already the active policy in database.")

    # 8. Verify active policy is V2
    new_active = ExecutionPolicyService.get_active_policy(conn)
    assert new_active.version == "PRODUCTION_EXECUTION_POLICY_V2"
    assert new_active.policy_hash == "c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1"
    print("Verification PASSED: Active policy is PRODUCTION_EXECUTION_POLICY_V2.")

    # 9. Verify V1 historical retention
    cursor = conn.cursor()
    cursor.execute("SELECT version, policy_hash, status FROM execution_policies ORDER BY created_at DESC;")
    history = [dict(r) for r in cursor.fetchall()]
    print(f"Total stored policies: {len(history)}")
    v1_record = next((p for p in history if p["version"] == "PRODUCTION_EXECUTION_POLICY_V1"), None)
    assert v1_record is not None
    assert v1_record["status"] == "SUPERSEDED"
    assert v1_record["policy_hash"] == "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a"
    print("Verification PASSED: V1 is retained as SUPERSEDED with original hash bda47521... (immutable).")

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

    print("\n=== V2 POLICY ACTIVATION COMPLETE AND VERIFIED ===")


if __name__ == "__main__":
    main()
