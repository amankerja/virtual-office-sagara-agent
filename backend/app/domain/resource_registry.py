"""
Read-Only Resource Registry Domain Model (Prompt 14.9A.7 Section 15-21).
Enforces server-side resource registration for SAFE_READ_ONLY tool operations.
Prevents arbitrary filesystem path traversal or freeform input.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

ResourceType = Literal["DOCUMENT", "SYSTEMD_SERVICE"]
ResourceClassification = Literal["INTERNAL", "PUBLIC", "CONFIDENTIAL"]


class ReadOnlyResource(BaseModel):
    """
    Authoritative logical resource registered for read-only inspection.
    Client/model references resource_id only; server resolves canonical path.
    """
    model_config = ConfigDict(extra="forbid")

    resource_id: str
    display_name: str
    canonical_path: str
    root_id: str  # e.g., "artifacts", "docs", "systemd"
    resource_type: ResourceType = "DOCUMENT"
    enabled: bool = True
    classification: ResourceClassification = "INTERNAL"
    max_bytes: int = 32768
    max_lines: int = 500
    current_hash: Optional[str] = None
    allow_redaction: bool = True
    owner_policy: str = "MISSION_CONTROL"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))

    def to_safe_metadata(self) -> Dict[str, object]:
        """Expose safe logical metadata without revealing sensitive absolute host paths."""
        return {
            "resource_id": self.resource_id,
            "display_name": self.display_name,
            "root_id": self.root_id,
            "resource_type": self.resource_type,
            "enabled": self.enabled,
            "classification": self.classification,
            "max_bytes": self.max_bytes,
            "max_lines": self.max_lines,
            "has_hash": self.current_hash is not None,
            "allow_redaction": self.allow_redaction,
            "owner_policy": self.owner_policy,
        }


class ResourceRegistryChangeSet(BaseModel):
    """Audited changeset for resource addition, modification, or revocation."""
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    description: Optional[str] = None
    status: Literal["DRAFT", "APPROVED", "APPLIED", "REJECTED"] = "DRAFT"
    proposed_resource_json: str
    diff_json: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    applied_by: Optional[str] = None
    applied_at: Optional[str] = None


CANONICAL_INITIAL_RESOURCES: List[ReadOnlyResource] = [
    ReadOnlyResource(
        resource_id="DOC-CANARY-001",
        display_name="Document Inspection Canary 001",
        canonical_path="artifacts/read-only-canary/document-inspection-001.md",
        root_id="artifacts",
        resource_type="DOCUMENT",
        enabled=True,
        classification="INTERNAL",
        max_bytes=32768,
        max_lines=500,
        current_hash="de8bd7268f3abb295e36d04c5f31ac80543768acd6e0c871113695d2791f49bb",
        allow_redaction=True,
        owner_policy="MISSION_CONTROL",
        created_at="2026-09-12T12:00:00Z",
        updated_at="2026-09-12T12:00:00Z",
    ),
    ReadOnlyResource(
        resource_id="DOC-CANARY-ARTIFACT-001",
        display_name="Document Inspection Canary Legacy Artifact",
        canonical_path="artifacts/document-inspection-001.md",
        root_id="artifacts",
        resource_type="DOCUMENT",
        enabled=True,
        classification="INTERNAL",
        max_bytes=32768,
        max_lines=500,
        current_hash=None,
        allow_redaction=True,
        owner_policy="MISSION_CONTROL",
        created_at="2026-09-12T12:00:00Z",
        updated_at="2026-09-12T12:00:00Z",
    ),
    ReadOnlyResource(
        resource_id="hermes-gateway.service",
        display_name="Hermes Gateway Service Runtime Unit",
        canonical_path="hermes-gateway.service",
        root_id="systemd",
        resource_type="SYSTEMD_SERVICE",
        enabled=True,
        classification="INTERNAL",
        max_bytes=8192,
        max_lines=100,
        current_hash=None,
        allow_redaction=True,
        owner_policy="MISSION_CONTROL",
        created_at="2026-09-12T12:00:00Z",
        updated_at="2026-09-12T12:00:00Z",
    ),
]

