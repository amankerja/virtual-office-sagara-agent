"""
SQLite Repository for Tool Security Policy & Audit Ledger (Prompt 14.9A Section 11-16, 97-100).
Provides read-only access to installed tool policies, capabilities metadata, and changeset tracking.
"""

import json
import sqlite3
from typing import Any, Dict, List, Optional
from app.db.connection import get_db_connection
from app.domain.tool_security_policy import (
    ToolSecurityPolicy,
    compute_tool_policy_hash,
    create_canonical_tool_security_policy_v1,
)
from app.services.tool_security_service import ToolSecurityService


class SqliteToolSecurityRepository:
    """Repository managing tool security policies, proposed changesets, and tool audit entries."""

    def __init__(self, db_path_override: Optional[str] = None) -> None:
        self._db_path_override = db_path_override

    def _get_connection(self) -> sqlite3.Connection:
        return get_db_connection(self._db_path_override)

    def get_installed_policy(self) -> ToolSecurityPolicy:
        """Fetch active or installed tool security policy."""
        conn = self._get_connection()
        try:
            return ToolSecurityService.get_installed_policy(conn)
        finally:
            conn.close()

    def list_capabilities(self) -> List[Dict[str, Any]]:
        """List metadata for all approved and candidate tool capabilities."""
        policy = self.get_installed_policy()
        capabilities_list = []
        for tool_id, cap in policy.approved_capabilities.items():
            capabilities_list.append({
                "tool_id": cap.tool_id,
                "tool_version": cap.tool_version,
                "implementation_fingerprint": cap.implementation_fingerprint,
                "description": cap.description,
                "risk_class": cap.risk_class,
                "read_only_verified": cap.read_only_verified,
                "scope_type": cap.resource_scope.scope_type,
                "network_policy": cap.network_policy,
                "filesystem_policy": cap.filesystem_policy,
                "enabled_profiles": cap.enabled_profiles,
                "operations": [
                    {
                        "operation_id": op.operation_id,
                        "description": op.description,
                        "read_only_verified": op.read_only_verified,
                        "max_result_bytes": op.max_result_bytes,
                        "max_result_lines": op.max_result_lines,
                        "timeout_seconds": op.timeout_seconds,
                    }
                    for op in cap.operations.values()
                ],
                "status": "APPROVED_FOR_FUTURE_READ_ONLY_CANARY",
            })
        return capabilities_list
